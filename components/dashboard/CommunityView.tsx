"use client";

import * as React from "react";
import { ArrowUpRight } from "@/components/ui/icons";
import { ViewFade } from "@/components/ui/ViewFade";
import { Card, PageHead } from "@/components/ui/primitives";
import { InstagramIcon, LinkedInIcon, TikTokIcon, WhatsAppIcon, XIcon } from "@/components/landing/SocialIcons";
import { COMMUNITY_LINKS, openExternal, type CommunityKey } from "@/lib/community";

const ICONS: Record<CommunityKey, React.ComponentType<{ size?: number }>> = {
  "wa-channel": WhatsAppIcon,
  "wa-community": WhatsAppIcon,
  x: XIcon,
  instagram: InstagramIcon,
  tiktok: TikTokIcon,
  linkedin: LinkedInIcon,
};

/** Halaman "Komunitas": semua saluran resmi DepUp, selalu bisa dibuka dari sidebar. */
export function CommunityView() {
  return (
    <ViewFade>
      <div className="space-y-5">
        <PageHead title="Komunitas" desc="Gabung untuk dapat kabar fitur baru, bantuan dari sesama pengguna, dan tips deploy." />
        <Card>
          <ul className="divide-y divide-[var(--surface-line)]">
            {COMMUNITY_LINKS.map(({ key, label, desc, href }) => {
              const Icon = ICONS[key];
              return (
                <li key={key}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => openExternal(e, href)}
                    className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-[var(--chip-bg)] focus-visible:bg-[var(--chip-bg)]"
                  >
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[var(--chip-bg)]">
                      <Icon size={20} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14.5px] font-bold tracking-tight">{label}</span>
                      <span className="block truncate text-[13px] text-text-muted">{desc}</span>
                    </span>
                    <ArrowUpRight size={18} className="shrink-0 text-text-muted" />
                  </a>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
    </ViewFade>
  );
}
