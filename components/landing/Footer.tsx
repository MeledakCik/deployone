import * as React from "react";
import Image from "next/image";
import { DashboardLink } from "./DashboardLink";
import { InstagramIcon, LinkedInIcon, TikTokIcon, WhatsAppIcon } from "./SocialIcons";
import { COMMUNITY_LINKS, type CommunityKey } from "@/lib/community";

/** Akun resmi DepUp. Daftar tautannya ada di lib/community.ts. */
const ICONS: Record<CommunityKey, React.ComponentType<{ size?: number }>> = {
  "wa-channel": WhatsAppIcon,
  "wa-community": WhatsAppIcon,
  instagram: InstagramIcon,
  tiktok: TikTokIcon,
  linkedin: LinkedInIcon,
};

/** Footer berada di atas kanvas ungu, jadi teksnya putih (token sidebar), bukan Ink. */
export function Footer() {
  return (
    <footer style={{ color: "var(--sidebar-text)" }}>
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-5 py-10 sm:px-8 md:flex-row md:items-center">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2.5">
            <Image src="/logo-white.png" alt="" width={28} height={28} className="h-7 w-7" />
            <span className="text-[18px] font-bold tracking-tight">Depup</span>
          </div>
          <p className="max-w-sm text-[13px] leading-relaxed">
            Dashboard untuk deploy dan kelola project di Vercel, Cloudflare Pages, dan Railway.
          </p>
          <ul className="mt-1 flex items-center gap-2" aria-label="Media sosial Depup">
            {COMMUNITY_LINKS.map(({ key, label, href }) => {
              const Icon = ICONS[key];
              return (
              <li key={key}>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Depup di ${label}`}
                  title={label}
                  className="grid h-10 w-10 place-items-center rounded-full border transition-colors hover:bg-[var(--sidebar-hover)] focus-visible:bg-[var(--sidebar-hover)]"
                  style={{ borderColor: "var(--sidebar-line)" }}
                >
                  <Icon size={18} />
                </a>
              </li>
              );
            })}
          </ul>
        </div>

        <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-7 gap-y-2 text-[13px] font-medium">
          <a href="/fitur" className="underline-offset-4 transition-colors hover:underline">Fitur</a>
          <a href="/#faq" className="underline-offset-4 transition-colors hover:underline">FAQ</a>
          <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="underline-offset-4 transition-colors hover:underline">GitHub</a>
          <a href="/docs/mcp" className="underline-offset-4 transition-colors hover:underline">Konektor Claude</a>
          <a href="/docs" className="underline-offset-4 transition-colors hover:underline">Dokumentasi</a>
          <a href="/privacy" className="underline-offset-4 transition-colors hover:underline">Privasi</a>
          <a href="/donate" target="_blank" rel="noopener noreferrer" className="underline-offset-4 transition-colors hover:underline">Dukung lewat Saweria</a>
        </nav>
      </div>
      <div className="border-t" style={{ borderColor: "var(--sidebar-line)" }}>
        <div className="lp-footer-bottom mx-auto max-w-6xl px-5 pt-4 text-[12px] sm:px-8">© {new Date().getFullYear()} Depup</div>
      </div>
    </footer>
  );
}
