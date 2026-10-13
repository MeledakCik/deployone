import { Cloud, Github, Train, Triangle } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";

const PLATFORMS = [
  { name: "Vercel", Icon: Triangle, tone: "text-ink" },
  { name: "Cloudflare Pages", Icon: Cloud, tone: "text-warn" },
  { name: "Railway", Icon: Train, tone: "text-accent" },
  { name: "GitHub", Icon: Github, tone: "text-ink" },
];

export function SocialProof() {
  return (
    <section className="mx-auto mt-16 flex max-w-6xl flex-col items-center gap-6 px-4 sm:px-8" aria-label="Platform yang didukung">
      <Reveal className="flex flex-col items-center gap-6">
        <span className="text-[14px] text-ink-3">Terhubung dengan platform yang kamu pakai</span>
        <ul className="flex flex-wrap items-center justify-center gap-3">
          {PLATFORMS.map(({ name, Icon, tone }) => (
            <li
              key={name}
              className="flex items-center gap-2.5 rounded-full bg-card px-5 py-3 text-[15px] font-semibold tracking-[-0.02em] text-ink shadow-card transition-transform duration-500 ease-bounce hover:-translate-y-1 hover:scale-105"
            >
              <Icon size={18} className={tone} aria-hidden="true" />
              {name}
            </li>
          ))}
        </ul>
      </Reveal>
    </section>
  );
}
