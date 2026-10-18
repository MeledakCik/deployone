"use client";

import * as React from "react";
import { Check } from "@/components/ui/icons";
import { Badge } from "@/components/ui/primitives";

/**
 * Demo animasi alur deploy Depup: tempel link, periksa repo, deploy, online.
 * Tiga skenario mengikuti jenis project di tabel "Repo kamu cocok di mana?".
 *
 * Semua tampilan diturunkan dari satu penghitung waktu `t` (ms), jadi tiap tahap bisa dilompati
 * dan saat prefers-reduced-motion tampilan berhenti di pose akhir tanpa timer.
 */

const SCENARIOS = [
  {
    key: "html",
    tab: "Situs HTML",
    tone: "bg-tone-lilac",
    repo: "github.com/rani/portofolio",
    kind: "HTML, CSS, JavaScript biasa",
    checks: ["index.html ditemukan", "Tanpa build, langsung tayang"],
    platform: "Cloudflare Pages",
    logs: ["Mengambil file dari GitHub", "Menyalin ke jaringan edge", "Situs tayang"],
    url: "portofolio.pages.dev",
  },
  {
    key: "next",
    tab: "Next.js",
    tone: "bg-tone-peri",
    repo: "github.com/dimas/toko-online",
    kind: "Next.js (React)",
    checks: ["package.json terbaca", "Script build ada, API route aktif"],
    platform: "Vercel",
    logs: ["Install dependency", "next build", "Deploy ke edge"],
    url: "toko-online.vercel.app",
  },
  {
    key: "node",
    tab: "Server Node.js",
    tone: "bg-tone-mint",
    repo: "github.com/dimas/api-toko",
    kind: "Express (server Node.js)",
    checks: ["Server terdeteksi", "Butuh container yang jalan terus"],
    platform: "Railway",
    logs: ["Membangun image", "Menjalankan container", "Server online"],
    url: "api-toko.up.railway.app",
  },
] as const;

const STEPS = ["Tempel", "Periksa", "Deploy", "Online"] as const;
/** Awal tiap tahap (ms). Tahap terakhir berakhir di TOTAL. */
const START = [0, 2400, 4800, 8400] as const;
const TOTAL = 11400;
const TICK = 80;

