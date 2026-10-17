"use client";

import * as React from "react";
import { Mail, Send, ShieldCheck, Sparkles } from "lucide-react";
import { adminFetch, useAdminData } from "./api";
import { renderRich, type MailFeature } from "@/lib/email-template";
import { Badge, Btn, Card, Empty, ErrorBox, KpiCard, Loading, PageHead, fmtDateTime } from "./ui";

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

  const draft = { subject, preheader, body, ctaLabel, ctaUrl, badge, headline, features: features.filter((f) => f.title.trim()) };

  function setFeature(i: number, patch: Partial<MailFeature>) {
    setFeatures((fs) => fs.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  }

  // Pratinjau langsung memakai template yang SAMA dengan yang dikirim. Form kosong -> tampil contoh.
  const previewHtml = React.useMemo(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const empty = !body.trim() && !headline.trim() && !features.some((f) => f.title.trim());
    const feats = features.filter((f) => f.title.trim());
    return renderRich(
      empty
        ? {
            badge: "Contoh tampilan",
            headline: "Judul besar yang menarik perhatian",
            body: "Halo!\n\nIni contoh tampilan email Depup. Isi form di sebelah atas atau pakai \"Buat dengan AI\", maka pratinjau ini berubah otomatis.",
            features: [
              { title: "Poin pertama", desc: "Penjelasan singkat satu kalimat." },
              { title: "Poin kedua", desc: "Maksimal tiga poin per email." },
            ],
            cta: { label: "Buka dashboard", url: origin || "https://depup.web.id" },
          }
        : {
            badge,
            headline,
            body: body || " ",
            preheader,
            features: feats,
            cta: ctaLabel.trim() && ctaUrl.trim() ? { label: ctaLabel, url: ctaUrl } : null,
          },
      { footerNote: "Kamu menerima email ini karena punya akun di Depup.", unsubUrl: "#", siteUrl: origin }
    ).html;
  }, [badge, headline, body, features, preheader, ctaLabel, ctaUrl]);

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

  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (!data) return <Loading />;

  const canSubmit = subject.trim().length > 0 && body.trim().length >= 10;

  return (
    <div className="space-y-4">
      <PageHead title="Promosi" desc="Kirim email promosi / pengumuman ke pengguna lewat Resend." />

      {!data.configured && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-[13px] text-amber-500">
          RESEND_API_KEY belum diisi di environment server (Vercel → Settings → Environment Variables), lalu redeploy. Sampai itu, tombol kirim tidak akan jalan.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Akan menerima" value={data.audience.eligible} sub="akun aktif & berlangganan" />
        <KpiCard label="Total akun" value={data.audience.total} />
        <KpiCard label="Berhenti langganan" value={data.audience.unsubscribed} />
        <KpiCard label="Diblokir" value={data.audience.blocked} />
      </div>

      <Card title="Buat dengan AI">
        <div className="space-y-3 p-5">
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
            <select value={tone} onChange={(e) => setTone(e.target.value as typeof tone)} aria-label="Gaya bahasa" className="input-solid px-3 py-2 text-[13px]">
              <option value="santai">Gaya santai</option>
              <option value="profesional">Gaya profesional</option>
              <option value="singkat">Singkat saja</option>
            </select>
            <Btn variant="primary" busy={generating} disabled={topic.trim().length < 5} onClick={() => void generate()}>
              <Sparkles size={13} /> Buat template
            </Btn>
            <span className="text-[11.5px] text-text-faint">Mengganti isi form di bawah. Fakta seperti harga/tanggal tetap periksa sendiri.</span>
          </div>
        </div>
      </Card>

      <Card title="Tulis email">
        <div className="space-y-3 p-5">
          <p className="flex items-center gap-1.5 text-[12px] text-text-faint">
            <Mail size={13} /> Pengirim: <span className="mono text-text-muted">{data.from}</span>
          </p>
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
            <input value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} placeholder="https://depup.web.id/dashboard" aria-label="URL tombol" className="input-solid px-4 py-2.5 text-[13px]" />
          </div>
          <p className="flex items-start gap-1.5 text-[11.5px] text-text-faint">
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
                <span className="text-[12.5px] text-amber-500">Yakin kirim ke {Math.min(data.audience.eligible, data.maxRecipients)} akun? Tidak bisa dibatalkan.</span>
                <Btn onClick={() => setConfirming(false)} disabled={busy === "send"}>
                  Batal
                </Btn>
                <Btn variant="primary" busy={busy === "send"} onClick={() => void sendAll()}>
                  Ya, kirim
                </Btn>
              </span>
            )}
          </div>
          <p className="text-[11.5px] text-text-faint">Kirim tes dulu ke emailmu sendiri dan cek tampilannya. Cek juga batas kirim plan Resend-mu (plan gratis ±100 email/hari).</p>
        </div>
      </Card>

      <Card title="Pratinjau email">
        <div className="p-4">
          <iframe title="Pratinjau email" sandbox="" srcDoc={previewHtml} className="h-[640px] w-full rounded-xl border border-[var(--surface-line)] bg-white" />
          <p className="mt-2 text-[11.5px] text-text-faint">Tampilan asli bisa sedikit beda di tiap aplikasi email (Gmail, Outlook, dll). Selalu kirim tes sebelum kirim massal.</p>
        </div>
      </Card>

      <Card title="Riwayat kampanye">
        {loading && !data ? (
          <Loading />
        ) : data.campaigns.length === 0 ? (
          <Empty>Belum ada kampanye.</Empty>
        ) : (
          <ul>
            {data.campaigns.map((c) => (
              <li key={c.id} className="border-b border-[var(--surface-line)] px-5 py-3.5 last:border-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="mono text-[12px] text-text-faint">{c.id}</span>
                  <Badge tone={STATUS[c.status].tone}>{STATUS[c.status].label}</Badge>
                  <span className="ml-auto text-[12px] text-text-faint">{fmtDateTime(c.createdAt)}</span>
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
