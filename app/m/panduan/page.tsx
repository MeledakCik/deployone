"use client";

import { useT } from "@/lib/i18n";
import "@/lib/i18n/dict/app";
import Link from "next/link";
import { ExternalLink, ChevronRight, Rocket, KeyRound, GitBranch, Link2, BookOpen } from "@/components/ui/icons";
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
    Icon: GitBranch,
    title: "Ambil GitHub token (repo privat)",
    steps: ["Buka Pengaturan → Developer settings → Tokens.", "Buat token dengan izin baca repo (contents).", "Tempel di Pengaturan. Repo publik tidak butuh token."],
    link: { href: "https://github.com/settings/tokens", label: "Buka github.com/settings/tokens" },
  },
  {
    Icon: Rocket,
    title: "Deploy pertama dari HP",
    steps: ["Buka tab Deploy, tempel link repo GitHub.", "Cek nama project, lalu tekan Mulai deploy.", "Tunggu status Aktif, lalu buka situsmu."],
    link: { href: "/m/deploy", label: "Mulai deploy", internal: true },
  },
  {
    Icon: Link2,
    title: "Link Instan tanpa repo",
    steps: ["Buka Link Instan di app.", "Unggah ZIP atau folder situs statis.", "Dapat link publik sementara dalam hitungan detik."],
    link: { href: "/m/link-instan", label: "Buka Link Instan", internal: true },
  },
] as const;

export default function MobileGuide() {
  const t = useT();
  return (
    <div className="space-y-4 pt-2">
      <section className={`relative overflow-hidden rounded-card ${HERO_GRADIENT} p-5 text-white shadow-[0_18px_34px_-14px_rgba(90,57,192,0.7)]`}>
        <div className="pointer-events-none absolute -bottom-10 -right-8 h-40 w-40 rounded-full bg-violet-400/40 blur-2xl" />
        <BookOpen size={28} className="relative text-violet-100" aria-hidden />
        <p className="relative mt-2 text-[20px] font-bold leading-tight tracking-tight">{t("Panduan singkat")}</p>
        <p className="relative mt-1 text-[13px] text-violet-100">{t("Dari token sampai situs online, tanpa laptop.")}</p>
      </section>

      {GUIDES.map(({ Icon, title, steps, link }) => (
        <article key={title} className={`${CARD} p-4`}>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-tone-lilac text-lav-text">
              <Icon size={20} aria-hidden />
            </span>
            <h2 className="min-w-0 text-[16px] font-bold tracking-tight">{t(title)}</h2>
          </div>
          <ol className="mt-3 space-y-2">
            {steps.map((s, i) => (
              <li key={s} className="flex gap-2.5 text-[13px] leading-snug text-text-muted [&>:last-child]:min-w-0">
                <span className="mt-[1px] flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--pill-bg)] text-[12px] font-bold text-lav-text">{i + 1}</span>
                {t(s)}
              </li>
            ))}
          </ol>
          {"internal" in link ? (
            <Link href={link.href} className="btn-primary mt-3 inline-flex h-10 max-w-full items-center gap-1 px-4 text-[13px] active:scale-95">
              <span className="min-w-0 truncate">{t(link.label)}</span> <ChevronRight size={16} className="shrink-0" aria-hidden />
            </Link>
          ) : (
            <a href={link.href} target="_blank" rel="noreferrer" className="pill mt-3 inline-flex h-10 max-w-full items-center gap-1.5 px-4 text-[13px] font-semibold text-lav-text active:scale-95">
              <span className="min-w-0 truncate">{t(link.label)}</span> <ExternalLink size={14} className="shrink-0" aria-hidden />
            </a>
          )}
        </article>
      ))}

      <Link href="/m/docs" className="pill flex items-center justify-between px-4 py-3.5 text-[14px] font-semibold text-lav-text active:scale-[0.99]">
        {t("Dokumentasi lengkap")}{" "}<ChevronRight size={18} aria-hidden />
      </Link>
    </div>
  );
}
