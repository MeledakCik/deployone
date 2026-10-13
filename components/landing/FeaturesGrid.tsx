import * as React from "react";
import { Globe, History, KeyRound, LayoutGrid, Layers, RefreshCw, ScanSearch, ShieldCheck } from "lucide-react";

function Icon({ children, tone }: { children: React.ReactNode; tone: string }) {
  return <div className={`mb-5 grid h-10 w-10 place-items-center rounded-xl ${tone}`}>{children}</div>;
}

function Mini({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`f-mono rounded-lg bg-obs-base p-3 text-[12px] ${className}`}>{children}</div>;
}

export function FeaturesGrid() {
  return (
    <section id="fitur" className="mx-auto w-full max-w-7xl scroll-mt-20 px-4 py-16 sm:px-8">
      <div className="mx-auto mb-14 max-w-3xl text-center">
        <h2 className="f-display text-[28px] font-bold leading-tight tracking-[-0.03em] text-white sm:text-[40px] sm:leading-[48px]">
          Setelah website live, semuanya tetap di satu tempat.
        </h2>
        <p className="mt-4 text-[17px] leading-relaxed text-obs-sec">
          Domain, environment variables, dan riwayat deploy dari tiga platform, tanpa pindah tab.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {/* Besar: satu dashboard, tiga platform */}
        <div className="obs-card group relative isolate flex flex-col justify-between overflow-hidden rounded-2xl p-7 md:col-span-2">
          <div className="pointer-events-none absolute -right-24 -top-24 -z-10 h-80 w-80 bg-[radial-gradient(closest-side,rgba(139,92,246,0.22),transparent)]" aria-hidden="true" />
          <div>
            <Icon tone="bg-obs-violet/20 text-obs-lilac">
              <Layers size={22} />
            </Icon>
            <h3 className="f-display mb-3 text-[24px] font-semibold tracking-[-0.02em] text-white">Satu dashboard, tiga platform</h3>
            <p className="mb-6 max-w-xl text-[15px] leading-relaxed text-obs-sec">
              Project dari Vercel, Cloudflare Pages, dan Railway tampil dalam satu daftar, lengkap dengan status dan tombol
              redeploy.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 rounded-xl bg-obs-base p-3 shadow-inner sm:grid-cols-3">
            {[
              ["VERCEL", "Situs web & framework"],
              ["CLOUDFLARE PAGES", "Situs statis & SPA"],
              ["RAILWAY", "Server, Docker, bahasa lain"],
            ].map(([name, note]) => (
              <div key={name} className="flex flex-col gap-1 rounded-lg bg-obs-low p-3">
                <span className="f-mono text-[10px] font-semibold text-obs-mute">{name}</span>
                <span className="text-[13px] text-white">{note}</span>
                <span className="f-mono text-[12px] text-obs-ok">✓ Terhubung</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pengecekan repo */}
        <div className="obs-card flex flex-col justify-between rounded-2xl p-7">
          <div>
            <Icon tone="bg-obs-violet/20 text-obs-lilac">
              <ScanSearch size={22} />
            </Icon>
            <h3 className="f-display mb-3 text-[24px] font-semibold tracking-[-0.02em] text-white">Cek repo dulu</h3>
            <p className="mb-6 text-[15px] leading-relaxed text-obs-sec">
              Depup membaca isi repo dan memberi tahu platform mana yang cocok sebelum deploy dimulai.
            </p>
          </div>
          <div className="f-mono flex flex-col gap-1.5 rounded-xl bg-obs-lowest p-3.5 text-[12px] leading-[18px] text-obs-sec shadow-inner">
            <div className="mb-1 flex items-center gap-1.5 pb-1">
              <span className="h-2 w-2 rounded-full bg-obs-bad" aria-hidden="true" />
              <span className="h-2 w-2 rounded-full bg-obs-warn" aria-hidden="true" />
              <span className="h-2 w-2 rounded-full bg-obs-ok" aria-hidden="true" />
              <span className="ml-2 text-[10px] text-obs-mute">hasil-cek.log</span>
            </div>
            <div className="text-white">Terdeteksi: Express</div>
            <div className="text-obs-warn">! Vercel: butuh penyesuaian</div>
            <div className="text-obs-mute">– Cloudflare: tidak cocok</div>
            <div className="text-obs-mint">✓ Railway: cocok untuk server</div>
          </div>
        </div>

        {/* Kecil */}
        <div className="obs-card flex flex-col justify-between rounded-2xl p-6">
          <div>
            <Icon tone="bg-obs-violet/20 text-obs-lilac">
              <Globe size={21} />
            </Icon>
            <h3 className="f-display mb-2 text-[20px] font-semibold tracking-[-0.01em] text-white">Domain sendiri</h3>
            <p className="mb-4 text-[13.5px] leading-relaxed text-obs-sec">
              Tambahkan domain dan dapatkan record DNS persis yang perlu dipasang di registrar.
            </p>
          </div>
          <Mini className="flex items-center justify-between">
            <span className="text-white">tokokopi.id</span>
            <span className="rounded bg-obs-ok/10 px-2 py-0.5 text-[10px] font-semibold text-obs-ok">DNS siap</span>
          </Mini>
        </div>

        <div className="obs-card flex flex-col justify-between rounded-2xl p-6">
          <div>
            <Icon tone="bg-obs-mint/15 text-obs-mint">
              <KeyRound size={21} />
            </Icon>
            <h3 className="f-display mb-2 text-[20px] font-semibold tracking-[-0.01em] text-white">Environment variables</h3>
            <p className="mb-4 text-[13.5px] leading-relaxed text-obs-sec">
              Simpan per project dan kirim ke platform tujuan. Yang dibutuhkan repo terdeteksi otomatis.
            </p>
          </div>
          <Mini className="flex flex-col gap-1">
            <div className="flex justify-between text-obs-sec">
              <span>DATABASE_URL</span>
              <span className="text-obs-mint">••••••••••</span>
            </div>
            <div className="flex justify-between text-obs-sec">
              <span>NEXT_PUBLIC_API</span>
              <span className="text-obs-lilac">https://api…</span>
            </div>
          </Mini>
        </div>

        <div className="obs-card flex flex-col justify-between rounded-2xl p-6">
          <div>
            <Icon tone="bg-obs-pink/15 text-obs-rose">
              <RefreshCw size={21} />
            </Icon>
            <h3 className="f-display mb-2 text-[20px] font-semibold tracking-[-0.01em] text-white">Redeploy otomatis</h3>
            <p className="mb-4 text-[13.5px] leading-relaxed text-obs-sec">
              Ubah secret, project langsung di-redeploy supaya nilai barunya terpakai.
            </p>
          </div>
          <Mini className="flex items-center justify-between text-obs-sec">
            <span>API_KEY diperbarui</span>
            <span className="font-semibold text-obs-ok">redeploy ✓</span>
          </Mini>
        </div>

        <div className="obs-card flex flex-col justify-between rounded-2xl p-6">
          <div>
            <Icon tone="bg-obs-highest text-white">
              <LayoutGrid size={21} />
            </Icon>
            <h3 className="f-display mb-2 text-[20px] font-semibold tracking-[-0.01em] text-white">Satu daftar project</h3>
            <p className="mb-4 text-[13.5px] leading-relaxed text-obs-sec">
              Semua project dan statusnya terlihat sekilas. Impor project yang sudah ada kapan saja.
            </p>
          </div>
          <Mini className="flex items-center justify-between text-obs-sec">
            <span>Vercel · Cloudflare · Railway</span>
            <span className="text-white">1 daftar</span>
          </Mini>
        </div>

        <div className="obs-card flex flex-col justify-between rounded-2xl p-6">
          <div>
            <Icon tone="bg-obs-violet/20 text-obs-lilac">
              <History size={21} />
            </Icon>
            <h3 className="f-display mb-2 text-[20px] font-semibold tracking-[-0.01em] text-white">Riwayat deploy</h3>
            <p className="mb-4 text-[13.5px] leading-relaxed text-obs-sec">
              Lihat deploy terakhir, hasilnya, dan buka lagi dengan satu klik.
            </p>
          </div>
          <div className="flex h-14 items-end gap-1.5 rounded-lg bg-obs-base p-2.5" aria-hidden="true">
            {["h-[40%] bg-obs-bright", "h-[60%] bg-obs-bright", "h-[50%] bg-obs-bright", "h-[80%] bg-obs-violet", "h-[65%] bg-obs-purple", "h-[95%] bg-obs-pink", "h-[75%] bg-obs-mint"].map((c, k) => (
              <div key={k} className={`flex-1 rounded-t ${c}`} />
            ))}
          </div>
        </div>

        <div className="obs-card flex flex-col justify-between rounded-2xl p-6">
          <div>
            <Icon tone="bg-obs-mint/15 text-obs-mint">
              <ShieldCheck size={21} />
            </Icon>
            <h3 className="f-display mb-2 text-[20px] font-semibold tracking-[-0.01em] text-white">Token tetap milikmu</h3>
            <p className="mb-4 text-[13.5px] leading-relaxed text-obs-sec">
              Token platform dikirim hanya saat dipakai. Login memakai akun Google, repo private bisa dengan GitHub Token.
            </p>
          </div>
          <Mini className="flex items-center justify-between text-obs-sec">
            <span>Token Vercel</span>
            <span className="text-obs-mint">saat deploy saja</span>
          </Mini>
        </div>
      </div>
    </section>
  );
}
