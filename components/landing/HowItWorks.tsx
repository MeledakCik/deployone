import { Github, KeyRound, Rocket } from "lucide-react";

const STEPS = [
  {
    icon: Github,
    title: "Connect GitHub",
    desc: "Hubungkan akun GitHub kamu dan pilih repository yang ingin di-deploy.",
  },
  {
    icon: KeyRound,
    title: "Set Token",
    desc: "Masukkan token platform (Vercel/Cloudflare) sekali saja, tersimpan aman di vault.",
  },
  {
    icon: Rocket,
    title: "Deploy",
    desc: "Klik deploy, pantau progress secara realtime, dan dapatkan URL live dalam hitungan detik.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="px-4 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-xl mb-16">
          <p className="text-[13px] font-medium text-violet-400 mb-3">How it Works</p>
          <h2 className="text-[32px] sm:text-[40px] font-semibold tracking-tight leading-[1.1]">
            Tiga langkah, dari repo ke live URL.
          </h2>
        </div>

        <div className="relative grid gap-10 sm:grid-cols-3">
          <div className="pointer-events-none absolute left-0 right-0 top-6 hidden h-px bg-gradient-to-r from-transparent via-[var(--line-strong)] to-transparent sm:block" />
          {STEPS.map((step, i) => (
            <div key={step.title} className="relative">
              <div className="glass-flat relative z-10 mb-5 grid h-12 w-12 place-items-center rounded-full text-violet-400">
                <step.icon size={20} />
              </div>
              <h3 className="text-[15px] font-semibold mb-1.5">
                {i + 1}. {step.title}
              </h3>
              <p className="text-[13px] leading-relaxed text-text-muted max-w-xs">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
