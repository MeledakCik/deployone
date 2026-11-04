"use client";

import * as React from "react";
import { RefreshCw, Bot, Download, Trash2, RotateCcw, Upload, X } from "@/components/ui/icons";
import { feedbackTemplateText, packTemplateText } from "@/lib/site-engine/import-template";
import { safeSvg } from "@/lib/site-assets";
import { adminFetch, useAdminData } from "./api";
import { Badge, Btn, Card, Empty, ErrorBox, KpiCard, Loading, PageHead, fmtDateTime } from "./ui";

interface EngineStatus {
  active: { source: "admin" | "bawaan"; trainedAt: string; stats: { packs: number; feedback: number; vocab: number; prompts: number } };
  bundled: { trainedAt: string; stats: { packs: number; feedback: number; vocab: number; prompts: number } };
  feedbackCount: number;
  recent: { prompt: string; kind: string; brand: string; at: number | null }[];
  imported: { id: string; kind: string; label: string; prompts: number; items: number; replacesBundled: boolean }[];
  styles?: { id: string; label: string; desc: string; palettes: string[][]; keywords: string[]; traits?: string[]; imported: boolean; chance: number }[];
  iconPacks?: { id: string; label: string; license: string; variant?: string | null; count: number; sample: { name: string; svg: string }[] }[];
  elementPacks?: {
    id: string;
    label: string;
    license: string;
    count: number;
    families?: { id: string; label: string; iconStyles: string[]; count: number }[];
    sample: { id: string; label: string; slot: string; family?: string; vb: string; svg: string }[];
  }[];
  domains: { id: string; kind: string; label: string; prompts: number; items: number; generic: boolean; imported: boolean }[];
}

type ImportResult =
  | { imported: true; added: string[]; updated: string[]; stylesAdded?: string[]; stylesUpdated?: string[]; iconPacks?: number; elementPacks?: number; feedback: number; notes: string[]; stats: { packs: number; prompts: number } }
  | { imported: false; errors: string[]; moreErrors?: number };

