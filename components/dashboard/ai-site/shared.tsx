"use client";

import * as React from "react";

/** Gaya bersama halaman AI Web Builder. Teks bantu minimal 12,5px supaya terbaca di HP. */
export const labelCls = "mb-1.5 block text-[13px] font-medium text-text-muted";
export const hintCls = "text-[12.5px] leading-snug text-text-muted";
export const checkCls = "mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-[var(--accent)]";

/**
 * Pasang di kotak berlatar Mist (bg-[var(--pill-bg)]) yang berisi kapsul, swatch, tombol .pill, atau input.
 * Isi di dalamnya otomatis berganti ke isian putih (tema terang) / Midnight (tema gelap), jadi tetap
 * kelihatan tanpa garis tepi. Variabel ini sengaja BUKAN --pill-bg supaya kotaknya sendiri tidak ikut berubah.
 */
export const ON_MIST = "[--tile-fill:var(--surface-solid)] [--input-bg:var(--surface-solid)]";

/**
 * Pilihan terpilih di builder dibedakan murni dengan isian warna (tanpa garis tepi):
 * terpilih = Ungu DepUp + teks putih (--ink-fill), tidak terpilih = Mist (--pill-bg).
 * Catatan: --tone-lilac sama dengan --pill-bg di tema terang, jadi tidak cukup untuk menandai pilihan.
 */
export const SELECTED_FILL = "bg-[var(--ink-fill)] text-[var(--ink-fill-text)]";

/** Chip pilihan (radio). Tinggi sentuh 40px hanya di layar kecil, seperti <Btn>. */
export const chipCls = (selected: boolean, muted = false): string =>
  [
    "rounded-full px-3.5 py-1.5 text-[12.5px] font-medium transition max-md:min-h-[40px]",
    selected
      ? `${SELECTED_FILL} hover:bg-[var(--ink-fill-hover)]`
      : `bg-[var(--tile-fill,var(--pill-bg))] hover:bg-[var(--card-hover)]${muted ? " text-text-muted" : ""}`,
  ].join(" ");

/**
 * Kotak swatch warna: swatch duduk di atas isian Mist/Ungu, jadi warna putih atau terang tetap
 * terlihat di kartu putih tanpa perlu garis tepi. Ring hanya muncul saat fokus keyboard.
 */
export const swatchTileCls = (selected: boolean, size: "h-10 w-10" | "h-11 w-11" = "h-10 w-10"): string =>
  `relative grid ${size} shrink-0 cursor-pointer place-items-center rounded-[14px] transition focus-within:ring-2 focus-within:ring-[var(--ring)] focus-within:ring-offset-2 ${
    selected ? "bg-[var(--ink-fill)]" : "bg-[var(--tile-fill,var(--pill-bg))] hover:bg-[var(--card-hover)]"
  }`;

export const isHex = (v: string): boolean => /^#[0-9a-fA-F]{6}$/.test(v);

export function Field({
  label,
  htmlFor,
  children,
  hint,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
  hint?: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <label htmlFor={htmlFor} className={labelCls}>{label}</label>
      {children}
      {hint && <p className={`mt-1.5 ${hintCls}`}>{hint}</p>}
    </div>
  );
}

export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new Error("Koneksi ke server gagal. Periksa internet lalu coba lagi.");
  }
  let json: { ok?: boolean; data?: T; error?: string } | null = null;
  try {
    json = await res.json();
  } catch {
    /* bukan JSON */
  }
  if (!res.ok || !json?.ok) throw new Error(json?.error ?? `Server menjawab error (${res.status}).`);
  return json.data as T;
}

export function ttlLabel(h: number): string {
  return h < 24 ? `${h} jam` : `${h / 24} hari`;
}

/** Sisa waktu yang mudah dibaca, mis. "sekitar 23 jam lagi". */
export function timeLeftLabel(expiresAt: number): string {
  const ms = expiresAt - Date.now();
  if (ms <= 60_000) return "kurang dari 1 menit lagi";
  const h = ms / 3_600_000;
  if (h < 1) return `${Math.max(1, Math.round(ms / 60_000))} menit lagi`;
  if (h < 48) return `sekitar ${Math.round(h)} jam lagi`;
  return `sekitar ${Math.round(h / 24)} hari lagi`;
}

/** true bila pengguna meminta gerakan dikurangi (dipakai untuk scroll halus). */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}
