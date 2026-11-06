"use client";

import * as React from "react";
import { LANG_COOKIE, makeT, setClientLang, type Lang, type TFn } from "./core";

export { type Lang, type TFn, LANG_NAMES, LANGS, tDeep, tl } from "./core";

const LangCtx = React.createContext<Lang>("id");

export function LanguageProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  if (typeof window !== "undefined") setClientLang(lang);
  return <LangCtx.Provider value={lang}>{children}</LangCtx.Provider>;
}

export function useLang(): Lang {
  return React.useContext(LangCtx);
}

/** t("Teks Indonesia", { var }) -> teks dalam bahasa aktif. */
export function useT(): TFn {
  const lang = React.useContext(LangCtx);
  return React.useMemo(() => makeT(lang), [lang]);
}

/** Simpan pilihan bahasa (1 tahun) lalu muat ulang supaya halaman server ikut berganti. */
export function setLang(lang: Lang): void {
  try {
    document.cookie = `${LANG_COOKIE}=${lang}; path=/; max-age=31536000; samesite=lax${location.protocol === "https:" ? "; secure" : ""}`;
  } catch {
    /* cookie diblokir: tetap muat ulang */
  }
  const url = new URL(location.href);
  // /en adalah halaman Inggris tetap; pilih Indonesia di sana -> kembali ke beranda.
  if (lang === "id" && (url.pathname === "/en" || url.pathname.startsWith("/en/"))) url.pathname = url.pathname.slice(3) || "/";
  url.searchParams.delete("lang");
  location.replace(url.toString());
}
