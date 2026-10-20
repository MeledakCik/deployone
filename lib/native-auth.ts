/**
 * Login Google di app mobile (Capacitor).
 *
 * Google menolak OAuth di WebView (403 disallowed_useragent), jadi di app login dibuka di
 * Chrome Custom Tabs, lalu hasilnya kembali lewat deep link depup://auth?token=...
 * Alur lengkap + alasan keamanannya: app/api/_lib/app-handoff.ts
 */
import { Capacitor } from "@capacitor/core";

const VERIFIER_KEY = "depup:app-verifier";
const HANDLED_KEY = "depup:app-auth-handled";

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
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    return { status: "ignored" };
  }
  if (u.protocol !== "depup:" || u.hostname !== "auth") return { status: "ignored" };

  // getLaunchUrl() mengembalikan URL yang sama setiap WebView dimuat ulang; jangan proses dua kali.
  if (sessionStorage.getItem(HANDLED_KEY) === rawUrl) return { status: "ignored" };
  sessionStorage.setItem(HANDLED_KEY, rawUrl);

  try {
    const { Browser } = await import("@capacitor/browser");
    await Browser.close(); // Android: no-op, tab sudah tertutup oleh deep link
  } catch {
    /* tidak masalah */
  }

  const error = u.searchParams.get("error");
  if (error) {
    localStorage.removeItem(VERIFIER_KEY);
    return { status: "error", message: error };
  }

  const token = u.searchParams.get("token");
  const verifier = localStorage.getItem(VERIFIER_KEY);
  if (!token || !verifier) {
    return { status: "error", message: "Sesi login tidak ditemukan. Coba masuk lagi." };
  }

  try {
    const res = await fetch("/api/auth/app-exchange", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, verifier }),
      cache: "no-store",
    });
    const body = await res.json().catch(() => null);
    localStorage.removeItem(VERIFIER_KEY);
    if (!res.ok || !body?.ok) {
      return { status: "error", message: body?.error ?? "Gagal menyelesaikan login. Coba lagi." };
    }
    return { status: "ok" };
  } catch {
    return { status: "error", message: "Tidak bisa terhubung ke server. Periksa koneksi internet." };
  }
}

/**
 * Pasang pendengar deep link. Mengembalikan fungsi pembersih.
 * Menangani dua kasus: app masih hidup (appUrlOpen) dan app dimatikan Android
 * selagi user login di browser (getLaunchUrl saat start).
 */
export function listenForNativeAuth(
  onResult: (r: NativeAuthResult) => void,
  onBrowserClosed: () => void
): () => void {
  let disposed = false;
  const handles: Array<{ remove: () => Promise<void> }> = [];

  void (async () => {
    const { App } = await import("@capacitor/app");
    const { Browser } = await import("@capacitor/browser");

    const h1 = await App.addListener("appUrlOpen", async ({ url }) => {
      const r = await handleAuthUrl(url);
      if (r.status !== "ignored") onResult(r);
    });
    const h2 = await Browser.addListener("browserFinished", () => onBrowserClosed());
    if (disposed) {
      void h1.remove();
      void h2.remove();
      return;
    }
    handles.push(h1, h2);

    const launch = await App.getLaunchUrl();
    if (launch?.url && !disposed) {
      const r = await handleAuthUrl(launch.url);
      if (r.status !== "ignored") onResult(r);
    }
  })().catch(() => {
    /* plugin belum terpasang di build native ini — login tetap bisa dicoba, tapi tidak akan kembali ke app */
  });

  return () => {
    disposed = true;
    handles.forEach((h) => void h.remove());
  };
}
