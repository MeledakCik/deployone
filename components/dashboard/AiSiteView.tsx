"use client";

import * as React from "react";
import {
  Sparkles, KeyRound, ExternalLink, Copy, Trash2, CircleAlert, Check, RefreshCw, Download, FileCode2,
  FileJson, Package, Monitor, Smartphone, Store, Pencil, ImagePlus, ImageIcon, X, Palette, Undo2, Eye,
  Info, ChevronDown, Loader2,
} from "lucide-react";
import { PageHead, Card, Btn, Badge, Loading } from "@/components/ui/primitives";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { ViewFade } from "@/components/ui/ViewFade";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/confirm";
import { cn } from "@/lib/utils";
import { fetchSites, publishSite, deleteSite, type SiteConfig } from "@/lib/site-upload";
import {
  TEMPLATES,
  HERO_LAYOUTS,
  FEAT_LAYOUTS,
  FONT_OPTIONS,
  KIND_LABEL,
  KIND_OPTIONS,
  MAX_PALETTE,
  defaultPalette,
  hasShop,
  normalizeContent,
  renderSite,
  sampleContent,
  type SiteContent,
  type SiteImages,
  type SiteKind,
  type TemplateId,
  type HeroLayout,
  type FeatLayout,
  type FontId,
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
  MAX_PRELOAD_BYTES,
  isAcceptedImage,
  type ImageSlot,
} from "@/lib/ai-site-images";
import { assignPhotos, type PhotoDraft } from "@/lib/ai-site-photos";
import { remapImages } from "@/lib/ai-site-edit";
import { Field, api, checkCls, hintCls, isHex, labelCls, timeLeftLabel, ttlLabel, useReducedMotion } from "./ai-site/shared";
import { PreviewFrame } from "./ai-site/ScaledFrame";
import { PaletteEditor } from "./ai-site/PaletteEditor";
import { PhotoPool } from "./ai-site/PhotoPool";
import { TemplatePicker } from "./ai-site/TemplatePicker";
import { FontPicker } from "./ai-site/FontPicker";

interface KeyStatus {
  hasKey: boolean;
  masked: string | null;
  freePerDay: number;
}

/** Contoh perintah ubah, disesuaikan jenis situs. */
function editSuggestions(kind: SiteKind): string[] {
  const base = ["Buat headline lebih singkat dan to the point", "Ubah gaya tulisan jadi lebih santai", "Pakai warna yang lebih gelap"];
  if (kind === "artikel") return ["Tambah 2 artikel lagi tentang topik serupa", ...base];
  if (kind === "umkm") return ["Tambah 3 menu minuman", ...base];
  if (kind === "event") return ["Tambah satu langkah cara daftar", ...base];
  return ["Tambah satu keunggulan baru", ...base];
}

const EXAMPLES: { label: string; text: string }[] = [
  { label: "Warung bakso", text: "Warung bakso Pak Slamet di Banjar, buka 10–21. Menu: bakso urat 15rb, bakso telur 18rb, mie ayam 14rb, es teler 12rb, es jeruk 5rb. Pesan via WhatsApp 081234567890." },
  { label: "Toko kue", text: "Toko kue Rumah Manis di Bandung: brownies, bolu pandan, donat kentang, kue kering lebaran. Terima pesanan ulang tahun, WA 081298765432." },
  { label: "Jasa desain", text: "Jasa desain logo dan branding untuk UMKM, proses cepat 3 hari, revisi unlimited, kontak hello@studiokita.id." },
  { label: "Portofolio", text: "Portofolio mahasiswa Teknik Informatika yang bisa web development dan UI design, kontak via email." },
  { label: "Event kampus", text: "Festival musik kampus Soundwave 2026, 14 Desember di Lapangan Utama, tiket early bird dan 8 penampil." },
  { label: "Blog artikel", text: "Blog Catatan Kopi Nusantara: panduan seduh V60, profil petani kopi Gayo, dan ulasan grinder untuk pemula. Terbit tiap Senin, kontak halo@kopinusantara.id." },
];

/** Hapus gambar milik produk/artikel yang sudah tidak ada di isi terbaru (logo & gambar utama tetap). */
function pruneImages(images: SiteImages, c: SiteContent): SiteImages {
  const ok = new Set<string>(["logo", "hero"]);
  c.items.forEach((i) => ok.add(`item:${i.id}`));
  (c.articles ?? []).forEach((a) => ok.add(`article:${a.id}`));
  const out: SiteImages = {};
  for (const k of Object.keys(images)) if (ok.has(k)) out[k] = images[k];
  return out;
}

/* ---------- draft otomatis (teks & pengaturan saja; gambar terlalu besar untuk localStorage) ---------- */

const DRAFT_KEY = "depup:ai-site-draft:v1";

interface Draft {
  v: 1;
  prompt: string;
  kindPick: SiteKind | "auto";
  content: unknown;
  template: unknown;
  palette: unknown;
  heroOpt: unknown;
  featOpt: unknown;
  fontOpt: unknown;
  tampilanMode: unknown;
  shopOn: boolean;
  variant: number;
  hadImages: boolean;
}

function readDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as Draft;
    return d && d.v === 1 ? d : null;
  } catch {
    return null;
  }
}

const validTpl = (v: unknown): v is TemplateId => TEMPLATES.some((t) => t.id === v);
const validHero = (v: unknown): v is HeroLayout => HERO_LAYOUTS.some((l) => l.id === v);
const validFeat = (v: unknown): v is FeatLayout => FEAT_LAYOUTS.some((l) => l.id === v);
const validFont = (v: unknown): v is FontId => FONT_OPTIONS.some((f) => f.id === v);
const validPalette = (v: unknown): v is string[] =>
  Array.isArray(v) && v.length >= 2 && v.length <= MAX_PALETTE && v.every((x) => typeof x === "string" && isHex(x));

