"use client";

import * as React from "react";
import {
  Sparkles, ExternalLink, Copy, Trash2, CircleAlert, Check, RefreshCw, Download, FileCode2,
  FileJson, Package, Monitor, Smartphone, Store, Pencil, ImagePlus, ImageIcon, X, Palette, Undo2, Redo2,
  Info, ChevronDown, Loader2, LayoutTemplate, PanelsTopLeft, Type, Shapes, Rows3, FileText, WandSparkles, Send,
  Globe, Rocket, SlidersHorizontal, MousePointerClick, type LucideIcon,
} from "lucide-react";
import { PageHead, Btn, BtnLink, Loading } from "@/components/ui/primitives";
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
  DESIGN_STYLES,
  DECOR_OPTIONS,
  BG_PRESETS,
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
  type DesignStyleId,
  type DecorId,
  type FontRoleId,
  type FontWeightId,
  FONT_WEIGHTS,
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
import { remapImages, setContentField } from "@/lib/ai-site-edit";
import { ICON_STYLES, isIconStyle, templateIconStyle, treatIcon, type IconStyle } from "@/lib/site-assets";
import { LUCIDE } from "@/lib/lucide-icons";
import { pixelIcon } from "@/lib/lucide-pixel";
import { Field, api, checkCls, chipCls, ChipLabel, subheadCls, swatchTileCls, ON_MIST, hintCls, isHex, labelCls, timeLeftLabel, ttlLabel, useReducedMotion } from "./ai-site/shared";
import { PaletteEditor } from "./ai-site/PaletteEditor";
import { PhotoPool } from "./ai-site/PhotoPool";
import { TemplatePicker } from "./ai-site/TemplatePicker";
import { StylePicker } from "./ai-site/StylePicker";
import { FontRolePicker } from "./ai-site/FontRolePicker";
import { CanvasFrame, type CanvasHandle, type CanvasMsg } from "./ai-site/CanvasFrame";
import { HeroLayoutPicker, FeatLayoutPicker } from "./ai-site/LayoutPicker";
import { SectionsPanel } from "./ai-site/SectionsPanel";

interface KeyStatus {
  hasKey: boolean;
  masked: string | null;
  freePerDay: number;
}

/** Contoh perintah ubah, disesuaikan jenis situs. */
function editSuggestions(kind: SiteKind): string[] {
  // Hanya perintah yang dipahami mesin Depup (lib/site-engine/core.ts → editSite).
  const base = ["Ganti warna jadi hijau", "Pakai template gelap", "Hapus testimoni"];
  if (kind === "artikel") return ["Pakai template jurnal", "Ganti warna jadi navy", "Ganti tombol jadi Mulai membaca"];
  if (kind === "umkm") return ["Tambah 3 menu minuman", ...base];
  if (kind === "event") return ["Ganti tombol jadi Daftar sekarang", ...base];
  return ["Ganti tombol jadi Hubungi kami", ...base];
}

/** Panel editor ala Canva (rel kiri di layar lebar, bilah bawah + lembar di HP). */
type PanelId = "desain" | "tata" | "warna" | "huruf" | "elemen" | "bagian" | "foto" | "isi" | "terbit";
const PANELS: { id: Exclude<PanelId, "terbit">; label: string; icon: LucideIcon }[] = [
  { id: "desain", label: "Desain", icon: LayoutTemplate },
  { id: "tata", label: "Tata letak", icon: PanelsTopLeft },
  { id: "warna", label: "Warna", icon: Palette },
  { id: "huruf", label: "Huruf", icon: Type },
  { id: "elemen", label: "Elemen", icon: Shapes },
  { id: "bagian", label: "Bagian", icon: Rows3 },
  { id: "foto", label: "Foto", icon: ImageIcon },
  { id: "isi", label: "Deskripsi", icon: FileText },
];

/** Gaya hasil latihan yang bisa dipasang sekali klik (lewat perintah ubah; butuh paket gayanya sudah diimpor). */
const QUICK_STYLES: { label: string; name: string; cmd: string }[] = [
  { label: "Brutalism", name: "Brutalism Poster", cmd: "pakai gaya brutalism" },
  { label: "Neo brutal", name: "Neo Brutal Klasik", cmd: "pakai gaya neo brutal klasik" },
  { label: "Neo pop", name: "Neo Pop Stiker", cmd: "pakai gaya neo pop" },
  { label: "Neo pastel", name: "Neo Pastel", cmd: "pakai gaya neo pastel" },
  { label: "Neo kolase", name: "Neo Zine Kolase", cmd: "pakai gaya neo kolase" },
  { label: "Neo geometris", name: "Neo Geometris", cmd: "pakai gaya neo geometris" },
];

/** Keluarga ornamen bawaan paket elemen Depup. */
const ORN_FAMILIES: { id: string; label: string }[] = [
  { id: "neo", label: "Neo brutal" },
  { id: "memphis", label: "Memphis" },
  { id: "nusantara", label: "Nusantara" },
  { id: "organik", label: "Organik" },
  { id: "retro", label: "Retro" },
  { id: "y2k", label: "Y2K" },
  { id: "minimal", label: "Minimal" },
  { id: "doodle", label: "Doodle" },
  { id: "kertas", label: "Kertas" },
  { id: "pantai", label: "Pantai" },
  { id: "piksel", label: "Piksel" },
  { id: "grafis", label: "Grafis" },
];

