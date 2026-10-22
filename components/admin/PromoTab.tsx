"use client";

import * as React from "react";
import { Mail, Monitor, Send, Smartphone } from "lucide-react";
import { ShieldCheck, Sparkles } from "@/components/ui/icons";
import { adminFetch, useAdminData } from "./api";
import { TEMPLATES, renderRich, type MailFeature, type TemplateId } from "@/lib/email-template";
import { Badge, Btn, Card, Empty, ErrorBox, KpiCard, Loading, PageHead, SelectField, fmtDateTime } from "./ui";

interface Campaign {
  id: string;
  createdAt: number;
  by: string;
  subject: string;
  status: "sending" | "done" | "partial" | "failed";
  total: number;
  sent: number;
  failed: number;
  lastError: string | null;
}
interface Data {
  configured: boolean;
  from: string;
  audience: { eligible: number; total: number; unsubscribed: number; blocked: number };
  maxRecipients: number;
  campaigns: Campaign[];
}

const STATUS: Record<Campaign["status"], { label: string; tone: "good" | "warn" | "bad" | "neutral" }> = {
  done: { label: "Terkirim", tone: "good" },
  partial: { label: "Sebagian", tone: "warn" },
  failed: { label: "Gagal", tone: "bad" },
  sending: { label: "Mengirim…", tone: "neutral" },
};

