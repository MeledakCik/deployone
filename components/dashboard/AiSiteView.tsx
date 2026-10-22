"use client";

import * as React from "react";
import {
  Sparkles, KeyRound, ExternalLink, Copy, Trash2, CircleAlert, Check, RefreshCw, Download, FileCode2,
  FileJson, Package, Monitor, Smartphone, Store, Pencil, ImagePlus, ImageIcon, X, Plus, Palette,
} from "lucide-react";
import { PageHead, Card, Btn, Badge, Loading, Empty } from "@/components/ui/primitives";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { ViewFade } from "@/components/ui/ViewFade";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/confirm";
import { cn } from "@/lib/utils";
import { fetchSites, publishSite, type SiteConfig } from "@/lib/site-upload";
import {
  TEMPLATES,
  HERO_LAYOUTS,
  FEAT_LAYOUTS,
  KIND_LABEL,
  KIND_OPTIONS,
  MAX_PALETTE,
  defaultPalette,
  hasShop,
  renderSite,
  type SiteContent,
  type SiteImages,
  type SiteKind,
  type TemplateId,
  type HeroLayout,
  type FeatLayout,
  type RenderOpts,
} from "@/lib/ai-site-templates";
import { downloadZip, downloadHtml, downloadJson, copyHtml } from "@/lib/ai-site-export";
import {
  fileToDataUrl,
  dataUrlBytes,
  totalImageBytes,
  formatBytes,
  IMAGE_ACCEPT,
  IMAGE_BUDGET_BYTES,
  type ImageSlot,
} from "@/lib/ai-site-images";

/** Gaya bersama halaman ini: label kecil di atas kolom isian, sama seperti form dashboard lain. */
const labelCls = "mb-1.5 block text-[12px] font-medium text-text-muted";
const checkCls = "mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[var(--accent)]";

interface KeyStatus {
  hasKey: boolean;
  masked: string | null;
  freePerDay: number;
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
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

function ttlLabel(h: number): string {
  return h < 24 ? `${h} jam` : `${h / 24} hari`;
}

const EXAMPLES: { label: string; text: string }[] = [
  { label: "Warung bakso", text: "Warung bakso Pak Slamet di Banjar, buka 10–21. Menu: bakso urat 15rb, bakso telur 18rb, mie ayam 14rb, es teler 12rb, es jeruk 5rb. Pesan via WhatsApp 081234567890." },
  { label: "Toko kue", text: "Toko kue Rumah Manis di Bandung: brownies, bolu pandan, donat kentang, kue kering lebaran. Terima pesanan ulang tahun, WA 081298765432." },
  { label: "Jasa desain", text: "Jasa desain logo dan branding untuk UMKM, proses cepat 3 hari, revisi unlimited, kontak hello@studiokita.id." },
  { label: "Portofolio", text: "Portofolio mahasiswa Teknik Informatika yang bisa web development dan UI design, kontak via email." },
  { label: "Event kampus", text: "Festival musik kampus Soundwave 2026, 14 Desember di Lapangan Utama, tiket early bird dan 8 penampil." },
  { label: "Blog artikel", text: "Blog Catatan Kopi Nusantara: panduan seduh V60, profil petani kopi Gayo, dan ulasan grinder untuk pemula. Terbit tiap Senin, kontak halo@kopinusantara.id." },
];

/** Pasangan warna siap pakai: [utama, kedua]. */
const PALETTE_PRESETS: [string, string][] = [
  ["#7b50ff", "#c6f432"],
  ["#0ea5e9", "#f97316"],
  ["#16a34a", "#facc15"],
  ["#e11d48", "#fdba74"],
  ["#0f172a", "#38bdf8"],
];

const COLOR_ROLES: { name: string; hint: string }[] = [
  { name: "Warna utama", hint: "Tombol, tautan, dan blok sorot" },
  { name: "Warna kedua", hint: "Latar ikon dan cahaya hero" },
];

const isHex = (v: string): boolean => /^#[0-9a-fA-F]{6}$/.test(v);

/** Hapus gambar milik produk/artikel yang sudah tidak ada di isi terbaru (logo & gambar utama tetap). */
function pruneImages(images: SiteImages, c: SiteContent): SiteImages {
  const ok = new Set<string>(["logo", "hero"]);
  c.items.forEach((i) => ok.add(`item:${i.id}`));
  (c.articles ?? []).forEach((a) => ok.add(`article:${a.id}`));
  const out: SiteImages = {};
  for (const k of Object.keys(images)) if (ok.has(k)) out[k] = images[k];
  return out;
}

/* ---------- potongan UI kecil ---------- */

function Field({ label, htmlFor, children, hint }: { label: string; htmlFor?: string; children: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <label htmlFor={htmlFor} className={labelCls}>{label}</label>
      {children}
      {hint && <p className="mt-1.5 text-[11.5px] leading-snug text-text-muted">{hint}</p>}
    </div>
  );
}

function HexInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [draft, setDraft] = React.useState(value);
  React.useEffect(() => setDraft(value), [value]);
  return (
    <input
      value={draft.toUpperCase()}
      maxLength={7}
      spellCheck={false}
      aria-label="Kode warna hex"
      onChange={(e) => {
        const v = e.target.value.trim();
        const withHash = v.startsWith("#") ? v : `#${v}`;
        setDraft(withHash);
        if (isHex(withHash)) onChange(withHash.toLowerCase());
      }}
      onBlur={() => setDraft(value)}
      className="input-solid mono h-11 w-[104px] shrink-0 px-3 text-[12.5px]"
    />
  );
}

