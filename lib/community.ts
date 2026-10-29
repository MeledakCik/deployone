import type * as React from "react";
import { isNativeApp } from "@/lib/native-auth";

export type CommunityKey = "wa-channel" | "wa-community" | "x" | "instagram" | "tiktok" | "linkedin";

export interface CommunityLink {
  key: CommunityKey;
  label: string;
  desc: string;
  href: string;
}

/** Semua akun resmi DepUp di satu tempat. Dipakai footer, dashboard, dan app mobile. */
export const COMMUNITY_LINKS: readonly CommunityLink[] = [
  {
    key: "wa-channel",
    label: "Saluran WhatsApp",
    desc: "Kabar fitur baru dan pengumuman DepUp Studio.",
    href: "https://whatsapp.com/channel/0029VbESCgr3WHTRKwAFHX3W",
  },
  {
    key: "wa-community",
    label: "Komunitas WhatsApp",
    desc: "Ngobrol, tanya jawab, dan tukar tips dengan sesama pengguna.",
    href: "https://chat.whatsapp.com/CCNAdECQy5BD3aVC53fTma",
  },
  { key: "x", label: "X (Twitter)", desc: "@DepUp_Web", href: "https://x.com/DepUp_Web" },
  { key: "instagram", label: "Instagram", desc: "@depup.web", href: "https://www.instagram.com/depup.web/" },
  { key: "tiktok", label: "TikTok", desc: "@depup.web", href: "https://www.tiktok.com/@depup.web" },
  { key: "linkedin", label: "LinkedIn", desc: "DepUp Developer", href: "https://www.linkedin.com/in/depup-developer" },
];

export const WA_COMMUNITY_URL = COMMUNITY_LINKS.find((l) => l.key === "wa-community")!.href;
export const WA_CHANNEL_URL = COMMUNITY_LINKS.find((l) => l.key === "wa-channel")!.href;

/**
 * Di app Android (Capacitor) tautan target=_blank bisa tertahan di dalam webview.
 * Di sana dibuka lewat plugin Browser; di web biasa perilaku <a> tetap seperti biasa.
 */
export function openExternal(e: React.MouseEvent<HTMLAnchorElement>, url: string) {
  if (!isNativeApp()) return;
  e.preventDefault();
  void import("@capacitor/browser").then(({ Browser }) => Browser.open({ url })).catch(() => {
    window.open(url, "_blank", "noopener,noreferrer");
  });
}
