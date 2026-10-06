"use client";

import * as React from "react";
import { Check, ExternalLink, Heart, Loader2, QrCode, RefreshCw } from "lucide-react";
import { ViewFade } from "@/components/ui/ViewFade";
import { useAuth } from "@/lib/auth-context";
import { notifySessionExpired } from "@/lib/session-expired";

interface Config {
  configured: boolean;
  pageUrl: string | null;
  minAmount: number;
  maxAmount: number;
}

interface Donation {
  id: string;
  amount: number;
  totalPaid: number;
  qrImage: string;
  invoiceUrl: string;
  pageUrl: string | null;
}

type Phase = "form" | "qr" | "paid" | "expired";

const PRESETS = [5000, 10000, 25000, 50000, 100000];
const POLL_MS = 4000;

const rupiah = (n: number) => `Rp${n.toLocaleString("id-ID")}`;

export function DonateView() {
  const { user } = useAuth();
  const [config, setConfig] = React.useState<Config | null>(null);
  const [configError, setConfigError] = React.useState(false);

  const [amountStr, setAmountStr] = React.useState("10000");
  const [name, setName] = React.useState(user?.name?.split(" ")[0] ?? "");
  const [email, setEmail] = React.useState(user?.email ?? "");
  const [message, setMessage] = React.useState("");

  const [phase, setPhase] = React.useState<Phase>("form");
  const [donation, setDonation] = React.useState<Donation | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [checking, setChecking] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    fetch("/api/donate", { cache: "no-store" })
      .then((r) => r.json())
      .then((b) => {
        if (!alive) return;
        if (b?.ok) setConfig(b.data);
        else setConfigError(true);
      })
      .catch(() => alive && setConfigError(true));
    return () => {
      alive = false;
    };
  }, []);

  const amount = Number(amountStr);
  const amountValid =
    !!config && Number.isInteger(amount) && amount >= config.minAmount && amount <= config.maxAmount;

  const checkStatus = React.useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/donate/status?id=${encodeURIComponent(id)}`, { cache: "no-store" });
      const body = await res.json().catch(() => null);
      notifySessionExpired(body);
      if (body?.ok) {
        if (body.data.state === "paid") setPhase("paid");
        else if (body.data.state === "expired") setPhase("expired");
      }
    } catch {
      /* jaringan putus sesaat: coba lagi di putaran berikutnya */
    }
  }, []);

  // Cek otomatis selama QR ditampilkan
  React.useEffect(() => {
    if (phase !== "qr" || !donation) return;
    const t = setInterval(() => void checkStatus(donation.id), POLL_MS);
    return () => clearInterval(t);
  }, [phase, donation, checkStatus]);

  async function createQr(e: React.FormEvent) {
    e.preventDefault();
    if (!amountValid || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/donate/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, name, email, message }),
      });
      const body = await res.json().catch(() => null);
      notifySessionExpired(body);
      if (!res.ok || !body?.ok) {
        setError(body?.error ?? "Tidak bisa membuat QRIS sekarang.");
        return;
      }
      setDonation(body.data as Donation);
      setPhase("qr");
    } catch {
      setError("Koneksi bermasalah. Cek internet kamu lalu coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  async function manualCheck() {
    if (!donation || checking) return;
    setChecking(true);
    await checkStatus(donation.id);
    setChecking(false);
  }

  function again() {
    setPhase("form");
    setDonation(null);
    setError(null);
  }

  const fallbackUrl = donation?.pageUrl ?? config?.pageUrl ?? null;

  return (
    <ViewFade>
      <div className="mx-auto max-w-xl space-y-6">
        <div>
          <h2 className="text-[22px] font-semibold">Donasi</h2>
          <p className="text-[13px] text-text-muted">
            Depup gratis dipakai. Kalau terbantu, kamu bisa mendukung pengembangannya lewat QRIS (Saweria).
          </p>
        </div>

        {configError && (
          <div className="surface-solid p-5 text-[13px] text-text-muted">
            Tidak bisa memuat pengaturan donasi. Muat ulang halaman, lalu coba lagi.
          </div>
        )}

        {!configError && !config && (
          <div className="surface-solid flex items-center gap-2 p-5 text-[13px] text-text-muted">
            <Loader2 size={15} className="animate-spin" /> Memuat…
          </div>
        )}

        {config && !config.configured && (
          <div className="surface-solid p-5 text-[13px] leading-relaxed text-text-muted">
            Fitur donasi belum diaktifkan oleh admin. (Admin: isi <code className="font-mono">SAWERIA_USERNAME</code> di
            environment server.)
          </div>
        )}

        {config?.configured && phase === "form" && (
          <form onSubmit={createQr} className="surface-solid space-y-5 p-5 sm:p-6">
            <fieldset>
              <legend className="mb-2 text-[12.5px] font-medium text-text-muted">Nominal</legend>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setAmountStr(String(p))}
                    aria-pressed={amount === p}
                    className={`pill px-3.5 py-2 text-[13px] font-medium transition ${
                      amount === p ? "!bg-violet-600 !text-white !border-transparent" : "text-text-muted hover:text-text"
                    }`}
                  >
                    {rupiah(p)}
                  </button>
                ))}
              </div>
              <div className="relative mt-3">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] text-text-muted">Rp</span>
                <input
                  inputMode="numeric"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value.replace(/\D/g, "").slice(0, 8))}
                  aria-label="Nominal donasi"
                  className="input-solid w-full py-3 pl-10 pr-3.5 text-[14px]"
                />
              </div>
              {amountStr && !amountValid && (
                <p className="mt-1.5 text-[12px] text-red-500">
                  Minimal {rupiah(config.minAmount)}, maksimal {rupiah(config.maxAmount)}.
                </p>
              )}
            </fieldset>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-[12.5px] font-medium text-text-muted">Nama (tampil di Saweria)</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value.slice(0, 30))}
                  placeholder="Anonim"
                  className="input-solid w-full px-3.5 py-3 text-[14px]"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[12.5px] font-medium text-text-muted">Email (untuk bukti)</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-solid w-full px-3.5 py-3 text-[14px]"
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-1.5 block text-[12.5px] font-medium text-text-muted">Pesan (opsional)</span>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, 150))}
                rows={2}
                placeholder="Semangat terus!"
                className="input-solid w-full resize-none px-3.5 py-3 text-[14px]"
              />
              <span className="mt-1 block text-right text-[11px] text-text-muted">{message.length}/150</span>
            </label>

            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-3 text-[13px] text-red-500">{error}</div>
            )}

            <button
              type="submit"
              disabled={!amountValid || busy}
              className="btn-primary flex w-full items-center justify-center gap-2 py-3 text-[14px] disabled:opacity-40"
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : <QrCode size={16} />}
              {busy ? "Membuat QRIS…" : amountValid ? `Buat QRIS ${rupiah(amount)}` : "Buat QRIS"}
            </button>

            {config.pageUrl && (
              <p className="text-center text-[12.5px] text-text-muted">
                Lebih suka lewat e-wallet atau metode lain?{" "}
                <a href={config.pageUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-violet-500 underline underline-offset-2">
                  Buka halaman Saweria <ExternalLink size={12} />
                </a>
              </p>
            )}
          </form>
        )}

        {phase === "qr" && donation && (
          <div className="surface-solid space-y-4 p-5 text-center sm:p-6">
            <p className="text-[13px] text-text-muted">Scan dengan aplikasi bank atau e-wallet apa saja yang mendukung QRIS</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={donation.qrImage}
              alt={`Kode QRIS donasi ${rupiah(donation.amount)}`}
              width={260}
              height={260}
              className="mx-auto h-[260px] w-[260px] rounded-2xl bg-white p-2"
            />
            <div>
              <p className="text-[22px] font-semibold">{rupiah(donation.totalPaid)}</p>
              {donation.totalPaid !== donation.amount && (
                <p className="text-[12px] text-text-muted">Donasi {rupiah(donation.amount)} + biaya layanan</p>
              )}
            </div>
            <p className="flex items-center justify-center gap-2 text-[13px] text-text-muted" aria-live="polite">
              <Loader2 size={14} className="animate-spin" /> Menunggu pembayaran…
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button type="button" onClick={manualCheck} disabled={checking} className="pill inline-flex items-center gap-1.5 px-3.5 py-2 text-[12.5px] font-medium disabled:opacity-50">
                <RefreshCw size={13} className={checking ? "animate-spin" : ""} /> Sudah bayar? Cek
              </button>
              <a href={donation.invoiceUrl} target="_blank" rel="noopener noreferrer" className="pill inline-flex items-center gap-1.5 px-3.5 py-2 text-[12.5px] font-medium">
                Buka di Saweria <ExternalLink size={12} />
              </a>
              <button type="button" onClick={again} className="pill px-3.5 py-2 text-[12.5px] font-medium text-text-muted hover:text-text">
                Ubah nominal
              </button>
            </div>
          </div>
        )}

        {phase === "paid" && (
          <div className="surface-solid space-y-3 p-8 text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-500/15 text-emerald-500">
              <Check size={28} strokeWidth={3} />
            </span>
            <h3 className="text-[18px] font-semibold">Terima kasih banyak!</h3>
            <p className="text-[13px] leading-relaxed text-text-muted">
              Pembayaran terdeteksi. Dukunganmu sangat berarti untuk pengembangan Depup.
            </p>
            <button type="button" onClick={again} className="pill mx-auto inline-flex items-center gap-1.5 px-4 py-2 text-[12.5px] font-medium">
              <Heart size={13} /> Donasi lagi
            </button>
          </div>
        )}

        {phase === "expired" && (
          <div className="surface-solid space-y-3 p-8 text-center">
            <h3 className="text-[16px] font-semibold">QRIS sudah kedaluwarsa</h3>
            <p className="text-[13px] text-text-muted">Kalau kamu sudah membayar, tidak perlu khawatir; cek email bukti dari Saweria.</p>
            <div className="flex flex-wrap justify-center gap-2">
              <button type="button" onClick={again} className="btn-primary px-5 py-2.5 text-[13px]">
                Buat QRIS baru
              </button>
              {fallbackUrl && (
                <a href={fallbackUrl} target="_blank" rel="noopener noreferrer" className="pill inline-flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-medium">
                  Halaman Saweria <ExternalLink size={12} />
                </a>
              )}
            </div>
          </div>
        )}

        {error && phase !== "form" && <p className="text-center text-[12.5px] text-red-500">{error}</p>}
      </div>
    </ViewFade>
  );
}
