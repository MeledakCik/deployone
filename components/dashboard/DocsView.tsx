"use client";

import * as React from "react";
import { HelpCircle, ArrowUpRight, ChevronDown } from "lucide-react";
import { ViewFade } from "@/components/ui/ViewFade";
import { cn } from "@/lib/utils";

interface DocEntry {
  title: string;
  desc: string;
  href: string;
  linkLabel: string;
  steps: string[];
}

const DOCS: DocEntry[] = [
  {
    title: "Cara mendapatkan Vercel Token",
    desc: "Buat token akses personal dari dashboard Vercel untuk dipakai saat deploy dari Depush.",
    href: "https://vercel.com/account/tokens",
    linkLabel: "Buka vercel.com/account/tokens",
    steps: [
      "Login ke akun Vercel kamu di vercel.com.",
      'Buka Settings, lalu pilih tab "Tokens" (atau langsung ke vercel.com/account/tokens).',
      'Klik "Create Token", kasih nama bebas — misalnya "depush".',
      "Atur scope & masa berlaku token sesuai kebutuhan, lalu klik Create.",
      "Salin token yang muncul (hanya ditampilkan sekali) dan tempel di form Deploy atau Settings Depush.",
    ],
  },
  {
    title: "Membuat GitHub PAT",
    desc: "Generate Personal Access Token GitHub dengan scope repo agar Depush bisa menarik source code kamu.",
    href: "https://github.com/settings/tokens",
    linkLabel: "Buka github.com/settings/tokens",
    steps: [
      "Login ke GitHub, buka Settings akun kamu.",
      'Pilih "Developer settings" di paling bawah sidebar.',
      'Buka "Personal access tokens" → "Tokens (classic)", lalu klik "Generate new token".',
      'Centang scope "repo" supaya Depush bisa mengakses repo private kamu.',
      "Klik Generate token, lalu salin (hanya tampil sekali) dan tempel di Depush.",
    ],
  },
  {
    title: "Panduan Custom Domain CNAME",
    desc: "Langkah-langkah mengarahkan DNS CNAME domain kamu ke project yang sudah di-deploy.",
    href: "#",
    linkLabel: "Dokumentasi DNS penyedia domain kamu",
    steps: [
      "Buka menu Domains di Depush, klik Add Domain, pilih project & masukkan nama domain.",
      "Untuk project Vercel, Depush akan langsung memasangnya lewat Vercel API dan menunjukkan status Pending/Active.",
      "Kalau statusnya masih Pending, buka pengaturan DNS domain kamu di penyedia domain (Niagahoster, Cloudflare, dll).",
      "Tambahkan record CNAME yang mengarah ke cname.vercel-dns.com (untuk subdomain) — untuk root domain, ikuti petunjuk A record dari Vercel.",
      'Tunggu propagasi DNS (bisa beberapa menit sampai jam), lalu klik "Cek Status" di halaman Domains untuk verifikasi ulang.',
    ],
  },
];

function DocCard({ doc }: { doc: DocEntry }) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="docs-item-glass p-5">
      <div className="flex items-start gap-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-violet-400">
          <HelpCircle size={28} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[14px] font-semibold">{doc.title}</h3>
          <p className="mt-1 text-[13px] leading-relaxed text-text-muted">{doc.desc}</p>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="mt-3 inline-flex items-center gap-1 text-[12.5px] font-medium text-violet-400 hover:text-violet-300"
          >
            <ChevronDown size={13} className={cn("transition-transform duration-200", open && "rotate-180")} />
            {open ? "Sembunyikan langkah-langkah" : "Lihat langkah-langkah"}
          </button>

          {open && (
            <ol className="mt-3 space-y-2 border-t border-[var(--line)] pt-3">
              {doc.steps.map((step, i) => (
                <li key={i} className="flex gap-2.5 text-[12.5px] leading-relaxed text-text-muted">
                  <span className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-[10px] font-semibold text-violet-400">
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          )}

          <a
            href={doc.href}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex items-center gap-1.5 text-[12.5px] font-medium text-text hover:text-violet-400"
          >
            {doc.linkLabel} <ArrowUpRight size={13} className="text-text-faint" />
          </a>
        </div>
      </div>
    </div>
  );
}

export function DocsView() {
  return (
    <ViewFade>
      <div className="space-y-6">
        <div>
          <h2 className="text-[22px] font-semibold">Docs</h2>
          <p className="text-[13px] text-text-muted">Panduan singkat untuk setup deployment kamu.</p>
        </div>

        <div className="space-y-3">
          {DOCS.map((doc) => (
            <DocCard key={doc.title} doc={doc} />
          ))}
        </div>
      </div>
    </ViewFade>
  );
}
