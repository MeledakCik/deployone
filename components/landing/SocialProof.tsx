import { Cloud, Github, Train, Triangle } from "lucide-react";

const PLATFORMS = [
  { name: "Vercel", Icon: Triangle, tone: "text-white" },
  { name: "Cloudflare Pages", Icon: Cloud, tone: "text-obs-warn" },
  { name: "Railway", Icon: Train, tone: "text-obs-lilac" },
  { name: "GitHub", Icon: Github, tone: "text-white" },
];

export function SocialProof() {
  return (
    <section className="mx-auto mt-12 flex max-w-7xl flex-col items-center gap-6 px-4 sm:px-8" aria-label="Platform yang didukung">
      <span className="text-[13px] text-obs-mute">Terhubung dengan platform yang kamu pakai</span>
      <ul className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 opacity-80 md:gap-x-14">
        {PLATFORMS.map(({ name, Icon, tone }) => (
          <li key={name} className="f-display flex items-center gap-2 text-[17px] font-bold text-white">
            <Icon size={20} className={tone} aria-hidden="true" />
            {name}
          </li>
        ))}
      </ul>
    </section>
  );
}
