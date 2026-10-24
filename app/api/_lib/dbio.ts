/** dbio.ts — util CSV & literal SQL untuk Import/Export. */
import type { Cell } from "./turso";

export function csvEscape(v: Cell): string {
  if (v === null) return "";
  const s = typeof v === "object" ? v.blob : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function sqlLiteral(v: Cell): string {
  if (v === null) return "NULL";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "NULL";
  if (typeof v === "object") return `X'${Buffer.from(v.blob, "base64").toString("hex")}'`;
  return `'${v.replace(/'/g, "''")}'`;
}

/** Parser CSV RFC-4180 sederhana (kutip ganda, newline di dalam sel, CRLF). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQ = false;
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQ) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else inQ = false;
      } else cell += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(cell);
      cell = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
    } else cell += c;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    if (row.length > 1 || row[0] !== "") rows.push(row);
  }
  return rows;
}

/** Ubah header CSV jadi nama kolom SQL yang valid & unik. */
export function normalizeHeaders(raw: string[]): string[] {
  const seen = new Set<string>();
  return raw.map((h, i) => {
    let n = h.trim().replace(/[^A-Za-z0-9_]/g, "_").slice(0, 60);
    if (!n) n = `kolom_${i + 1}`;
    if (!/^[A-Za-z_]/.test(n)) n = `c_${n}`;
    let u = n;
    let k = 2;
    while (seen.has(u.toLowerCase())) u = `${n}_${k++}`;
    seen.add(u.toLowerCase());
    return u;
  });
}
