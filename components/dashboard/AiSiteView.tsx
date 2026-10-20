"use client";

import * as React from "react";
import {
  Sparkles, KeyRound, ExternalLink, Copy, Trash2, CircleAlert, Check, RefreshCw, Download, FileCode2,
  FileJson, Package, Monitor, Smartphone, Store, Pencil,
} from "lucide-react";
import { PageHead, Card, Btn, Badge, Loading } from "@/components/ui/primitives";
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
  hasShop,
  renderSite,
  type SiteContent,
  type TemplateId,
  type HeroLayout,
  type FeatLayout,
} from "@/lib/ai-site-templates";
import { downloadZip, downloadHtml, downloadJson, copyHtml } from "@/lib/ai-site-export";

const inputCls =
  "w-full rounded-xl border border-[var(--line)] bg-[var(--pill-bg)] px-3.5 py-2.5 text-[13px] outline-none transition focus:border-[var(--line-strong)]";

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

const EXAMPLES = [
  "Warung bakso Pak Slamet di Banjar, buka 10–21. Menu: bakso urat 15rb, bakso telur 18rb, mie ayam 14rb, es teler 12rb, es jeruk 5rb. Pesan via WhatsApp 081234567890.",
  "Toko kue Rumah Manis di Bandung: brownies, bolu pandan, donat kentang, kue kering lebaran. Terima pesanan ulang tahun, WA 081298765432.",
  "Jasa desain logo dan branding untuk UMKM, proses cepat 3 hari, revisi unlimited, kontak hello@studiokita.id.",
  "Portofolio mahasiswa Teknik Informatika yang bisa web development dan UI design, kontak via email.",
  "Festival musik kampus Soundwave 2026, 14 Desember di Lapangan Utama, tiket early bird dan 8 penampil.",
];

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
  // null = ikuti saran AI; nilai terisi = pilihan manual pengguna
  const [template, setTemplate] = React.useState<TemplateId | null>(null);
  const [accent, setAccent] = React.useState<string | null>(null);
  const [heroOpt, setHeroOpt] = React.useState<HeroLayout | null>(null);
  const [featOpt, setFeatOpt] = React.useState<FeatLayout | null>(null);
  const [shopOn, setShopOn] = React.useState(true);
  const [device, setDevice] = React.useState<"desktop" | "mobile">("desktop");
  const [variant, setVariant] = React.useState(0);
  const [ttlHours, setTtlHours] = React.useState(24);
  const [autoPublish, setAutoPublish] = React.useState(true);

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
  const accentEff = accent ?? (content?.accent || tpl.accent);
  const heroEff = heroOpt ?? content?.hero ?? "center";
  const featEff = featOpt ?? content?.feat ?? "grid";
  const renderOpts = React.useMemo(() => ({ hero: heroEff, feat: featEff, shop: shopOn }), [heroEff, featEff, shopOn]);
  const html = React.useMemo(
    () => (content ? renderSite(content, tplId, accentEff, renderOpts) : null),
    [content, tplId, accentEff, renderOpts],
  );
  const shopActive = !!content && hasShop(content) && shopOn;

  const canUseAi = !!keyStatus && (keyStatus.hasKey || keyStatus.freePerDay > 0);

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
        body: JSON.stringify({ prompt, variant: v }),
      });
      setVariant(v);
      setContent(r.content);
      if (again) {
        setTemplate(null);
        setAccent(null);
        setHeroOpt(null);
        setFeatOpt(null);
      }
      if (autoPublish && cfg?.enabled) {
        const eff = {
          tpl: (again ? null : template) ?? r.content.template,
          acc: (again ? null : accent) ?? (r.content.accent || TEMPLATES.find((t) => t.id === ((again ? null : template) ?? r.content.template))!.accent),
        };
        await publish(r.content, renderSite(r.content, eff.tpl, eff.acc, {
          hero: (again ? null : heroOpt) ?? r.content.hero,
          feat: (again ? null : featOpt) ?? r.content.feat,
          shop: shopOn,
        }));
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
        <div className="mt-6 flex items-start gap-2 rounded-xl bg-tone-pink p-4 text-[13px] text-bad-fg">
          <CircleAlert size={16} className="mt-0.5 shrink-0" /> {loadErr}
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

  return (
    <ViewFade>
      <PageHead
        title="AI Web Builder"
        desc="Ceritakan usahamu, AI menentukan jenis situs, gaya, ikon, dan isinya. Toko/UMKM otomatis dapat katalog + keranjang + kelola produk (CRUD). Tinggal publish ke Link Instan atau ekspor file."
      />

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <div className="space-y-5">
          <Card
            title="Token Groq-mu"
            action={keyStatus.hasKey ? <Badge tone="good" dot>Terpasang</Badge> : <Badge tone="warn" dot>Belum ada</Badge>}
          >
            <div className="space-y-3 px-6 py-5 text-[13px]">
              {!showKeyForm ? (
                <>
                  <div className="flex items-center justify-between gap-3 rounded-xl bg-[var(--pill-bg)] px-3.5 py-2.5">
                    <span className="flex items-center gap-2 font-mono text-[12.5px]">
                      <KeyRound size={14} /> {keyStatus.masked}
                    </span>
                    <span className="flex gap-1.5">
                      <Btn onClick={() => setEditingKey(true)}>Ganti</Btn>
                      <Btn variant="danger" onClick={removeKey} aria-label="Hapus token Groq">
                        <Trash2 size={13} />
                      </Btn>
                    </span>
                  </div>
                  <p className="text-text-muted">
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
                    value={keyDraft}
                    onChange={(e) => setKeyDraft(e.target.value)}
                    className={cn(inputCls, "font-mono")}
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <Btn variant="primary" busy={savingKey} disabled={keyDraft.trim().length < 20} onClick={saveKey}>
                      Simpan & cek
                    </Btn>
                    {editingKey && <Btn onClick={() => { setEditingKey(false); setKeyDraft(""); }}>Batal</Btn>}
                  </div>
                  <p className="text-text-muted">
                    Buat token gratis di{" "}
                    <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="font-medium text-text underline">
                      console.groq.com/keys
                    </a>
                    . Disimpan terenkripsi dan tidak akan ditampilkan lagi. Token dicek ke Groq tanpa memakai kuota.
                  </p>
                  {keyStatus.freePerDay > 0 && !keyStatus.hasKey && (
                    <p className="text-text-muted">Tanpa token, kamu masih dapat {keyStatus.freePerDay}x coba gratis per hari.</p>
                  )}
                </>
              )}
            </div>
          </Card>

          <Card title="Website yang kamu mau">
            <div className="space-y-4 px-6 py-5">
              <div>
                <textarea
                  rows={5}
                  maxLength={1400}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Contoh: Warung bakso Pak Slamet, buka 10–21. Menu: bakso urat 15rb, es teler 12rb. Pesan via WA 0812…"
                  className={cn(inputCls, "resize-y")}
                />
                <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-[11.5px] text-text-muted">
                  <span>Sebutkan nama usaha, produk + harga, jam buka, dan kontak. Makin detail, makin pas hasilnya.</span>
                  <span>{prompt.length}/1400</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {EXAMPLES.map((ex, i) => (
                    <button key={i} type="button" onClick={() => setPrompt(ex)} className="pill px-2.5 py-1 text-[11.5px]">
                      Contoh {i + 1}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-2 text-[12.5px] font-medium">
                  <span>Template</span>
                  {template && (
                    <button type="button" onClick={() => { setTemplate(null); setAccent(null); }} className="text-[11.5px] font-normal text-text-muted underline">
                      Ikuti saran AI
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {TEMPLATES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => { setTemplate(t.id); setAccent(null); }}
                      aria-pressed={tplId === t.id}
                      className={cn(
                        "rounded-xl border p-3 text-left transition",
                        tplId === t.id ? "border-[var(--line-strong)] bg-[var(--pill-bg)]" : "border-[var(--line)] hover:border-[var(--line-strong)]",
                      )}
                    >
                      <span className="mb-2 flex h-6 overflow-hidden rounded-md border border-[var(--line)]">
                        <span className="flex-1" style={{ background: t.swatch[0] }} />
                        <span className="w-1/3" style={{ background: t.swatch[1] }} />
                      </span>
                      <span className="flex items-center gap-1.5 text-[13px] font-semibold">
                        {t.name}
                        {content && !template && content.template === t.id && <Badge tone="good">Saran AI</Badge>}
                      </span>
                      <span className="block text-[11.5px] leading-snug text-text-muted">{t.desc}</span>
                    </button>
                  ))}
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <div className="mb-1.5 text-[12px] font-medium">Tata letak atas</div>
                    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Tata letak hero">
                      {HERO_LAYOUTS.map((l) => (
                        <button key={l.id} type="button" aria-pressed={heroEff === l.id} onClick={() => setHeroOpt(l.id)}
                          className={cn("pill flex-1 px-2 py-1.5 text-[11.5px]", heroEff === l.id && "!border-[var(--line-strong)] font-semibold")}>
                          {l.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="mb-1.5 text-[12px] font-medium">Tata letak keunggulan</div>
                    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Tata letak fitur">
                      {FEAT_LAYOUTS.map((l) => (
                        <button key={l.id} type="button" aria-pressed={featEff === l.id} onClick={() => setFeatOpt(l.id)}
                          className={cn("pill flex-1 px-2 py-1.5 text-[11.5px]", featEff === l.id && "!border-[var(--line-strong)] font-semibold")}>
                          {l.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <label className="mt-3 flex items-center gap-2 text-[12.5px]">
                  Warna utama
                  <input
                    type="color"
                    value={accentEff}
                    onChange={(e) => setAccent(e.target.value)}
                    className="h-8 w-10 cursor-pointer rounded-md border border-[var(--line)] bg-transparent"
                  />
                  {accent && (
                    <button type="button" onClick={() => setAccent(null)} className="text-[11.5px] text-text-muted underline">Reset</button>
                  )}
                </label>
              </div>

              <div className="grid grid-cols-[1fr_auto] items-center gap-3 text-[12.5px]">
                <label htmlFor="ai-ttl" className="font-medium">Masa aktif link</label>
                <select id="ai-ttl" value={ttlHours} onChange={(e) => setTtlHours(Number(e.target.value))} className={cn(inputCls, "w-auto")}>
                  {cfg.ttlOptionsHours.map((h) => (
                    <option key={h} value={h}>{ttlLabel(h)}</option>
                  ))}
                </select>
              </div>

              <label className="flex items-start gap-2 text-[12.5px]">
                <input
                  type="checkbox"
                  checked={autoPublish}
                  disabled={!cfg.enabled}
                  onChange={(e) => setAutoPublish(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  Langsung publish ke Link Instan setelah jadi
                  {!cfg.enabled && <span className="block text-text-muted">Link Instan sedang tidak aktif di server ini, jadi hanya pratinjau.</span>}
                </span>
              </label>

              <Btn
                variant="primary"
                className="w-full"
                busy={busy !== null}
                disabled={!canUseAi || prompt.trim().length < 10}
                onClick={() => generate(false)}
              >
                <Sparkles size={14} />
                {busy === "ai" ? "AI sedang merancang…" : busy === "publish" ? progress || "Mempublikasikan…" : content ? "Buat dari awal" : "Buat website"}
              </Btn>
              {content && (
                <Btn className="w-full" busy={busy !== null} disabled={!canUseAi || prompt.trim().length < 10} onClick={() => generate(true)}>
                  <RefreshCw size={13} /> Buat ulang dengan gaya lain
                </Btn>
              )}
              {!canUseAi && <p className="text-[12px] text-text-muted">Pasang token Groq di atas dulu untuk mulai.</p>}
              {error && (
                <div className="flex items-start gap-2 rounded-xl bg-tone-pink p-3 text-[12.5px] text-bad-fg" role="alert">
                  <CircleAlert size={15} className="mt-0.5 shrink-0" /> {error}
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-5">
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
                  <span>{KIND_LABEL[content.kind]}</span>
                </div>
                {/* sandbox tanpa allow-same-origin: skrip pratinjau berjalan terisolasi dan tidak bisa menyentuh dashboard */}
                <div className="flex justify-center rounded-xl bg-[var(--pill-bg)] p-2">
                  <iframe
                    title="Pratinjau website"
                    sandbox="allow-scripts allow-downloads allow-popups allow-popups-to-escape-sandbox"
                    srcDoc={html}
                    className={cn("h-[560px] rounded-lg border border-[var(--line)] bg-white transition-[width]", device === "mobile" ? "w-[390px] max-w-full" : "w-full")}
                  />
                </div>

                {published ? (
                  <div className="space-y-2 rounded-xl bg-tone-mint p-3.5 text-[13px] text-ok-fg">
                    <div className="flex items-center gap-1.5 font-semibold"><Check size={15} /> Online sampai {new Date(published.expiresAt).toLocaleString("id-ID")}</div>
                    <input readOnly value={published.url} onFocus={(e) => e.currentTarget.select()} className={cn(inputCls, "font-mono")} />
                    <div className="flex flex-wrap gap-2">
                      <a href={published.url} target="_blank" rel="noopener noreferrer" className="btn-primary inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] font-medium">
                        <ExternalLink size={13} /> Buka website
                      </a>
                      {shopActive && (
                        <a href={`${published.url}#kelola`} target="_blank" rel="noopener noreferrer" className="pill inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[12.5px] font-medium">
                          <Pencil size={13} /> Buka mode kelola
                        </a>
                      )}
                      <Btn onClick={copyLink}><Copy size={13} /> Salin link</Btn>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    {cfg.enabled && (
                      <Btn variant="primary" busy={busy === "publish"} onClick={() => publish(content, html)}>
                        {busy === "publish" ? progress || "Mempublikasikan…" : "Publish ke Link Instan"}
                      </Btn>
                    )}
                    <span className="text-[12px] text-text-muted">Ganti template, tata letak, atau warna di kiri untuk melihat tampilan lain tanpa memanggil AI lagi.</span>
                  </div>
                )}
                {published && (
                  <p className="text-[12px] text-text-muted">
                    Ganti tampilan lalu publish lagi akan membuat link baru (maks {cfg.maxSites} link aktif per akun). Link lama bisa dihapus di menu Link Instan.
                  </p>
                )}
                {published && (
                  <Btn busy={busy === "publish"} onClick={() => publish(content, html)}>Publish versi ini sebagai link baru</Btn>
                )}
              </div>
            ) : (
              <div className="px-6 py-14 text-center text-[13px] text-text-muted">
                <Sparkles className="mx-auto mb-3 opacity-60" size={22} />
                Hasilnya muncul di sini. Biasanya selesai dalam beberapa detik.
              </div>
            )}
          </Card>

          {html && content && (
            <>
              {hasShop(content) && (
                <Card title="Katalog & kelola produk (CRUD)" action={<Badge tone={shopOn ? "good" : "warn"} dot>{shopOn ? "Aktif" : "Mati"}</Badge>}>
                  <div className="space-y-3 px-6 py-5 text-[13px]">
                    <label className="flex items-start gap-2">
                      <input type="checkbox" checked={shopOn} onChange={(e) => setShopOn(e.target.checked)} className="mt-0.5" />
                      <span>
                        <span className="flex items-center gap-1.5 font-medium"><Store size={14} /> Aktifkan katalog, keranjang, dan mode kelola</span>
                        <span className="block text-text-muted">Pengunjung bisa cari produk, mengisi keranjang, lalu memesan lewat WhatsApp.</span>
                      </span>
                    </label>
                    {shopOn && (
                      <ul className="list-disc space-y-1 pl-5 text-text-muted">
                        <li>Pratinjau di atas sudah dalam <b>mode kelola</b>: coba tambah, ubah, atau hapus produk langsung di kartunya.</li>
                        <li>Di situs yang sudah online, buka link + <code className="font-mono">#kelola</code> untuk masuk mode kelola (tidak terlihat oleh pengunjung biasa).</li>
                        <li>Perubahan tersimpan di browser pemilik, bukan di server. Setelah selesai, tekan <b>Unduh situs</b> di bilah kelola lalu upload ulang agar semua pengunjung melihat versi terbaru.</li>
                      </ul>
                    )}
                  </div>
                </Card>
              )}

              <Card title="Ekspor file">
                <div className="space-y-3 px-6 py-5">
                  <div className="flex flex-wrap gap-2">
                    <Btn
                      variant="primary"
                      busy={exporting === "zip"}
                      onClick={() => runExport("zip", () => downloadZip(content, tplId, accentEff, renderOpts), "Proyek ZIP diunduh.")}
                    >
                      <Package size={13} /> Unduh ZIP proyek
                    </Btn>
                    <Btn onClick={() => runExport("html", () => downloadHtml(content, tplId, accentEff, renderOpts), "File HTML diunduh.")}>
                      <FileCode2 size={13} /> Unduh index.html
                    </Btn>
                    <Btn onClick={() => runExport("json", () => downloadJson(content, tplId, accentEff), "content.json diunduh.")}>
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
                  <p className="flex items-start gap-1.5 text-[12px] text-text-muted">
                    <Download size={13} className="mt-0.5 shrink-0" />
                    ZIP berisi index.html, assets/style.css{shopActive ? ", assets/app.js" : ""}, content.json, dan README. Bisa dibuka langsung di browser dan di-upload ke hosting statis mana pun.
                  </p>
                </div>
              </Card>
            </>
          )}
        </div>
      </div>
    </ViewFade>
  );
}
