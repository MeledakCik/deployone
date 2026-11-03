/**
 * Pasangan konversi yang didukung mesin Depup: dari → daftar tujuan. Id mengikuti lib/convert/languages.ts.
 * File terpisah (tanpa dependensi) supaya bisa dipakai di browser untuk menyaring pilihan tujuan.
 */
export const SUPPORTED: Record<string, string[]> = {
  json: ["yaml", "toml", "xml"],
  yaml: ["json", "toml", "xml"],
  toml: ["json", "yaml", "xml"],
  xml: ["json", "yaml", "toml"],
  ts: ["js"],
  tsx: ["jsx", "js", "html"],
  jsx: ["tsx", "js", "html"],
  js: ["ts"],
  scss: ["css"],
  css: ["scss"],
  md: ["html"],
  html: ["md", "jsx", "tsx"],
};

export function canConvert(from: string, to: string): boolean {
  return !!SUPPORTED[from]?.includes(to);
}
