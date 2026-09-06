import Link from "next/link";
import { ArrowUpRight, Play } from "lucide-react";

const DEPLOYMENTS = [
  { name: "depush-landing-v2", platform: "VERCEL", status: "Ready", time: "2m ago", branch: "main", dot: "bg-emerald-400" },
  { name: "api-gateway-edge", platform: "CLOUDFLARE", status: "Building", time: "now", branch: "feat/cache", dot: "bg-amber-400" },
  { name: "docs-v3-redesign", platform: "VERCEL", status: "Ready", time: "18m ago", branch: "docs/new", dot: "bg-emerald-400" },
  { name: "marketing-site", platform: "CLOUDFLARE", status: "Failed", time: "1h ago", branch: "main", dot: "bg-red-400" },
  { name: "dashboard-app", platform: "VERCEL", status: "Ready", time: "3h ago", branch: "main", dot: "bg-emerald-400" },
];

const STATS = [
  { k: "Total Deploys", v: "1,284", d: "+12%" },
  { k: "Success Rate", v: "98.2%", d: "+0.4%" },
  { k: "Avg Build", v: "47s", d: "-8s" },
];

function statusClasses(status: string) {
  if (status === "Ready") return "bg-emerald-500/10 border-emerald-400/20 text-emerald-300";
  if (status === "Building") return "bg-amber-500/10 border-amber-400/20 text-amber-300";
  return "bg-red-500/10 border-red-400/20 text-red-300";
}

