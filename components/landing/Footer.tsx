import { getT } from "@/lib/i18n/server";
import * as React from "react";
import Image from "next/image";
import { DashboardLink } from "./DashboardLink";
import { InstagramIcon, LinkedInIcon, TikTokIcon, WhatsAppIcon, XIcon } from "./SocialIcons";
import { COMMUNITY_LINKS as COMMUNITY_LINKS_RAW, type CommunityKey } from "@/lib/community";
import { tDeep } from "@/lib/i18n/core";
import { Users } from "@/components/ui/icons";
import { LanguageSwitch } from "@/components/ui/LanguageSwitch";

/** Akun resmi DepUp. Daftar tautannya ada di lib/community.ts. */
const ICONS: Record<CommunityKey, React.ComponentType<{ size?: number }>> = {
  "wa-channel": WhatsAppIcon,
  // Ikon berbeda dari Saluran WhatsApp, supaya dua tautan WhatsApp bisa dibedakan tanpa membaca label.
  "wa-community": Users,
  x: XIcon,
  instagram: InstagramIcon,
  tiktok: TikTokIcon,
  linkedin: LinkedInIcon,
};

/** Footer berada di atas kanvas ungu, jadi teksnya putih (token sidebar), bukan Ink. */
export function Footer() {
  const t = getT();
  const COMMUNITY_LINKS = tDeep(COMMUNITY_LINKS_RAW, t);
  return (
    // Latar sedikit digelapkan (Ink 18%) di atas kanvas ungu: teks putih 13px jadi ≥ 5:1 (sebelumnya ±4,2:1, di bawah WCAG AA).
    <footer style={{ color: "var(--sidebar-text)", background: "rgba(18, 11, 46, 0.18)" }}>
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-5 py-10 sm:px-8 md:flex-row md:items-center">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2.5">
            <Image src="/logo-white.png" alt="" width={28} height={28} className="h-7 w-7" />
            <span className="text-[18px] font-bold tracking-tight">{t("Depup")}</span>
          </div>
          <p className="max-w-sm text-[13px] leading-relaxed">
            {t("Dashboard untuk deploy dan kelola project di Vercel, Cloudflare Pages, dan Railway.")}
          </p>
          <ul className="mt-1 flex items-center gap-2" aria-label={t("Media sosial Depup")}>
            {COMMUNITY_LINKS.map(({ key, label, href }) => {
              const Icon = ICONS[key];
              return (
              <li key={key}>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t("Depup di {label}", { label })}
                  title={t(label)}
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

        <nav aria-label={t("Footer")} className="flex flex-wrap items-center gap-x-7 gap-y-2 text-[13px] font-medium">
          <a href="/fitur" className="underline-offset-4 transition-colors hover:underline">{t("Fitur")}</a>
          <a href="/#faq" className="underline-offset-4 transition-colors hover:underline">FAQ</a>
          <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="underline-offset-4 transition-colors hover:underline">{t("GitHub")}</a>
          <a href="/docs/mcp" className="underline-offset-4 transition-colors hover:underline">{t("Konektor Claude")}</a>
          <a href="/docs" className="underline-offset-4 transition-colors hover:underline">{t("Dokumentasi")}</a>
          <a href="/privacy" className="underline-offset-4 transition-colors hover:underline">{t("Privasi")}</a>
                    <a href="/donate" target="_blank" rel="noopener noreferrer" className="underline-offset-4 transition-colors hover:underline">{t("Dukung lewat Saweria")}</a>
        </nav>
        <LanguageSwitch />
      </div>
      <div className="border-t" style={{ borderColor: "var(--sidebar-line)" }}>
        <div className="lp-footer-bottom mx-auto max-w-6xl px-5 pt-4 text-[12px] sm:px-8">{t("© {getFullYear} Depup", { getFullYear: new Date().getFullYear() })}</div>
      </div>
    </footer>
  );
}
