import "./dict/all";
import { cookies, headers } from "next/headers";
import { LANG_COOKIE, LANG_HEADER, isLang, makeT, type Lang, type TFn } from "./core";

/** Bahasa request ini (komponen server): header dari middleware, lalu cookie, lalu Indonesia. */
export function getLang(): Lang {
  const h = headers().get(LANG_HEADER);
  if (isLang(h)) return h;
  const c = cookies().get(LANG_COOKIE)?.value;
  return isLang(c) ? c : "id";
}

export function getT(): TFn {
  return makeT(getLang());
}