export function Hero() {
  return (
    <section className="relative mx-auto max-w-[1200px] px-6 pt-12 md:pt-20 pb-10 md:pb-24">
      <div className="grid md:grid-cols-[1.05fr_0.95fr] gap-12 md:gap-8 items-center">
        {/* Left: copy */}
        <div>
          <div className="pill inline-flex items-center gap-2.5 h-8 px-3.5 backdrop-blur-xl text-[12.5px] text-[var(--text-muted)]">
            <span
              className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.6)]"
              style={{ animation: "landing-blink 1.4s infinite" }}
            />
            Sekarang mendukung Cloudflare Pages
            <span className="w-px h-3 mx-1 hidden sm:block" style={{ background: "var(--line-strong)" }} />
            <span className="hidden sm:inline-flex items-center gap-1 text-[var(--text-faint)]">
              Baru <span className="w-1 h-1 rounded-full" style={{ background: "var(--text-faint)" }} />
            </span>
          </div>

          <h1 className="mt-7 text-[42px] md:text-[64px] leading-[0.95] tracking-[-0.04em] font-[800] text-[var(--text)]">
            Deploy without
            <br />
            <span className="text-[var(--text)]">the hassle.</span>
          </h1>

          <p className="mt-5 text-[16.5px] md:text-[18px] leading-[1.6] text-[var(--text-muted)] max-w-[480px]">
            Kelola semua deployment Vercel dan Cloudflare dari satu dashboard glass yang cantik.
            No more tab switching.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="group h-[44px] px-6 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white text-[14px] font-semibold flex items-center gap-2 shadow-[0_0_30px_rgba(124,58,237,0.35)] hover:shadow-[0_0_40px_rgba(124,58,237,0.5)] hover:brightness-110 transition-all"
            >
              Deploy Sekarang
              <ArrowUpRight size={16} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </Link>

            <a
              href="#how-it-works"
              className="pill h-[44px] px-6 backdrop-blur-xl text-[var(--text)] text-[14px] font-medium flex items-center gap-2 hover:brightness-105 transition"
            >
              <span className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "var(--card-hover)" }}>
                <Play size={12} className="fill-[var(--text)] ml-0.5" />
              </span>
              Lihat Demo
            </a>
          </div>

          <div className="mt-10 flex items-center gap-6 text-[12.5px] text-[var(--text-faint)]">
            <div className="flex -space-x-2">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="w-7 h-7 rounded-full border backdrop-blur flex items-center justify-center text-[10px] font-bold text-[var(--text)]"
                  style={{ background: "var(--card-hover)", borderColor: "var(--line)" }}
                >
                  {String.fromCharCode(64 + n)}
                </div>
              ))}
            </div>
            <span>Dipercaya 2,400+ developers Indonesia</span>
          </div>
        </div>

        {/* Right: glass dashboard mockup */}
        <div className="relative md:h-[520px] flex items-center justify-center">
          <div
            className="absolute w-[420px] h-[420px] bg-violet-600/20 blur-[80px] rounded-full -z-10"
            style={{ animation: "landing-glow-pulse 4s ease-in-out infinite" }}
          />
          <div className="absolute w-[300px] h-[300px] bg-fuchsia-500/15 blur-[60px] rounded-full top-10 right-10 -z-10" />

          <div
            className="glass w-full max-w-[560px] !rounded-[24px] overflow-hidden"
            style={{ animation: "landing-float 6s ease-in-out infinite" }}
          >
            <div
              className="h-[48px] px-5 flex items-center justify-between"
              style={{ borderBottom: "1px solid var(--line)", background: "var(--card-hover)" }}
            >
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ background: "var(--line-strong)" }} />
                  <div className="w-3 h-3 rounded-full" style={{ background: "var(--line-strong)" }} />
                  <div className="w-3 h-3 rounded-full" style={{ background: "var(--line-strong)" }} />
                </div>
                <span className="ml-4 text-[12px] text-[var(--text-faint)] tracking-wide">
                  depush.app / deployments
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="pill w-20 h-6" />
                <div className="w-6 h-6 rounded-full bg-violet-500/20 border border-violet-400/20 flex items-center justify-center text-[10px] text-[var(--text-muted)]">
                  ⌘K
                </div>
              </div>
            </div>

            <div className="p-4 grid grid-cols-3 gap-3">
              {STATS.map((s) => (
                <div key={s.k} className="rounded-[14px] p-3" style={{ background: "var(--card-hover)", border: "1px solid var(--line)" }}>
                  <div className="text-[10px] uppercase tracking-widest text-[var(--text-faint)]">{s.k}</div>
                  <div className="mt-1 flex items-end gap-1.5">
                    <span className="text-[18px] font-bold tracking-tight text-[var(--text)]">{s.v}</span>
                    <span className="text-[11px] text-emerald-500 mb-[2px]">{s.d}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-4 pb-4 space-y-2">
              <div className="flex items-center justify-between px-1 pb-1">
                <span className="text-[11px] tracking-widest text-[var(--text-faint)] uppercase">
                  Recent Deployments
                </span>
                <span className="text-[11px] text-[var(--text-faint)]">5 active</span>
              </div>

              {DEPLOYMENTS.map((d) => (
                <div
                  key={d.name}
                  className="group flex items-center gap-3 h-[54px] px-3.5 rounded-[14px] transition-all cursor-default"
                  style={{ background: "var(--card-hover)", border: "1px solid var(--line)" }}
                >
                  <div className={`w-2 h-2 rounded-full ${d.dot} shadow-[0_0_8px_currentColor]`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-medium text-[var(--text)] truncate">{d.name}</span>
                      <span className="hidden sm:inline text-[9px] px-1.5 py-0.5 rounded tracking-widest text-[var(--text-faint)]" style={{ background: "var(--pill-bg)", border: "1px solid var(--line)" }}>
                        {d.platform}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-[var(--text-faint)]">{d.branch}</span>
                      <span className="w-1 h-1 rounded-full" style={{ background: "var(--line-strong)" }} />
                      <span className="text-[11px] text-[var(--text-faint)]">{d.time}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] px-2.5 py-1 rounded-full border font-medium ${statusClasses(d.status)}`}>
                      {d.status}
                    </span>
                    <div className="w-6 h-6 rounded-full hidden sm:flex items-center justify-center opacity-0 group-hover:opacity-100 transition" style={{ background: "var(--pill-bg)" }}>
                      <ArrowUpRight size={12} className="text-[var(--text-faint)]" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="h-10 bg-gradient-to-t from-[var(--bg-base)]/40 to-transparent pointer-events-none" />
          </div>
        </div>
      </div>
    </section>
  );
}
