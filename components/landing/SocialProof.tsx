import { Github } from "lucide-react";
import { CloudflareIcon, RailwayIcon, VercelIcon } from "@/components/ui/PlatformIcon";

const PLATFORMS = [
  { name: "Vercel", Icon: VercelIcon, tone: "text-lav-text" },
  { name: "Cloudflare Pages", Icon: CloudflareIcon, tone: "text-lav-text" },
  { name: "Railway", Icon: RailwayIcon, tone: "text-lav-text" },
  { name: "GitHub", Icon: Github, tone: "text-text" },
];

export function SocialProof() {
  return (
    <section className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 pt-14 sm:px-8 sm:pt-16" aria-label="Platform yang didukung">
      <span className="text-[13px] font-medium text-text-muted">Terhubung dengan platform yang kamu pakai</span>
      <ul className="flex flex-wrap items-center justify-center gap-3">
        {PLATFORMS.map(({ name, Icon, tone }) => (
          <li
            key={name}
            className="flex items-center gap-2.5 rounded-full bg-[var(--chip-bg)] py-2.5 pl-3.5 pr-5 text-[15px] font-bold tracking-tight text-text"
          >
            <Icon size={19} className={tone} aria-hidden="true" />
            {name}
          </li>
        ))}
      </ul>
    </section>
  );
}
