"use client";

import * as React from "react";
import { LANG_COOKIE, isLocalizedPath, localePath, makeT, setClientLang, stripLangPrefix, type Lang, type TFn } from "./core";

export { type Lang, type TFn, LANG_NAMES, LANGS, tDeep, tl, localePath } from "./core";

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

/** href internal sesuai bahasa aktif: lp("/fitur") -> "/en/fitur" bila bahasa Inggris. */
export function useLocalePath(): (href: string) => string {
  const lang = React.useContext(LangCtx);
  return React.useCallback((href: string) => localePath(lang, href), [lang]);
}

/** Simpan pilihan bahasa (1 tahun) lalu muat ulang supaya halaman server ikut berganti. */
export function setLang(lang: Lang): void {
  try {
    document.cookie = `${LANG_COOKIE}=${lang}; path=/; max-age=31536000; samesite=lax${location.protocol === "https:" ? "; secure" : ""}`;
  } catch {
    /* cookie diblokir: tetap muat ulang */
  }
  const url = new URL(location.href);
  // Halaman publik punya URL per bahasa: pindah ke pasangannya (/fitur <-> /en/fitur) supaya URL = bahasa.
  const base = stripLangPrefix(url.pathname);
  if (lang === "id") url.pathname = base;
  else if (isLocalizedPath(base)) url.pathname = localePath("en", base);
  url.searchParams.delete("lang");
  location.replace(url.toString());
}