/** Keadaan yang bisa dikembalikan lewat tombol Urungkan. */
interface Snapshot {
  content: SiteContent;
  images: SiteImages;
  template: TemplateId | null;
  palette: string[] | null;
  heroOpt: HeroLayout | null;
  featOpt: FeatLayout | null;
  fontOpt: FontId | null;
  variant: number;
  shopOn: boolean;
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
          <ImageIcon size={18} aria-hidden />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-medium">{def.label}</p>
        <p className={`truncate ${hintCls}`}>{src ? formatBytes(dataUrlBytes(src)) : def.hint}</p>
      </div>
      <Btn busy={busy} onClick={onPick} aria-label={`${src ? "Ganti" : "Unggah"} gambar ${def.label}`}>
        <ImagePlus size={13} /> {src ? "Ganti" : "Unggah"}
      </Btn>
      {src && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Hapus gambar ${def.label}`}
          className="pill grid h-10 w-10 shrink-0 place-items-center hover:!bg-bad-bg hover:text-bad-fg"
        >
          <X size={15} />
        </button>
      )}
    </li>
  );
}

export function AiSiteView() {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const reduced = useReducedMotion();

  const [keyStatus, setKeyStatus] = React.useState<KeyStatus | null>(null);
  const [cfg, setCfg] = React.useState<SiteConfig | null>(null);
  const [loadErr, setLoadErr] = React.useState<string | null>(null);
  const [reloadTick, setReloadTick] = React.useState(0);
  const [hydrated, setHydrated] = React.useState(false);

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
  // null = ikut huruf bawaan Template; nilai terisi = pilihan manual pengguna
  const [fontOpt, setFontOpt] = React.useState<FontId | null>(null);
  // Cara menampilkan kartu "2. Tampilan": "ai" = ringkas (Gaya + Warna, tata letak disembunyikan),
  // "manual" = Gaya, Tata letak, Warna, dan Huruf sejajar dan terbuka semua.
  const [tampilanMode, setTampilanMode] = React.useState<"ai" | "manual">("ai");
  const [shopOn, setShopOn] = React.useState(true);
  const [device, setDevice] = React.useState<"desktop" | "mobile">("desktop");
  const [variant, setVariant] = React.useState(0);
  const [ttlHours, setTtlHours] = React.useState(24);
  // Default mati: tiap publish memakai satu slot link aktif, jadi pengguna memutuskan sendiri kapan mempublikasikan.
  const [autoPublish, setAutoPublish] = React.useState(false);
  const [replacePrev, setReplacePrev] = React.useState(true);
  const [lastPubId, setLastPubId] = React.useState<string | null>(null);
  const [siteCount, setSiteCount] = React.useState(0);

  const [images, setImages] = React.useState<SiteImages>({});
  const [imgBusy, setImgBusy] = React.useState<string | null>(null);
  const [showAllImgs, setShowAllImgs] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const pendingRef = React.useRef<ImageSlotDef | null>(null);

  // Foto yang disiapkan sebelum generate (berkas asli tetap di memori browser).
  const [photos, setPhotos] = React.useState<PhotoDraft[]>([]);
  const [photosAdding, setPhotosAdding] = React.useState(false);
  const [photosUsed, setPhotosUsed] = React.useState<number | null>(null);
  const photosRef = React.useRef<PhotoDraft[]>([]);
  photosRef.current = photos;
  React.useEffect(() => () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.preview)), []);

  const [content, setContent] = React.useState<SiteContent | null>(null);
  const [history, setHistory] = React.useState<Snapshot[]>([]);
  const [busy, setBusy] = React.useState<null | "ai" | "publish" | "edit">(null);
  const [editText, setEditText] = React.useState("");
  const [editError, setEditError] = React.useState<string | null>(null);
  const [progress, setProgress] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [exporting, setExporting] = React.useState<null | "zip" | "html" | "json">(null);
  const [published, setPublished] = React.useState<{ id: string; url: string; expiresAt: number } | null>(null);
  const [savedHtml, setSavedHtml] = React.useState<string | null>(null);

  const [announce, setAnnounce] = React.useState("");
  const announceTick = React.useRef(0);
  const say = React.useCallback((msg: string) => {
    announceTick.current += 1;
    // Spasi tak terlihat bergantian supaya pesan yang sama tetap dibacakan ulang.
    setAnnounce(msg + (announceTick.current % 2 ? "" : "\u00A0"));
  }, []);

  const [previewVisible, setPreviewVisible] = React.useState(true);
  const previewRef = React.useRef<HTMLElement>(null);
  const tokenRef = React.useRef<HTMLDivElement>(null);
  const promptRef = React.useRef<HTMLTextAreaElement>(null);
  const editRef = React.useRef<HTMLTextAreaElement>(null);
  const pendingFocusRef = React.useRef(false);

  /* ---------- muat data awal + pulihkan draft ---------- */

  React.useEffect(() => {
    let alive = true;
    setLoadErr(null);
    (async () => {
      try {
        const [k, c] = await Promise.all([api<KeyStatus>("/api/ai/key"), fetchSites()]);
        if (!alive) return;
        setKeyStatus(k);
        setCfg(c);
        setTtlHours(c.defaultTtlHours);
        setSiteCount(c.sites.length);

        const d = readDraft();
        if (d) {
          const restored = d.content ? normalizeContent(d.content) : null;
          if (typeof d.prompt === "string") setPrompt(d.prompt.slice(0, 1400));
          if (d.kindPick === "auto" || KIND_OPTIONS.some((o) => o.id === d.kindPick)) setKindPick(d.kindPick);
          if (restored) {
            setContent(restored);
            if (validTpl(d.template)) setTemplate(d.template);
            if (validPalette(d.palette)) setPalette(d.palette);
            if (validHero(d.heroOpt)) setHeroOpt(d.heroOpt);
            if (validFeat(d.featOpt)) setFeatOpt(d.featOpt);
            if (validFont(d.fontOpt)) setFontOpt(d.fontOpt);
            if (d.tampilanMode === "ai" || d.tampilanMode === "manual") setTampilanMode(d.tampilanMode);
            if (typeof d.shopOn === "boolean") setShopOn(d.shopOn);
            if (typeof d.variant === "number") setVariant(d.variant);
            showToast(d.hadImages ? "Draf terakhir dipulihkan. Gambar perlu diunggah lagi." : "Draf terakhir dipulihkan.");
          } else if (d.prompt) {
            showToast("Deskripsi terakhir dipulihkan.");
          }
        }
        setHydrated(true);
      } catch (e) {
        if (alive) setLoadErr((e as Error).message);
      }
    })();
    return () => {
      alive = false;
    };
    // showToast sengaja tidak masuk dependensi: efek ini hanya dijalankan saat mount / coba lagi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadTick]);

  /* ---------- turunan tampilan ---------- */

  const isSample = !content;
  // Sebelum ada hasil AI, pratinjau memakai isi contoh supaya pilihan template/warna langsung terlihat efeknya.
  const previewContent = React.useMemo<SiteContent>(
    () => content ?? sampleContent(kindPick === "auto" ? "jasa" : kindPick),
    [content, kindPick],
  );
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
    () => ({ hero: heroEff, feat: featEff, shop: shopOn, palette: palette ?? undefined, font: fontOpt ?? undefined, images }),
    [heroEff, featEff, shopOn, palette, fontOpt, images],
  );
  const html = React.useMemo(
    () => renderSite(previewContent, tplId, accentEff, renderOpts),
    [previewContent, tplId, accentEff, renderOpts],
  );
  const shopActive = !!content && hasShop(content) && shopOn;
  const imgBytes = totalImageBytes(images);

  const canUseAi = !!keyStatus && (keyStatus.hasKey || keyStatus.freePerDay > 0);
  const promptReady = prompt.trim().length >= 10;
  const canGenerate = canUseAi && promptReady;
  const editReady = editText.trim().length >= 4;

  const hasWork =
    !!content &&
    (history.length > 0 ||
      Object.keys(images).length > 0 ||
      template !== null ||
      palette !== null ||
      heroOpt !== null ||
      featOpt !== null ||
      fontOpt !== null);
  const dirtyMedia = !!content && html !== savedHtml && (Object.keys(images).length > 0 || photos.length > 0);

  const noAiMsg = "Jatah gratis hari ini habis. Pasang token Groq di kartu di atas untuk lanjut.";
  const genHint = !canUseAi ? noAiMsg : !promptReady ? "Tulis minimal 10 karakter di kolom Deskripsi untuk mulai." : "";
  const editHint = !canUseAi ? noAiMsg : !editReady ? "Tulis perintahnya minimal 4 karakter." : "";

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

  /* ---------- efek samping ---------- */

  // Simpan draf teks & pengaturan (tanpa gambar) supaya refresh tidak menghapus hasil AI.
  React.useEffect(() => {
    if (!hydrated) return;
    const t = window.setTimeout(() => {
      try {
        if (!content && !prompt.trim()) {
          localStorage.removeItem(DRAFT_KEY);
          return;
        }
        const d: Draft = {
          v: 1, prompt, kindPick, content, template, palette, heroOpt, featOpt, fontOpt, tampilanMode, shopOn, variant,
          hadImages: Object.keys(images).length > 0,
        };
        localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
      } catch {
        /* penyimpanan penuh / diblokir: abaikan */
      }
    }, 600);
    return () => window.clearTimeout(t);
  }, [hydrated, prompt, kindPick, content, template, palette, heroOpt, featOpt, fontOpt, tampilanMode, shopOn, variant, images]);

  // Peringatkan sebelum menutup halaman bila ada gambar/foto yang belum disimpan (tidak ikut draf).
  React.useEffect(() => {
    if (!dirtyMedia) return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirtyMedia]);

  // Umumkan proses AI untuk pembaca layar (tombol tetap bisa difokus, jadi teksnya tidak otomatis dibacakan).
  React.useEffect(() => {
    if (busy === "ai") say("AI sedang merancang websitemu. Mohon tunggu.");
    else if (busy === "edit") say("AI sedang menerapkan perubahan. Mohon tunggu.");
    else if (busy === "publish") say("Sedang mempublikasikan website.");
  }, [busy, say]);

  // Setelah generate: gulir dan pindahkan fokus ke pratinjau.
  React.useEffect(() => {
    if (!content || !pendingFocusRef.current) return;
    pendingFocusRef.current = false;
    const el = previewRef.current;
    if (!el) return;
    el.scrollIntoView({ block: "start", behavior: reduced ? "auto" : "smooth" });
    el.focus({ preventScroll: true });
  }, [content, reduced]);

  // Tombol "Lihat pratinjau" di layar sempit hanya tampil saat pratinjau di luar layar.
  const ready = !!keyStatus && !!cfg;
  React.useEffect(() => {
    const el = previewRef.current;
    if (!ready || !el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setPreviewVisible(e.isIntersecting), { threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, [ready]);

  function goPreview() {
    const el = previewRef.current;
    if (!el) return;
    el.scrollIntoView({ block: "start", behavior: reduced ? "auto" : "smooth" });
    el.focus({ preventScroll: true });
  }

  /* ---------- riwayat / urungkan ---------- */

  function snapshot(): Snapshot | null {
    return content ? { content, images, template, palette, heroOpt, featOpt, fontOpt, variant, shopOn } : null;
  }

  function pushHistory() {
    const s = snapshot();
    if (s) setHistory((h) => [...h.slice(-9), s]);
  }

  function undo() {
    const last = history[history.length - 1];
    if (!last || busy !== null) return;
    setHistory(history.slice(0, -1));
    setContent(last.content);
    setImages(last.images);
    setTemplate(last.template);
    setPalette(last.palette);
    setHeroOpt(last.heroOpt);
    setFeatOpt(last.featOpt);
    setFontOpt(last.fontOpt);
    setVariant(last.variant);
    setShopOn(last.shopOn);
    setPublished(null);
    setEditError(null);
    showToast("Perubahan terakhir dibatalkan.");
  }

  /* ---------- gambar & foto ---------- */

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

  function addPhotos(files: File[]) {
    if (!files.length) return;
    setPhotosAdding(true);
    try {
      let total = photosRef.current.reduce((n, p) => n + p.file.size, 0);
      const next: PhotoDraft[] = [];
      let badType = 0;
      let tooBig = 0;
      for (const f of files) {
        if (!isAcceptedImage(f)) { badType++; continue; }
        if (total + f.size > MAX_PRELOAD_BYTES) { tooBig++; continue; }
        total += f.size;
        next.push({ id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`, file: f, preview: URL.createObjectURL(f) });
      }
      if (next.length) setPhotos((cur) => [...cur, ...next]);
      if (tooBig) showToast(`${tooBig} foto tidak ditambahkan: total melebihi ${formatBytes(MAX_PRELOAD_BYTES)}.`);
      else if (badType) showToast(`${badType} file dilewati. Pakai PNG, JPG, WebP, atau GIF.`);
    } finally {
      setPhotosAdding(false);
    }
  }

  function removePhoto(id: string) {
    setPhotos((cur) => {
      const gone = cur.find((p) => p.id === id);
      if (gone) URL.revokeObjectURL(gone.preview);
      return cur.filter((p) => p.id !== id);
    });
  }

  function movePhoto(id: string, dir: -1 | 1) {
    setPhotos((cur) => {
      const i = cur.findIndex((p) => p.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= cur.length) return cur;
      const next = cur.slice();
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  function clearPhotos() {
    photosRef.current.forEach((p) => URL.revokeObjectURL(p.preview));
    setPhotos([]);
    setPhotosUsed(null);
  }

  function removeImage(key: string) {
    setImages((m) => {
      const n = { ...m };
      delete n[key];
      return n;
    });
  }

  /* ---------- token Groq ---------- */

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

  /* ---------- publish ---------- */

  async function publish(c: SiteContent, h: string) {
    if (!cfg) return;
    const size = new TextEncoder().encode(h).length;
    if (size > cfg.maxBytes) {
      setError(`Halaman terlalu besar (${formatBytes(size)}, batas ${formatBytes(cfg.maxBytes)}). Hapus atau ganti beberapa gambar dengan yang lebih kecil.`);
      return;
    }
    const prev = replacePrev ? lastPubId : null;
    const full = siteCount >= cfg.maxSites;
    if (full && !prev) {
      setError(`Kuota link aktif penuh (${siteCount} dari ${cfg.maxSites}). Hapus satu link di menu Link Instan dulu, lalu coba lagi.`);
      return;
    }
    setError(null);
    setBusy("publish");
    setProgress("Menyiapkan link…");
    let freedFirst = false;
    try {
      // Kuota penuh: link lama harus dimatikan dulu agar ada slot untuk yang baru.
      if (full && prev) {
        await deleteSite(prev);
        freedFirst = true;
        setSiteCount((n) => Math.max(0, n - 1));
        setLastPubId(null);
      }
      const data = new TextEncoder().encode(h);
      const r = await publishSite([{ path: "index.html", data, executable: false }], {
        name: c.brand,
        ttlHours,
        spa: false,
        onProgress: (_d, _t, label) => setProgress(label),
      });
      setPublished({ id: r.id, url: r.url, expiresAt: r.expiresAt });
      setLastPubId(r.id);
      setSavedHtml(h);
      setSiteCount((n) => n + 1);
      let replaced = freedFirst;
      if (prev && !freedFirst) {
        try {
          await deleteSite(prev);
          setSiteCount((n) => Math.max(0, n - 1));
          replaced = true;
        } catch {
          showToast("Website online, tapi link lama gagal dimatikan. Hapus manual di menu Link Instan.");
        }
      }
      if (prev && replaced) showToast("Website online di link baru. Link sebelumnya sudah dimatikan.");
      else if (!prev) showToast("Website sudah online!");
      say("Website sudah online. Link tersedia di kartu pratinjau.");
    } catch (e) {
      const msg = (e as Error).message;
      setError(freedFirst ? `Link lama sudah dimatikan, tetapi link baru gagal dibuat: ${msg} Coba publish lagi.` : msg);
    } finally {
      setBusy(null);
      setProgress("");
    }
  }

  /* ---------- generate & ubah ---------- */

  async function generate(again = false) {
    setError(null);
    setPublished(null);
    setBusy("ai");
    const v = again ? variant + 1 : 0;
    try {
      const r = await api<{ content: SiteContent; source: "own" | "free" }>("/api/ai/site", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt, variant: v, kind: kindPick === "auto" ? undefined : kindPick, photoCount: photos.length }),
      });
      let nextImages = pruneImages(images, r.content);
      if (photos.length > 0) {
        // Foto yang disiapkan lebih dulu dipasang otomatis; logo buatan sendiri tetap dipertahankan.
        setProgress("Memasang foto…");
        const keep: SiteImages = images.logo ? { logo: images.logo } : {};
        const placed = await assignPhotos(r.content, photos, keep);
        nextImages = placed.images;
        setPhotosUsed(placed.used);
        if (placed.failed > 0) showToast(`${placed.failed} foto gagal dipasang (format rusak atau melebihi batas ukuran gambar).`);
      }
      pushHistory();
      setVariant(v);
      setContent(r.content);
      setImages(nextImages);
      setSavedHtml(null);
      if (again) {
        setTemplate(null);
        setPalette(null);
        setHeroOpt(null);
        setFeatOpt(null);
        setFontOpt(null);
      }
      pendingFocusRef.current = true;
      say("Website selesai dibuat. Pratinjau sudah diperbarui.");
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
            font: (again ? null : fontOpt) ?? undefined,
            images: nextImages,
          }),
        );
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy((b) => (b === "ai" ? null : b));
      setProgress((p) => (p === "Memasang foto…" ? "" : p));
    }
  }

  function explainGenerate() {
    say(genHint);
    if (!canUseAi) {
      tokenRef.current?.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" });
      tokenRef.current?.focus({ preventScroll: true });
    } else {
      promptRef.current?.focus();
    }
  }

  async function requestGenerate(again: boolean) {
    if (busy !== null) return;
    if (!canGenerate) {
      explainGenerate();
      return;
    }
    if (hasWork) {
      const { ok } = await confirm({
        title: again ? "Coba gaya lain?" : "Buat ulang dari deskripsi?",
        description:
          "Hasil dan pengaturan yang sekarang akan diganti dengan hasil baru, dan ini memakai 1 jatah AI. Kalau tidak cocok, tombol Urungkan di kartu Pratinjau mengembalikannya.",
        confirmLabel: "Ya, buat ulang",
      });
      if (!ok) return;
    }
    await generate(again);
  }

  async function applyEdit() {
    if (!content || busy !== null) return;
    if (!canUseAi || !editReady) {
      say(editHint);
      editRef.current?.focus();
      return;
    }
    setEditError(null);
    setBusy("edit");
    try {
      const r = await api<{ content: SiteContent; changed: string[]; note: string }>("/api/ai/site/edit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ instruction: editText, current: content }),
      });
      if (r.changed.length === 0) {
        setEditError(r.note || "Tidak ada yang berubah. Coba kalimat yang lebih spesifik.");
        return;
      }
      pushHistory();
      setImages((m) => remapImages(content, r.content, m));
      setContent(r.content);
      // Bila AI mengubah tampilan, pilihan manual lama dilepas supaya perubahan itu terlihat di pratinjau.
      if (r.changed.includes("template") || r.changed.includes("accent")) {
        setTemplate(null);
        setPalette(null);
      }
      if (r.changed.includes("hero")) setHeroOpt(null);
      if (r.changed.includes("feat")) setFeatOpt(null);
      setPublished(null);
      setEditText("");
      showToast(r.note || "Perubahan diterapkan.");
    } catch (e) {
      setEditError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function resetAll() {
    const { ok } = await confirm({
      title: "Mulai dari kosong?",
      description:
        "Deskripsi, hasil AI, foto, gambar, dan pengaturan tampilan di halaman ini akan dihapus. Link yang sudah dipublish tidak terpengaruh.",
      confirmLabel: "Ya, mulai baru",
      tone: "danger",
    });
    if (!ok) return;
    clearPhotos();
    setContent(null);
    setImages({});
    setPrompt("");
    setKindPick("auto");
    setTemplate(null);
    setPalette(null);
    setHeroOpt(null);
    setFeatOpt(null);
    setFontOpt(null);
    setTampilanMode("ai");
    setShopOn(true);
    setVariant(0);
    setHistory([]);
    setPublished(null);
    setSavedHtml(null);
    setEditText("");
    setEditError(null);
    setError(null);
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* abaikan */
    }
    say("Halaman dikosongkan.");
    promptRef.current?.focus();
  }

  /* ---------- ekspor & salin ---------- */

  async function runExport(kind: "zip" | "html" | "json", fn: () => void | Promise<void>, okMsg: string) {
    setExporting(kind);
    try {
      await fn();
      setSavedHtml(html);
      showToast(okMsg);
    } catch {
      showToast("Gagal membuat file. Coba lagi.");
    } finally {
      setExporting(null);
    }
  }

  async function copyText(text: string, okMsg: string) {
    try {
      await navigator.clipboard.writeText(text);
      showToast(okMsg);
    } catch {
      showToast("Tidak bisa menyalin otomatis. Salin manual dari kotak link.");
    }
  }

  /* ---------- keadaan memuat / gagal ---------- */

  if (loadErr) {
    return (
      <ViewFade>
        <PageHead title="AI Web Builder" />
        <div className="notice notice-bad mt-6" role="alert">
          <CircleAlert size={16} className="mt-0.5 shrink-0" aria-hidden /> <span className="min-w-0">{loadErr}</span>
        </div>
        <div className="mt-3">
          <Btn onClick={() => { setKeyStatus(null); setCfg(null); setReloadTick((n) => n + 1); }}>
            <RefreshCw size={13} /> Coba lagi
          </Btn>
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

  /* ---------- potongan tampilan ---------- */

  const showKeyForm = !keyStatus.hasKey || editingKey;
  const busyLabel =
    busy === "edit" ? "AI sedang mengubah…" : busy === "ai" ? progress || "AI sedang merancang…" : busy === "publish" ? progress || "Mempublikasikan…" : null;
  const kindName = content ? KIND_OPTIONS.find((k) => k.id === content.kind)?.name ?? content.kind : "";
  const kindNote = content ? KIND_LABEL[content.kind].match(/\((.*)\)/)?.[1] ?? "" : "";
  const heroName = HERO_LAYOUTS.find((l) => l.id === heroEff)?.name ?? heroEff;
  const featName = FEAT_LAYOUTS.find((l) => l.id === featEff)?.name ?? featEff;
  const fontName = fontOpt ? FONT_OPTIONS.find((f) => f.id === fontOpt)?.name ?? fontOpt : null;

  const tokenForm = (
    <>
      <input
        type="password"
        autoComplete="off"
        spellCheck={false}
        placeholder="gsk_…"
        aria-label="Token Groq"
        aria-describedby="groq-help"
        value={keyDraft}
        onChange={(e) => setKeyDraft(e.target.value)}
        className="input-solid mono h-11 w-full px-3.5 text-[13.5px]"
      />
      <div className="flex flex-wrap items-center gap-2">
        <Btn variant="primary" busy={savingKey} disabled={keyDraft.trim().length < 20} softDisabled onClick={saveKey}>
          Simpan &amp; cek
        </Btn>
        {editingKey && (
          <Btn onClick={() => { setEditingKey(false); setKeyDraft(""); }}>Batal</Btn>
        )}
        {keyDraft.length > 0 && keyDraft.trim().length < 20 && <span className={hintCls}>Token biasanya diawali gsk_ dan cukup panjang.</span>}
      </div>
      <p id="groq-help" className={`leading-relaxed ${hintCls}`}>
        Groq adalah layanan AI yang dipakai untuk menulis isi websitemu. Token adalah kunci akses gratis dari akunmu sendiri. Buat di{" "}
        <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="font-medium text-text underline">
          console.groq.com/keys<span className="sr-only"> (buka di tab baru)</span>
        </a>
        , lalu tempel di sini. Disimpan terenkripsi dan tidak ditampilkan lagi. Token dicek ke Groq tanpa memakai kuota.
      </p>
    </>
  );

  const tokenMasked = (
    <>
      <div className="flex items-center gap-3 rounded-[14px] bg-[var(--pill-bg)] px-3.5 py-2">
        <KeyRound size={14} className="shrink-0" aria-hidden />
        <span className="mono min-w-0 flex-1 truncate text-[13px]">{keyStatus.masked}</span>
        <Btn onClick={() => setEditingKey(true)}>Ganti</Btn>
        <Btn variant="danger" onClick={removeKey} aria-label="Hapus token Groq">
          <Trash2 size={13} />
        </Btn>
      </div>
      <p className={`leading-relaxed ${hintCls}`}>Semua pembuatan website memakai kuota Groq-mu sendiri, jadi tidak mengurangi kuota orang lain.</p>
    </>
  );

  // Token tidak lagi jadi "langkah 1": tampil menonjol hanya bila jatah gratis habis; selain itu opsional di bagian bawah.
  const tokenCardTop = (
    <div ref={tokenRef} tabIndex={-1} className="scroll-mt-4 outline-none">
      <Card title="Pasang token Groq dulu" action={<Badge tone="warn" dot>Belum ada</Badge>}>
        <div className="space-y-3 px-6 py-5 text-[13.5px]">
          <p className="leading-relaxed">Jatah gratis hari ini sudah habis. Untuk lanjut membuat website, pasang token Groq milikmu sendiri.</p>
          {tokenForm}
        </div>
      </Card>
    </div>
  );

  const tokenCardBottom = (
    <Card
      title={keyStatus.hasKey ? "Token Groq" : "Token Groq (opsional)"}
      action={keyStatus.hasKey ? <Badge tone="good" dot>Terpasang</Badge> : <Badge tone="neutral">Belum dipasang</Badge>}
    >
      {keyStatus.hasKey || showKeyForm ? (
        keyStatus.hasKey && !showKeyForm ? (
          <div className="space-y-3 px-6 py-5 text-[13.5px]">{tokenMasked}</div>
        ) : keyStatus.hasKey ? (
          <div className="space-y-3 px-6 py-5 text-[13.5px]">{tokenForm}</div>
        ) : (
          <details className="group px-6 py-5 text-[13.5px]">
            <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-3 text-[13.5px] font-medium [&::-webkit-details-marker]:hidden">
              <span className="min-w-0">
                Kamu masih punya {keyStatus.freePerDay}x coba gratis per hari. Pakai token sendiri?
              </span>
              <ChevronDown size={16} className="shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden />
            </summary>
            <div className="mt-3 space-y-3">{tokenForm}</div>
          </details>
        )
      ) : null}
    </Card>
  );

  const editCard = content ? (
    <Card title="Ubah dengan perintah">
      <div className="space-y-3 px-6 py-5">
        <label htmlFor="ai-edit" className={labelCls}>Mau diubah apa?</label>
        <textarea
          ref={editRef}
          id="ai-edit"
          rows={2}
          maxLength={600}
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              void applyEdit();
            }
          }}
          aria-describedby="ai-edit-hint edit-hint"
          placeholder="Contoh: tambah 3 menu minuman, headline lebih santai, warna lebih gelap"
          className="input-solid w-full resize-y px-3.5 py-3 text-[13.5px] leading-relaxed"
        />
        <div className="flex flex-wrap gap-1.5">
          {editSuggestions(content.kind).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => { setEditText(t); editRef.current?.focus(); }}
              className="pill min-h-[36px] px-3 py-2 text-[12.5px]"
            >
              {t}
            </button>
          ))}
        </div>
        <Btn
          variant="primary"
          className="!py-2.5 !text-[13px] max-sm:w-full"
          busy={busy === "edit"}
          disabled={busy !== null || !canUseAi || !editReady}
          softDisabled
          aria-describedby="edit-hint"
          onDisabledClick={() => { say(editHint); editRef.current?.focus(); }}
          onClick={() => void applyEdit()}
        >
          <Sparkles size={14} /> {busy === "edit" ? "AI sedang mengubah…" : "Terapkan perubahan"}
        </Btn>
        <p id="edit-hint" className={cn(hintCls, "min-h-[1.1rem]")}>{editHint}</p>
        {editError && (
          <div className="notice notice-bad" role="alert">
            <CircleAlert size={15} className="mt-0.5 shrink-0" aria-hidden /> <span className="min-w-0">{editError}</span>
          </div>
        )}
        <p id="ai-edit-hint" className={`leading-relaxed ${hintCls}`}>
          Hanya bagian yang kamu sebut yang berubah; gambar dan pilihan di bagian 2 (Tampilan) tetap. Tekan Ctrl/⌘ + Enter untuk menerapkan.
          Salah ubah? Tombol Urungkan di kartu Pratinjau mengembalikannya. Perubahan tidak otomatis dipublish.
        </p>
      </div>
    </Card>
  ) : null;

  const publishArea =
    content && !isSample ? (
      <div className="space-y-3">
        {published && (
          <div className="notice notice-ok !block space-y-2.5 !p-4">
            <div className="flex items-start gap-1.5 font-semibold">
              <Check size={15} className="mt-0.5 shrink-0" aria-hidden />
              <span className="min-w-0">
                Online sampai {new Date(published.expiresAt).toLocaleString("id-ID")} ({timeLeftLabel(published.expiresAt)})
              </span>
            </div>
            <input
              readOnly
              aria-label="Link website"
              value={published.url}
              onFocus={(e) => e.currentTarget.select()}
              className="input-solid mono h-11 w-full px-3.5 text-[13px] text-text"
            />
            <div className="flex flex-wrap gap-2">
              <a
                href={published.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary inline-flex min-h-[40px] items-center gap-1.5 whitespace-nowrap px-3.5 py-1.5 text-[13px] font-medium"
              >
                <ExternalLink size={13} aria-hidden /> Buka website<span className="sr-only"> (tab baru)</span>
              </a>
              {shopActive && (
                <a
                  href={`${published.url}#kelola`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pill inline-flex min-h-[40px] items-center gap-1.5 whitespace-nowrap px-3.5 py-1.5 text-[13px] font-medium"
                >
                  <Pencil size={13} aria-hidden /> Mode kelola<span className="sr-only"> (tab baru)</span>
                </a>
              )}
              <Btn onClick={() => void copyText(published.url, "Link disalin.")}>
                <Copy size={13} /> Salin link
              </Btn>
              <Btn
                busy={exporting === "zip"}
                onClick={() => void runExport("zip", () => downloadZip(content, tplId, accentEff, renderOpts), "Proyek ZIP diunduh.")}
              >
                <Package size={13} /> Unduh ZIP
              </Btn>
            </div>
            <p className={`leading-relaxed ${hintCls} !text-current opacity-90`}>
              Setelah masa aktif habis, link mati otomatis. Opsi perpanjangan waktu akan tersedia mulai 3 hari sebelum link kedaluwarsa. Unduh ZIP kalau kamu mau menyimpan websitenya permanen. Link ini juga ada di menu Link Instan.
            </p>
          </div>
        )}

        {!cfg.enabled ? (
          <div className="notice notice-warn flex items-start gap-2 !p-3 text-[13px]">
            <Info size={15} className="mt-0.5 shrink-0" aria-hidden />
            <span className="min-w-0">Link Instan sedang tidak aktif di server ini, jadi websitenya hanya bisa dilihat di pratinjau dan diekspor sebagai file.</span>
          </div>
        ) : (
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <Btn
                variant={published ? "ghost" : "primary"}
                busy={busy === "publish"}
                disabled={busy !== null}
                softDisabled
                onClick={() => void publish(content, html)}
              >
                {busy === "publish"
                  ? progress || "Mempublikasikan…"
                  : published
                    ? "Publish sebagai link baru"
                    : lastPubId
                      ? "Publish versi terbaru"
                      : "Publish ke Link Instan"}
              </Btn>
              <span className={`tabular-nums ${hintCls}`}>Link aktif: {siteCount} dari {cfg.maxSites}</span>
            </div>
            {lastPubId && (
              <label className="flex min-h-[44px] items-start gap-2.5 text-[13.5px]">
                <input type="checkbox" checked={replacePrev} onChange={(e) => setReplacePrev(e.target.checked)} className={checkCls} />
                <span className="min-w-0">
                  Matikan link sebelumnya setelah publish
                  <span className={`block ${hintCls}`}>
                    Isi link lama tidak ikut berubah. Kalau sudah kamu bagikan, bagikan lagi link yang baru.
                  </span>
                </span>
              </label>
            )}
            <p className={`leading-relaxed ${hintCls}`}>
              Ganti template, warna, atau gambar di kolom pengaturan untuk melihat tampilan lain tanpa memanggil AI lagi. Setiap publish membuat link baru yang aktif {ttlLabel(ttlHours)}. Opsi perpanjangan waktu akan tersedia mulai 3 hari sebelum link kedaluwarsa.
            </p>
          </div>
        )}
      </div>
    ) : null;

  const previewCard = (
    <Card
      title="Pratinjau"
      action={
        <div className="flex flex-wrap items-center gap-1.5">
          {history.length > 0 && (
            <Btn onClick={undo} disabled={busy !== null} softDisabled>
              <Undo2 size={13} /> Urungkan
            </Btn>
          )}
          <span className="flex gap-1" role="group" aria-label="Ukuran pratinjau">
            <Btn variant={device === "desktop" ? "primary" : "ghost"} aria-pressed={device === "desktop"} onClick={() => setDevice("desktop")}>
              <Monitor size={13} /> Desktop
            </Btn>
            <Btn variant={device === "mobile" ? "primary" : "ghost"} aria-pressed={device === "mobile"} onClick={() => setDevice("mobile")}>
              <Smartphone size={13} /> HP
            </Btn>
          </span>
        </div>
      }
    >
      <div className="space-y-4 px-4 py-4 sm:px-6 sm:py-5">
        {isSample ? (
          <div className="notice notice-info flex items-start gap-2 !p-3 text-[13px] leading-snug">
            <Info size={15} className="mt-0.5 shrink-0" aria-hidden />
            <span className="min-w-0">
              Ini contoh tampilan dengan isi bayangan, supaya kamu bisa mencoba template dan warna dulu. Isi websitemu muncul setelah kamu menekan Buat website.
            </span>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2 text-[13px] text-text-muted">
            <Badge tone="good">{kindName}</Badge>
            {kindNote && <span className="min-w-0">{kindNote.charAt(0).toUpperCase() + kindNote.slice(1)}</span>}
          </div>
        )}

        <div className={cn("relative rounded-2xl bg-[var(--pill-bg)] p-2 sm:p-3", busy === "ai" && "opacity-60 transition-opacity motion-reduce:transition-none")} aria-busy={busy === "ai" || undefined}>
          <PreviewFrame html={html} device={device} />
          {busy === "ai" && (
            <div className="absolute inset-0 grid place-items-center" aria-hidden>
              <span className="notice notice-info inline-flex items-center gap-2 !px-4 !py-2.5 text-[13px] font-medium shadow-lg">
                <Loader2 size={15} className="animate-spin motion-reduce:animate-none" /> AI sedang merancang…
              </span>
            </div>
          )}
        </div>

        {publishArea}
      </div>
    </Card>
  );

  return (
    <ViewFade>
      <PageHead
        title="AI Web Builder"
        desc="Ceritakan usahamu atau topik blogmu. AI menentukan jenis situs, gaya, dan isinya. Kamu tinggal atur tampilan dan gambar, lalu publish ke Link Instan atau ekspor file."
      />
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">{announce}</div>

      {/* Layar lebar: pengaturan di kiri, pratinjau menempel di kanan. Layar sempit: satu kolom, pratinjau di atas setelah ada hasil. */}
      <div className="mt-6 grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] xl:items-start">
        <section
          ref={previewRef}
          tabIndex={-1}
          aria-label="Pratinjau website"
          className={cn(
            "min-w-0 scroll-mt-4 outline-none xl:sticky xl:top-4 xl:col-start-2 xl:row-start-1 xl:max-h-[calc(100dvh-2rem)] xl:overflow-y-auto",
            !content && "max-xl:hidden",
          )}
        >
          {previewCard}
        </section>

        <div className="min-w-0 space-y-5 xl:col-start-1 xl:row-start-1">
          {!canUseAi && tokenCardTop}
          {editCard}

          <Card title="1. Ceritakan websitemu" action={content ? <Btn onClick={() => void resetAll()}>Mulai baru</Btn> : undefined}>
            <div className="space-y-4 px-6 py-5">
              <div>
                <label htmlFor="ai-prompt" className={labelCls}>Deskripsi</label>
                <textarea
                  ref={promptRef}
                  id="ai-prompt"
                  rows={5}
                  maxLength={1400}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      void requestGenerate(false);
                    }
                  }}
                  aria-describedby="ai-prompt-hint gen-hint"
                  placeholder="Contoh: Warung bakso Pak Slamet, buka 10–21. Menu: bakso urat 15rb, es teler 12rb. Pesan via WA 0812…"
                  className="input-solid w-full resize-y px-3.5 py-3 text-[13.5px] leading-relaxed"
                />
                <div className="mt-1.5 flex items-start justify-between gap-3">
                  <span id="ai-prompt-hint" className={`min-w-0 ${hintCls}`}>
                    Sebutkan nama, produk atau topik, harga, jam buka, dan kontak. Makin detail, makin pas. Ctrl/⌘ + Enter untuk membuat.
                  </span>
                  <span className={`shrink-0 tabular-nums ${hintCls}`}>{prompt.length}/1400</span>
                </div>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {EXAMPLES.map((ex) => (
                    <button
                      key={ex.label}
                      type="button"
                      onClick={() => { setPrompt(ex.text); promptRef.current?.focus(); }}
                      className="pill min-h-[36px] px-3 py-2 text-[12.5px]"
                    >
                      {ex.label}
                    </button>
                  ))}
                </div>
              </div>

              <Field label="Foto (opsional)">
                <PhotoPool
                  photos={photos}
                  adding={photosAdding}
                  usedCount={photosUsed}
                  hasContent={!!content}
                  onAdd={addPhotos}
                  onRemove={removePhoto}
                  onMove={movePhoto}
                  onClear={clearPhotos}
                />
              </Field>

              <Field label="Jenis situs" htmlFor="ai-kind" hint={kindPick === "auto" ? "AI memilih sendiri dari deskripsimu." : KIND_LABEL[kindPick]}>
                <Select value={kindPick} onValueChange={(v) => setKindPick(v as SiteKind | "auto")}>
                  <SelectTrigger id="ai-kind" aria-label="Jenis situs">
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
                <label className="flex min-h-[44px] items-start gap-2.5 text-[13.5px]">
                  <input
                    type="checkbox"
                    checked={autoPublish && cfg.enabled}
                    disabled={!cfg.enabled}
                    onChange={(e) => setAutoPublish(e.target.checked)}
                    className={checkCls}
                  />
                  <span className="min-w-0">
                    Langsung publish setelah dibuat
                    <span className={`block ${hintCls}`}>
                      {cfg.enabled
                        ? `Memakai 1 dari ${cfg.maxSites} slot link aktif. Kalau tidak dicentang, kamu bisa melihat hasilnya dulu lalu publish sendiri.`
                        : "Link Instan sedang tidak aktif di server ini, jadi hanya pratinjau."}
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

              <p className={`-mt-1 leading-relaxed ${hintCls}`}>
                Masa aktif link maksimal 30 hari, lalu link dan filenya terhapus otomatis. Opsi perpanjangan waktu akan tersedia mulai 3 hari sebelum link kedaluwarsa.
              </p>

              <div className="space-y-2">
                <Btn
                  variant="primary"
                  className="w-full !py-2.5 !text-[13px]"
                  busy={busy !== null}
                  disabled={!canGenerate}
                  softDisabled
                  aria-describedby="gen-hint"
                  onDisabledClick={explainGenerate}
                  onClick={() => void requestGenerate(false)}
                >
                  <Sparkles size={14} /> {busyLabel ?? (content ? "Buat ulang dari deskripsi" : "Buat website")}
                </Btn>
                {content && (
                  <Btn
                    className="w-full !py-2.5 !text-[13px]"
                    busy={busy !== null}
                    disabled={!canGenerate}
                    softDisabled
                    aria-describedby="gen-hint"
                    onDisabledClick={explainGenerate}
                    onClick={() => void requestGenerate(true)}
                  >
                    <RefreshCw size={13} /> Coba gaya lain
                  </Btn>
                )}
                <p id="gen-hint" className={cn(hintCls, "min-h-[1.1rem]")}>{genHint}</p>
                {content && (
                  <p className={`leading-relaxed ${hintCls}`}>
                    &ldquo;Buat ulang dari deskripsi&rdquo; mengganti hasil sekarang. &ldquo;Coba gaya lain&rdquo; memakai deskripsi yang sama, tetapi AI memilih template, tata letak, dan warna yang berbeda (isi tulisan bisa ikut berubah).
                    Keduanya bisa dibatalkan dengan tombol Urungkan.
                  </p>
                )}
              </div>
              {error && (
                <div className="notice notice-bad" role="alert">
                  <CircleAlert size={15} className="mt-0.5 shrink-0" aria-hidden /> <span className="min-w-0">{error}</span>
                </div>
              )}
            </div>
          </Card>

          <Card title="2. Tampilan" action={isSample ? <span className={hintCls}>Pratinjau memakai isi contoh</span> : undefined}>
            <div className="space-y-5 px-6 py-5">
              <div role="radiogroup" aria-label="Cara mengatur tampilan" className="flex items-center gap-2">
                <Btn
                  variant={tampilanMode === "ai" ? "primary" : "ghost"}
                  aria-pressed={tampilanMode === "ai"}
                  onClick={() => setTampilanMode("ai")}
                  className="flex-1"
                >
                  Ikuti saran AI
                </Btn>
                <Btn
                  variant={tampilanMode === "manual" ? "primary" : "ghost"}
                  aria-pressed={tampilanMode === "manual"}
                  onClick={() => setTampilanMode("manual")}
                  className="flex-1"
                >
                  Atur manual
                </Btn>
              </div>
              <p className={`leading-relaxed ${hintCls}`}>
                {tampilanMode === "ai"
                  ? "AI menyarankan gaya yang serasi. Tata letak & huruf ikut gaya terpilih, bisa diubah di \u201cAtur manual\u201d."
                  : "Atur gaya, tata letak, warna, dan huruf satu per satu. Pratinjau di samping langsung berubah tiap pilihan diganti."}
              </p>

              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-[13px] font-medium text-text-muted">Gaya desain</span>
                  {template && (
                    <button type="button" onClick={() => setTemplate(null)} className="min-h-[32px] text-[12.5px] text-text-muted underline">
                      {content ? "Ikuti saran AI" : "Atur ulang"}
                    </button>
                  )}
                </div>
                <TemplatePicker
                  value={tplId}
                  suggestedId={content && !template ? content.template : null}
                  preview={previewContent}
                  palette={palette}
                  onPick={setTemplate}
                />
                <p className={`mt-2.5 rounded-2xl bg-[var(--pill-bg)] px-3.5 py-2.5 leading-relaxed ${hintCls}`}>
                  <b className="font-semibold text-text">{tpl.name}</b> · {tpl.desc}
                </p>
              </div>

              {tampilanMode === "manual" ? (
                <div className="rounded-2xl bg-[var(--pill-bg)] p-3.5">
                  <div className="mb-3 text-[13px] font-medium text-text-muted">Tata letak</div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Bagian paling atas" htmlFor="ai-hero" hint="Judul besar dan tombol di awal halaman.">
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
                    <Field label="Bagian keunggulan" htmlFor="ai-feat" hint="Daftar kelebihan di bawah bagian atas.">
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
                </div>
              ) : (
                <details className="group rounded-2xl bg-[var(--pill-bg)]">
                  <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-3.5 py-2.5 text-[13.5px] font-medium [&::-webkit-details-marker]:hidden">
                    <span className="min-w-0">
                      Atur tata letak <span className="font-normal text-text-muted">· {heroName}, {featName}</span>
                    </span>
                    <ChevronDown size={16} className="shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden />
                  </summary>
                  <div className="grid gap-3 px-3.5 pb-3.5 sm:grid-cols-2">
                    <Field label="Bagian paling atas" htmlFor="ai-hero-c" hint="Judul besar dan tombol di awal halaman.">
                      <Select value={heroEff} onValueChange={(v) => setHeroOpt(v as HeroLayout)}>
                        <SelectTrigger id="ai-hero-c">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {HERO_LAYOUTS.map((l) => (
                            <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Bagian keunggulan" htmlFor="ai-feat-c" hint="Daftar kelebihan di bawah bagian atas.">
                      <Select value={featEff} onValueChange={(v) => setFeatOpt(v as FeatLayout)}>
                        <SelectTrigger id="ai-feat-c">
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
                </details>
              )}

              <div>
                <div className="mb-2 flex items-center gap-1.5 text-[13px] font-medium text-text-muted">
                  <Palette size={13} aria-hidden /> Warna
                </div>
                <PaletteEditor colors={colors} custom={palette !== null} pageBg={tpl.swatch[0]} onChange={setPalette} onReset={() => setPalette(null)} />
              </div>

              {tampilanMode === "manual" && (
                <div>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-[13px] font-medium text-text-muted">Jenis huruf</span>
                    {fontOpt && (
                      <button type="button" onClick={() => setFontOpt(null)} className="min-h-[32px] text-[12.5px] text-text-muted underline">
                        Ikuti gaya desain
                      </button>
                    )}
                  </div>
                  <FontPicker value={fontOpt} template={tplId} accent={accentEff} palette={palette} preview={previewContent} onPick={setFontOpt} />
                  <p className={`mt-2.5 rounded-2xl bg-[var(--pill-bg)] px-3.5 py-2.5 leading-relaxed ${hintCls}`}>
                    {fontOpt ? (
                      <>
                        <b className="font-semibold text-text">{fontName}</b> · {FONT_OPTIONS.find((f) => f.id === fontOpt)?.desc}
                      </>
                    ) : (
                      "Belum diubah, masih mengikuti huruf bawaan Gaya desain di atas."
                    )}
                  </p>
                </div>
              )}

              {content && hasShop(content) && (
                <label className="flex min-h-[44px] items-start gap-2.5 rounded-2xl bg-[var(--pill-bg)] p-3.5 text-[13.5px]">
                  <input type="checkbox" checked={shopOn} onChange={(e) => setShopOn(e.target.checked)} className={checkCls} />
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 font-medium"><Store size={14} className="shrink-0" aria-hidden /> Katalog, keranjang, dan mode kelola</span>
                    <span className={`mt-0.5 block leading-snug ${hintCls}`}>Pengunjung bisa cari produk, mengisi keranjang, lalu memesan lewat WhatsApp.</span>
                  </span>
                </label>
              )}
            </div>
          </Card>

          <Card title="3. Gambar" action={<span className={`tabular-nums ${hintCls}`}>{formatBytes(imgBytes)} / {formatBytes(IMAGE_BUDGET_BYTES)}</span>}>
            <div className="space-y-4 px-6 py-5">
              <div
                className="h-1.5 overflow-hidden rounded-full bg-[var(--pill-bg)]"
                role="progressbar"
                aria-label="Ukuran gambar terpakai"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.min(100, Math.round((imgBytes / IMAGE_BUDGET_BYTES) * 100))}
              >
                <div className="h-full rounded-full bg-[var(--accent)] transition-[width] motion-reduce:transition-none" style={{ width: `${Math.min(100, (imgBytes / IMAGE_BUDGET_BYTES) * 100)}%` }} />
              </div>
              <ul className="space-y-3">
                {visibleSlots.map((d) => (
                  <ImageRow key={d.key} def={d} src={images[d.key]} busy={imgBusy === d.key} onPick={() => pickImage(d)} onRemove={() => removeImage(d.key)} />
                ))}
              </ul>
              {imageSlots.length > 6 && (
                <button type="button" onClick={() => setShowAllImgs((v) => !v)} aria-expanded={showAllImgs} className="min-h-[36px] text-[12.5px] text-text-muted underline">
                  {showAllImgs ? "Tampilkan lebih sedikit" : `Tampilkan semua (${imageSlots.length})`}
                </button>
              )}
              {!content && (
                <p className={`leading-snug ${hintCls}`}>
                  Belum mengunggah foto di bagian 1? Tidak masalah. Foto produk atau sampul artikel muncul di sini setelah websitenya dibuat, lalu unggah satu per satu.
                </p>
              )}
              <p className={`leading-snug ${hintCls}`}>
                PNG, JPG, WebP, atau GIF. Gambar otomatis dikecilkan di browser dan ikut tertanam saat publish atau ekspor. Gambar tidak ikut draf otomatis, jadi unduh ZIP atau publish sebelum menutup halaman.
              </p>
              <input ref={fileRef} type="file" accept={IMAGE_ACCEPT} className="hidden" tabIndex={-1} aria-hidden onChange={onFile} />
            </div>
          </Card>

          {content && shopActive && (
            <Card title="Kelola produk (untuk pemilik)" action={<Badge tone="good" dot>Aktif</Badge>}>
              <div className="space-y-4 px-6 py-5">
                <ol className="list-decimal space-y-2 pl-5 text-[13.5px] leading-relaxed text-text-muted marker:font-medium marker:text-text">
                  <li>Pratinjau sudah dalam <b className="text-text">mode kelola</b>: coba tambah, ubah, atau hapus produk langsung di kartunya.</li>
                  <li>Di situs yang sudah online, tambahkan <code className="mono">#kelola</code> di akhir link untuk masuk mode kelola. Pengunjung biasa tidak melihatnya.</li>
                  <li>Setelah selesai, tekan <b className="text-text">Unduh situs</b> di bilah kelola, lalu upload ulang file itu supaya semua pengunjung melihat versi terbaru.</li>
                </ol>
                <div className="notice notice-warn flex items-start gap-2 !p-3 text-[13px] leading-snug">
                  <CircleAlert size={15} className="mt-0.5 shrink-0" aria-hidden />
                  <span className="min-w-0">
                    Perubahan produk hanya tersimpan di browser pemilik, bukan di server. Kalau ganti browser atau data browser dihapus sebelum kamu mengunduh situsnya, perubahan itu hilang.
                  </span>
                </div>
              </div>
            </Card>
          )}

          {content && (
            <Card title="Ekspor file">
              <div className="space-y-3 px-6 py-5">
                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                  <Btn variant="primary" busy={exporting === "zip"} onClick={() => void runExport("zip", () => downloadZip(content, tplId, accentEff, renderOpts), "Proyek ZIP diunduh.")}>
                    <Package size={13} /> Unduh ZIP proyek
                  </Btn>
                  <Btn busy={exporting === "html"} onClick={() => void runExport("html", () => downloadHtml(content, tplId, accentEff, renderOpts), "File HTML diunduh.")}>
                    <FileCode2 size={13} /> Unduh index.html
                  </Btn>
                  <Btn busy={exporting === "json"} onClick={() => void runExport("json", () => downloadJson(content, tplId, accentEff, renderOpts), "content.json diunduh.")}>
                    <FileJson size={13} /> content.json
                  </Btn>
                  <Btn
                    onClick={async () => {
                      const ok = await copyHtml(content, tplId, accentEff, renderOpts);
                      if (ok) setSavedHtml(html);
                      showToast(ok ? "Kode HTML disalin." : "Tidak bisa menyalin otomatis. Pakai tombol unduh.");
                    }}
                  >
                    <Copy size={13} /> Salin HTML
                  </Btn>
                </div>
                <p className={`flex items-start gap-1.5 leading-relaxed ${hintCls}`}>
                  <Download size={13} className="mt-0.5 shrink-0" aria-hidden />
                  <span className="min-w-0">
                    ZIP berisi index.html, assets/style.css{shopActive ? ", assets/app.js" : ""}
                    {imgBytes > 0 ? ", assets/img (gambarmu)" : ""}, content.json, dan README. Bisa dibuka langsung di browser dan di-upload ke hosting statis mana pun.
                  </span>
                </p>
              </div>
            </Card>
          )}

          {canUseAi && tokenCardBottom}
        </div>
      </div>

      {/* Layar sempit: jalan pintas kembali ke pratinjau saat sedang mengatur di bawah. */}
      {content && !previewVisible && (
        <button
          type="button"
          onClick={goPreview}
          className="btn-primary fixed bottom-24 right-4 z-40 inline-flex min-h-[44px] items-center gap-2 px-4 text-[13px] font-semibold shadow-lg xl:hidden"
        >
          <Eye size={15} aria-hidden /> Lihat pratinjau
        </button>
      )}
    </ViewFade>
  );
}