function usePrefersReducedMotion() {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduced(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}

export function DeployDemo() {
  const reduced = usePrefersReducedMotion();
  const rootRef = React.useRef<HTMLDivElement>(null);
  const [scenario, setScenario] = React.useState(0);
  const [t, setT] = React.useState(0);
  const [playing, setPlaying] = React.useState(true);
  const [inView, setInView] = React.useState(false);
  const [picked, setPicked] = React.useState(false); // pengguna memilih skenario sendiri: berhenti berganti otomatis

  // Reduced motion: langsung ke pose akhir.
  React.useEffect(() => {
    if (reduced) setT(TOTAL - 1);
  }, [reduced]);

  // Jalan hanya saat bagian ini terlihat di layar.
  React.useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  React.useEffect(() => {
    if (reduced || !playing || !inView) return;
    const id = window.setInterval(() => setT((v) => v + TICK), TICK);
    return () => window.clearInterval(id);
  }, [reduced, playing, inView]);

  // Satu putaran selesai: lanjut ke skenario berikutnya (atau ulang yang sama kalau dipilih manual).
  React.useEffect(() => {
    if (reduced || t < TOTAL) return;
    setT(0);
    if (!picked) setScenario((s) => (s + 1) % SCENARIOS.length);
  }, [t, reduced, picked]);

  const s = SCENARIOS[scenario];
  const phase = t >= START[3] ? 3 : t >= START[2] ? 2 : t >= START[1] ? 1 : 0;
  const typed = Math.floor((Math.min(t, 1800) / 1800) * s.repo.length);
  const typingDone = typed >= s.repo.length;
  const progress = Math.max(0, Math.min(100, ((t - START[2]) / (START[3] - START[2])) * 100));
  const stageIdx = progress < 34 ? 0 : progress < 67 ? 1 : 2;

  const jumpTo = (i: number) => {
    // Reduced motion tidak punya waktu berjalan, jadi tampilkan akhir tahap itu.
    setT(reduced ? (i === 3 ? TOTAL : START[i + 1]) - 1 : START[i]);
  };
  const pick = (i: number) => {
    setScenario(i);
    setPicked(true);
    setT(reduced ? TOTAL - 1 : 0);
  };

  return (
    <section id="demo" className="mx-auto w-full max-w-6xl scroll-mt-24 px-4 pb-16 pt-4 sm:px-8 sm:pb-20">
      <div className="mx-auto mb-10 max-w-3xl text-center">
        <h2 className="lp-h2">Lihat Depup bekerja.</h2>
        <p className="lp-lead">Pilih jenis project-mu dan tonton alurnya, dari link repo sampai situs online.</p>
      </div>

      <div ref={rootRef}>
        <div className="mb-5 flex flex-wrap items-center justify-center gap-2" role="group" aria-label="Pilih jenis project">
          {SCENARIOS.map((sc, i) => (
            <button
              key={sc.key}
              type="button"
              onClick={() => pick(i)}
              aria-pressed={i === scenario}
              className={`pill px-4 py-2.5 text-[13.5px] font-semibold ${i === scenario ? "" : "bg-[var(--surface-solid)] text-text-muted"}`}
              style={i === scenario ? { background: "var(--ink-fill)", color: "var(--ink-fill-text)" } : undefined}
            >
              {sc.tab}
            </button>
          ))}
        </div>

        <div className="lp-window mx-auto max-w-3xl p-2 sm:p-3">
          <div className="overflow-hidden rounded-[26px] bg-[var(--surface-solid)] sm:rounded-[30px]">
            {/* Bar judul + tahap */}
            <div className="flex items-center justify-between gap-3 border-b border-[var(--surface-line)] px-4 py-3 sm:px-6">
              <div className="flex items-center gap-1.5" aria-hidden="true">
                <span className="h-2.5 w-2.5 rounded-full bg-tone-peach" />
                <span className="h-2.5 w-2.5 rounded-full bg-tone-lemon" />
                <span className="h-2.5 w-2.5 rounded-full bg-tone-mint" />
              </div>
              <ol className="flex items-center gap-1 sm:gap-2" aria-label="Tahap deploy">
                {STEPS.map((label, i) => {
                  const done = i < phase;
                  const active = i === phase;
                  return (
                    <li key={label} className="flex items-center gap-1 sm:gap-2">
                      <button
                        type="button"
                        onClick={() => jumpTo(i)}
                        aria-current={active ? "step" : undefined}
                        className={`dd-step flex items-center gap-1.5 rounded-full py-1 pl-1 pr-2.5 text-[11.5px] font-semibold sm:text-[12.5px] ${active ? "bg-tone-lilac text-text" : "text-text-faint"}`}
                      >
                        <span
                          className="grid h-5 w-5 place-items-center rounded-full text-[10.5px] font-bold tabular-nums transition-colors"
                          style={
                            active || done
                              ? { background: "var(--ink-fill)", color: "var(--ink-fill-text)" }
                              : { background: "var(--tone-lilac)", color: "var(--text-muted)" }
                          }
                        >
                          {done ? <Check size={11} /> : i + 1}
                        </span>
                        <span className="hidden min-[420px]:inline">{label}</span>
                      </button>
                      {i < STEPS.length - 1 && <span className="hidden h-px w-3 bg-[var(--line)] sm:block" aria-hidden="true" />}
                    </li>
                  );
                })}
              </ol>
              {reduced ? (
                <span className="w-[34px]" aria-hidden="true" />
              ) : (
                <button
                  type="button"
                  onClick={() => setPlaying((p) => !p)}
                  aria-label={playing ? "Jeda animasi" : "Putar animasi"}
                  className="pill grid h-[34px] w-[34px] place-items-center"
                >
                  {playing ? (
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden="true">
                      <rect x="6" y="5" width="4" height="14" rx="1.2" />
                      <rect x="14" y="5" width="4" height="14" rx="1.2" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden="true">
                      <path d="M8 5.5v13a1 1 0 0 0 1.5.9l10.4-6.5a1 1 0 0 0 0-1.8L9.5 4.6A1 1 0 0 0 8 5.5z" />
                    </svg>
                  )}
                </button>
              )}
            </div>

            {/* Isi tahap */}
            <div className="relative min-h-[320px] px-4 py-6 sm:min-h-[340px] sm:px-8 sm:py-8" aria-hidden="true">
              {phase === 0 && (
                <div key={`${s.key}-0`} className="dd-in">
                  <div className="mb-2 text-[12px] font-bold text-text-faint">Link repo GitHub</div>
                  <div className="flex items-center gap-2 rounded-2xl border border-[var(--line-strong)] bg-[var(--surface-solid)] px-4 py-3.5 font-mono text-[13px] sm:text-[14.5px]">
                    <span className="truncate font-semibold text-text">{s.repo.slice(0, typed)}</span>
                    <span className="dd-caret h-[18px] w-[2px] shrink-0" style={{ background: "var(--ink-fill)" }} />
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <span className="text-[12.5px] text-text-muted">Repo private? Tambahkan GitHub Token di Settings.</span>
                    <span
                      className={`rounded-full px-5 py-2.5 text-[13px] font-semibold transition-transform ${typingDone ? "dd-press" : "opacity-60"}`}
                      style={{ background: "var(--ink-fill)", color: "var(--ink-fill-text)" }}
                    >
                      Periksa repo
                    </span>
                  </div>
                </div>
              )}

              {phase === 1 && (
                <div key={`${s.key}-1`}>
                  <div className="dd-in mb-4 flex items-center gap-2 font-mono text-[12.5px] text-text-muted">
                    <span className="live-dot" />
                    {s.repo}
                  </div>
                  <div className={`rounded-2xl p-4 sm:p-5 ${s.tone}`}>
                    <div className="dd-in mb-1 text-[11px] font-bold text-text-faint" style={{ animationDelay: "120ms" }}>
                      Hasil pemeriksaan
                    </div>
                    <div className="dd-in text-[19px] font-bold tracking-[-0.02em] sm:text-[22px]" style={{ animationDelay: "250ms" }}>
                      {s.kind}
                    </div>
                    <ul className="mt-4 flex flex-col gap-2 text-[13.5px]">
                      {s.checks.map((c, i) => (
                        <li key={c} className="dd-in flex items-center gap-2 text-ok-fg" style={{ animationDelay: `${600 + i * 450}ms` }}>
                          <Check size={14} />
                          <span className="font-medium text-text">{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="dd-in mt-4 flex items-center justify-between gap-3" style={{ animationDelay: "1600ms" }}>
                    <span className="text-[13px] text-text-muted">Platform yang cocok</span>
                    <Badge tone="good">
                      <Check size={13} strokeWidth={3} />
                      {s.platform}
                    </Badge>
                  </div>
                </div>
              )}

              {phase === 2 && (
                <div key={`${s.key}-2`} className="dd-in">
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <div className="text-[13px] text-text-muted">
                      Deploy ke <b className="font-semibold text-text">{s.platform}</b>
                    </div>
                    <span className="font-mono text-[13px] font-semibold tabular-nums text-text">{Math.round(progress)}%</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-tone-lilac">
                    <div
                      className="dd-bar h-full rounded-full"
                      style={{ width: `${progress}%`, background: "var(--ink-fill)" }}
                    />
                  </div>
                  <div className="mt-5 grid grid-cols-3 gap-2 text-center text-[12.5px] font-semibold">
                    {["Build", "Deploy", "Live"].map((name, i) => (
                      <div
                        key={name}
                        className={`rounded-xl px-2 py-2.5 transition-colors ${i <= stageIdx ? "bg-tone-lilac text-text" : "bg-[var(--frame)] text-text-faint"}`}
                      >
                        {name}
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 rounded-2xl bg-[var(--frame)] p-4 font-mono text-[12px] leading-[20px]">
                    {s.logs.map((l, i) =>
                      progress > i * 30 + 4 ? (
                        <div key={l} className="dd-in flex items-center gap-2 text-text-muted">
                          <span className="text-ok-fg">›</span>
                          {l}
                        </div>
                      ) : null,
                    )}
                  </div>
                </div>
              )}

              {phase === 3 && (
                <div key={`${s.key}-3`} className="relative flex min-h-[260px] flex-col items-center justify-center text-center">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <span
                      key={i}
                      className="dd-spark absolute left-1/2 top-[88px] h-2 w-2 rounded-full"
                      style={{
                        background: i % 2 ? "#C6F432" : "var(--ink-fill)",
                        ["--a" as string]: `${i * 36}deg`,
                      }}
                    />
                  ))}
                  <span className="dd-pop mb-4 grid h-16 w-16 place-items-center rounded-full" style={{ background: "var(--ink-fill)", color: "var(--ink-fill-text)" }}>
                    <Check size={30} />
                  </span>
                  <div className="dd-in text-[22px] font-bold tracking-[-0.02em] sm:text-[26px]" style={{ animationDelay: "250ms" }}>
                    Situsmu sudah online
                  </div>
                  <div
                    className="dd-in mt-4 inline-flex max-w-full items-center gap-2 rounded-full bg-tone-mint px-4 py-2.5 font-mono text-[12.5px] font-semibold sm:text-[14px]"
                    style={{ animationDelay: "500ms" }}
                  >
                    <span className="live-dot" />
                    <span className="truncate">https://{s.url}</span>
                  </div>
                  <div className="dd-in mt-3 text-[12.5px] text-text-muted" style={{ animationDelay: "700ms" }}>
                    Project masuk ke daftar Projects, siap dideploy ulang kapan saja.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Ringkasan untuk pembaca layar, karena animasinya disembunyikan dari aksesibilitas */}
        <p className="sr-only">
          Contoh alur deploy: tempel link repo GitHub, Depup memeriksa isinya (misalnya {s.kind}) dan merekomendasikan {s.platform}, lalu
          deploy berjalan dari build sampai live dan situs online di {s.url}.
        </p>
        <p className="mt-4 text-center text-[12.5px] text-text-muted">Contoh tampilan. Klik tahap di atas untuk melompat.</p>
      </div>
    </section>
  );
}
