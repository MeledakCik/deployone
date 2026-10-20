"use client";

import Link from "next/link";
import { ExternalLink, ChevronRight, Rocket, KeyRound, Github, Zap, BookOpen } from "lucide-react";
import { CARD, HERO_GRADIENT } from "@/components/m/ui";

const GUIDES = [
  {
    Icon: KeyRound,
    title: "Ambil token Vercel",
    steps: ["Buka halaman Tokens di Vercel.", "Buat token baru (Scope: akun kamu).", "Salin lalu tempel di Pengaturan."],
    link: { href: "https://vercel.com/account/tokens", label: "Buka vercel.com/account/tokens" },
  },
  {
    Icon: KeyRound,
    title: "Ambil token Railway",
    steps: ["Buka Account → Tokens di Railway.", "Buat Account token baru (bukan project token).", "Tempel di Pengaturan, lalu pilih Railway di tab Deploy."],
    link: { href: "https://railway.com/account/tokens", label: "Buka railway.com/account/tokens" },
  },
  {
    Icon: KeyRound,
    title: "Ambil token Cloudflare",
    steps: ["Buka My Profile → API Tokens di Cloudflare.", "Buat token dengan izin Cloudflare Pages: Edit.", "Tempel di Pengaturan dan pilih akun Cloudflare-mu di sana."],
    link: { href: "https://dash.cloudflare.com/profile/api-tokens", label: "Buka dash.cloudflare.com/profile/api-tokens" },
  },
  {
    Icon: Github,
    title: "Ambil GitHub token (repo privat)",
    steps: ["Buka Settings → Developer settings → Tokens.", "Buat token dengan izin baca repo (contents).", "Tempel di Pengaturan. Repo publik tidak butuh token."],
    link: { href: "https://github.com/settings/tokens", label: "Buka github.com/settings/tokens" },
  },
  {
    Icon: Rocket,
    title: "Deploy pertama dari HP",
    steps: ["Buka tab Deploy, tempel link repo GitHub.", "Cek nama project, lalu tekan Mulai Deploy.", "Tunggu status READY, lalu buka situsmu."],
    link: { href: "/m/deploy", label: "Mulai deploy", internal: true },
  },
  {
    Icon: Zap,
    title: "Link Instan tanpa repo",
    steps: ["Buka Link Instan di app.", "Upload zip atau folder situs statis.", "Dapat link publik sementara dalam hitungan detik."],
    link: { href: "/m/link-instan", label: "Buka Link Instan", internal: true },
  },
] as const;

export default function MobileGuide() {
  return (
    <div className="space-y-4 pt-2">
      <section className={`relative overflow-hidden rounded-[24px] ${HERO_GRADIENT} p-5 text-white shadow-[0_18px_34px_-14px_rgba(109,40,217,0.7)]`}>
        <div className="pointer-events-none absolute -bottom-10 -right-8 h-40 w-40 rounded-full bg-[#6366F1]/40 blur-2xl" />
        <BookOpen className="relative h-7 w-7 text-[#EDE0FF]" />
        <p className="relative mt-2 text-[20px] font-extrabold leading-tight tracking-[-0.025em]">Panduan singkat</p>
        <p className="relative mt-1 text-[13px] text-[#EDE0FF]">Dari token sampai situs online, tanpa laptop.</p>
      </section>

      {GUIDES.map(({ Icon, title, steps, link }) => (
        <article key={title} className={`${CARD} p-4`}>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#F5F3FF] text-[#7C3AED]"><Icon className="h-5 w-5" /></span>
            <h2 className="text-[15.5px] font-extrabold tracking-[-0.01em]">{title}</h2>
          </div>
          <ol className="mt-3 space-y-2">
            {steps.map((s, i) => (
              <li key={s} className="flex gap-2.5 text-[13px] leading-snug text-[#334155]">
                <span className="mt-[1px] flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#EDE9FE] text-[11px] font-extrabold text-[#6D28D9]">{i + 1}</span>
                {s}
              </li>
            ))}
          </ol>
          {"internal" in link ? (
            <Link href={link.href} className="mt-3 inline-flex h-9 items-center gap-1 rounded-full bg-[#7C3AED] px-4 text-[12.5px] font-bold text-white active:scale-95">
              {link.label} <ChevronRight className="h-4 w-4" />
            </Link>
          ) : (
            <a href={link.href} target="_blank" rel="noreferrer" className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-full bg-[#F5F3FF] px-4 text-[12.5px] font-bold text-[#6D28D9] ring-1 ring-[#DDD6FE] active:scale-95">
              {link.label} <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </article>
      ))}

      <Link href="/m/docs" className="flex items-center justify-between rounded-[16px] bg-[#EEF1FF] px-4 py-3.5 text-[14px] font-bold text-[#4338CA] active:scale-[0.99]">
        Dokumentasi lengkap <ChevronRight className="h-5 w-5" />
      </Link>
    </div>
  );
}