function PaletteEditor({
  colors, custom, onChange, onReset,
}: {
  colors: string[];
  custom: boolean;
  onChange: (next: string[]) => void;
  onReset: () => void;
}) {
  const setAt = (i: number, v: string) => onChange(colors.map((c, k) => (k === i ? v : c)));
  const addColor = () => {
    if (colors.length >= MAX_PALETTE) return;
    // Warna baru: geser hue dari warna utama supaya langsung terlihat beda.
    const hues = ["#f43f5e", "#22c55e", "#f59e0b", "#06b6d4", "#a855f7", "#64748b"];
    const next = hues.find((h) => !colors.includes(h)) ?? "#64748b";
    onChange([...colors, next]);
  };
  return (
    <div className="space-y-3">
      <div className="flex h-2.5 overflow-hidden rounded-full" aria-hidden>
        {colors.map((c, i) => (
          <span key={i} className="h-full flex-1" style={{ background: c }} />
        ))}
      </div>
      <ul className="space-y-2.5">
        {colors.map((c, i) => {
          const role = COLOR_ROLES[i] ?? { name: `Warna tambahan ${i + 1}`, hint: "Variasi ikon dan cahaya hero" };
          return (
            <li key={i} className="flex items-center gap-2.5">
              <label
                className="relative h-11 w-11 shrink-0 cursor-pointer overflow-hidden rounded-[14px] ring-1 ring-[var(--line-strong)]"
                style={{ background: c }}
              >
                <span className="sr-only">{role.name}</span>
                <input
                  type="color"
                  value={c}
                  onChange={(e) => setAt(i, e.target.value.toLowerCase())}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                />
              </label>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium">{role.name}</p>
                <p className="truncate text-[11.5px] text-text-muted">{role.hint}</p>
              </div>
              <HexInput value={c} onChange={(v) => setAt(i, v)} />
              {i >= 2 ? (
                <button
                  type="button"
                  onClick={() => onChange(colors.filter((_, k) => k !== i))}
                  aria-label={`Hapus ${role.name}`}
                  className="pill grid h-9 w-9 shrink-0 place-items-center hover:!bg-bad-bg hover:text-bad-fg"
                >
                  <X size={14} />
                </button>
              ) : (
                <span className="h-9 w-9 shrink-0" aria-hidden />
              )}
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap items-center gap-2">
        <Btn onClick={addColor} disabled={colors.length >= MAX_PALETTE}>
          <Plus size={13} /> Tambah warna
        </Btn>
        {custom && <Btn onClick={onReset}><RefreshCw size={13} /> Bawaan template</Btn>}
        <span className="ml-auto text-[11.5px] text-text-muted">{colors.length}/{MAX_PALETTE} warna</span>
      </div>
      <div>
        <p className={labelCls}>Pasangan siap pakai</p>
        <div className="flex flex-wrap gap-2">
          {PALETTE_PRESETS.map((p) => (
            <button
              key={p.join("")}
              type="button"
              aria-label={`Pakai pasangan ${p[0]} dan ${p[1]}`}
              onClick={() => onChange([...p, ...colors.slice(2)])}
              className="pill inline-flex items-center gap-1 px-2.5 py-2"
            >
              <span className="h-4 w-4 rounded-full ring-1 ring-[var(--line-strong)]" style={{ background: p[0] }} />
              <span className="h-4 w-4 rounded-full ring-1 ring-[var(--line-strong)]" style={{ background: p[1] }} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

interface ImageSlotDef {
  key: string;
  slot: ImageSlot;
  label: string;
  hint: string;
}

function ImageRow({
  def, src, busy, onPick, onRemove,
}: {
  def: ImageSlotDef;
  src: string | undefined;
  busy: boolean;
  onPick: () => void;
  onRemove: () => void;
}) {
  return (
    <li className="flex items-center gap-3">
      <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-[14px] bg-[var(--pill-bg)] text-text-faint">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" className="h-full w-full object-cover" />
        ) : (
          <ImageIcon size={18} />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium">{def.label}</p>
        <p className="truncate text-[11.5px] text-text-muted">{src ? formatBytes(dataUrlBytes(src)) : def.hint}</p>
      </div>
      <Btn busy={busy} onClick={onPick} aria-label={`${src ? "Ganti" : "Unggah"} gambar ${def.label}`}>
        <ImagePlus size={13} /> {src ? "Ganti" : "Unggah"}
      </Btn>
      {src && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Hapus gambar ${def.label}`}
          className="pill grid h-9 w-9 shrink-0 place-items-center hover:!bg-bad-bg hover:text-bad-fg"
        >
          <X size={14} />
        </button>
      )}
    </li>
  );
}

export function AiSiteView() {
  const { showToast } = useToast();
  const confirm = useConfirm();

  const [keyStatus, setKeyStatus] = React.useState<KeyStatus | null>(null);
  const [cfg, setCfg] = React.useState<SiteConfig | null>(null);
  const [loadErr, setLoadErr] = React.useState<string | null>(null);

  const [keyDraft, setKeyDraft] = React.useState("");
  const [savingKey, setSavingKey] = React.useState(false);
  const [editingKey, setEditingKey] = React.useState(false);

  const [prompt, setPrompt] = React.useState("");
  const [kindPick, setKindPick] = React.useState<SiteKind | "auto">("auto");
  // null = ikuti saran AI; nilai terisi = pilihan manual pengguna
  const [template, setTemplate] = React.useState<TemplateId | null>(null);
  // null = dua warna bawaan template; array = palet buatan pengguna (2 sampai MAX_PALETTE warna)
  const [palette, setPalette] = React.useState<string[] | null>(null);
  const [heroOpt, setHeroOpt] = React.useState<HeroLayout | null>(null);
  const [featOpt, setFeatOpt] = React.useState<FeatLayout | null>(null);
  const [shopOn, setShopOn] = React.useState(true);
  const [device, setDevice] = React.useState<"desktop" | "mobile">("desktop");
  const [variant, setVariant] = React.useState(0);
  const [ttlHours, setTtlHours] = React.useState(24);
  const [autoPublish, setAutoPublish] = React.useState(true);

  const [images, setImages] = React.useState<SiteImages>({});
  const [imgBusy, setImgBusy] = React.useState<string | null>(null);
  const [showAllImgs, setShowAllImgs] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const pendingRef = React.useRef<ImageSlotDef | null>(null);

  const [content, setContent] = React.useState<SiteContent | null>(null);
  const [busy, setBusy] = React.useState<null | "ai" | "publish">(null);
  const [progress, setProgress] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [exporting, setExporting] = React.useState<null | "zip" | "html" | "json">(null);
  const [published, setPublished] = React.useState<{ url: string; expiresAt: number } | null>(null);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [k, c] = await Promise.all([api<KeyStatus>("/api/ai/key"), fetchSites()]);
        if (!alive) return;
        setKeyStatus(k);
        setCfg(c);
        setTtlHours(c.defaultTtlHours);
      } catch (e) {
        if (alive) setLoadErr((e as Error).message);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const tplId: TemplateId = template ?? content?.template ?? "bersih";
  const tpl = TEMPLATES.find((t) => t.id === tplId)!;
  const baseColors = React.useMemo<string[]>(() => {
    const d = defaultPalette(tplId);
    return [(!template && content?.accent) || d[0], d[1]];
  }, [tplId, template, content?.accent]);
  const colors = palette ?? baseColors;
  const accentEff = colors[0];
  const heroEff = heroOpt ?? content?.hero ?? "center";
  const featEff = featOpt ?? content?.feat ?? "grid";
  const renderOpts = React.useMemo<RenderOpts>(
    () => ({ hero: heroEff, feat: featEff, shop: shopOn, palette: palette ?? undefined, images }),
    [heroEff, featEff, shopOn, palette, images],
  );
  const html = React.useMemo(
    () => (content ? renderSite(content, tplId, accentEff, renderOpts) : null),
    [content, tplId, accentEff, renderOpts],
  );
  const shopActive = !!content && hasShop(content) && shopOn;
  const imgBytes = totalImageBytes(images);

  const canUseAi = !!keyStatus && (keyStatus.hasKey || keyStatus.freePerDay > 0);

  const imageSlots = React.useMemo<ImageSlotDef[]>(() => {
    const out: ImageSlotDef[] = [
      { key: "logo", slot: "logo", label: "Logo", hint: "Pojok kiri atas. PNG transparan paling rapi" },
      { key: "hero", slot: "hero", label: "Gambar utama", hint: "Tampil di bagian atas halaman" },
    ];
    if (content) {
      content.items.forEach((i) => out.push({ key: `item:${i.id}`, slot: "item", label: i.name, hint: "Foto produk" }));
      (content.articles ?? []).forEach((a) => out.push({ key: `article:${a.id}`, slot: "article", label: a.title, hint: "Sampul artikel" }));
    }
    return out;
  }, [content]);
  const visibleSlots = showAllImgs ? imageSlots : imageSlots.slice(0, 6);

  function pickImage(def: ImageSlotDef) {
    pendingRef.current = def;
    fileRef.current?.click();
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    const def = pendingRef.current;
    pendingRef.current = null;
    if (!file || !def) return;
    setImgBusy(def.key);
    try {
      const url = await fileToDataUrl(file, def.slot);
      const others = totalImageBytes(images) - (images[def.key] ? dataUrlBytes(images[def.key]) : 0);
      if (others + dataUrlBytes(url) > IMAGE_BUDGET_BYTES) {
        showToast(`Total gambar melebihi ${formatBytes(IMAGE_BUDGET_BYTES)}. Hapus gambar lain dulu.`);
        return;
      }
      setImages((m) => ({ ...m, [def.key]: url }));
      setPublished(null);
    } catch (err) {
      showToast((err as Error).message);
    } finally {
      setImgBusy(null);
    }
  }

  function removeImage(key: string) {
    setImages((m) => {
      const n = { ...m };
      delete n[key];
      return n;
    });
  }

  async function saveKey() {
    setSavingKey(true);
    try {
      const r = await api<{ hasKey: boolean; masked: string }>("/api/ai/key", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ key: keyDraft.trim() }),
      });
      setKeyStatus((s) => ({ hasKey: r.hasKey, masked: r.masked, freePerDay: s?.freePerDay ?? 0 }));
      setKeyDraft("");
      setEditingKey(false);
      showToast("Token Groq tersimpan dan terverifikasi.");
    } catch (e) {
      showToast((e as Error).message);
    } finally {
      setSavingKey(false);
    }
  }

  async function removeKey() {
    const { ok } = await confirm({
      title: "Hapus token Groq?",
      description: "Token dihapus dari akunmu. Kamu bisa memasangnya lagi kapan saja.",
      confirmLabel: "Ya, hapus",
    });
    if (!ok) return;
    try {
      const r = await api<{ hasKey: boolean; masked: null }>("/api/ai/key", { method: "DELETE" });
      setKeyStatus((s) => ({ hasKey: r.hasKey, masked: null, freePerDay: s?.freePerDay ?? 0 }));
      showToast("Token Groq dihapus.");
    } catch (e) {
      showToast((e as Error).message);
    }
  }

  async function publish(c: SiteContent, h: string) {
    if (cfg && new TextEncoder().encode(h).length > cfg.maxBytes) {
      setError(`Halaman terlalu besar (${formatBytes(new TextEncoder().encode(h).length)}, batas ${formatBytes(cfg.maxBytes)}). Hapus atau ganti beberapa gambar dengan yang lebih kecil.`);
      return;
    }
    setError(null);
    setBusy("publish");
    setProgress("Menyiapkan link…");
    try {
      const data = new TextEncoder().encode(h);
      const r = await publishSite([{ path: "index.html", data, executable: false }], {
        name: c.brand,
        ttlHours,
        spa: false,
        onProgress: (_d, _t, label) => setProgress(label),
      });
      setPublished({ url: r.url, expiresAt: r.expiresAt });
      showToast("Website sudah online!");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
      setProgress("");
    }
  }

  async function generate(again = false) {
    setError(null);
    setPublished(null);
    setBusy("ai");
    const v = again ? variant + 1 : 0;
    try {
      const r = await api<{ content: SiteContent; source: "own" | "free" }>("/api/ai/site", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt, variant: v, kind: kindPick === "auto" ? undefined : kindPick }),
      });
      const nextImages = pruneImages(images, r.content);
      setVariant(v);
      setContent(r.content);
      setImages(nextImages);
      if (again) {
        setTemplate(null);
        setPalette(null);
        setHeroOpt(null);
        setFeatOpt(null);
      }
      if (autoPublish && cfg?.enabled) {
        const t0: TemplateId = (again ? null : template) ?? r.content.template;
        const pal = again ? null : palette;
        const dflt = defaultPalette(t0);
        const acc = pal?.[0] ?? (!again && template ? dflt[0] : r.content.accent || dflt[0]);
        await publish(
          r.content,
          renderSite(r.content, t0, acc, {
            hero: (again ? null : heroOpt) ?? r.content.hero,
            feat: (again ? null : featOpt) ?? r.content.feat,
            shop: shopOn,
            palette: pal ?? undefined,
            images: nextImages,
          }),
        );
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy((b) => (b === "ai" ? null : b));
    }
  }

  async function runExport(kind: "zip" | "html" | "json", fn: () => void | Promise<void>, okMsg: string) {
    setExporting(kind);
    try {
      await fn();
      showToast(okMsg);
    } catch {
      showToast("Gagal membuat file. Coba lagi.");
    } finally {
      setExporting(null);
    }
  }

  async function copyLink() {
    if (!published) return;
    try {
      await navigator.clipboard.writeText(published.url);
      showToast("Link disalin.");
    } catch {
      showToast("Tidak bisa menyalin otomatis. Salin manual dari kotak link.");
    }
  }

  if (loadErr) {
    return (
      <ViewFade>
        <PageHead title="AI Web Builder" />
        <div className="notice notice-bad mt-6" role="alert">
          <CircleAlert size={16} className="mt-0.5 shrink-0" /> <span className="min-w-0">{loadErr}</span>
        </div>
      </ViewFade>
    );
  }
  if (!keyStatus || !cfg) {
    return (
      <ViewFade>
        <PageHead title="AI Web Builder" />
        <div className="mt-6">
          <Loading />
        </div>
      </ViewFade>
    );
  }

  const showKeyForm = !keyStatus.hasKey || editingKey;
  const promptReady = prompt.trim().length >= 10;
  const busyLabel = busy === "ai" ? "AI sedang merancang…" : busy === "publish" ? progress || "Mempublikasikan…" : null;

  return (
    <ViewFade>
      <PageHead
        title="AI Web Builder"
        desc="Ceritakan usahamu atau topik blogmu. AI menentukan jenis situs, gaya, dan isinya. Kamu tinggal atur warna, gambar, dan template, lalu publish ke Link Instan atau ekspor file."
      />

      {/* Satu kolom: pratinjau paling atas, lalu pengaturan, lalu hasil/ekspor */}
      <div className="mt-6 min-w-0 space-y-5">
        <Card
          title="Pratinjau"
          action={
            html ? (
              <span className="flex gap-1" role="group" aria-label="Ukuran pratinjau">
                <Btn variant={device === "desktop" ? "primary" : "ghost"} aria-pressed={device === "desktop"} aria-label="Tampilan desktop" onClick={() => setDevice("desktop")}><Monitor size={13} /></Btn>
                <Btn variant={device === "mobile" ? "primary" : "ghost"} aria-pressed={device === "mobile"} aria-label="Tampilan HP" onClick={() => setDevice("mobile")}><Smartphone size={13} /></Btn>
              </span>
            ) : undefined
          }
        >
          {html && content ? (
            <div className="space-y-4 px-4 py-4 sm:px-6 sm:py-5">
              <div className="flex flex-wrap items-center gap-2 text-[12px] text-text-muted">
                <Badge tone="good">{content.kind.toUpperCase()}</Badge>
                <span className="min-w-0">{KIND_LABEL[content.kind]}</span>
              </div>
              {/* sandbox tanpa allow-same-origin: skrip pratinjau berjalan terisolasi dan tidak bisa menyentuh dashboard */}
              <div className="flex justify-center rounded-2xl bg-[var(--pill-bg)] p-2 sm:p-3">
                <iframe
                  title="Pratinjau website"
                  sandbox="allow-scripts allow-downloads allow-popups allow-popups-to-escape-sandbox"
                  srcDoc={html}
                  className={cn(
                    "rounded-xl bg-white transition-[width]",
                    device === "mobile" ? "h-[clamp(420px,64dvh,700px)] w-[390px] max-w-full" : "aspect-video w-full",
                  )}
                />
              </div>

              {published ? (
                <div className="notice notice-ok !block space-y-2.5 !p-4">
                  <div className="flex items-start gap-1.5 font-semibold">
                    <Check size={15} className="mt-0.5 shrink-0" />
                    <span className="min-w-0">Online sampai {new Date(published.expiresAt).toLocaleString("id-ID")}</span>
                  </div>
                  <input readOnly aria-label="Link website" value={published.url} onFocus={(e) => e.currentTarget.select()} className="input-solid mono h-11 w-full px-3.5 text-[12.5px] text-text" />
                  <div className="flex flex-wrap gap-2">
                    <a href={published.url} target="_blank" rel="noopener noreferrer" className="btn-primary inline-flex items-center gap-1.5 whitespace-nowrap px-3.5 py-1.5 text-[12.5px] font-medium">
                      <ExternalLink size={13} /> Buka website
                    </a>
                    {shopActive && (
                      <a href={`${published.url}#kelola`} target="_blank" rel="noopener noreferrer" className="pill inline-flex items-center gap-1.5 whitespace-nowrap px-3.5 py-1.5 text-[12.5px] font-medium">
                        <Pencil size={13} /> Mode kelola
                      </a>
                    )}
                    <Btn onClick={copyLink}><Copy size={13} /> Salin link</Btn>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  {cfg.enabled && (
                    <Btn variant="primary" busy={busy === "publish"} onClick={() => publish(content, html)}>
                      {busy === "publish" ? progress || "Mempublikasikan…" : "Publish ke Link Instan"}
                    </Btn>
                  )}
                  <span className="min-w-0 flex-1 basis-56 text-[12px] leading-snug text-text-muted">
                    Ganti template, tata letak, warna, atau gambar di bawah untuk melihat tampilan lain tanpa memanggil AI lagi.
                  </span>
                </div>
              )}
              {published && (
                <div className="space-y-2">
                  <Btn busy={busy === "publish"} onClick={() => publish(content, html)}>Publish sebagai link baru</Btn>
                  <p className="text-[12px] leading-snug text-text-muted">
                    Mengganti tampilan lalu publish lagi membuat link baru (maks {cfg.maxSites} link aktif per akun). Link lama bisa dihapus di menu Link Instan.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <Empty icon={Sparkles} title="Belum ada pratinjau">
              Hasilnya muncul di sini. Biasanya selesai dalam beberapa detik.
            </Empty>
          )}
        </Card>

        <Card
          title="1. Token Groq"
          action={keyStatus.hasKey ? <Badge tone="good" dot>Terpasang</Badge> : <Badge tone="warn" dot>Belum ada</Badge>}
        >
          <div className="space-y-3 px-6 py-5 text-[13px]">
            {!showKeyForm ? (
              <>
                <div className="flex items-center gap-3 rounded-[14px] bg-[var(--pill-bg)] px-3.5 py-2">
                  <KeyRound size={14} className="shrink-0" />
                  <span className="mono min-w-0 flex-1 truncate text-[12.5px]">{keyStatus.masked}</span>
                  <Btn onClick={() => setEditingKey(true)}>Ganti</Btn>
                  <Btn variant="danger" onClick={removeKey} aria-label="Hapus token Groq">
                    <Trash2 size={13} />
                  </Btn>
                </div>
                <p className="leading-relaxed text-text-muted">
                  Semua pembuatan website memakai kuota Groq-mu sendiri, jadi tidak mengurangi kuota orang lain.
                </p>
              </>
            ) : (
              <>
                <input
                  type="password"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="gsk_…"
                  aria-label="Token Groq"
                  value={keyDraft}
                  onChange={(e) => setKeyDraft(e.target.value)}
                  className="input-solid mono h-11 w-full px-3.5 text-[13px]"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Btn variant="primary" busy={savingKey} disabled={keyDraft.trim().length < 20} onClick={saveKey}>
                    Simpan &amp; cek
                  </Btn>
                  {editingKey && <Btn onClick={() => { setEditingKey(false); setKeyDraft(""); }}>Batal</Btn>}
                </div>
                <p className="leading-relaxed text-text-muted">
                  Buat token gratis di{" "}
                  <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="font-medium text-text underline">
                    console.groq.com/keys
                  </a>
                  . Disimpan terenkripsi dan tidak ditampilkan lagi. Token dicek ke Groq tanpa memakai kuota.
                </p>
                {keyStatus.freePerDay > 0 && !keyStatus.hasKey && (
                  <p className="text-text-muted">Tanpa token, kamu masih dapat {keyStatus.freePerDay}x coba gratis per hari.</p>
                )}
              </>
            )}
          </div>
        </Card>

        <Card title="2. Ceritakan websitemu">
          <div className="space-y-4 px-6 py-5">
            <div>
              <label htmlFor="ai-prompt" className={labelCls}>Deskripsi</label>
              <textarea
                id="ai-prompt"
                rows={5}
                maxLength={1400}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Contoh: Warung bakso Pak Slamet, buka 10–21. Menu: bakso urat 15rb, es teler 12rb. Pesan via WA 0812…"
                className="input-solid w-full resize-y px-3.5 py-3 text-[13px] leading-relaxed"
              />
              <div className="mt-1.5 flex items-start justify-between gap-3 text-[11.5px] leading-snug text-text-muted">
                <span className="min-w-0">Sebutkan nama, produk atau topik, harga, jam buka, dan kontak. Makin detail, makin pas.</span>
                <span className="shrink-0 tabular-nums">{prompt.length}/1400</span>
              </div>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {EXAMPLES.map((ex) => (
                  <button key={ex.label} type="button" onClick={() => setPrompt(ex.text)} className="pill px-3 py-1.5 text-[12px]">
                    {ex.label}
                  </button>
                ))}
              </div>
            </div>

            <Field label="Jenis situs" hint={kindPick === "auto" ? "AI memilih sendiri dari deskripsimu." : KIND_LABEL[kindPick]}>
              <Select value={kindPick} onValueChange={(v) => setKindPick(v as SiteKind | "auto")}>
                <SelectTrigger aria-label="Jenis situs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Otomatis (saran AI)</SelectItem>
                  {KIND_OPTIONS.map((k) => (
                    <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_150px] sm:items-end">
              <label className="flex items-start gap-2.5 text-[13px]">
                <input
                  type="checkbox"
                  checked={autoPublish}
                  disabled={!cfg.enabled}
                  onChange={(e) => setAutoPublish(e.target.checked)}
                  className={checkCls}
                />
                <span className="min-w-0">
                  Langsung publish ke Link Instan
                  <span className="block text-[11.5px] leading-snug text-text-muted">
                    {cfg.enabled ? "Link aktif sesuai masa aktif di samping." : "Link Instan sedang tidak aktif di server ini, jadi hanya pratinjau."}
                  </span>
                </span>
              </label>
              <Field label="Masa aktif link" htmlFor="ai-ttl">
                <Select value={String(ttlHours)} onValueChange={(v) => setTtlHours(Number(v))}>
                  <SelectTrigger id="ai-ttl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {cfg.ttlOptionsHours.map((h) => (
                      <SelectItem key={h} value={String(h)}>{ttlLabel(h)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <div className="space-y-2">
              <Btn variant="primary" className="w-full !py-2.5 !text-[13px]" busy={busy !== null} disabled={!canUseAi || !promptReady} onClick={() => generate(false)}>
                <Sparkles size={14} /> {busyLabel ?? (content ? "Buat dari awal" : "Buat website")}
              </Btn>
              {content && (
                <Btn className="w-full !py-2.5 !text-[13px]" busy={busy !== null} disabled={!canUseAi || !promptReady} onClick={() => generate(true)}>
                  <RefreshCw size={13} /> Buat ulang dengan gaya lain
                </Btn>
              )}
            </div>
            {!canUseAi && <p className="text-[12px] text-text-muted">Pasang token Groq di langkah 1 dulu untuk mulai.</p>}
            {error && (
              <div className="notice notice-bad" role="alert">
                <CircleAlert size={15} className="mt-0.5 shrink-0" /> <span className="min-w-0">{error}</span>
              </div>
            )}
          </div>
        </Card>

        <Card title="3. Tampilan" action={content ? <Badge tone="violet">Langsung di pratinjau</Badge> : undefined}>
          <div className="space-y-5 px-6 py-5">
            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-[12px] font-medium text-text-muted">Template</span>
                {template && (
                  <button type="button" onClick={() => setTemplate(null)} className="text-[12px] text-text-muted underline">
                    Ikuti saran AI
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 min-[420px]:grid-cols-3">
                {TEMPLATES.map((t) => {
                  const sel = tplId === t.id;
                  const suggested = !!content && !template && content.template === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTemplate(t.id)}
                      aria-pressed={sel}
                      className={cn(
                        "flex min-w-0 flex-col gap-1.5 rounded-2xl p-2.5 text-left transition",
                        sel ? "bg-tone-lilac ring-2 ring-[var(--ring)]" : "bg-[var(--pill-bg)] hover:bg-[var(--card-hover)]",
                      )}
                    >
                      <span className="flex h-8 w-full overflow-hidden rounded-lg ring-1 ring-[var(--line)]">
                        <span className="flex-1" style={{ background: t.swatch[0] }} />
                        <span className="w-1/3" style={{ background: t.swatch[1] }} />
                      </span>
                      <span className="block min-w-0 truncate text-[12.5px] font-semibold">{t.name}</span>
                      {suggested ? (
                        <span className="block truncate text-[11px] font-medium text-lav-text">Saran AI</span>
                      ) : (
                        <span aria-hidden className="block h-[14px]" />
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2.5 rounded-2xl bg-[var(--pill-bg)] px-3.5 py-2.5 text-[12px] leading-relaxed text-text-muted">
                <b className="font-semibold text-text">{tpl.name}</b> · {tpl.desc}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Tata letak atas" htmlFor="ai-hero">
                <Select value={heroEff} onValueChange={(v) => setHeroOpt(v as HeroLayout)}>
                  <SelectTrigger id="ai-hero">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HERO_LAYOUTS.map((l) => (
                      <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Tata letak keunggulan" htmlFor="ai-feat">
                <Select value={featEff} onValueChange={(v) => setFeatOpt(v as FeatLayout)}>
                  <SelectTrigger id="ai-feat">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FEAT_LAYOUTS.map((l) => (
                      <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <div>
              <div className="mb-2 flex items-center gap-1.5 text-[12px] font-medium text-text-muted">
                <Palette size={13} /> Warna
              </div>
              <PaletteEditor colors={colors} custom={palette !== null} onChange={setPalette} onReset={() => setPalette(null)} />
            </div>

            {content && hasShop(content) && (
              <label className="flex items-start gap-2.5 rounded-2xl bg-[var(--pill-bg)] p-3.5 text-[13px]">
                <input type="checkbox" checked={shopOn} onChange={(e) => setShopOn(e.target.checked)} className={checkCls} />
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 font-medium"><Store size={14} className="shrink-0" /> Katalog, keranjang, dan mode kelola</span>
                  <span className="mt-0.5 block text-[12px] leading-snug text-text-muted">Pengunjung bisa cari produk, mengisi keranjang, lalu memesan lewat WhatsApp.</span>
                </span>
              </label>
            )}
          </div>
        </Card>

        <Card title="4. Gambar" action={<span className="text-[12px] text-text-muted">{formatBytes(imgBytes)} / {formatBytes(IMAGE_BUDGET_BYTES)}</span>}>
          <div className="space-y-4 px-6 py-5">
            <div className="h-1.5 overflow-hidden rounded-full bg-[var(--pill-bg)]" aria-hidden>
              <div className="h-full rounded-full bg-[var(--accent)] transition-[width]" style={{ width: `${Math.min(100, (imgBytes / IMAGE_BUDGET_BYTES) * 100)}%` }} />
            </div>
            <ul className="space-y-3">
              {visibleSlots.map((d) => (
                <ImageRow
                  key={d.key}
                  def={d}
                  src={images[d.key]}
                  busy={imgBusy === d.key}
                  onPick={() => pickImage(d)}
                  onRemove={() => removeImage(d.key)}
                />
              ))}
            </ul>
            {imageSlots.length > 6 && (
              <button type="button" onClick={() => setShowAllImgs((v) => !v)} className="text-[12px] text-text-muted underline">
                {showAllImgs ? "Tampilkan lebih sedikit" : `Tampilkan semua (${imageSlots.length})`}
              </button>
            )}
            {!content && (
              <p className="text-[12px] leading-snug text-text-muted">
                Foto produk atau sampul artikel muncul di sini setelah websitenya dibuat.
              </p>
            )}
            <p className="text-[11.5px] leading-snug text-text-muted">
              PNG, JPG, WebP, atau GIF. Gambar otomatis dikecilkan di browser dan ikut tertanam saat publish atau ekspor.
            </p>
            <input ref={fileRef} type="file" accept={IMAGE_ACCEPT} className="hidden" onChange={onFile} />
          </div>
        </Card>

        {html && content && (
          <>
            {shopActive && (
              <Card title="Katalog & kelola produk" action={<Badge tone="good" dot>Aktif</Badge>}>
                <ul className="list-disc space-y-1.5 px-6 py-5 pl-11 text-[13px] leading-relaxed text-text-muted">
                  <li>Pratinjau sudah dalam <b className="text-text">mode kelola</b>: coba tambah, ubah, atau hapus produk langsung di kartunya.</li>
                  <li>Di situs yang sudah online, buka link + <code className="mono">#kelola</code> untuk masuk mode kelola (tidak terlihat oleh pengunjung biasa).</li>
                  <li>Perubahan tersimpan di browser pemilik, bukan di server. Setelah selesai, tekan <b className="text-text">Unduh situs</b> di bilah kelola lalu upload ulang agar semua pengunjung melihat versi terbaru.</li>
                </ul>
              </Card>
            )}

            <Card title="Ekspor file">
              <div className="space-y-3 px-6 py-5">
                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                  <Btn variant="primary" busy={exporting === "zip"} onClick={() => runExport("zip", () => downloadZip(content, tplId, accentEff, renderOpts), "Proyek ZIP diunduh.")}>
                    <Package size={13} /> Unduh ZIP proyek
                  </Btn>
                  <Btn onClick={() => runExport("html", () => downloadHtml(content, tplId, accentEff, renderOpts), "File HTML diunduh.")}>
                    <FileCode2 size={13} /> Unduh index.html
                  </Btn>
                  <Btn onClick={() => runExport("json", () => downloadJson(content, tplId, accentEff, renderOpts), "content.json diunduh.")}>
                    <FileJson size={13} /> content.json
                  </Btn>
                  <Btn
                    onClick={async () => {
                      const ok = await copyHtml(content, tplId, accentEff, renderOpts);
                      showToast(ok ? "Kode HTML disalin." : "Tidak bisa menyalin otomatis. Pakai tombol unduh.");
                    }}
                  >
                    <Copy size={13} /> Salin HTML
                  </Btn>
                </div>
                <p className="flex items-start gap-1.5 text-[12px] leading-relaxed text-text-muted">
                  <Download size={13} className="mt-0.5 shrink-0" />
                  <span className="min-w-0">
                    ZIP berisi index.html, assets/style.css{shopActive ? ", assets/app.js" : ""}
                    {imgBytes > 0 ? ", assets/img (gambarmu)" : ""}, content.json, dan README. Bisa dibuka langsung di browser dan di-upload ke hosting statis mana pun.
                  </span>
                </p>
              </div>
            </Card>
          </>
        )}
      </div>
    </ViewFade>
  );
}
