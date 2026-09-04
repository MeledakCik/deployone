"use client";

import * as React from "react";
import { ChevronDown, ExternalLink, KeyRound, Github, ShieldCheck } from "lucide-react";
import { ViewFade } from "@/components/ui/ViewFade";
import { Surface } from "@/components/ui/Surface";

interface Guide {
  icon: React.ElementType;
  title: string;
  desc: string;
  link: { label: string; href: string };
  steps: string[];
}

const GUIDES: Guide[] = [
  {
    icon: KeyRound,
    title: "Cara dapetin Vercel Token",
    desc: "Token ini dipakai Depush untuk deploy langsung dari repo GitHub kamu ke Vercel.",
    link: { label: "Buka Vercel Tokens", href: "https://vercel.com/account/tokens" },
    steps: [
      "Login ke akun Vercel kamu di vercel.com.",
      'Buka menu Account Settings → tab "Tokens" (atau langsung ke vercel.com/account/tokens).',
      'Klik "Create Token", kasih nama bebas (misal "depush"), pilih scope sesuai akun/tim yang mau dipakai.',
      "Atur masa berlaku (No Expiration lebih praktis untuk dipakai berulang, tapi lebih aman kalau dikasih expiry).",
      'Klik "Create", lalu salin token yang muncul — token ini cuma ditampilkan sekali, jadi langsung simpan.',
      "Tempel token itu ke field Vercel Token di form Deploy atau di halaman Settings Depush.",
    ],
  },
  {
    icon: Github,
    title: "Cara bikin GitHub Token (PAT)",
    desc: "Token ini opsional untuk repo public, tapi wajib kalau repo yang mau di-deploy itu private.",
    link: { label: "Buka GitHub Tokens", href: "https://github.com/settings/tokens?type=beta" },
    steps: [
      "Login ke GitHub, buka Settings (klik foto profil kanan atas → Settings).",
      'Scroll ke bawah ke "Developer settings" (paling bawah sidebar kiri).',
      'Pilih "Personal access tokens" → "Fine-grained tokens" → "Generate new token".',
      "Kasih nama token, atur masa berlaku, dan pilih repository access — bisa semua repo atau pilih repo tertentu saja.",
      'Di bagian "Repository permissions", pastikan "Contents" di-set ke "Read-only" minimal (biar Depush bisa baca source code & package.json).',
      'Klik "Generate token", salin, lalu tempel ke field GitHub Token di form Deploy atau Settings.',
    ],
  },
  {
    icon: ShieldCheck,
    title: "Setup Login Google (untuk admin/deployer Depush)",
    desc: "Depush pakai OAuth2 Google asli — bukan simulasi. Ini perlu di-setup sekali di Google Cloud Console oleh yang deploy Depush.",
    link: { label: "Buka Google Cloud Console", href: "https://console.cloud.google.com/apis/credentials" },
    steps: [
      "Buka Google Cloud Console → pilih/buat sebuah project.",
      'Buka "APIs & Services" → "OAuth consent screen", isi info dasar aplikasi (nama, email support), publish ke "External" kalau untuk banyak user.',
      'Buka "Credentials" → "Create Credentials" → "OAuth client ID" → pilih tipe "Web application".',
      "Di bagian Authorized redirect URIs, tambahkan persis: https://<domain-vercel-kamu>/api/auth/google/callback",
      "Simpan, lalu salin Client ID dan Client Secret yang muncul.",
      'Di project Vercel Depush, buka Settings → Environment Variables, tambahkan GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, dan AUTH_SECRET (string acak bebas, minimal 16 karakter) — lalu redeploy.',
    ],
  },
];

function GuideCard({ guide }: { guide: Guide }) {
  const [open, setOpen] = React.useState(false);
  const Icon = guide.icon;

  return (
    <Surface className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start gap-4 p-5 text-left"
      >
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-violet-500/10 text-violet-400">
          <Icon size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[14px] font-semibold">{guide.title}</h3>
          <p className="mt-1 text-[13px] leading-relaxed text-text-muted">{guide.desc}</p>
        </div>
        <ChevronDown
          size={18}
          className={`mt-1 shrink-0 text-text-faint transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="border-t px-5 pb-5 pt-4" style={{ borderColor: "var(--surface-line)" }}>
          <ol className="space-y-3">
            {guide.steps.map((step, i) => (
              <li key={i} className="flex gap-3 text-[13px] leading-relaxed">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--pill-bg)] text-[11px] font-semibold text-text-muted">
                  {i + 1}
                </span>
                <span className="text-text-muted">{step}</span>
              </li>
            ))}
          </ol>
          <a
            href={guide.link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="pill mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[12px] font-medium hover:brightness-110"
          >
            {guide.link.label} <ExternalLink size={12} />
          </a>
        </div>
      )}
    </Surface>
  );
}

export function DocsView() {
  return (
    <ViewFade>
      <div className="space-y-6">
        <div>
          <h2 className="text-[22px] font-semibold">Docs</h2>
          <p className="text-[13px] text-text-muted">
            Panduan lengkap setup token & OAuth yang dipakai Depush — semuanya real, tidak ada simulasi.
          </p>
        </div>

        <div className="space-y-3">
          {GUIDES.map((guide) => (
            <GuideCard key={guide.title} guide={guide} />
          ))}
        </div>
      </div>
    </ViewFade>
  );
}
