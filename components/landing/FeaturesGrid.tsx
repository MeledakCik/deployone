import {
  Layers,
  Terminal,
  RotateCcw,
  ShieldCheck,
  Globe,
  Users,
  BarChart3,
  GitBranch,
  Webhook,
  ArrowUpRight,
  Zap,
} from "lucide-react";

const FEATURES = [
  {
    span: "md:col-span-3",
    icon: Layers,
    title: "Multi-Platform Deploy",
    desc: "Deploy ke Vercel dan Cloudflare Pages dari satu tempat. Satu klik, dua platform live tanpa pindah tab.",
    accent: "from-violet-500/20 to-fuchsia-500/10",
    large: true,
  },
  {
    icon: Terminal,
    title: "Realtime Logs",
    desc: "Streaming build logs secara real-time dengan syntax highlight dan error trace yang jelas.",
  },
  {
    icon: RotateCcw,
    title: "Instant Rollback",
    desc: "Balik ke versi sebelumnya dalam 1 detik. Aman tanpa downtime.",
  },
  {
    icon: ShieldCheck,
    title: "Env Manager",
    desc: "Kelola environment variables terenkripsi dengan sync otomatis.",
  },
  {
    icon: Globe,
    title: "Domain Control",
    desc: "Atur custom domain, SSL, dan redirect rules tanpa ribet.",
  },
  {
    icon: Users,
    title: "Team Collaboration",
    desc: "Invite tim, atur role, dan review deployment bareng.",
  },
  {
    icon: BarChart3,
    title: "Usage Analytics",
    desc: "Pantau bandwidth, build time, dan request dengan chart yang cantik.",
  },
  {
    icon: GitBranch,
    title: "Git Integrations",
    desc: "Auto-deploy dari GitHub push, PR preview, dan branch mapping.",
  },
  {
    icon: Webhook,
    title: "Webhooks & API",
    desc: "Trigger deploy via webhook atau gunakan API untuk CI/CD custom.",
  },
];

export function FeaturesGrid() {
  return (
    <section id="features" className="relative mx-auto max-w-[1200px] px-6 pt-24 pb-16">
      <div className="max-w-[640px]">
        <h2 className="text-[30px] md:text-[44px] leading-[1.05] tracking-[-0.03em] font-bold text-[var(--text)]">
          Semua yang kamu butuhkan untuk deploy, dalam satu tempat.
        </h2>
        <p className="mt-4 text-[var(--text-muted)] text-[15px] leading-relaxed">
          Glassmorphism dashboard yang cepat, keyboard-first, dan dibuat untuk developer yang benci
          pindah tab.
        </p>
      </div>

      <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-[14px]">
        {FEATURES.map((feature) => {
          const Icon = feature.icon;
          return (
            <div
              key={feature.title}
              className={`group relative rounded-[22px] backdrop-blur-xl p-[22px] overflow-hidden transition-all duration-300 ${
                feature.span || ""
              } ${feature.large ? "md:min-h-[280px]" : "min-h-[200px]"}`}
              style={{ background: "var(--card-hover)", border: "1px solid var(--line)" }}
            >
              <div
                className={`pointer-events-none absolute -top-24 -right-24 w-[260px] h-[260px] rounded-full bg-gradient-to-br ${
                  feature.accent || "from-violet-500/10 to-transparent"
                } blur-[30px] opacity-60 group-hover:opacity-90 transition`}
              />

              <div className="relative">
                <div
                  className="w-10 h-10 rounded-[12px] flex items-center justify-center"
                  style={{ background: "var(--pill-bg)", border: "1px solid var(--line-strong)" }}
                >
                  <Icon size={18} className="text-[var(--text-muted)] group-hover:text-[var(--text)] transition" />
                </div>

                {feature.large ? (
                  <div className="mt-6 flex flex-col lg:flex-row gap-6">
                    <div className="flex-1">
                      <h3 className="text-[22px] font-bold tracking-tight text-[var(--text)]">
                        {feature.title}
                      </h3>
                      <p className="mt-2 text-[14px] leading-relaxed text-[var(--text-muted)] max-w-[380px]">
                        {feature.desc}
                      </p>
                      <div className="mt-5 flex gap-2">
                        <span className="h-7 px-3 rounded-full bg-white text-black text-[12px] font-semibold flex items-center shadow-[0_0_0_1px_rgba(15,23,42,0.08)]">
                          Vercel
                        </span>
                        <span className="pill h-7 px-3 text-[12px] flex items-center text-[var(--text-muted)]">
                          Cloudflare
                        </span>
                        <span className="pill h-7 px-3 text-[12px] flex items-center text-[var(--text-muted)]">
                          + GitHub
                        </span>
                      </div>
                    </div>

                    <div
                      className="lg:w-[300px] rounded-[14px] p-3 backdrop-blur"
                      style={{ background: "var(--surface-solid)", border: "1px solid var(--surface-line)" }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex gap-1.5 items-center">
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                          <span className="text-[11px] text-[var(--text-faint)]">syncing platforms</span>
                        </div>
                        <Zap size={12} className="text-violet-400" />
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <div className="h-[64px] rounded-[10px] p-2.5" style={{ background: "var(--card-hover)", border: "1px solid var(--line)" }}>
                          <div className="text-[10px] text-[var(--text-faint)]">VERCEL</div>
                          <div className="mt-1 text-[13px] font-semibold text-[var(--text)]">3 Projects</div>
                          <div className="mt-1 w-full h-1 rounded-full overflow-hidden" style={{ background: "var(--pill-bg)" }}>
                            <div className="h-full w-[70%]" style={{ background: "var(--text-muted)" }} />
                          </div>
                        </div>
                        <div className="h-[64px] rounded-[10px] p-2.5" style={{ background: "var(--card-hover)", border: "1px solid var(--line)" }}>
                          <div className="text-[10px] text-[var(--text-faint)]">CLOUDFLARE</div>
                          <div className="mt-1 text-[13px] font-semibold text-[var(--text)]">2 Projects</div>
                          <div className="mt-1 w-full h-1 rounded-full overflow-hidden" style={{ background: "var(--pill-bg)" }}>
                            <div className="h-full w-[45%] bg-orange-400/70" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <h3 className="mt-5 text-[16px] font-semibold tracking-tight text-[var(--text)]">
                      {feature.title}
                    </h3>
                    <p className="mt-2 text-[13.5px] leading-[1.5] text-[var(--text-muted)]">{feature.desc}</p>
                  </>
                )}
              </div>

              <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition duration-500 bg-[radial-gradient(400px_circle_at_0%_0%,rgba(139,92,246,0.10),transparent_60%)]" />
              <span
                className="absolute bottom-3 right-3 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition"
                style={{ background: "var(--pill-bg)", border: "1px solid var(--line)" }}
              >
                <ArrowUpRight size={12} className="text-[var(--text-muted)]" />
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