/** true di layar lebar (≥1024px): panel di samping kanvas, bukan lembar bawah. */
function useIsWide(): boolean {
  const [wide, setWide] = React.useState(true);
  React.useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    setWide(mq.matches);
    const on = (e: MediaQueryListEvent) => setWide(e.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return wide;
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
  styleOpt: unknown;
  decorOpt: unknown;
  bgOpt: unknown;
  fontsOpt: unknown;
  tampilanMode: unknown;
  shopOn: boolean;
  variant: number;
  hadImages: boolean;
  /** Ditambahkan belakangan: draf lama tidak punya (tetap v: 1). */
  iconOpt?: unknown;
  ornOff?: unknown;
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
const validStyle = (v: unknown): v is DesignStyleId => DESIGN_STYLES.some((s) => s.id === v);
const validDecor = (v: unknown): v is DecorId => DECOR_OPTIONS.some((d) => d.id === v);
const validBg = (v: unknown): v is string => typeof v === "string" && isHex(v);
const FONT_ROLE_IDS: FontRoleId[] = ["sans", "serif", "slab", "mono", "display"];
const validFontRole = (v: unknown): v is FontRoleId => FONT_ROLE_IDS.includes(v as FontRoleId);
const FONT_WEIGHT_IDS: FontWeightId[] = FONT_WEIGHTS.map((w) => w.id);
const validFontWeight = (v: unknown): v is FontWeightId => FONT_WEIGHT_IDS.includes(v as FontWeightId);
interface RoleSetting {
  family: FontRoleId | null;
  weight: FontWeightId | null;
}
interface FontRoles {
  title: RoleSetting;
  sub: RoleSetting;
  body: RoleSetting;
}
const EMPTY_ROLE: RoleSetting = { family: null, weight: null };
const EMPTY_FONTS: FontRoles = { title: EMPTY_ROLE, sub: EMPTY_ROLE, body: EMPTY_ROLE };
const validRoleSetting = (v: unknown): v is RoleSetting =>
  !!v &&
  typeof v === "object" &&
  (v as RoleSetting).family !== undefined &&
  (v as RoleSetting).weight !== undefined &&
  ((v as RoleSetting).family === null || validFontRole((v as RoleSetting).family)) &&
  ((v as RoleSetting).weight === null || validFontWeight((v as RoleSetting).weight));
const validFonts = (v: unknown): v is FontRoles =>
  !!v &&
  typeof v === "object" &&
  (["title", "sub", "body"] as const).every((k) => validRoleSetting((v as FontRoles)[k]));
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
  styleOpt: DesignStyleId | null;
  decorOpt: DecorId | null;
  bgOpt: string | null;
  fontsOpt: FontRoles;
  iconOpt: IconStyle | null;
  ornOff: boolean;
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
        <p className="truncate text-[14px] font-medium">{def.label}</p>
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

  const [trainConsent, setTrainConsent] = React.useState(false);
  React.useEffect(() => {
    try {
      setTrainConsent(localStorage.getItem("depup-engine-consent") === "1");
    } catch {
      /* penyimpanan tidak tersedia */
    }
  }, []);

  const [prompt, setPrompt] = React.useState("");
  const [kindPick, setKindPick] = React.useState<SiteKind | "auto">("auto");
  // null = ikuti saran AI; nilai terisi = pilihan manual pengguna
  const [template, setTemplate] = React.useState<TemplateId | null>(null);
  // null = dua warna bawaan template; array = palet buatan pengguna (2 sampai MAX_PALETTE warna)
  const [palette, setPalette] = React.useState<string[] | null>(null);
  const [heroOpt, setHeroOpt] = React.useState<HeroLayout | null>(null);
  const [featOpt, setFeatOpt] = React.useState<FeatLayout | null>(null);
  // null = ikut bentuk bawaan Template; nilai terisi = gerakan desain pilihan pengguna (mode "Atur manual")
  const [styleOpt, setStyleOpt] = React.useState<DesignStyleId | null>(null);
  // null = ikut hiasan bawaan Gaya desain/Template. Hiasan murni dekoratif di belakang judul hero.
  const [decorOpt, setDecorOpt] = React.useState<DecorId | null>(null);
  // null = ikut warna latar bawaan Template; nilai terisi = latar kustom (mode "Atur manual")
  const [bgOpt, setBgOpt] = React.useState<string | null>(null);
  // null = ikut gaya ikon pilihan mesin / ciri khas Template; nilai terisi = gaya ikon pilihan pengguna
  const [iconOpt, setIconOpt] = React.useState<IconStyle | null>(null);
  // true = sembunyikan ornamen dari paket elemen (content.ornaments)
  const [ornOff, setOrnOff] = React.useState(false);
  // null per peran = ikut Gaya desain/Template (Sub-judul: ikut Judul lebih dulu, lihat lib/ai-site-templates.ts)
  const [fontsOpt, setFontsOpt] = React.useState<FontRoles>(EMPTY_FONTS);
  // Cara menampilkan kartu "2. Tampilan": "ai" = ringkas (Template + Warna, tata letak disembunyikan),
  // "manual" = Template, Tata letak, Warna, Gaya desain, Hiasan, dan Huruf sejajar dan terbuka semua.
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

  const [panel, setPanel] = React.useState<PanelId | null>(null);
  // Layar lebar: panel Desain langsung terbuka seperti Canva. HP: kanvas dulu, panel dibuka dari bilah bawah.
  React.useEffect(() => {
    if (window.matchMedia("(min-width: 1024px)").matches) setPanel("desain");
    else setDevice("mobile");
  }, []);
  const [selSec, setSelSec] = React.useState<string | null>(null);
  const [future, setFuture] = React.useState<Snapshot[]>([]);
  const [canvasNonce, setCanvasNonce] = React.useState(0);
  const canvasRef = React.useRef<CanvasHandle>(null);
  const lastPushRef = React.useRef(0);
  const isWide = useIsWide();
  const promptRef = React.useRef<HTMLTextAreaElement>(null);
  const editRef = React.useRef<HTMLInputElement>(null);
  const pendingFocusRef = React.useRef(false);

  /* ---------- muat data awal + pulihkan draft ---------- */

  React.useEffect(() => {
    let alive = true;
    setLoadErr(null);
    (async () => {
      try {
        // Mesin lokal: tidak ada token atau jatah harian yang perlu dicek.
        const c = await fetchSites();
        if (!alive) return;
        setKeyStatus({ hasKey: true, masked: null, freePerDay: 0 });
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
            if (validStyle(d.styleOpt)) setStyleOpt(d.styleOpt);
            if (validDecor(d.decorOpt)) setDecorOpt(d.decorOpt);
            if (validBg(d.bgOpt)) setBgOpt(d.bgOpt);
            if (validFonts(d.fontsOpt)) setFontsOpt(d.fontsOpt);
            if (isIconStyle(d.iconOpt)) setIconOpt(d.iconOpt);
            if (d.ornOff === true) setOrnOff(true);
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

  // Sebelum ada hasil AI, pratinjau memakai isi contoh supaya pilihan template/warna langsung terlihat efeknya.
  const previewContent = React.useMemo<SiteContent>(
    () => content ?? sampleContent(kindPick === "auto" ? "jasa" : kindPick),
    [content, kindPick],
  );
  const tplId: TemplateId = template ?? content?.template ?? "bersih";
  const tpl = TEMPLATES.find((t) => t.id === tplId)!;
  // Gaya hasil latihan (content.look) tetap dipakai walau warnanya diubah; Template/gaya desain/latar sendiri melepasnya.
  const lookOn = !!content?.look && !template && !styleOpt && !bgOpt;
  const baseColors = React.useMemo<string[]>(() => {
    // Gaya aktif: panel Warna menampilkan warna gaya itu (aksen, aksen kedua, lalu warna kartu/stiker).
    if (lookOn && content?.look) {
      const L = content.look;
      return [...new Set([(content.accent && isHex(content.accent) ? content.accent : L.accent).toLowerCase(), L.accent2, ...L.swatches])].slice(0, MAX_PALETTE);
    }
    const d = defaultPalette(tplId);
    return [(!template && content?.accent) || d[0], d[1]];
  }, [tplId, template, content?.accent, content?.look, lookOn]);
  const colors = palette ?? baseColors;
  const accentEff = colors[0];
  const bgEff = bgOpt ?? (lookOn && content?.look ? content.look.bg : tpl.swatch[0]);
  const heroEff = heroOpt ?? content?.hero ?? "center";
  const featEff = featOpt ?? content?.feat ?? "grid";
  const fontsEff = React.useMemo<RenderOpts["fonts"]>(
    () => ({
      title: { family: fontsOpt.title.family ?? undefined, weight: fontsOpt.title.weight ?? undefined },
      sub: { family: fontsOpt.sub.family ?? undefined, weight: fontsOpt.sub.weight ?? undefined },
      body: { family: fontsOpt.body.family ?? undefined, weight: fontsOpt.body.weight ?? undefined },
    }),
    [fontsOpt],
  );
  // Gaya ikon yang sedang tampil (sama dengan aturan di buildSite): manual > pilihan mesin > ciri khas Template.
  const iconEff: IconStyle =
    iconOpt ?? (content?.iconStyle ? (lookOn || tplId === content.template ? content.iconStyle : templateIconStyle(tplId)) : "garis");
  // Contoh ikon di pilihan "Gaya ikon": ikon usaha ini sendiri (bawaan atau impor), selain itu ikon toko.
  const iconGlyph = React.useCallback(
    (style: IconStyle): string => {
      const own = content?.brandIcon && (LUCIDE[content.brandIcon] || content.icons?.[content.brandIcon]) ? content.brandIcon : "store";
      const inner = LUCIDE[own] ?? content?.icons?.[own] ?? LUCIDE.store;
      const alt = style === "garis" ? undefined : (content?.iconAlt?.[style]?.[own] ?? (style === "piksel" ? pixelIcon(own) : undefined));
      return treatIcon(inner, style, alt);
    },
    [content],
  );
  const renderOpts = React.useMemo<RenderOpts>(
    () => ({
      hero: heroEff, feat: featEff, shop: shopOn, palette: palette ?? undefined,
      style: styleOpt ?? undefined, decor: decorOpt ?? undefined, bg: bgOpt ?? undefined, fonts: fontsEff, images, look: lookOn,
      iconStyle: iconOpt ?? undefined, ornaments: !ornOff,
    }),
    [heroEff, featEff, shopOn, palette, styleOpt, decorOpt, bgOpt, fontsEff, images, lookOn, iconOpt, ornOff],
  );
  const html = React.useMemo(
    () => renderSite(previewContent, tplId, accentEff, renderOpts),
    [previewContent, tplId, accentEff, renderOpts],
  );
  // Kanvas editor: versi yang bisa diklik (data-f/data-sec/data-img). Publish & ekspor tetap memakai `html` di atas.
  const canvasHtml = React.useMemo(
    () => renderSite(previewContent, tplId, accentEff, { ...renderOpts, editable: true }) + (canvasNonce ? `<!--${canvasNonce}-->` : ""),
    [previewContent, tplId, accentEff, renderOpts, canvasNonce],
  );
  const shopActive = !!content && hasShop(content) && shopOn;
  const imgBytes = totalImageBytes(images);

  const canUseAi = true;
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
      styleOpt !== null ||
      decorOpt !== null ||
      bgOpt !== null ||
      iconOpt !== null ||
      ornOff ||
      fontsOpt.title.family !== null ||
      fontsOpt.title.weight !== null ||
      fontsOpt.sub.family !== null ||
      fontsOpt.sub.weight !== null ||
      fontsOpt.body.family !== null ||
      fontsOpt.body.weight !== null);
  const dirtyMedia = !!content && html !== savedHtml && (Object.keys(images).length > 0 || photos.length > 0);

  const noAiMsg = "";
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
          v: 1, prompt, kindPick, content, template, palette, heroOpt, featOpt, styleOpt, decorOpt, bgOpt, fontsOpt, tampilanMode, shopOn, variant,
          hadImages: Object.keys(images).length > 0, iconOpt, ornOff,
        };
        localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
      } catch {
        /* penyimpanan penuh / diblokir: abaikan */
      }
    }, 600);
    return () => window.clearTimeout(t);
  }, [hydrated, prompt, kindPick, content, template, palette, heroOpt, featOpt, styleOpt, decorOpt, bgOpt, fontsOpt, tampilanMode, shopOn, variant, images, iconOpt, ornOff]);

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

  // Setelah generate: kembali ke atas supaya editor terlihat penuh.
  React.useEffect(() => {
    if (!content || !pendingFocusRef.current) return;
    pendingFocusRef.current = false;
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  }, [content, reduced]);

  /* ---------- riwayat / urungkan ---------- */

  function snapshot(): Snapshot | null {
    return content ? { content, images, template, palette, heroOpt, featOpt, styleOpt, decorOpt, bgOpt, fontsOpt, iconOpt, ornOff, variant, shopOn } : null;
  }

  function pushHistory() {
    const s = snapshot();
    if (s) setHistory((h) => [...h.slice(-29), s]);
    setFuture([]);
    lastPushRef.current = Date.now();
  }

  /**
   * Satu perubahan tampilan dari panel: simpan titik urungkan lalu jalankan. `merge` = perubahan beruntun (geser warna)
   * digabung jadi satu langkah urungkan selama jedanya < 1,2 detik.
   */
  function change(fn: () => void, merge = false) {
    if (!merge || Date.now() - lastPushRef.current > 1200) pushHistory();
    else lastPushRef.current = Date.now();
    fn();
  }

  function restore(s: Snapshot) {
    setContent(s.content);
    setImages(s.images);
    setTemplate(s.template);
    setPalette(s.palette);
    setHeroOpt(s.heroOpt);
    setFeatOpt(s.featOpt);
    setStyleOpt(s.styleOpt);
    setDecorOpt(s.decorOpt);
    setBgOpt(s.bgOpt);
    setFontsOpt(s.fontsOpt);
    setIconOpt(s.iconOpt);
    setOrnOff(s.ornOff);
    setVariant(s.variant);
    setShopOn(s.shopOn);
  }

  function redo() {
    const next = future[future.length - 1];
    const cur = snapshot();
    if (!next || !cur || busy !== null) return;
    setFuture(future.slice(0, -1));
    setHistory((h) => [...h.slice(-29), cur]);
    restore(next);
    setPublished(null);
    showToast("Perubahan diulang.");
  }

  function undo() {
    const last = history[history.length - 1];
    if (!last || busy !== null) return;
    const cur = snapshot();
    if (cur) setFuture((f) => [...f.slice(-29), cur]);
    setHistory(history.slice(0, -1));
    setContent(last.content);
    setImages(last.images);
    setTemplate(last.template);
    setPalette(last.palette);
    setHeroOpt(last.heroOpt);
    setFeatOpt(last.featOpt);
    setStyleOpt(last.styleOpt);
    setDecorOpt(last.decorOpt);
    setBgOpt(last.bgOpt);
    setFontsOpt(last.fontsOpt);
    setIconOpt(last.iconOpt);
    setOrnOff(last.ornOff);
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
      // Contoh latih untuk mesin Depup: hanya bila pengguna mengizinkan. Gagal = diam, tidak mengganggu publish.
      if (trainConsent && prompt.trim().length >= 10) {
        void fetch("/api/ai/site/feedback", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ prompt: prompt.trim(), content: c }),
        }).catch(() => undefined);
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
      const r = await api<{ content: SiteContent; source: string }>("/api/ai/site", {
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
      // Gaya visual dari mesin (mis. brutalism) mengatur warna, huruf, garis, dan tata letak seluruh halaman.
      // Pilihan tampilan manual yang tersisa dari sebelumnya (Template, warna, gaya, latar, huruf) akan mematikannya,
      // jadi dilepas supaya gaya baru benar-benar terlihat di semua bagian.
      const hadManual = !!(template || palette || styleOpt || bgOpt || decorOpt || heroOpt || iconOpt || fontsOpt.title.family || fontsOpt.sub.family || fontsOpt.body.family);
      if (again || r.content.look) {
        setTemplate(null);
        setPalette(null);
        setHeroOpt(null);
        setFeatOpt(null);
        setStyleOpt(null);
        setDecorOpt(null);
        setBgOpt(null);
        setFontsOpt(EMPTY_FONTS);
        setIconOpt(null);
      }
      // Hasil baru membawa ornamen baru: tampilkan lagi.
      setOrnOff(false);
      if (r.content.look && hadManual && !again) showToast(`Gaya ${r.content.look.name} dipakai. Pilihan tampilan manual sebelumnya dilepas.`);
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
            feat: r.content.feat,
            shop: shopOn,
            palette: pal ?? undefined,
            style: (again ? null : styleOpt) ?? undefined,
            decor: (again ? null : decorOpt) ?? undefined,
            bg: (again ? null : bgOpt) ?? undefined,
            look: again || !(template || styleOpt || bgOpt),
            iconStyle: (again ? null : iconOpt) ?? undefined,
            fonts: again
              ? undefined
              : {
                  title: { family: fontsOpt.title.family ?? undefined, weight: fontsOpt.title.weight ?? undefined },
                  sub: { family: fontsOpt.sub.family ?? undefined, weight: fontsOpt.sub.weight ?? undefined },
                  body: { family: fontsOpt.body.family ?? undefined, weight: fontsOpt.body.weight ?? undefined },
                },
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
    promptRef.current?.focus();
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
          "Hasil dan pengaturan yang sekarang akan diganti dengan hasil baru. Kalau tidak cocok, tombol Urungkan di kartu Pratinjau mengembalikannya.",
        confirmLabel: "Ya, buat ulang",
      });
      if (!ok) return;
    }
    await generate(again);
  }

  async function applyEdit(command?: string) {
    if (!content || busy !== null) return;
    const instruction = command ?? editText;
    if (!command && (!canUseAi || !editReady)) {
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
        body: JSON.stringify({ instruction, current: content }),
      });
      if (r.changed.length === 0) {
        if (command) showToast(r.note || "Belum bisa diterapkan.");
        else setEditError(r.note || "Tidak ada yang berubah. Coba kalimat yang lebih spesifik.");
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
      // Gaya visual baru dari perintah ("pakai gaya brutalism"): lepas pilihan manual yang akan mematikannya.
      if (r.changed.includes("look") && r.content.look) {
        setTemplate(null);
        setPalette(null);
        setStyleOpt(null);
        setBgOpt(null);
        setDecorOpt(null);
        setFontsOpt(EMPTY_FONTS);
        setHeroOpt(null);
        setFeatOpt(null);
      }
      if (r.changed.includes("hero")) setHeroOpt(null);
      if (r.changed.includes("feat")) setFeatOpt(null);
      // Gaya ikon / ornamen dari perintah: lepas pilihan manual yang menutupinya.
      if (r.changed.includes("iconStyle")) setIconOpt(null);
      if (r.changed.includes("ornaments")) setOrnOff(false);
      setPublished(null);
      if (!command) setEditText("");
      showToast(r.note || "Perubahan diterapkan.");
    } catch (e) {
      setEditError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  /** Tombol panel yang memakai perintah mesin (gaya siap pakai, keluarga hiasan). */
  async function runCommand(cmd: string) {
    await applyEdit(cmd);
  }

  /* ---------- kanvas: ketik langsung, klik gambar, pilih bagian ---------- */

  function setSections(next: NonNullable<SiteContent["sections"]>) {
    change(() => setContent((c) => (c ? { ...c, sections: next } : c)));
    setPublished(null);
  }

  function selectSection(id: string) {
    setSelSec(id);
    canvasRef.current?.select(id);
  }

  function onCanvasMsg(m: CanvasMsg) {
    if (!content) return;
    if (m.dp === "edit") {
      const next = setContentField(content, m.f, m.v);
      if (next) {
        pushHistory();
        setContent(next);
        setPublished(null);
        say("Teks diperbarui.");
      } else {
        // Teks wajib dikosongkan / bidang tak dikenal: kembalikan kanvas ke isi semula.
        if (!m.v.trim()) showToast("Teks ini wajib diisi, jadi dikembalikan.");
        setCanvasNonce((n) => n + 1);
      }
    } else if (m.dp === "img") {
      const def = imageSlots.find((d) => d.key === m.k);
      if (def) pickImage(def);
    } else if (m.dp === "sec") {
      setSelSec(m.id);
      setPanel(m.id === "hero" || m.id === "fitur" ? "tata" : "bagian");
    }
  }

  // Ctrl/⌘+Z = urungkan, Ctrl/⌘+Shift+Z atau Ctrl+Y = ulangi (kecuali sedang mengetik di kolom).
  React.useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      const k = e.key.toLowerCase();
      if (k === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((k === "z" && e.shiftKey) || k === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  });

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
    setStyleOpt(null);
    setDecorOpt(null);
    setBgOpt(null);
    setFontsOpt(EMPTY_FONTS);
    setIconOpt(null);
    setOrnOff(false);
    setTampilanMode("ai");
    setShopOn(true);
    setVariant(0);
    setHistory([]);
    setFuture([]);
    setSelSec(null);
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
        <PageHead title="AI Web Builder" desc="Ceritakan usaha atau topik blogmu; AI menyusun situsnya, lalu kamu publish ke Link Instan atau ekspor file." />
        <div className="notice notice-bad mt-6" role="alert">
          <CircleAlert size={16} className="mt-0.5 shrink-0" aria-hidden />
          <span className="min-w-0">
            <span className="block font-semibold">AI Web Builder belum bisa dimuat.</span>
            <span className="block">{loadErr} Kalau masih gagal setelah dicoba lagi, tanyakan lewat tombol Bantuan di pojok kanan bawah.</span>
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
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

  const busyLabel =
    busy === "edit" ? "Mesin sedang mengubah…" : busy === "ai" ? progress || "Mesin sedang menyusun…" : busy === "publish" ? progress || "Mempublikasikan…" : null;
  const kindName = content ? KIND_OPTIONS.find((k) => k.id === content.kind)?.name ?? content.kind : "";

  // Izin memakai website ini sebagai contoh latih mesin Depup (default mati, diingat per perangkat).
  const trainConsentBox = (
    <label className="flex items-start gap-2.5 text-[13px] leading-relaxed text-text-muted">
      <input
        type="checkbox"
        className="mt-1"
        checked={trainConsent}
        onChange={(e) => {
          setTrainConsent(e.target.checked);
          try {
            localStorage.setItem("depup-engine-consent", e.target.checked ? "1" : "0");
          } catch {
            /* abaikan */
          }
        }}
      />
      <span>
        Izinkan website ini dipakai sebagai contoh untuk melatih mesin Depup. Yang dikirim hanya deskripsi dan teks website, tanpa
        gambar, nomor WhatsApp, email, dan alamat.
      </span>
    </label>
  );

  const ttlField = (
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
  );

  const errorBox = error && (
    <div className="notice notice-bad" role="alert">
      <CircleAlert size={15} className="mt-0.5 shrink-0" aria-hidden /> <span className="min-w-0">{error}</span>
    </div>
  );

  /* ===== Layar mulai: belum ada website ===== */
  if (!content) {
    return (
      <ViewFade>
        <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">{announce}</div>
        <section className="mx-auto mt-2 max-w-3xl">
          <div className="rounded-[28px] bg-[var(--surface-solid)] px-5 py-8 [box-shadow:var(--surface-shadow)] sm:px-10 sm:py-12">
            <p className="flex items-center justify-center gap-1.5 text-[13px] font-medium text-text-muted">
              <Sparkles size={14} aria-hidden /> AI Web Builder · mesin Depup, tanpa AI luar
            </p>
            <h1 className="mt-3 text-center text-[clamp(26px,4vw,40px)] font-bold leading-tight tracking-[-0.02em]">Mau bikin website apa hari ini?</h1>
            <p className="mx-auto mt-2 max-w-xl text-center text-[15px] leading-relaxed text-text-muted">
              Ceritakan usahamu dalam satu-dua kalimat. Setelah jadi, semua bisa kamu ubah langsung di kanvas: klik teks untuk mengetik, pilih gaya, warna, dan susunan dari panel samping.
            </p>

            <div className="mt-7">
              <label htmlFor="ai-prompt" className="sr-only">Deskripsi website</label>
              <div className="rounded-[20px] bg-[var(--pill-bg)] p-2 focus-within:ring-2 focus-within:ring-[var(--ring)]">
                <textarea
                  ref={promptRef}
                  id="ai-prompt"
                  rows={4}
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
                  placeholder="Contoh: Warung bakso Pak Slamet di Banjar, buka 10–21. Menu: bakso urat 15rb, es teler 12rb. Pesan via WA 0812…"
                  className="w-full resize-none bg-transparent px-3 py-2.5 text-[16px] leading-relaxed outline-none placeholder:text-text-faint"
                />
                <div className="flex flex-wrap items-center justify-between gap-2 px-2 pb-1">
                  <span className={`tabular-nums ${hintCls}`}>{prompt.length}/1400</span>
                  <Btn
                    variant="primary"
                    className="!px-5 !py-2.5 !text-[14px]"
                    busy={busy !== null}
                    disabled={!canGenerate}
                    softDisabled
                    aria-describedby="gen-hint"
                    onDisabledClick={explainGenerate}
                    onClick={() => void requestGenerate(false)}
                  >
                    <Sparkles size={15} /> {busyLabel ?? "Buat website"}
                  </Btn>
                </div>
              </div>
              <p id="gen-hint" className={cn(hintCls, "mt-2 min-h-[1.1rem]")}>{genHint}</p>
              <p id="ai-prompt-hint" className={`mt-1 ${hintCls}`}>
                Sebutkan nama, produk atau topik, harga, jam buka, dan kontak. Mau gaya tertentu? Tulis saja, mis. &ldquo;gaya neo brutalism pastel&rdquo;.
              </p>
              <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                {EXAMPLES.map((ex) => (
                  <button key={ex.label} type="button" onClick={() => { setPrompt(ex.text); promptRef.current?.focus(); }} className={chipCls(false)}>
                    {ex.label}
                  </button>
                ))}
              </div>
            </div>

            {errorBox && <div className="mt-4">{errorBox}</div>}

            <div className="mt-8 grid gap-3">
              <details className={cn("group rounded-[18px] bg-[var(--pill-bg)]", ON_MIST)}>
                <summary className="flex min-h-[48px] cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-[14px] font-medium [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center gap-2"><ImagePlus size={15} aria-hidden /> Foto (opsional){photos.length ? ` · ${photos.length}` : ""}</span>
                  <ChevronDown size={16} className="shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden />
                </summary>
                <div className="px-4 pb-4">
                  <PhotoPool photos={photos} adding={photosAdding} usedCount={photosUsed} hasContent={false} onAdd={addPhotos} onRemove={removePhoto} onMove={movePhoto} onClear={clearPhotos} />
                </div>
              </details>
              <details className={cn("group rounded-[18px] bg-[var(--pill-bg)]", ON_MIST)}>
                <summary className="flex min-h-[48px] cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-[14px] font-medium [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center gap-2"><SlidersHorizontal size={15} aria-hidden /> Pengaturan lain</span>
                  <ChevronDown size={16} className="shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden />
                </summary>
                <div className="grid gap-4 px-4 pb-4">
                  <Field label="Jenis situs" htmlFor="ai-kind" hint={kindPick === "auto" ? "Mesin memilih sendiri dari deskripsimu." : KIND_LABEL[kindPick]}>
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
                  <div>
                    <div className={`mb-2 ${labelCls}`}>Mulai dari Template (opsional)</div>
                    <TemplatePicker value={tplId} suggestedId={null} preview={previewContent} palette={palette} onPick={setTemplate} />
                  </div>
                  <label className="flex min-h-[44px] items-start gap-2.5 text-[14px]">
                    <input type="checkbox" checked={autoPublish && cfg.enabled} disabled={!cfg.enabled} onChange={(e) => setAutoPublish(e.target.checked)} className={checkCls} />
                    <span className="min-w-0">
                      Langsung publish setelah dibuat
                      <span className={`block ${hintCls}`}>
                        {cfg.enabled ? `Memakai 1 dari ${cfg.maxSites} slot link aktif.` : "Link Instan sedang tidak aktif di server ini, jadi hanya pratinjau."}
                      </span>
                    </span>
                  </label>
                  {cfg.enabled && ttlField}
                  {trainConsentBox}
                </div>
              </details>
            </div>
          </div>
        </section>
      </ViewFade>
    );
  }

  /* ===== Editor ala Canva ===== */

  const lookBox = content.look && (
    <div className={`flex flex-wrap items-center justify-between gap-2 rounded-[14px] bg-[var(--pill-bg)] px-3.5 py-2.5 leading-relaxed ${hintCls}`}>
      <span className="min-w-0">
        {lookOn ? (
          <>Memakai gaya <b className="font-semibold text-text">{content.look.name}</b>. Warna bisa diubah tanpa melepas gaya; memilih Template, gaya desain, atau warna latar lain akan menggantikannya.</>
        ) : (
          <>Gaya <b className="font-semibold text-text">{content.look.name}</b> sedang tidak dipakai.</>
        )}
      </span>
      {lookOn ? (
        <button type="button" onClick={() => change(() => setContent((c) => (c ? { ...c, look: undefined } : c)))} className="text-[13px] text-text-muted underline max-md:min-h-[40px]">
          Lepas gaya
        </button>
      ) : (
        <button type="button" onClick={() => change(() => { setTemplate(null); setPalette(null); setStyleOpt(null); setBgOpt(null); })} className="text-[13px] text-text-muted underline max-md:min-h-[40px]">
          Pakai lagi
        </button>
      )}
    </div>
  );

  const resetLink = (show: boolean, label: string, fn: () => void) =>
    show ? (
      <button type="button" onClick={() => change(fn)} className="text-[13px] text-text-muted underline max-md:min-h-[40px]">
        {label}
      </button>
    ) : null;

  const subhead = (title: string, extra?: React.ReactNode) => (
    <div className="mb-2.5 flex items-center justify-between gap-2">
      <span className={subheadCls}>{title}</span>
      {extra}
    </div>
  );

  const panelBody: Record<PanelId, React.ReactNode> = {
    desain: (
      <div className="space-y-6">
        {lookBox}
        <div>
          {subhead("Gaya siap pakai")}
          <div className="flex flex-wrap gap-1.5">
            {QUICK_STYLES.map((q) => (
              <button key={q.cmd} type="button" disabled={busy !== null} onClick={() => void runCommand(q.cmd)} className={cn(chipCls(content.look?.name === q.name), "disabled:opacity-50")}>
                <ChipLabel selected={content.look?.name === q.name}>{q.label}</ChipLabel>
              </button>
            ))}
          </div>
          <Btn className="mt-3 w-full" busy={busy === "ai"} disabled={busy !== null || !canGenerate} softDisabled onDisabledClick={explainGenerate} onClick={() => void requestGenerate(true)}>
            <RefreshCw size={13} /> Acak gaya lain
          </Btn>
        </div>
        <div>
          {subhead("Template", resetLink(!!template, "Ikuti saran AI", () => setTemplate(null)))}
          <TemplatePicker value={tplId} suggestedId={!template ? content.template : null} preview={previewContent} palette={palette} onPick={(v) => change(() => setTemplate(v))} />
        </div>
        <div>
          {subhead("Gaya desain", resetLink(!!styleOpt, "Ikuti Template", () => setStyleOpt(null)))}
          <StylePicker value={styleOpt} template={tplId} accent={accentEff} palette={palette} fonts={fontsEff} preview={previewContent} onPick={(v) => change(() => setStyleOpt(v))} />
        </div>
        <div>
          {subhead("Hiasan latar", resetLink(!!decorOpt, "Ikuti Gaya desain", () => setDecorOpt(null)))}
          <div role="radiogroup" aria-label="Pilih hiasan" className="flex flex-wrap gap-1.5">
            {DECOR_OPTIONS.map((d) => (
              <button key={d.id} type="button" role="radio" aria-checked={decorOpt === d.id} onClick={() => change(() => setDecorOpt(d.id))} title={d.desc} className={chipCls(decorOpt === d.id, true)}>
                <ChipLabel selected={decorOpt === d.id}>{d.name}</ChipLabel>
              </button>
            ))}
          </div>
        </div>
      </div>
    ),
    tata: (
      <div className="space-y-6">
        <div>
          {subhead("Bagian paling atas", resetLink(!!heroOpt, "Saran AI", () => setHeroOpt(null)))}
          <HeroLayoutPicker value={heroEff} suggested={content.hero} onPick={(v) => change(() => setHeroOpt(v))} />
        </div>
        <div>
          {subhead("Keunggulan", resetLink(!!featOpt, "Saran AI", () => setFeatOpt(null)))}
          <FeatLayoutPicker value={featEff} onPick={(v) => change(() => setFeatOpt(v))} />
        </div>
        {hasShop(content) && (
          <label className="flex min-h-[44px] items-start gap-2.5 rounded-[14px] bg-[var(--pill-bg)] p-3.5 text-[14px]">
            <input type="checkbox" checked={shopOn} onChange={(e) => { const v = e.target.checked; change(() => setShopOn(v)); }} className={checkCls} />
            <span className="min-w-0">
              <span className="flex items-center gap-1.5 font-medium"><Store size={14} className="shrink-0" aria-hidden /> Katalog, keranjang, dan mode kelola</span>
              <span className={`mt-0.5 block leading-snug ${hintCls}`}>Pengunjung bisa cari produk, mengisi keranjang, lalu memesan lewat WhatsApp.</span>
            </span>
          </label>
        )}
      </div>
    ),
    warna: (
      <div className="space-y-6">
        <div>
          {subhead("Palet")}
          <PaletteEditor colors={colors} custom={palette !== null} pageBg={bgEff} onChange={(p) => change(() => setPalette(p), true)} onReset={() => change(() => setPalette(null))} />
        </div>
        <div>
          {subhead("Warna latar", resetLink(!!bgOpt, "Bawaan", () => setBgOpt(null)))}
          <div role="radiogroup" aria-label="Pilih warna latar" className="flex flex-wrap items-center gap-2">
            {BG_PRESETS.map((p) => (
              <button key={p.hex} type="button" role="radio" aria-checked={bgEff.toLowerCase() === p.hex} aria-label={p.name} title={p.name} onClick={() => change(() => setBgOpt(p.hex))} className={swatchTileCls(bgEff.toLowerCase() === p.hex)}>
                <span aria-hidden className="h-7 w-7 rounded-[10px]" style={{ background: p.hex }} />
              </button>
            ))}
            <label className={swatchTileCls(false)} title="Warna lain">
              <span aria-hidden className="h-7 w-7 rounded-[10px]" style={{ background: bgEff }} />
              <input type="color" value={bgEff} aria-label="Pilih warna latar lain" onChange={(e) => { const v = e.target.value.toLowerCase(); change(() => setBgOpt(v), true); }} className="absolute inset-0 h-full w-full cursor-pointer rounded-[14px] opacity-0" />
            </label>
          </div>
          <p className={`mt-2.5 leading-relaxed ${hintCls}`}>Teks, kartu, dan garis otomatis disesuaikan supaya tetap terbaca.</p>
        </div>
      </div>
    ),
    huruf: (
      <FontRolePicker
        title={fontsOpt.title}
        sub={fontsOpt.sub}
        body={fontsOpt.body}
        onTitleFamily={(id) => change(() => setFontsOpt((f) => ({ ...f, title: { ...f.title, family: id } })))}
        onTitleWeight={(w) => change(() => setFontsOpt((f) => ({ ...f, title: { ...f.title, weight: w } })))}
        onTitleWeightFollow={() => change(() => setFontsOpt((f) => ({ ...f, title: { ...f.title, weight: null } })))}
        onSubFamily={(id) => change(() => setFontsOpt((f) => ({ ...f, sub: { ...f.sub, family: id } })))}
        onSubFamilyFollow={() => change(() => setFontsOpt((f) => ({ ...f, sub: { ...f.sub, family: null } })))}
        onSubWeight={(w) => change(() => setFontsOpt((f) => ({ ...f, sub: { ...f.sub, weight: w } })))}
        onSubWeightFollow={() => change(() => setFontsOpt((f) => ({ ...f, sub: { ...f.sub, weight: null } })))}
        onBodyFamily={(id) => change(() => setFontsOpt((f) => ({ ...f, body: { ...f.body, family: id } })))}
        onBodyWeight={(w) => change(() => setFontsOpt((f) => ({ ...f, body: { ...f.body, weight: w } })))}
        onBodyWeightFollow={() => change(() => setFontsOpt((f) => ({ ...f, body: { ...f.body, weight: null } })))}
      />
    ),
    elemen: (
      <div className="space-y-6">
        <div>
          {subhead("Gaya ikon", resetLink(!!iconOpt, "Saran AI", () => setIconOpt(null)))}
          <div role="radiogroup" aria-label="Pilih gaya ikon" className="grid grid-cols-2 gap-2">
            {ICON_STYLES.map((st) => (
              <button key={st.id} type="button" role="radio" aria-checked={iconEff === st.id} onClick={() => change(() => setIconOpt(st.id))} title={st.desc} className={cn(chipCls(iconEff === st.id, true), "inline-flex items-center justify-start gap-2 !rounded-[14px] !py-2.5")}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0" dangerouslySetInnerHTML={{ __html: iconGlyph(st.id) }} />
                <ChipLabel selected={iconEff === st.id}>{st.name}</ChipLabel>
              </button>
            ))}
          </div>
        </div>
        <div>
          {subhead("Ornamen")}
          {!!content.ornaments?.length && (
            <div role="radiogroup" aria-label="Tampilkan ornamen" className="mb-3 flex flex-wrap gap-1.5">
              {[{ on: true, label: "Tampilkan" }, { on: false, label: "Sembunyikan" }].map((o) => (
                <button key={o.label} type="button" role="radio" aria-checked={!ornOff === o.on} onClick={() => change(() => setOrnOff(!o.on))} className={chipCls(!ornOff === o.on, true)}>
                  <ChipLabel selected={!ornOff === o.on}>{o.label}</ChipLabel>
                </button>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-1.5">
            {ORN_FAMILIES.map((f) => (
              <button key={f.id} type="button" disabled={busy !== null} onClick={() => void runCommand(`hiasan ${f.id}`)} className={cn(chipCls(content.ornFamily === f.id), "disabled:opacity-50")}>
                <ChipLabel selected={content.ornFamily === f.id}>{f.label}</ChipLabel>
              </button>
            ))}
          </div>
          <Btn className="mt-3 w-full" disabled={busy !== null} onClick={() => void runCommand("ganti hiasan lain")}>
            <Shapes size={13} /> Acak hiasan lain
          </Btn>
          <p className={`mt-2.5 leading-relaxed ${hintCls}`}>
            {content.ornaments?.length ? `${content.ornaments.length} ornamen dari keluarga ${content.ornFamily ?? "-"}.` : "Belum ada ornamen."} Ornamen hanya muncul bila paket elemennya sudah diimpor di Panel Admin.
          </p>
        </div>
      </div>
    ),
    bagian: (
      <div className="space-y-3">
        <SectionsPanel content={content} shop={shopActive} selected={selSec} onChange={setSections} onSelect={selectSection} />
        <p className={`leading-relaxed ${hintCls}`}>Seret untuk mengubah urutan, atau pakai panah. Ikon mata menyembunyikan bagian tanpa menghapus isinya.</p>
      </div>
    ),
    foto: (
      <div className="space-y-4">
        <div className="h-1.5 overflow-hidden rounded-full bg-[var(--pill-bg)]" role="progressbar" aria-label="Ukuran gambar terpakai" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, Math.round((imgBytes / IMAGE_BUDGET_BYTES) * 100))}>
          <div className="h-full rounded-full bg-[var(--accent)] transition-[width] motion-reduce:transition-none" style={{ width: `${Math.min(100, (imgBytes / IMAGE_BUDGET_BYTES) * 100)}%` }} />
        </div>
        <p className={`tabular-nums ${hintCls}`}>{formatBytes(imgBytes)} dari {formatBytes(IMAGE_BUDGET_BYTES)}</p>
        <ul className="space-y-3">
          {visibleSlots.map((d) => (
            <ImageRow key={d.key} def={d} src={images[d.key]} busy={imgBusy === d.key} onPick={() => pickImage(d)} onRemove={() => change(() => removeImage(d.key))} />
          ))}
        </ul>
        {imageSlots.length > 6 && (
          <button type="button" onClick={() => setShowAllImgs((v) => !v)} aria-expanded={showAllImgs} className="text-[13px] text-text-muted underline max-md:min-h-[40px]">
            {showAllImgs ? "Tampilkan lebih sedikit" : `Tampilkan semua (${imageSlots.length})`}
          </button>
        )}
        <p className={`leading-snug ${hintCls}`}>Tips: klik logo, foto utama, atau ikon produk di kanvas untuk langsung mengganti gambarnya. Gambar tidak ikut draf otomatis, jadi publish atau unduh ZIP sebelum menutup halaman.</p>
      </div>
    ),
    isi: (
      <div className="space-y-4">
        <div>
          <label htmlFor="ai-prompt" className={labelCls}>Deskripsi</label>
          <textarea
            ref={promptRef}
            id="ai-prompt"
            rows={6}
            maxLength={1400}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            aria-describedby="gen-hint"
            className="input-solid w-full resize-y px-3.5 py-3 text-[14px] leading-relaxed"
          />
          <p id="gen-hint" className={cn(hintCls, "mt-1 min-h-[1.1rem]")}>{genHint}</p>
        </div>
        <Btn variant="primary" className="w-full !py-2.5" busy={busy === "ai"} disabled={busy !== null || !canGenerate} softDisabled onDisabledClick={explainGenerate} onClick={() => void requestGenerate(false)}>
          <Sparkles size={14} /> Buat ulang dari deskripsi
        </Btn>
        <Field label="Jenis situs" htmlFor="ai-kind" hint={kindPick === "auto" ? `Sekarang: ${kindName}.` : KIND_LABEL[kindPick]}>
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
        {errorBox}
        <p className={`leading-relaxed ${hintCls}`}>Buat ulang mengganti isi dan gaya dengan hasil baru. Bisa dibatalkan dengan Urungkan.</p>
        <Btn className="w-full" onClick={() => void resetAll()}>
          <Trash2 size={13} /> Mulai dari kosong
        </Btn>
        {trainConsentBox}
      </div>
    ),
    terbit: (
      <div className="space-y-5">
        {published && (
          <div className="notice notice-ok !block space-y-2.5 !p-4">
            <div className="flex items-start gap-1.5 font-semibold">
              <Check size={15} className="mt-0.5 shrink-0" aria-hidden />
              <span className="min-w-0">Online sampai {new Date(published.expiresAt).toLocaleString("id-ID")} ({timeLeftLabel(published.expiresAt)})</span>
            </div>
            <input readOnly aria-label="Link website" value={published.url} onFocus={(e) => e.currentTarget.select()} className="input-solid mono h-11 w-full px-3.5 text-[13px] text-text" />
            <div className="flex flex-wrap gap-2">
              <BtnLink variant="primary" href={published.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink size={13} aria-hidden /> Buka<span className="sr-only"> website (tab baru)</span>
              </BtnLink>
              {shopActive && (
                <BtnLink href={`${published.url}#kelola`} target="_blank" rel="noopener noreferrer">
                  <Pencil size={13} aria-hidden /> Mode kelola<span className="sr-only"> (tab baru)</span>
                </BtnLink>
              )}
              <Btn onClick={() => void copyText(published.url, "Link disalin.")}>
                <Copy size={13} /> Salin link
              </Btn>
            </div>
          </div>
        )}
        {!cfg.enabled ? (
          <div className="notice notice-warn flex items-start gap-2 !p-3 text-[13px]">
            <Info size={15} className="mt-0.5 shrink-0" aria-hidden />
            <span className="min-w-0">Link Instan sedang tidak aktif di server ini. Websitenya bisa diunduh sebagai file di bawah.</span>
          </div>
        ) : (
          <div className="space-y-3">
            {ttlField}
            <Btn variant={published ? "ghost" : "primary"} className="w-full !py-2.5" busy={busy === "publish"} disabled={busy !== null} softDisabled onClick={() => void publish(content, html)}>
              <Globe size={14} /> {busy === "publish" ? progress || "Mempublikasikan…" : published ? "Publish sebagai link baru" : lastPubId ? "Publish versi terbaru" : "Publish ke Link Instan"}
            </Btn>
            <p className={`tabular-nums ${hintCls}`}>Link aktif: {siteCount} dari {cfg.maxSites}. Setiap publish membuat link baru yang aktif {ttlLabel(ttlHours)}.</p>
            {lastPubId && (
              <label className="flex min-h-[44px] items-start gap-2.5 text-[14px]">
                <input type="checkbox" checked={replacePrev} onChange={(e) => setReplacePrev(e.target.checked)} className={checkCls} />
                <span className="min-w-0">
                  Matikan link sebelumnya setelah publish
                  <span className={`block ${hintCls}`}>Kalau link lama sudah kamu bagikan, bagikan lagi link yang baru.</span>
                </span>
              </label>
            )}
          </div>
        )}
        {errorBox}
        <div>
          {subhead("Unduh")}
          <div className="grid grid-cols-2 gap-2">
            <Btn busy={exporting === "zip"} onClick={() => void runExport("zip", () => downloadZip(content, tplId, accentEff, renderOpts), "ZIP project diunduh.")}>
              <Package size={13} /> ZIP project
            </Btn>
            <Btn busy={exporting === "html"} onClick={() => void runExport("html", () => downloadHtml(content, tplId, accentEff, renderOpts), "File HTML diunduh.")}>
              <FileCode2 size={13} /> index.html
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
          <p className={`mt-2.5 flex items-start gap-1.5 leading-relaxed ${hintCls}`}>
            <Download size={13} className="mt-0.5 shrink-0" aria-hidden />
            <span className="min-w-0">ZIP bisa dibuka langsung di browser dan di-upload ke hosting statis mana pun.</span>
          </p>
        </div>
        {shopActive && (
          <div className="rounded-[14px] bg-[var(--pill-bg)] p-3.5 text-[13px] leading-relaxed text-text-muted">
            <b className="text-text">Kelola produk:</b> di situs yang sudah online, tambahkan <code className="mono">#kelola</code> di akhir link. Perubahan produk tersimpan di browser pemilik, jadi unduh situsnya lalu upload ulang supaya semua pengunjung melihat versi terbaru.
          </div>
        )}
      </div>
    ),
  };

  const panelTitle = PANELS.find((p) => p.id === panel)?.label ?? (panel === "terbit" ? "Publish & unduh" : "");

  const railBtn = (p: (typeof PANELS)[number], mobile = false) => {
    const on = panel === p.id;
    const Icon = p.icon;
    return (
      <button
        key={p.id}
        type="button"
        aria-pressed={on}
        aria-controls="ai-panel"
        onClick={() => setPanel(on && !mobile ? null : p.id)}
        className={cn(
          "flex shrink-0 flex-col items-center justify-center gap-1 rounded-[14px] text-[11.5px] font-medium transition",
          mobile ? "h-[58px] min-w-[68px] px-2" : "h-[62px] w-[64px]",
          on ? "bg-[var(--ink-fill)] text-[var(--ink-fill-text)]" : "text-text-muted hover:bg-[var(--pill-bg)] hover:text-text",
        )}
      >
        <Icon size={19} aria-hidden />
        {p.label}
      </button>
    );
  };

  const magicBar = (
    <form
      className="w-full"
      onSubmit={(e) => {
        e.preventDefault();
        void applyEdit();
      }}
    >
      <div className="flex items-center gap-2 rounded-[18px] bg-[var(--surface-solid)] p-1.5 pl-3.5 [box-shadow:var(--surface-shadow)] focus-within:ring-2 focus-within:ring-[var(--ring)]">
        <WandSparkles size={17} className="shrink-0 text-[var(--accent)]" aria-hidden />
        <label htmlFor="ai-edit" className="sr-only">Minta perubahan ke AI</label>
        <input
          ref={editRef}
          id="ai-edit"
          maxLength={600}
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          placeholder="Minta ke AI: tambah menu Es Teh 5rb, ganti warna jadi hijau…"
          className="min-w-0 flex-1 bg-transparent py-2 text-[14px] outline-none placeholder:text-text-faint"
          autoComplete="off"
          list="ai-edit-ideas"
        />
        <datalist id="ai-edit-ideas">
          {editSuggestions(content.kind).map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
        <Btn type="submit" variant="primary" busy={busy === "edit"} disabled={busy !== null || !editReady} softDisabled onDisabledClick={() => { say(editHint); editRef.current?.focus(); }}>
          <Send size={13} /> <span className="max-sm:sr-only">Terapkan</span>
        </Btn>
      </div>
      {editError && (
        <p className="mt-2 rounded-[12px] bg-bad-bg px-3 py-2 text-[13px] text-bad-fg" role="alert">
          {editError}
        </p>
      )}
    </form>
  );

  const topBar = (
    <div className="flex min-h-[56px] items-center gap-2 border-b border-[var(--surface-line)] px-3 sm:px-4">
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold">{content.brand}</p>
        <p className={`truncate ${hintCls} !text-[12px]`}>{kindName}{content.look && lookOn ? ` · ${content.look.name}` : ` · ${tpl.name}`}</p>
      </div>
      <div className="flex items-center gap-1" role="group" aria-label="Riwayat">
        <button type="button" onClick={undo} disabled={!history.length || busy !== null} aria-label="Urungkan" title="Urungkan (Ctrl+Z)" className="grid h-10 w-10 place-items-center rounded-[12px] hover:bg-[var(--pill-bg)] disabled:opacity-35">
          <Undo2 size={17} aria-hidden />
        </button>
        <button type="button" onClick={redo} disabled={!future.length || busy !== null} aria-label="Ulangi" title="Ulangi (Ctrl+Shift+Z)" className="grid h-10 w-10 place-items-center rounded-[12px] hover:bg-[var(--pill-bg)] disabled:opacity-35">
          <Redo2 size={17} aria-hidden />
        </button>
      </div>
      <div className="flex rounded-[12px] bg-[var(--pill-bg)] p-1" role="group" aria-label="Ukuran pratinjau">
        <button type="button" aria-pressed={device === "desktop"} onClick={() => setDevice("desktop")} title="Desktop" className={cn("grid h-8 w-9 place-items-center rounded-[9px]", device === "desktop" && "bg-[var(--surface-solid)] [box-shadow:var(--surface-shadow)]")}>
          <Monitor size={15} aria-hidden /><span className="sr-only">Desktop</span>
        </button>
        <button type="button" aria-pressed={device === "mobile"} onClick={() => setDevice("mobile")} title="HP" className={cn("grid h-8 w-9 place-items-center rounded-[9px]", device === "mobile" && "bg-[var(--surface-solid)] [box-shadow:var(--surface-shadow)]")}>
          <Smartphone size={15} aria-hidden /><span className="sr-only">HP</span>
        </button>
      </div>
      <Btn variant="primary" className="!px-4" onClick={() => setPanel("terbit")} aria-pressed={panel === "terbit"}>
        <Rocket size={14} /> <span className="max-sm:sr-only">{published ? "Online" : "Publish"}</span>
      </Btn>
    </div>
  );

  const panelBox = panel && (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex min-h-[52px] items-center justify-between gap-2 px-4">
        <h2 className="text-[15px] font-semibold">{panelTitle}</h2>
        <button type="button" onClick={() => setPanel(null)} aria-label="Tutup panel" className="grid h-9 w-9 place-items-center rounded-[10px] hover:bg-[var(--pill-bg)]">
          <X size={16} aria-hidden />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">{panelBody[panel]}</div>
    </div>
  );

  return (
    <ViewFade>
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">{announce}</div>
      <input ref={fileRef} type="file" accept={IMAGE_ACCEPT} className="hidden" tabIndex={-1} aria-hidden onChange={onFile} />

      <div className="overflow-hidden rounded-[24px] bg-[var(--surface-solid)] [box-shadow:var(--surface-shadow)]">
        {topBar}
        {/* Bilah panel (layar sempit): tepat di bawah bilah atas, karena bawah layar dipakai menu aplikasi. */}
        <nav aria-label="Panel editor" className="flex gap-1 overflow-x-auto border-b border-[var(--surface-line)] px-2 py-2 lg:hidden">
          {PANELS.map((p) => railBtn(p, true))}
        </nav>
        <div
          className={cn(
            "grid min-h-0",
            "lg:h-[calc(100dvh-9.5rem)] lg:min-h-[620px]",
            panel ? "lg:grid-cols-[80px_340px_minmax(0,1fr)]" : "lg:grid-cols-[80px_minmax(0,1fr)]",
          )}
        >
          {/* Rel kiri (layar lebar) */}
          <nav aria-label="Panel editor" className="hidden flex-col items-center gap-1 border-r border-[var(--surface-line)] py-3 lg:flex">
            {PANELS.map((p) => railBtn(p))}
          </nav>

          {/* Panel samping (layar lebar) */}
          {panel && isWide && (
            <aside id="ai-panel" aria-label={panelTitle} className="hidden min-h-0 border-r border-[var(--surface-line)] lg:block">
              {panelBox}
            </aside>
          )}

          {/* Kanvas */}
          <section aria-label="Kanvas website" className="relative flex min-h-0 flex-col bg-[var(--pill-bg)]">
            <div className="flex items-center justify-center gap-1.5 px-4 pt-3 text-[12.5px] text-text-muted">
              <MousePointerClick size={14} aria-hidden /> Klik teks untuk mengetik langsung<span className="max-sm:hidden"> · klik gambar untuk mengganti · klik bagian untuk mengaturnya</span>
            </div>
            <div className="relative h-[58dvh] min-h-[400px] lg:h-auto lg:min-h-0 lg:flex-1">
              <CanvasFrame ref={canvasRef} html={canvasHtml} device={device} onMessage={onCanvasMsg} busy={busy === "ai" || busy === "edit"} />
              {(busy === "ai" || busy === "edit") && (
                <div className="pointer-events-none absolute inset-0 grid place-items-center" aria-hidden>
                  <span className="notice notice-info inline-flex items-center gap-2 !px-4 !py-2.5 text-[13px] font-medium [box-shadow:var(--surface-shadow)]">
                    <Loader2 size={15} className="animate-spin motion-reduce:animate-none" /> {busyLabel}
                  </span>
                </div>
              )}
            </div>
            <div className="px-3 pb-3 pt-1 sm:px-6 sm:pb-4">{magicBar}</div>
          </section>
        </div>

      </div>

      {/* Lembar bawah (layar sempit) */}
      {panel && !isWide && (
        <div id="ai-panel" className="fixed inset-0 z-[70] lg:hidden" role="dialog" aria-modal="true" aria-label={panelTitle}>
          <button type="button" aria-label="Tutup panel" className="absolute inset-0 bg-black/30" onClick={() => setPanel(null)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[78dvh] overflow-hidden rounded-t-[24px] bg-[var(--surface-solid)] pb-[env(safe-area-inset-bottom)] [box-shadow:var(--surface-shadow)]">
            <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-[var(--surface-line)]" aria-hidden />
            <div className="flex max-h-[calc(78dvh-14px)] flex-col">{panelBox}</div>
          </div>
        </div>
      )}
    </ViewFade>
  );
}