function download(name: string, text: string, type = "application/json") {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

const IMPORT_MAX = 2_000_000;

/**
 * Panel "Mesin AI": status mesin AI Web Builder milik Depup, contoh dari pengguna, dan tombol latih ulang.
 * Melatih di sini menyimpan model ke KV (langsung dipakai). Untuk membuat model bawaan baru, ekspor contoh
 * lalu jalankan `npm run engine:train` di repo.
 */
export function EngineTab({ toast }: { toast: (m: string) => void }) {
  const { data, error, loading, reload } = useAdminData<EngineStatus>("/api/admin/engine");
  const [busy, setBusy] = React.useState<string | null>(null);

  const [text, setText] = React.useState("");
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<ImportResult | null>(null);
  const [dragging, setDragging] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  async function readFile(f: File | undefined) {
    if (!f) return;
    if (f.size > IMPORT_MAX) {
      toast("File terlalu besar (maks. ±2 MB). Bagi jadi beberapa file.");
      return;
    }
    setText(await f.text());
    setFileName(f.name);
    setResult(null);
  }

  async function doImport() {
    setBusy("import");
    setResult(null);
    try {
      const r = await adminFetch<ImportResult>("/api/admin/engine", { method: "POST", body: { action: "import", text } });
      setResult(r);
      if (r.imported) {
        toast("Data diimpor dan mesin sudah dilatih ulang.");
        setText("");
        setFileName(null);
        if (fileRef.current) fileRef.current.value = "";
        await reload();
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : "Impor gagal.");
    } finally {
      setBusy(null);
    }
  }

  async function removePack(id: string, kind: "pack" | "style" | "icons" | "elements" = "pack") {
    const what = kind === "style" ? "gaya" : kind === "icons" ? "paket ikon" : kind === "elements" ? "paket elemen" : "paket";
    if (!window.confirm(`Hapus ${what} impor "${id}"? Mesin akan dilatih ulang tanpanya.`)) return;
    setBusy(`rm:${id}`);
    try {
      await adminFetch("/api/admin/engine", { method: "POST", body: { action: "removePack", id, kind } });
      toast(`Paket "${id}" dihapus.`);
      await reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Gagal menghapus.");
    } finally {
      setBusy(null);
    }
  }

  async function exportPacks() {
    setBusy("exportPacks");
    try {
      const r = await adminFetch<{ json: string; count: number }>("/api/admin/engine", { method: "POST", body: { action: "exportPacks" } });
      download(`site-engine-packs-impor-${new Date().toISOString().slice(0, 10)}.json`, r.json);
      toast(`${r.count} paket diekspor.`);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Gagal.");
    } finally {
      setBusy(null);
    }
  }

  async function run(action: "train" | "reset" | "export" | "clear") {
    if (action === "clear" && !window.confirm("Hapus semua contoh dari pengguna? Model yang sudah dilatih tidak berubah.")) return;
    setBusy(action);
    try {
      const r = await adminFetch<{ jsonl?: string; count?: number; stats?: { feedback: number } }>("/api/admin/engine", { method: "POST", body: { action } });
      if (action === "export") {
        download(`site-engine-feedback-${new Date().toISOString().slice(0, 10)}.jsonl`, r.jsonl ?? "", "application/x-ndjson");
        toast(`${r.count ?? 0} contoh diekspor.`);
      } else if (action === "train") toast(`Mesin dilatih ulang dengan ${r.stats?.feedback ?? 0} contoh pengguna.`);
      else if (action === "reset") toast("Kembali memakai model bawaan.");
      else toast("Contoh pengguna dihapus.");
      await reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Gagal.");
    } finally {
      setBusy(null);
    }
  }

  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (!data) return null;

  return (
    <div className="space-y-5">
      <PageHead
        title="Mesin AI"
        desc="AI Web Builder memakai mesin Depup sendiri, tanpa layanan AI luar. Mesin belajar dari paket domain bawaan dan dari website yang pengguna izinkan sebagai contoh."
        right={
          <Btn onClick={reload} busy={loading}>
            <RefreshCw size={13} /> Muat ulang
          </Btn>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Model aktif" value={data.active.source === "admin" ? "Dilatih admin" : "Bawaan"} sub={`Dilatih ${fmtDateTime(data.active.trainedAt)}`} icon={Bot} />
        <KpiCard label="Contoh pengguna" value={data.feedbackCount} sub={`${data.active.stats.feedback} sudah dipakai model aktif`} />
        <KpiCard label="Kosakata" value={data.active.stats.vocab} sub={`${data.active.stats.packs} domain · ${data.active.stats.prompts} contoh deskripsi`} />
      </div>

      <Card title="Impor data latihan">
        <div className="space-y-4 px-6 py-5 text-[14px] leading-relaxed">
          <p className="text-text-muted">
            Unggah atau tempel <b>paket domain</b> (.json, satu jenis usaha per objek) atau <b>contoh pengguna</b> (.jsonl, satu baris
            per contoh). Isinya diperiksa dulu; kalau ada yang salah, tidak ada yang disimpan dan kesalahannya ditampilkan. Kalau lolos,
            mesin langsung dilatih ulang.
          </p>
          <div className="flex flex-wrap gap-2">
            <Btn onClick={() => download("contoh-paket-domain.json", packTemplateText())}>
              <Download size={13} /> Contoh paket (.json)
            </Btn>
            <Btn onClick={() => download("contoh-contoh-pengguna.jsonl", feedbackTemplateText(), "application/x-ndjson")}>
              <Download size={13} /> Contoh pengguna (.jsonl)
            </Btn>
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              void readFile(e.dataTransfer.files?.[0]);
            }}
            className={`space-y-2 rounded-[18px] p-3 ${dragging ? "bg-tone-lilac" : "bg-[var(--chip-bg)]"}`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileRef}
                id="engine-import-file"
                type="file"
                accept=".json,.jsonl,.ndjson,application/json,application/x-ndjson,text/plain"
                className="sr-only"
                onChange={(e) => void readFile(e.target.files?.[0])}
              />
              <Btn onClick={() => fileRef.current?.click()}>
                <Upload size={13} /> Pilih file
              </Btn>
              <span className="text-[13px] text-text-muted">{fileName ? `${fileName} · ${Math.round(text.length / 1000)} KB` : "atau seret file ke sini, atau tempel isinya di bawah"}</span>
              {text && (
                <Btn
                  aria-label="Kosongkan"
                  onClick={() => {
                    setText("");
                    setFileName(null);
                    setResult(null);
                    if (fileRef.current) fileRef.current.value = "";
                  }}
                >
                  <X size={13} />
                </Btn>
              )}
            </div>
            <textarea
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setFileName(null);
                setResult(null);
              }}
              rows={8}
              spellCheck={false}
              aria-label="Isi JSON atau JSONL untuk diimpor"
              placeholder={'[ { "id": "umkm-es-teh", "kind": "umkm", "label": "...", "prompts": [...], ... } ]\natau\n{"prompt": "...", "content": {...}}'}
              className="input-solid w-full resize-y px-4 py-2.5 font-mono text-[12px] leading-relaxed"
            />
          </div>

          <Btn variant="primary" busy={busy === "import"} disabled={!text.trim() || text.length > IMPORT_MAX} onClick={doImport}>
            <Upload size={13} /> Impor & latih
          </Btn>

          {result && !result.imported && (
            <div role="alert" className="rounded-[16px] bg-tone-pink px-4 py-3 text-[13px] text-bad-fg">
              <p className="font-semibold">Belum diimpor. Perbaiki dulu:</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5">
                {result.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
              {!!result.moreErrors && <p className="mt-1">…dan {result.moreErrors} kesalahan lain.</p>}
            </div>
          )}
          {result && result.imported && (
            <div role="status" className="rounded-[16px] bg-tone-mint px-4 py-3 text-[13px] text-ok-fg">
              <p className="font-semibold">
                Berhasil. {result.added.length > 0 && `${result.added.length} paket baru. `}
                {result.updated.length > 0 && `${result.updated.length} paket diperbarui. `}
                {!!result.stylesAdded?.length && `${result.stylesAdded.length} gaya visual baru. `}
                {!!result.iconPacks && `${result.iconPacks} paket ikon. `}
                {!!result.elementPacks && `${result.elementPacks} paket elemen. `}
                {!!result.stylesUpdated?.length && `${result.stylesUpdated.length} gaya visual diperbarui. `}
                {result.feedback > 0 && `${result.feedback} contoh ditambahkan. `}
                Mesin sekarang mengenal {result.stats.packs} domain.
              </p>
              {result.notes.length > 0 && (
                <ul className="mt-1 list-disc space-y-0.5 pl-5">
                  {result.notes.map((n, i) => (
                    <li key={i}>{n}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </Card>

      {!!data.iconPacks?.length && (
        <Card
          title="Paket ikon"
          action={
            <Badge tone="neutral">
              {data.iconPacks.filter((p) => !p.variant).reduce((n, p) => n + p.count, 0)} ikon
              {data.iconPacks.some((p) => p.variant) ? ` · ${data.iconPacks.filter((p) => p.variant).reduce((n, p) => n + p.count, 0)} varian` : ""}
            </Badge>
          }
        >
          <ul className="divide-y divide-[var(--surface-line)]">
            {data.iconPacks.map((p) => (
              <li key={p.id} className="space-y-3 px-6 py-4 text-[14px]">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {p.label}
                      {p.variant ? (
                        <span className="ml-2 align-middle">
                          <Badge tone="neutral">varian {p.variant}</Badge>
                        </span>
                      ) : null}
                    </p>
                    <p className="text-[13px] text-text-muted">
                      <code>{p.id}</code> · {p.count} {p.variant ? "gambar" : "ikon"}
                      {p.license ? ` · ${p.license}` : ""}
                    </p>
                  </div>
                  <Btn variant="danger" aria-label={`Hapus paket ikon ${p.label}`} busy={busy === `rm:${p.id}`} onClick={() => removePack(p.id, "icons")}>
                    <Trash2 size={13} />
                  </Btn>
                </div>
                <ul className="grid grid-cols-[repeat(auto-fill,minmax(64px,1fr))] gap-2" aria-label={`Contoh ikon ${p.label}`}>
                  {p.sample.map((ic) => (
                    <li key={ic.name} className="flex flex-col items-center gap-1 rounded-[12px] bg-[var(--chip-bg)] px-1 py-2 text-center" title={ic.name}>
                      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden dangerouslySetInnerHTML={{ __html: safeSvg(ic.svg, 4000) }} />
                      <span className="w-full truncate text-[10.5px] text-text-muted">{ic.name}</span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
          <p className="px-6 pb-5 text-[13px] text-text-muted">
            Mesin mempelajari kata kunci tiap ikon. Produk, layanan, atau usaha yang namanya memuat kata itu otomatis memakai ikon tersebut. Paket varian berisi gambar
            pengganti untuk satu gaya ikon (mis. piksel); website bergaya itu memakainya bila ada.
          </p>
        </Card>
      )}

      {!!data.elementPacks?.length && (
        <Card title="Paket elemen" action={<Badge tone="neutral">{data.elementPacks.reduce((n, p) => n + p.count, 0)} elemen</Badge>}>
          <ul className="divide-y divide-[var(--surface-line)]">
            {data.elementPacks.map((p) => (
              <li key={p.id} className="space-y-3 px-6 py-4 text-[14px]">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">{p.label}</p>
                    <p className="text-[13px] text-text-muted">
                      <code>{p.id}</code> · {p.count} elemen{p.license ? ` · ${p.license}` : ""}
                    </p>
                  </div>
                  <Btn variant="danger" aria-label={`Hapus paket elemen ${p.label}`} busy={busy === `rm:${p.id}`} onClick={() => removePack(p.id, "elements")}>
                    <Trash2 size={13} />
                  </Btn>
                </div>
                {(p.families?.length ? p.families : [{ id: p.id, label: p.label, iconStyles: [], count: p.count }]).map((fam) => {
                  const els = p.sample.filter((el) => (el.family ?? p.id) === fam.id);
                  if (!els.length) return null;
                  return (
                    <div key={fam.id} className="space-y-2">
                      <p className="text-[13px] text-text-muted">
                        <b className="font-semibold text-text">{fam.label}</b> · {fam.count} elemen
                        {fam.iconStyles.length ? ` · ikon serasi: ${fam.iconStyles.join(", ")}` : ""}
                      </p>
                      <ul className="grid grid-cols-[repeat(auto-fill,minmax(112px,1fr))] gap-2" aria-label={`Contoh elemen ${fam.label}`}>
                        {els.map((el) => (
                          <li key={el.id} className="flex flex-col gap-1.5 rounded-[12px] bg-[var(--chip-bg)] p-2" title={el.id}>
                            <span className="grid h-16 place-items-center overflow-hidden text-text [--a:#7c5cff] [--a2:#c6f432] [--ink:currentColor] [--bg:var(--chip-bg)] [--fg:currentColor] [--on:#fff] [--s1:#a78bfa] [--s2:#c6f432] [--s3:#ff8a3d] [--s4:#5ce1e6] [--s5:#ff6fb5]">
                              <svg viewBox={el.vb} className="max-h-16 w-full" aria-hidden dangerouslySetInnerHTML={{ __html: safeSvg(el.svg, 12000) }} />
                            </span>
                            <span className="truncate text-[11.5px] font-medium">{el.label}</span>
                            <span className="text-[10.5px] text-text-muted">{el.slot}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </li>
            ))}
          </ul>
          <p className="px-6 pb-5 text-[13px] text-text-muted">
            Slot: <b>corner</b> = hiasan sudut bagian atas, <b>art</b> = gambar utama, <b>badge</b> = stiker kecil, <b>divider</b> = pita pembatas di bawah bagian atas,{" "}
            <b>pattern</b> = motif latar blok ajakan. Satu website memakai satu keluarga elemen saja, dipilih dari gaya, template, jenis usaha, domain, atau kata di
            deskripsi (mis. &ldquo;batik&rdquo;, &ldquo;memphis&rdquo;, &ldquo;8-bit&rdquo;).
          </p>
        </Card>
      )}

      {!!data.styles?.length && (
        <Card title="Gaya visual" action={<Badge tone="neutral">{data.styles.length}</Badge>}>
          <ul className="divide-y divide-[var(--surface-line)]">
            {data.styles.map((st) => (
              <li key={st.id} className="flex items-center justify-between gap-3 px-6 py-3 text-[14px]">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-medium">
                    {st.label} {st.imported && <Badge tone="violet">impor</Badge>}
                    <span className="inline-flex gap-1" aria-hidden>
                      {st.palettes.slice(0, 6).map((p, i) => (
                        <span key={i} className="inline-flex overflow-hidden rounded-[6px] ring-1 ring-[var(--surface-line)]">
                          {p.map((c, j) => (
                            <span key={j} className="h-4 w-3" style={{ background: c }} />
                          ))}
                        </span>
                      ))}
                    </span>
                  </p>
                  <p className="text-[13px] text-text-muted">
                    <code>{st.id}</code> · dipicu: {st.keywords.map((k) => `“${k}”`).join(", ")}
                    {!!st.traits?.length && ` · pembeda: ${st.traits.map((k) => `“${k}”`).join(", ")}`}
                    {st.chance > 0 && ` · otomatis ${Math.round(st.chance * 100)}% untuk usaha yang cocok`}
                  </p>
                </div>
                {st.imported && (
                  <Btn variant="danger" aria-label={`Hapus gaya ${st.label}`} busy={busy === `rm:${st.id}`} onClick={() => removePack(st.id, "style")}>
                    <Trash2 size={13} />
                  </Btn>
                )}
              </li>
            ))}
          </ul>
          <p className="px-6 pb-5 text-[13px] text-text-muted">
            Gaya dipakai bila deskripsi pengguna memuat kata pemicunya, atau secara acak untuk jenis usaha yang cocok. Pengguna tetap bisa melepasnya
            lewat perintah “hapus gaya” atau memilih Template lain.
          </p>
        </Card>
      )}

      {data.imported.length > 0 && (
        <Card
          title="Paket hasil impor"
          action={
            <Btn busy={busy === "exportPacks"} onClick={exportPacks}>
              <Download size={13} /> Ekspor (.json)
            </Btn>
          }
        >
          <ul className="divide-y divide-[var(--surface-line)]">
            {data.imported.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 px-6 py-3 text-[14px]">
                <div className="min-w-0">
                  <p className="font-medium">
                    {p.label} {p.replacesBundled && <Badge tone="warn">ganti bawaan</Badge>}
                  </p>
                  <p className="text-[13px] text-text-muted">
                    <code>{p.id}</code> · {p.kind} · {p.prompts} contoh deskripsi · {p.items} item
                  </p>
                </div>
                <Btn variant="danger" aria-label={`Hapus paket ${p.label}`} busy={busy === `rm:${p.id}`} onClick={() => removePack(p.id)}>
                  <Trash2 size={13} />
                </Btn>
              </li>
            ))}
          </ul>
          <p className="px-6 pb-5 text-[13px] text-text-muted">
            Paket impor tersimpan di database. Agar jadi bawaan permanen, ekspor lalu taruh di <code>data/site-engine/packs/</code> dan
            jalankan <code>npm run engine:train</code>.
          </p>
        </Card>
      )}

      <Card title="Latih mesin">
        <div className="space-y-3 px-6 py-5 text-[14px] leading-relaxed">
          <p className="text-text-muted">
            Latih ulang menggabungkan paket bawaan, paket impor, dan contoh pengguna: deskripsinya menambah data klasifikasi, isinya memperkaya
            bank kalimat, produk, dan fitur. Model baru langsung dipakai semua pengguna.
          </p>
          <div className="flex flex-wrap gap-2">
            <Btn variant="primary" busy={busy === "train"} onClick={() => run("train")}>
              <Bot size={13} /> Latih ulang sekarang
            </Btn>
            <Btn busy={busy === "export"} onClick={() => run("export")} disabled={!data.feedbackCount}>
              <Download size={13} /> Ekspor contoh (.jsonl)
            </Btn>
            {data.active.source === "admin" && (
              <Btn busy={busy === "reset"} onClick={() => run("reset")}>
                <RotateCcw size={13} /> Pakai model bawaan
              </Btn>
            )}
            <Btn variant="danger" busy={busy === "clear"} onClick={() => run("clear")} disabled={!data.feedbackCount}>
              <Trash2 size={13} /> Hapus contoh
            </Btn>
          </div>
          <p className="text-[13px] text-text-muted">
            “Pakai model bawaan” mengabaikan paket impor dan contoh pengguna sampai kamu melatih ulang lagi.
          </p>
        </div>
      </Card>

      <Card title="Contoh terbaru dari pengguna" action={<Badge tone="neutral">{data.feedbackCount}</Badge>}>
        {data.recent.length === 0 ? (
          <Empty title="Belum ada contoh">Contoh masuk saat pengguna menerbitkan website dan mencentang izin “bantu latih mesin”.</Empty>
        ) : (
          <ul className="divide-y divide-[var(--surface-line)]">
            {data.recent.map((r, i) => (
              <li key={i} className="px-6 py-3 text-[14px]">
                <p className="font-medium">{r.brand}</p>
                <p className="text-[13px] text-text-muted">
                  {r.kind} · {r.at ? fmtDateTime(r.at) : "-"} · “{r.prompt.slice(0, 140)}”
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Domain yang dikenali">
        <ul className="grid gap-x-6 gap-y-2 px-6 py-5 text-[14px] sm:grid-cols-2">
          {data.domains.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-3">
              <span>
                {d.label} {d.generic && <Badge tone="neutral">umum</Badge>} {d.imported && <Badge tone="violet">impor</Badge>}
              </span>
              <span className="text-[13px] text-text-muted tabular-nums">
                {d.kind} · {d.prompts} contoh · {d.items} item
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
