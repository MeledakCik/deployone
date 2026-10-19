import * as React from "react";
import { GlyphText, InlineIcon } from "@/components/ui/Icon";
import { Globe, History, KeyRound, LayoutGrid, Layers, RefreshCw, ScanSearch, ShieldCheck } from "@/components/ui/icons";
import { Badge } from "@/components/ui/primitives";

/** Ikon fitur: ubin 44px membulat 14px, sama dengan ikon KpiCard di dashboard. */
function Icon({ children, dark }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <div
      className={`mb-5 grid h-11 w-11 place-items-center rounded-[14px] ${
        dark ? "bg-night-15 text-[var(--lime)]" : "bg-[var(--surface-solid)] text-lav-text"
      }`}
    >
      {children}
    </div>
  );
}

/** Cuplikan kecil di dasar kartu: putih solid, radius 16. */
function Mini({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl bg-[var(--surface-solid)] p-3.5 font-mono text-[12px] break-words ${className}`}>{children}</div>;
}

const CARD = "flex flex-col justify-between rounded-card p-6 sm:p-7";
const H3 = "mb-2 text-[20px] font-bold tracking-[-0.025em]";
const P = "mb-5 text-[13.5px] leading-relaxed text-text-muted";

export function FeaturesGrid() {
  return (
    <section id="fitur" className="mx-auto w-full max-w-6xl scroll-mt-24 px-4 py-16 sm:px-8 sm:py-20">
      <div className="mx-auto mb-12 max-w-3xl text-center">
        <h2 className="lp-h2">Setelah website live, semuanya tetap di satu tempat.</h2>
        <p className="lp-lead">Domain, environment variables, dan riwayat deploy dari tiga platform, tanpa pindah tab.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Besar: satu dashboard, tiga platform */}
        <div className="relative isolate flex flex-col justify-between overflow-hidden rounded-card bg-midnight p-6 sm:p-7 md:col-span-2">
          <svg
            aria-hidden="true"
            viewBox="0 0 200 90"
            className="pointer-events-none absolute right-6 top-6 hidden h-20 w-44 sm:block"
            fill="none"
            stroke="#C6F432"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 60 C 18 60, 20 30, 32 30 S 44 74, 56 74 S 66 18, 80 18 S 92 66, 104 66 S 116 38, 128 38 S 140 58, 152 54 S 168 20, 196 12" />
          </svg>
          <div>
            <Icon dark>
              <Layers size={22} />
            </Icon>
            <h3 className="mb-3 text-[26px] font-bold tracking-[-0.03em] text-white">Satu dashboard, tiga platform</h3>
            <p className="mb-7 max-w-xl text-[15px] leading-relaxed text-night-80">
              Project dari Vercel, Cloudflare Pages, dan Railway tampil dalam satu daftar, lengkap dengan status dan tombol
              redeploy.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              ["Vercel", "Situs web & framework"],
              ["Cloudflare Pages", "Situs statis & SPA"],
              ["Railway", "Server, Docker, bahasa lain"],
            ].map(([name, note]) => (
              <div key={name} className="flex flex-col gap-1.5 rounded-2xl bg-night-15 p-4">
                <span className="text-[14px] font-semibold text-white">{name}</span>
                <span className="text-[13px] text-night-80">{note}</span>
                <span className="mt-1 self-start">
                  <Badge tone="good" dot>
                    Terhubung
                  </Badge>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Pengecekan repo */}
        <div className={`${CARD} bg-tone-lilac`}>
          <div>
            <Icon>
              <ScanSearch size={22} />
            </Icon>
            <h3 className={H3}>Periksa repo dulu</h3>
            <p className={P}>Depup membaca isi repo dan memberi tahu platform mana yang cocok sebelum deploy dimulai.</p>
          </div>
          <Mini className="flex flex-col gap-1.5 leading-[18px] text-text-muted">
            <div className="mb-1 flex items-center gap-1.5 pb-1">
              <span className="h-2 w-2 rounded-full bg-bad" aria-hidden="true" />
              <span className="h-2 w-2 rounded-full bg-warn" aria-hidden="true" />
              <span className="h-2 w-2 rounded-full bg-ok" aria-hidden="true" />
              <span className="ml-2 text-[11px] text-text-faint">hasil-periksa.log</span>
            </div>
            <div className="font-semibold text-text">Terdeteksi: Express</div>
            <div className="text-warn-fg">! Vercel: butuh penyesuaian</div>
            <div className="text-text-faint">– Cloudflare: tidak cocok</div>
            <div className="text-ok-fg">
              <GlyphText>✓ Railway: cocok untuk server</GlyphText>
            </div>
          </Mini>
        </div>

        {/* Kecil */}
        <div className={`${CARD} bg-tone-peri`}>
          <div>
            <Icon>
              <Globe size={22} />
            </Icon>
            <h3 className={H3}>Domain sendiri</h3>
            <p className={P}>Tambahkan domain dan dapatkan record DNS persis yang perlu dipasang di registrar.</p>
          </div>
          <Mini className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
            <span>tokokopi.id</span>
            <Badge tone="good">DNS siap</Badge>
          </Mini>
        </div>

        <div className={`${CARD} bg-tone-mint`}>
          <div>
            <Icon>
              <KeyRound size={22} />
            </Icon>
            <h3 className={H3}>Environment variables</h3>
            <p className={P}>Simpan per project, lalu kirim ke platform tujuan. Variabel yang dibutuhkan repo terdeteksi otomatis.</p>
          </div>
          <Mini className="flex flex-col gap-1 text-text-muted">
            <div className="flex justify-between gap-3">
              <span>DATABASE_URL</span>
              <span className="text-ok-fg">••••••••••</span>
            </div>
            <div className="flex justify-between gap-3">
              <span>NEXT_PUBLIC_API</span>
              <span className="text-lav-text">https://api…</span>
            </div>
          </Mini>
        </div>

        <div className={`${CARD} bg-tone-lilac`}>
          <div>
            <Icon>
              <RefreshCw size={22} />
            </Icon>
            <h3 className={H3}>Redeploy otomatis</h3>
            <p className={P}>Ubah secret, project langsung dideploy ulang supaya nilai barunya terpakai.</p>
          </div>
          <Mini className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-text-muted">
            <span>API_KEY diperbarui</span>
            <span className="font-semibold text-ok-fg">
              redeploy <InlineIcon name="check" />
            </span>
          </Mini>
        </div>

        <div className={`${CARD} bg-tone-lilac`}>
          <div>
            <Icon>
              <LayoutGrid size={22} />
            </Icon>
            <h3 className={H3}>Satu daftar project</h3>
            <p className={P}>Semua project dan statusnya terlihat sekilas. Impor project yang sudah ada kapan saja.</p>
          </div>
          <Mini className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-text-muted">
            <span>Vercel · Cloudflare · Railway</span>
            <span className="font-semibold text-text">1 daftar</span>
          </Mini>
        </div>

        <div className={`${CARD} bg-tone-peri`}>
          <div>
            <Icon>
              <History size={22} />
            </Icon>
            <h3 className={H3}>Riwayat deploy</h3>
            <p className={P}>Lihat deploy terakhir, hasilnya, dan buka lagi dengan satu klik.</p>
          </div>
          <div className="flex h-14 items-end gap-1.5 rounded-2xl bg-[var(--surface-solid)] p-2.5" aria-hidden="true">
            {[
              "h-[40%] bg-violet-200",
              "h-[60%] bg-violet-200",
              "h-[50%] bg-violet-200",
              "h-[80%] bg-[var(--lime)]",
              "h-[65%] bg-violet-300",
              "h-[95%] bg-[var(--accent)]",
              "h-[75%] bg-violet-300",
            ].map((c, k) => (
              <div key={k} className={`flex-1 rounded-t ${c}`} />
            ))}
          </div>
        </div>

        <div className={`${CARD} bg-tone-lilac`}>
          <div>
            <Icon>
              <ShieldCheck size={22} />
            </Icon>
            <h3 className={H3}>Token tetap milikmu</h3>
            <p className={P}>
              Token platform hanya dikirim saat dipakai. Kamu masuk dengan akun Google, dan repo private cukup dilengkapi GitHub Token.
            </p>
          </div>
          <Mini className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-text-muted">
            <span>Token Vercel</span>
            <span className="font-semibold text-ok-fg">saat deploy saja</span>
          </Mini>
        </div>
      </div>
    </section>
  );
}
