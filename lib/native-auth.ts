/**
 * Login Google di app mobile (Capacitor).
 *
 * Google menolak OAuth di WebView (403 disallowed_useragent), jadi di app login dibuka di
 * Chrome Custom Tabs, lalu hasilnya kembali lewat deep link depup://auth?token=...
 * Alur lengkap + alasan keamanannya: app/api/_lib/app-handoff.ts
 */
import { Capacitor } from "@capacitor/core";
import { parseAuthDeepLink, type AuthDeepLink } from "@/lib/auth-deeplink";

const VERIFIER_KEY = "depup:app-verifier";
const HANDLED_KEY = "depup:app-auth-handled";
/** true selama token sedang ditukar ke server (supaya spinner tidak di-reset di tengah proses). */
let exchanging = false;

export function isNativeApp(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

function b64url(bytes: Uint8Array): string {
  let s = "";
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function makePkce(): Promise<{ verifier: string; challenge: string }> {
  const verifier = b64url(crypto.getRandomValues(new Uint8Array(32))); // 43 karakter
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return { verifier, challenge: b64url(new Uint8Array(digest)) };
}

/** Buka halaman login Google di Custom Tab. */
export async function startNativeLogin(): Promise<void> {
  const { verifier, challenge } = await makePkce();
  // localStorage (bukan memori) supaya tetap ada kalau Android mematikan app saat user di browser.
  localStorage.setItem(VERIFIER_KEY, verifier);
  const { Browser } = await import("@capacitor/browser");
  const url = `${window.location.origin}/api/auth/google?app=1&challenge=${challenge}`;
  await Browser.open({ url });
}

/**
 * Ubah error teknis Capacitor jadi pesan yang menunjuk penyebab & langkah perbaikannya.
 * Error aslinya tetap dicetak ke console (lihat lewat chrome://inspect).
 */
export function describeLoginError(e: unknown): string {
  console.error("[depup] gagal membuka login Google", e);
  const msg = e instanceof Error ? e.message : typeof e === "string" ? e : JSON.stringify(e ?? "");
  if (/not implemented|unimplemented|not available|plugin.*not/i.test(msg)) {
    return "Plugin Browser belum ada di APK ini. Jalankan `npx cap sync android`, lalu build & install ulang APK.";
  }
  if (/no activity|resolve|not found|ActivityNotFound/i.test(msg)) {
    return "Tidak ada browser di perangkat ini. Pakai emulator yang ada Google Play, atau pasang Chrome.";
  }
  if (/subtle|undefined/i.test(msg)) {
    return "Perangkat tidak mendukung enkripsi yang dibutuhkan login. Perbarui Android System WebView.";
  }
  return `Tidak bisa membuka login Google (${msg.slice(0, 120) || "error tidak diketahui"}).`;
}

export type NativeAuthResult = { status: "ok" } | { status: "error"; message: string } | { status: "ignored" };

/** Proses URL depup://auth?... yang masuk ke app. */
export async function handleAuthUrl(rawUrl: string): Promise<NativeAuthResult> {
  const link = parseAuthDeepLink(rawUrl);
  if (!link) {
    if (/^depup:/i.test(rawUrl)) console.warn("[depup] deep link depup:// tidak dikenali, diabaikan");
    return { status: "ignored" };
  }

  // getLaunchUrl() mengembalikan URL yang sama setiap WebView dimuat ulang; jangan proses dua kali.
  if (sessionStorage.getItem(HANDLED_KEY) === rawUrl) return { status: "ignored" };
  sessionStorage.setItem(HANDLED_KEY, rawUrl);

  try {
    const { Browser } = await import("@capacitor/browser");
    await Browser.close(); // Android: no-op, tab sudah tertutup oleh deep link
  } catch {
    /* tidak masalah */
  }

  exchanging = true;
  try {
    return await finishAuth(link);
  } finally {
    exchanging = false;
  }
}

async function finishAuth(link: AuthDeepLink): Promise<NativeAuthResult> {
  const error = link.error;
  if (error) {
    localStorage.removeItem(VERIFIER_KEY);
    return { status: "error", message: error };
  }

  const token = link.token;
  const verifier = localStorage.getItem(VERIFIER_KEY);
  if (!token || !verifier) {
    return { status: "error", message: "Sesi login tidak ditemukan. Coba masuk lagi." };
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch("/api/auth/app-exchange", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, verifier }),
      cache: "no-store",
      signal: ctrl.signal,
    });
    const body = await res.json().catch(() => null);
    localStorage.removeItem(VERIFIER_KEY);
    if (!res.ok || !body?.ok) {
      return { status: "error", message: body?.error ?? "Gagal menyelesaikan login. Coba lagi." };
    }
    return { status: "ok" };
  } catch (e) {
    console.error("[depup] app-exchange gagal", e);
    const aborted = e instanceof DOMException && e.name === "AbortError";
    return {
      status: "error",
      message: aborted
        ? "Server tidak merespons. Coba masuk lagi."
        : "Tidak bisa terhubung ke server. Periksa koneksi internet.",
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Pasang pendengar deep link. Mengembalikan fungsi pembersih.
 * Menangani: app masih hidup (appUrlOpen), app dimatikan Android selagi user di browser
 * (getLaunchUrl), dan user kembali ke app TANPA deep link (onReturnedWithoutResult).
 */
export function listenForNativeAuth(
  onResult: (r: NativeAuthResult) => void,
  onReturnedWithoutResult: () => void
): () => void {
  let disposed = false;
  let lastResultAt = 0;
  const handles: Array<{ remove: () => Promise<void> }> = [];

  const deliver = (r: NativeAuthResult) => {
    if (r.status === "ignored") return;
    lastResultAt = Date.now();
    onResult(r);
  };

  // Beri waktu 2,5 dtk: deep link biasanya datang hampir bersamaan dengan app kembali ke depan.
  const returned = () => {
    setTimeout(() => {
      if (disposed || exchanging || Date.now() - lastResultAt < 2500) return;
      onReturnedWithoutResult();
    }, 2500);
  };

  void (async () => {
    const { App } = await import("@capacitor/app");
    const { Browser } = await import("@capacitor/browser");

    const h1 = await App.addListener("appUrlOpen", async ({ url }) => deliver(await handleAuthUrl(url)));
    const h2 = await Browser.addListener("browserFinished", returned);
    const h3 = await App.addListener("appStateChange", ({ isActive }) => {
      if (isActive) returned();
    });
    if (disposed) {
      [h1, h2, h3].forEach((h) => void h.remove());
      return;
    }
    handles.push(h1, h2, h3);

    const launch = await App.getLaunchUrl();
    if (launch?.url && !disposed) deliver(await handleAuthUrl(launch.url));
  })().catch((e) => {
    console.error("[depup] gagal memasang pendengar login native", e);
    if (!disposed) {
      onResult({
        status: "error",
        message: "Plugin App/Browser tidak aktif di APK ini. Jalankan `npx cap sync android` lalu install ulang APK.",
      });
    }
  });

  return () => {
    disposed = true;
    handles.forEach((h) => void h.remove());
  };
}
