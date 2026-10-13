import * as React from "react";
import { Globe, History, KeyRound, LayoutGrid, Layers, RefreshCw, ScanSearch, ShieldCheck } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";

function Icon({ children, tone = "bg-card/80 text-ink" }: { children: React.ReactNode; tone?: string }) {
  return (
    <div
      className={`mb-5 grid h-11 w-11 place-items-center rounded-2xl shadow-sm transition-transform duration-700 ease-bounce group-hover:-rotate-6 group-hover:scale-110 ${tone}`}
    >
      {children}
    </div>
  );
}

/** Cuplikan kecil di dasar kartu */
function Mini({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl bg-card/80 p-3.5 text-[12.5px] backdrop-blur ${className}`}>{children}</div>;
}

const CARD = "group lift flex flex-col justify-between rounded-[32px] p-7 shadow-card";

export function FeaturesGrid() {
  return (
    <section id="fitur" className="mx-auto w-full max-w-6xl scroll-mt-24 px-4 py-20 sm:px-8">
      <Reveal className="mx-auto mb-14 max-w-3xl text-center">
        <h2 className="display text-[32px] leading-[1.08] text-ink sm:text-[52px]">
          Setelah website live, semuanya tetap di satu tempat.
        </h2>
        <p className="mt-5 text-[17px] leading-relaxed text-ink-2 sm:text-[19px]">
          Domain, environment variables, dan riwayat deploy dari tiga platform, tanpa pindah tab.
        </p>
      </Reveal>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Besar: satu dashboard, tiga platform */}
        <Reveal className="md:col-span-2">
          <div className={`${CARD} tint-lav h-full`}>
            <div>
              <Icon>
                <Layers size={22} />
              </Icon>
              <h3 className="mb-3 text-[26px] font-semibold tracking-[-0.03em] text-ink">Satu dashboard, tiga platform</h3>
              <p className="mb-7 max-w-xl text-[15.5px] leading-relaxed text-ink-2">
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
                <div key={name} className="flex flex-col gap-1 rounded-[22px] bg-card/80 p-4 backdrop-blur">
                  <span className="text-[13px] font-semibold text-ink">{name}</span>
                  <span className="text-[13px] text-ink-2">{note}</span>
                  <span className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-full bg-ok/15 px-2.5 py-0.5 text-[12px] font-semibold text-ok">
                    ✓ Terhubung
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        {/* Pengecekan repo */}
        <Reveal delay={90}>
          <div className={`${CARD} bg-card h-full`}>
            <div>
              <Icon tone="tint-sky text-ink">
                <ScanSearch size={22} />
              </Icon>
              <h3 className="mb-3 text-[26px] font-semibold tracking-[-0.03em] text-ink">Cek repo dulu</h3>
              <p className="mb-7 text-[15.5px] leading-relaxed text-ink-2">
                Depup membaca isi repo dan memberi tahu platform mana yang cocok sebelum deploy dimulai.
              </p>
            </div>
            <div className="flex flex-col gap-2 rounded-[22px] bg-paper p-4 text-[13px] leading-[19px] text-ink-2">
              <div className="mb-1 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#ff5f57]" aria-hidden="true" />
                <span className="h-2 w-2 rounded-full bg-[#febc2e]" aria-hidden="true" />
                <span className="h-2 w-2 rounded-full bg-[#28c840]" aria-hidden="true" />
                <span className="ml-2 text-[11px] text-ink-3">hasil-cek.log</span>
              </div>
              <div className="mono font-medium text-ink">Terdeteksi: Express</div>
              <div className="mono text-warn">! Vercel: butuh penyesuaian</div>
              <div className="mono text-ink-3">– Cloudflare: tidak cocok</div>
              <div className="mono text-ok">✓ Railway: cocok untuk server</div>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0}>
          <div className={`${CARD} bg-card h-full p-6`}>
            <div>
              <Icon tone="tint-sky text-ink">
                <Globe size={21} />
              </Icon>
              <h3 className="mb-2 text-[21px] font-semibold tracking-[-0.025em] text-ink">Domain sendiri</h3>
              <p className="mb-5 text-[14.5px] leading-relaxed text-ink-2">
                Tambahkan domain dan dapatkan record DNS persis yang perlu dipasang di registrar.
              </p>
            </div>
            <Mini className="flex items-center justify-between bg-paper">
              <span className="font-medium text-ink">tokokopi.id</span>
              <span className="rounded-full bg-ok/15 px-2.5 py-0.5 text-[11.5px] font-semibold text-ok">DNS siap</span>
            </Mini>
          </div>
        </Reveal>

        <Reveal delay={90}>
          <div className={`${CARD} tint-mint h-full p-6`}>
            <div>
              <Icon>
                <KeyRound size={21} />
              </Icon>
              <h3 className="mb-2 text-[21px] font-semibold tracking-[-0.025em] text-ink">Environment variables</h3>
              <p className="mb-5 text-[14.5px] leading-relaxed text-ink-2">
                Simpan per project dan kirim ke platform tujuan. Yang dibutuhkan repo terdeteksi otomatis.
              </p>
            </div>
            <Mini className="mono flex flex-col gap-1.5">
              <div className="flex justify-between text-ink-2">
                <span>DATABASE_URL</span>
                <span className="text-ok">••••••••••</span>
              </div>
              <div className="flex justify-between text-ink-2">
                <span>NEXT_PUBLIC_API</span>
                <span className="text-accent">https://api…</span>
              </div>
            </Mini>
          </div>
        </Reveal>

        <Reveal delay={180}>
          <div className={`${CARD} tint-rose h-full p-6`}>
            <div>
              <Icon>
                <RefreshCw size={21} />
              </Icon>
              <h3 className="mb-2 text-[21px] font-semibold tracking-[-0.025em] text-ink">Redeploy otomatis</h3>
              <p className="mb-5 text-[14.5px] leading-relaxed text-ink-2">
                Ubah secret, project langsung di-redeploy supaya nilai barunya terpakai.
              </p>
            </div>
            <Mini className="flex items-center justify-between text-ink-2">
              <span>API_KEY diperbarui</span>
              <span className="font-semibold text-ok">redeploy ✓</span>
            </Mini>
          </div>
        </Reveal>

        <Reveal delay={0}>
          <div className={`${CARD} bg-card h-full p-6`}>
            <div>
              <Icon tone="tint-lav text-ink">
                <LayoutGrid size={21} />
              </Icon>
              <h3 className="mb-2 text-[21px] font-semibold tracking-[-0.025em] text-ink">Satu daftar project</h3>
              <p className="mb-5 text-[14.5px] leading-relaxed text-ink-2">
                Semua project dan statusnya terlihat sekilas. Impor project yang sudah ada kapan saja.
              </p>
            </div>
            <Mini className="flex items-center justify-between bg-paper text-ink-2">
              <span>Vercel · Cloudflare · Railway</span>
              <span className="font-semibold text-ink">1 daftar</span>
            </Mini>
          </div>
        </Reveal>

        <Reveal delay={90}>
          <div className={`${CARD} bg-card h-full p-6`}>
            <div>
              <Icon tone="tint-sky text-ink">
                <History size={21} />
              </Icon>
              <h3 className="mb-2 text-[21px] font-semibold tracking-[-0.025em] text-ink">Riwayat deploy</h3>
              <p className="mb-5 text-[14.5px] leading-relaxed text-ink-2">
                Lihat deploy terakhir, hasilnya, dan buka lagi dengan satu klik.
              </p>
            </div>
            <div className="flex h-24 items-end gap-2 rounded-[20px] bg-paper p-3.5" aria-hidden="true">
              {["h-[40%] bg-fill/30", "h-[60%] bg-fill/30", "h-[50%] bg-fill/30", "h-[80%] bg-accent/60", "h-[65%] bg-accent/75", "h-[95%] bg-accent", "h-[75%] bg-ok"].map((c, k) => (
                <div key={k} className={`flex-1 rounded-full ${c}`} />
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal delay={180}>
          <div className={`${CARD} tint-sky h-full p-6`}>
            <div>
              <Icon>
                <ShieldCheck size={21} />
              </Icon>
              <h3 className="mb-2 text-[21px] font-semibold tracking-[-0.025em] text-ink">Token tetap milikmu</h3>
              <p className="mb-5 text-[14.5px] leading-relaxed text-ink-2">
                Token platform dikirim hanya saat dipakai. Login memakai akun Google, repo private bisa dengan GitHub Token.
              </p>
            </div>
            <Mini className="flex items-center justify-between text-ink-2">
              <span>Token Vercel</span>
              <span className="font-semibold text-ok">saat deploy saja</span>
            </Mini>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
