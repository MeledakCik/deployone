"use client";

import * as React from "react";
import { ChevronDown, ExternalLink, KeyRound, Github, ShieldCheck, BarChart2, Cloud, Link2, AlertTriangle } from "lucide-react";
import { ViewFade } from "@/components/ui/ViewFade";
import { Surface } from "@/components/ui/Surface";

interface Guide {
  icon: React.ElementType;
  title: string;
  desc: string;
  link: { label: string; href: string };
  steps: (string | React.ReactNode)[];
}

const GUIDES: Guide[] = [
  {
    icon: AlertTriangle,
    title: "Next.js di Cloudflare Pages vs Vercel — apa bedanya?",
    desc: "Penting dibaca kalau repo yang di-deploy ke Cloudflare pakai Next.js dengan API routes — perilakunya beda dari Vercel.",
    link: {
      label: "Baca dokumentasi next-on-pages",
      href: "https://github.com/cloudflare/next-on-pages",
    },
    steps: [
      "Vercel dibuat oleh tim yang sama dengan Next.js, jadi API routes & SSR jalan otomatis tanpa konfigurasi tambahan.",
      'Cloudflare Pages bukan didesain khusus untuk Next.js. Depup otomatis pakai adapter "@cloudflare/next-on-pages" untuk project Next.js supaya API routes tetap bisa jalan — tapi adapter ini sudah deprecated dan sifatnya best-effort, jadi tidak semua fitur Next.js (terutama fitur SSR/API routes yang kompleks) dijamin jalan 100% sama seperti di Vercel.',
      "Kalau build gagal atau ada fitur yang error, itu keterbatasan platform Cloudflare Pages untuk Next.js — bukan bug di Depup. Cek log build project tersebut di Cloudflare dashboard untuk detail errornya.",
      'Rekomendasi resmi Cloudflare sekarang untuk Next.js dengan banyak API routes adalah deploy sebagai Cloudflare Worker pakai adapter "@opennextjs/cloudflare" — tapi setup Git-connected Worker ini masih harus manual lewat dashboard Cloudflare (belum ada API publik buat Depup otomasi ini).',
      "Kalau project kamu simple (tanpa API routes sama sekali, murni halaman statis), pertimbangkan set output: 'export' di next.config.js — hasilnya full static dan jauh lebih stabil di Cloudflare Pages.",
      "Untuk Next.js app yang butuh API routes solid & lengkap, Vercel tetap pilihan paling straightforward lewat Depup.",
    ],
  },
  {
    icon: KeyRound,
    title: "Cara dapetin Vercel Token",
    desc: "Token ini dipakai Depup untuk deploy langsung dari repo GitHub kamu ke Vercel.",
    link: { label: "Buka Vercel Tokens", href: "https://vercel.com/account/tokens" },
    steps: [
      "Login ke akun Vercel kamu di vercel.com.",
      'Buka menu Account Settings → tab "Tokens" (atau langsung ke vercel.com/account/tokens).',
      'Klik "Create Token", kasih nama bebas (misal "depup"), pilih scope sesuai akun/tim yang mau dipakai.',
      "Atur masa berlaku (No Expiration lebih praktis untuk dipakai berulang, tapi lebih aman kalau dikasih expiry).",
      'Klik "Create", lalu salin token yang muncul — token ini cuma ditampilkan sekali, jadi langsung simpan.',
      "Tempel token itu ke field Vercel Token di form Deploy atau di halaman Settings Depup.",
    ],
  },
  {
    icon: Cloud,
    title: "Cara dapetin Cloudflare API Token",
    desc: "Token ini dipakai Depup untuk membuat & mengelola project Cloudflare Pages kamu — deploy, custom domain, dan environment variables.",
    link: { label: "Buka Cloudflare API Tokens", href: "https://dash.cloudflare.com/profile/api-tokens" },
    steps: [
      "Login ke dashboard Cloudflare kamu di dash.cloudflare.com.",
      'Buka foto profil (kanan atas) → "My Profile" → tab "API Tokens" (atau langsung ke dash.cloudflare.com/profile/api-tokens).',
      'Klik "Create Token" → pilih template "Edit Cloudflare Workers" atau bikin custom token dengan permission "Account" → "Cloudflare Pages" → "Edit".',
      "Pilih akun (Account Resources) yang mau dipakai deploy, lalu klik Continue to summary.",
      'Klik "Create Token", lalu salin token yang muncul — token ini cuma ditampilkan sekali, jadi langsung simpan.',
      'Tempel token itu ke field Cloudflare Token di halaman Settings Depup, lalu klik "Test Koneksi" untuk pilih akun aktifnya.',
    ],
  },
  {
    icon: Link2,
    title: "Cara hubungkan GitHub ke Cloudflare Pages",
    desc: "Sekali di-connect, semua deploy Cloudflare berikutnya lewat Depup otomatis jalan tanpa perlu login ulang — sama seperti Vercel.",
    link: { label: "Buka Cloudflare Pages", href: "https://dash.cloudflare.com/?to=/:account/pages/new/provider/github" },
    steps: [
      "Pertama kali deploy ke Cloudflare di form Deploy, Depup otomatis cek apakah GitHub sudah terhubung ke akun Cloudflare kamu.",
      'Kalau belum, akan muncul tombol "Hubungkan GitHub ke Cloudflare" — klik itu, nanti diarahkan ke halaman resmi Cloudflare untuk connect.',
      'Di halaman Cloudflare, klik "Connect GitHub" lalu login/authorize GitHub App Cloudflare Pages (pilih "All repositories" atau repo tertentu saja).',
      "Setelah authorize berhasil, kembali ke tab Depup dan klik \"Sudah connect, cek lagi\".",
      "Begitu status berubah jadi terhubung, klik Deploy Project lagi — deploy langsung jalan otomatis tanpa langkah manual lagi untuk deploy-deploy berikutnya.",
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
      'Di bagian "Repository permissions", pastikan "Contents" di-set ke "Read-only" minimal (biar Depup bisa baca source code & package.json).',
      'Klik "Generate token", salin, lalu tempel ke field GitHub Token di form Deploy atau Settings.',
    ],
  },
  {
    icon: ShieldCheck,
    title: "Setup Login Google (untuk admin/deployer Depup)",
    desc: "Depup pakai OAuth2 Google asli — bukan simulasi. Ini perlu di-setup sekali di Google Cloud Console oleh yang deploy Depup.",
    link: { label: "Buka Google Cloud Console", href: "https://console.cloud.google.com/apis/credentials" },
    steps: [
      "Buka Google Cloud Console → pilih/buat sebuah project.",
      'Buka "APIs & Services" → "OAuth consent screen", isi info dasar aplikasi (nama, email support), publish ke "External" kalau untuk banyak user.',
      'Buka "Credentials" → "Create Credentials" → "OAuth client ID" → pilih tipe "Web application".',
      "Di bagian Authorized redirect URIs, tambahkan persis: https://<domain-vercel-kamu>/api/auth/google/callback",
      "Simpan, lalu salin Client ID dan Client Secret yang muncul.",
      'Di project Vercel Depup, buka Settings → Environment Variables, tambahkan GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, dan AUTH_SECRET (string acak bebas, minimal 16 karakter) — lalu redeploy.',
    ],
  },
  {
    icon: BarChart2,
    title: "Enable Analytics di Project Target",
    desc: "Cara mengaktifkan Vercel Analytics / Speed Insights dan memasang paket kode tracking pada repositori Next.js / React kamu.",
    link: { label: "Buka Vercel Analytics Docs", href: "https://vercel.com/docs/analytics" },
    steps: [
      "Buka Dashboard Vercel → Pilih project target kamu → Masuk ke tab Analytics atau Speed Insights → Klik Enable.",
      "Install package analytics di project kamu lewat terminal: npm i @vercel/analytics",
      (
        <div key="nextjs-app">
          <p className="font-medium text-text">Untuk Next.js (App Router - Root Layout `app/layout.tsx`):</p>
          <pre className="mt-1 overflow-x-auto rounded-lg bg-[var(--surface-solid-2)] p-2.5 text-[11.5px] text-violet-300 mono">
{`import { Analytics } from "@vercel/analytics/react";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}`}
          </pre>
        </div>
      ),
      (
        <div key="nextjs-pages">
          <p className="font-medium text-text">Untuk Next.js (Pages Router - `pages/_app.tsx`):</p>
          <pre className="mt-1 overflow-x-auto rounded-lg bg-[var(--surface-solid-2)] p-2.5 text-[11.5px] text-violet-300 mono">
{`import { Analytics } from "@vercel/analytics/react";
import type { AppProps } from "next/app";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Component {...pageProps} />
      <Analytics />
    </>
  );
}`}
          </pre>
        </div>
      ),
      "Commit perubahan tersebut ke repository GitHub kamu, lalu lakukan trigger deploy via Depup.",
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
          <ol className="space-y-4">
            {guide.steps.map((step, i) => (
              <li key={i} className="flex gap-3 text-[13px] leading-relaxed">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--pill-bg)] text-[11px] font-semibold text-text-muted">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1 text-text-muted">{step}</div>
              </li>
            ))}
          </ol>
          <a
            href={guide.link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="pill mt-5 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[12px] font-medium hover:brightness-110"
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
            Panduan lengkap setup token, OAuth, serta integrasi Analytics pada project target — semuanya real, tidak ada simulasi.
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