export function PromoTab({ toast }: { toast: (m: string) => void }) {
  const { data, error, loading, reload } = useAdminData<Data>("/api/admin/promo");
  const [subject, setSubject] = React.useState("");
  const [preheader, setPreheader] = React.useState("");
  const [body, setBody] = React.useState("");
  const [template, setTemplate] = React.useState<TemplateId>("depup");
  const [badge, setBadge] = React.useState("");
  const [headline, setHeadline] = React.useState("");
  const [features, setFeatures] = React.useState<MailFeature[]>([
    { title: "", desc: "" },
    { title: "", desc: "" },
    { title: "", desc: "" },
  ]);
  const [ctaLabel, setCtaLabel] = React.useState("");
  const [ctaUrl, setCtaUrl] = React.useState("");
  const [testTo, setTestTo] = React.useState("");
  const [busy, setBusy] = React.useState<"test" | "send" | null>(null);
  const [confirming, setConfirming] = React.useState(false);
  const [topic, setTopic] = React.useState("");
  const [tone, setTone] = React.useState<"santai" | "profesional" | "singkat">("santai");
  const [generating, setGenerating] = React.useState(false);
  const [device, setDevice] = React.useState<"mobile" | "desktop">("desktop");

  const draft = { template, subject, preheader, body, ctaLabel, ctaUrl, badge, headline, features: features.filter((f) => f.title.trim()) };

  function setFeature(i: number, patch: Partial<MailFeature>) {
    setFeatures((fs) => fs.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  }

  // Pratinjau langsung memakai template yang SAMA dengan yang dikirim. Form kosong -> tampil contoh.
  const isSample = !body.trim() && !headline.trim() && !features.some((f) => f.title.trim());
  const previewHtml = React.useMemo(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const empty = isSample;
    const feats = features.filter((f) => f.title.trim());
    return renderRich(
      empty
        ? {
            template,
            badge: "Fitur baru",
            headline: "Deploy tanpa ribet, langsung online",
            body: "Halo!\n\nIni contoh tampilan email Depup. Isi form di sebelah kiri atau pakai \"Buat dengan AI\", maka pratinjau ini berubah otomatis.",
            features: [
              { title: "Poin pertama", desc: "Penjelasan singkat satu kalimat." },
              { title: "Poin kedua", desc: "Maksimal tiga poin per email." },
            ],
            cta: { label: "Buka dashboard", url: origin || "https://depup.cloud" },
          }
        : {
            template,
            badge,
            headline,
            body: body || " ",
            preheader,
            features: feats,
            cta: ctaLabel.trim() && ctaUrl.trim() ? { label: ctaLabel, url: ctaUrl } : null,
          },
      { footerNote: "Kamu menerima email ini karena punya akun di Depup.", unsubUrl: "#", siteUrl: origin }
    ).html;
  }, [template, badge, headline, body, features, preheader, ctaLabel, ctaUrl, isSample]);

  async function generate() {
    setGenerating(true);
    try {
      const r = await adminFetch<{ subject: string; preheader: string; body: string; ctaLabel: string; badge: string; headline: string; features: MailFeature[] }>("/api/admin/promo/generate", { method: "POST", body: { topic, tone } });
      setSubject(r.subject);
      setPreheader(r.preheader);
      setBody(r.body);
      setBadge(r.badge ?? "");
      setHeadline(r.headline ?? "");
      setFeatures([0, 1, 2].map((i) => r.features?.[i] ?? { title: "", desc: "" }));
      if (r.ctaLabel) {
        setCtaLabel(r.ctaLabel);
        setCtaUrl((u) => u.trim() || `${window.location.origin}/dashboard`);
      }
      toast("Template dibuat. Baca & edit dulu, lalu kirim tes sebelum kirim ke semua.");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Gagal membuat template.");
    } finally {
      setGenerating(false);
    }
  }

  async function sendTest() {
    setBusy("test");
    try {
      const r = await adminFetch<{ sentTo: string }>("/api/admin/promo", { method: "POST", body: { action: "test", to: testTo.trim() || undefined, ...draft } });
      toast(`Email tes terkirim ke ${r.sentTo}. Cek Inbox/Promosi/Spam-nya.`);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Gagal mengirim tes.");
    } finally {
      setBusy(null);
    }
  }

  async function sendAll() {
    setBusy("send");
    try {
      const r = await adminFetch<{ campaign: Campaign }>("/api/admin/promo", { method: "POST", body: { action: "send", confirm: true, ...draft } });
      toast(`Kampanye selesai: ${r.campaign.sent}/${r.campaign.total} terkirim.`);
      setConfirming(false);
      setSubject("");
      setPreheader("");
      setBody("");
      setBadge("");
      setHeadline("");
      setFeatures([{ title: "", desc: "" }, { title: "", desc: "" }, { title: "", desc: "" }]);
      setCtaLabel("");
      setCtaUrl("");
      void reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Gagal mengirim kampanye.");
    } finally {
      setBusy(null);
    }
  }

  if (error) return <Card><ErrorBox message={error} onRetry={reload} /></Card>;
  if (!data) return <Card><Loading /></Card>;

  const canSubmit = subject.trim().length > 0 && body.trim().length >= 10;

  return (
    <div className="space-y-5">
      <PageHead title="Promosi" desc="Kirim email promosi / pengumuman ke pengguna lewat Resend." />

      {!data.configured && (
        <div className="notice notice-warn" role="alert">
          RESEND_API_KEY belum diisi di environment server (Vercel → Settings → Environment Variables), lalu redeploy. Sampai itu, tombol kirim tidak akan jalan.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Akan menerima" value={data.audience.eligible} sub="akun aktif & berlangganan" />
        <KpiCard label="Total akun" value={data.audience.total} />
        <KpiCard label="Berhenti langganan" value={data.audience.unsubscribed} />
        <KpiCard label="Diblokir" value={data.audience.blocked} />
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(380px,440px)]">
        <div className="min-w-0 space-y-5">
      <Card title="Buat dengan AI">
        <div className="space-y-3 p-6">
          <p className="text-[12.5px] text-text-muted">Ketik topiknya saja, AI menyusun subjek, pratinjau, isi, dan teks tombol. Hasilnya mengisi form di bawah dan tetap bisa kamu edit.</p>
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value.slice(0, 600))}
            rows={2}
            aria-label="Topik email"
            placeholder="Mis. Link Instan sekarang bisa menampung situs sampai 10 MB, ajak user mencoba upload situs statis"
            className="input-solid w-full resize-none px-4 py-2.5 text-[13px]"
          />
          <div className="flex flex-wrap items-center gap-2">
            <SelectField
              value={tone}
              onValueChange={(v) => setTone(v as typeof tone)}
              label="Gaya bahasa"
              options={[
                { value: "santai", label: "Gaya santai" },
                { value: "profesional", label: "Gaya profesional" },
                { value: "singkat", label: "Singkat saja" },
              ]}
            />
            <Btn variant="primary" busy={generating} disabled={topic.trim().length < 5} onClick={() => void generate()}>
              <Sparkles size={13} /> Buat template
            </Btn>
            <span className="text-[12px] text-text-muted">Mengganti isi form di bawah. Fakta seperti harga/tanggal tetap periksa sendiri.</span>
          </div>
        </div>
      </Card>

      <Card title="Tulis email">
        <div className="space-y-3 p-6">
          <p className="flex items-center gap-1.5 text-[12px] text-text-muted">
            <Mail size={13} /> Pengirim: <span className="mono text-text-muted">{data.from}</span>
          </p>
          <div>
            <p className="mb-2 text-[12px] text-text-muted">Gaya tampilan</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 2xl:grid-cols-6" role="radiogroup" aria-label="Gaya template">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={template === t.id}
                  onClick={() => setTemplate(t.id)}
                  title={t.desc}
                  className={
                    "rounded-xl bg-[var(--surface-solid-2)] p-2.5 text-left transition " +
                    (template === t.id ? "ring-2 ring-[var(--ring)]" : "hover:brightness-95")
                  }
                >
                  <span className="block h-7 w-full rounded-md border border-black/10" style={{ background: `linear-gradient(135deg, ${t.swatch[0]} 0%, ${t.swatch[0]} 50%, ${t.swatch[1]} 50%, ${t.swatch[1]} 100%)` }} />
                  <span className="mt-1.5 block text-[12px] font-medium">{t.label}</span>
                </button>
              ))}
            </div>
          </div>
          <input value={subject} onChange={(e) => setSubject(e.target.value.slice(0, 120))} placeholder="Subjek — singkat & jelas, tanpa HURUF BESAR / tanda seru berlebihan" aria-label="Subjek" className="input-solid w-full px-4 py-2.5 text-[13px]" />
          <input value={preheader} onChange={(e) => setPreheader(e.target.value.slice(0, 140))} placeholder="Pratinjau di inbox (opsional)" aria-label="Pratinjau" className="input-solid w-full px-4 py-2.5 text-[13px]" />
          <div className="grid gap-3 sm:grid-cols-[1fr_2fr]">
            <input value={badge} onChange={(e) => setBadge(e.target.value.slice(0, 30))} placeholder="Label banner (mis. Fitur baru)" aria-label="Label banner" className="input-solid px-4 py-2.5 text-[13px]" />
            <input value={headline} onChange={(e) => setHeadline(e.target.value.slice(0, 90))} placeholder="Judul besar di banner" aria-label="Judul besar" className="input-solid px-4 py-2.5 text-[13px]" />
          </div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, 5000))}
            rows={8}
            aria-label="Isi email"
            placeholder={"Tulis seperti pesan biasa. Baris kosong = paragraf baru.\n\nHalo! Kami baru menambahkan ..."}
            className="input-solid w-full resize-y px-4 py-2.5 text-[13px]"
          />
          <div className="space-y-2">
            <p className="text-[12px] text-text-muted">Poin-poin (opsional, maks. 3) — tampil sebagai kartu bernomor.</p>
            {features.map((f, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-[1fr_2fr]">
                <input value={f.title} onChange={(e) => setFeature(i, { title: e.target.value.slice(0, 60) })} placeholder={`Judul poin ${i + 1}`} aria-label={`Judul poin ${i + 1}`} className="input-solid px-4 py-2 text-[13px]" />
                <input value={f.desc} onChange={(e) => setFeature(i, { desc: e.target.value.slice(0, 200) })} placeholder="Penjelasan singkat" aria-label={`Penjelasan poin ${i + 1}`} className="input-solid px-4 py-2 text-[13px]" />
              </div>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <input value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value.slice(0, 60))} placeholder="Teks tombol (opsional), mis. Coba sekarang" aria-label="Teks tombol" className="input-solid px-4 py-2.5 text-[13px]" />
            <input value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} placeholder="https://depup.cloud/dashboard" aria-label="URL tombol" className="input-solid px-4 py-2.5 text-[13px]" />
          </div>
          <p className="flex items-start gap-1.5 text-[12px] text-text-muted">
            <ShieldCheck size={13} className="mt-0.5 shrink-0" />
            Link berhenti berlangganan & header one-click otomatis ditambahkan (membantu email masuk Inbox/tab Promosi, bukan Spam). Hindari kata “GRATIS!!!”, banyak tanda seru, dan link pemendek URL.
          </p>

          <div className="flex flex-wrap items-center gap-2 border-t border-[var(--surface-line)] pt-4">
            <input value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="Tes ke email (kosong = email kamu)" aria-label="Email tujuan tes" className="input-solid min-w-0 flex-1 px-3 py-2 text-[13px] sm:max-w-xs" />
            <Btn onClick={() => void sendTest()} busy={busy === "test"} disabled={!canSubmit || !data.configured}>
              Kirim tes
            </Btn>
            {!confirming ? (
              <Btn variant="primary" className="ml-auto" disabled={!canSubmit || !data.configured || data.audience.eligible === 0} onClick={() => setConfirming(true)}>
                <Send size={13} /> Kirim ke {data.audience.eligible} akun
              </Btn>
            ) : (
              <span className="ml-auto flex items-center gap-2">
                <span className="text-[12.5px] text-warn-fg">Yakin kirim ke {Math.min(data.audience.eligible, data.maxRecipients)} akun? Tidak bisa dibatalkan.</span>
                <Btn onClick={() => setConfirming(false)} disabled={busy === "send"}>
                  Batal
                </Btn>
                <Btn variant="primary" busy={busy === "send"} onClick={() => void sendAll()}>
                  Ya, kirim
                </Btn>
              </span>
            )}
          </div>
          <p className="text-[12px] text-text-muted">Kirim tes dulu ke emailmu sendiri dan cek tampilannya. Cek juga batas kirim plan Resend-mu (plan gratis ±100 email/hari).</p>
        </div>
      </Card>

        </div>
        <PreviewPanel
          html={previewHtml}
          from={data.from}
          subject={subject}
          preheader={preheader}
          device={device}
          onDevice={setDevice}
          isSample={isSample}
          templateLabel={TEMPLATES.find((t) => t.id === template)?.label ?? ""}
        />
      </div>

      <Card title="Riwayat kampanye">
        {loading && !data ? (
          <Loading />
        ) : data.campaigns.length === 0 ? (
          <Empty>Belum ada kampanye.</Empty>
        ) : (
          <ul>
            {data.campaigns.map((c) => (
              <li key={c.id} className="border-b border-[var(--surface-line)] px-6 py-4 last:border-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="mono text-[12px] text-text-muted">{c.id}</span>
                  <Badge tone={STATUS[c.status].tone}>{STATUS[c.status].label}</Badge>
                  <span className="ml-auto text-[12px] text-text-muted">{fmtDateTime(c.createdAt)}</span>
                </div>
                <p className="mt-1 text-[13.5px]">{c.subject}</p>
                <p className="text-[12px] text-text-muted">
                  {c.sent}/{c.total} terkirim{c.failed ? ` · ${c.failed} gagal` : ""} · oleh {c.by}
                  {c.lastError ? ` · ${c.lastError}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Pratinjau: kotak masuk + bingkai perangkat. Tampilan email tetap memakai
   template yang sama dengan yang dikirim (iframe), hanya pembungkusnya yang
   dibuat bergaya Depup: Midnight, ungu, dan aksen lime.
   --------------------------------------------------------------------------- */

function senderName(from: string): { name: string; addr: string } {
  const m = from.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  return m ? { name: m[1].trim() || "Depup", addr: m[2] } : { name: "Depup", addr: from };
}

function PreviewPanel({
  html,
  from,
  subject,
  preheader,
  device,
  onDevice,
  isSample,
  templateLabel,
}: {
  html: string;
  from: string;
  subject: string;
  preheader: string;
  device: "mobile" | "desktop";
  onDevice: (d: "mobile" | "desktop") => void;
  isSample: boolean;
  templateLabel: string;
}) {
  const sender = senderName(from);
  const mobile = device === "mobile";
  const subjectLen = subject.trim().length;

  // Email dirender pada lebar "logis" (ponsel 360px, desktop minimal 360px) lalu diperkecil
  // dengan transform bila ruangnya lebih sempit, supaya isinya tidak terpotong di layar kecil.
  const stageRef = React.useRef<HTMLDivElement>(null);
  const [avail, setAvail] = React.useState(0);
  React.useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const update = () => setAvail(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const frameH = mobile ? 560 : 640;
  const logicalW = mobile ? 360 : Math.max(avail || 360, 360);
  const scale = avail > 0 ? Math.min(1, avail / logicalW) : 1;
  const scaled = scale < 1;

  return (
    <aside className="min-w-0 xl:sticky xl:top-4" aria-label="Pratinjau email">
      <div className="overflow-hidden rounded-card bg-[#1e1150] text-white shadow-[0_30px_70px_-35px_rgba(30,17,80,0.85)]">
        {/* Header: judul, status, dan pemilih perangkat */}
        <div className="flex items-center gap-3 px-5 pb-3 pt-5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#c6f432] text-[17px] font-black leading-none text-[#1e1150]" aria-hidden>
            ↑
          </span>
          <div className="min-w-0">
            <h2 className="text-[14px] font-semibold leading-tight">Pratinjau email</h2>
            <p className="truncate text-[11.5px] text-[#b2aec4]">{isSample ? "Contoh tampilan · mulai menulis untuk menggantinya" : `Langsung dari form · gaya ${templateLabel}`}</p>
          </div>
          <div className="ml-auto flex shrink-0 rounded-full bg-white/10 p-0.5" role="radiogroup" aria-label="Ukuran layar pratinjau">
            {(
              [
                { id: "desktop", label: "Desktop", Icon: Monitor },
                { id: "mobile", label: "Ponsel", Icon: Smartphone },
              ] as const
            ).map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={device === id}
                aria-label={label}
                title={label}
                onClick={() => onDevice(id)}
                className={
                  "grid h-7 w-8 place-items-center rounded-full transition " +
                  (device === id ? "bg-[#c6f432] text-[#1e1150]" : "text-[#d2cfdc] hover:bg-white/10 hover:text-white")
                }
              >
                <Icon size={14} />
              </button>
            ))}
          </div>
        </div>

        {/* Baris kotak masuk: begini email terlihat sebelum dibuka */}
        <div className="mx-4 rounded-2xl bg-white/[0.07] p-3.5">
          <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#9a94b0]">Di kotak masuk</p>
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#7b50ff] text-[16px] font-black leading-none" aria-hidden>
              ↑
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="truncate text-[13px] font-semibold">{sender.name}</span>
                <span className="ml-auto shrink-0 text-[11px] text-[#9a94b0]">Baru saja</span>
              </div>
              <p className={"truncate text-[13px] " + (subject.trim() ? "text-white" : "italic text-[#9a94b0]")}>{subject.trim() || "(Subjek belum diisi)"}</p>
              <p className="truncate text-[12px] text-[#a5a0b9]">{preheader.trim() || "Teks pratinjau kosong: klien email akan memakai kalimat pertama isi email."}</p>
            </div>
          </div>
          <div className="mt-2.5 flex flex-wrap gap-1.5 text-[11px]">
            <span className={"rounded-full px-2 py-0.5 " + (subjectLen === 0 ? "bg-white/10 text-[#b2aec4]" : subjectLen <= 60 ? "bg-[#c6f432]/20 text-[#d3f65f]" : "bg-[#fbbf24]/20 text-[#fcd34d]")}>
              Subjek {subjectLen}/60{subjectLen > 60 ? " · terpotong di ponsel" : ""}
            </span>
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[#b2aec4]">{sender.addr}</span>
          </div>
        </div>

        {/* Bingkai perangkat */}
        <div className="px-4 pb-5 pt-4">
          <div
            className={
              "mx-auto overflow-hidden bg-white transition-[max-width,border-radius] duration-300 " +
              (mobile ? "w-full max-w-[372px] rounded-[30px] border-[6px] border-[#0d0722]" : "w-full max-w-full rounded-xl border border-white/10")
            }
          >
            {mobile ? (
              <div className="flex justify-center bg-[#0d0722] pb-1.5 pt-0.5" aria-hidden>
                <span className="h-1 w-14 rounded-full bg-white/25" />
              </div>
            ) : (
              <div className="flex items-center gap-1.5 bg-[#f4f1ff] px-3 py-2" aria-hidden>
                <span className="h-2 w-2 rounded-full bg-[#d6455d]/70" />
                <span className="h-2 w-2 rounded-full bg-[#fbbf24]/80" />
                <span className="h-2 w-2 rounded-full bg-[#34d399]/80" />
                <span className="ml-2 truncate rounded-full bg-white px-3 py-0.5 text-[10.5px] text-[#5a39c0]">{sender.addr} → kamu</span>
              </div>
            )}
            <div ref={stageRef} className="relative w-full overflow-hidden bg-white" style={{ height: frameH }}>
              <iframe
                title="Pratinjau email"
                sandbox=""
                srcDoc={html}
                className="absolute left-0 top-0 block max-w-none border-0 bg-white"
                style={
                  scaled
                    ? { width: logicalW, height: frameH / scale, transform: `scale(${scale})`, transformOrigin: "top left" }
                    : { width: "100%", height: frameH }
                }
              />
            </div>
          </div>
          <p className="mt-3 text-[11.5px] leading-relaxed text-[#9a94b0]">
            Tampilan asli bisa sedikit beda di tiap aplikasi email (Gmail, Outlook, dll). Selalu kirim tes sebelum kirim massal.
          </p>
        </div>
      </div>
    </aside>
  );
}
