"use client";

import * as React from "react";
import { Plus } from "@/components/ui/icons";
import { DashboardLink } from "./DashboardLink";

/** Isi FAQ disusun dari README dan menu Docs Depup, jadi jawabannya selaras dengan perilaku aplikasi. */
const FAQS: { q: string; a: string }[] = [
  {
    q: "Apakah Depup gratis?",
    a: "Depup gratis dipakai. Donasi lewat menu Donasi (QRIS, via Saweria) sepenuhnya sukarela. Platform tujuan punya aturan biayanya sendiri. Railway, misalnya, berbayar berdasarkan pemakaian, jadi pastikan akun Railway-mu punya kredit atau metode pembayaran aktif.",
  },
  {
    q: "Project jenis apa saja yang bisa di-deploy?",
    a: "Website HTML, CSS, dan JavaScript biasa bisa ke ketiga platform (cukup ada index.html). Aplikasi Node.js dengan package.json seperti React, Vue, atau Next.js juga bisa, pastikan ada script build. Server (Express, NestJS), Docker, Python, Go, PHP, dan bahasa lain cocoknya ke Railway. Sebelum deploy, Depup memeriksa isi repo dan memberi tahu platform mana yang cocok.",
  },
  {
    q: "Pilih Vercel, Cloudflare Pages, atau Railway?",
    a: "Vercel paling mudah untuk Next.js dan situs frontend lain. Cloudflare Pages unggul untuk situs statis, Vite, dan Astro. Railway dipakai untuk backend yang harus jalan terus, seperti Express, Python, atau Docker. Kalau pilihanmu tidak cocok dengan isi repo, Depup menjelaskan alasannya dan menyarankan platform lain.",
  },
  {
    q: "Repo saya private, apakah bisa?",
    a: "Bisa. Isi GitHub Token dengan izin repo di menu Settings, lalu Depup bisa membaca repo private-mu.",
  },
  {
    q: "Saya belum punya repo GitHub. Bagaimana?",
    a: "Pakai menu Upload. Tarik file .zip atau folder project ke Depup, lalu isinya dikirim ke repo GitHub baru dan bisa langsung di-deploy. File .env tidak ikut ke GitHub. Batasnya sampai 3.000 file, total 150 MB, dan maksimal 50 MB per file.",
  },
  {
    q: "Apakah token dan environment variable saya aman?",
    a: "Kamu masuk lewat akun Google, jadi Depup tidak menyimpan password. Token platform dan nilai environment variable disimpan terenkripsi dan hanya bisa dipakai oleh akunmu. Token yang kamu ketik langsung di form deploy tidak disimpan, dan token yang tersimpan bisa kamu hapus kapan saja di Settings. Token juga tidak pernah dikirim ke AI.",
  },
  {
    q: "Bisakah memakai domain sendiri?",
    a: "Bisa. Buka menu Domains, tambahkan domainmu ke sebuah project, lalu isi record DNS yang ditampilkan Depup di tempat kamu membeli domain. Depup membantu mengecek apakah domainnya sudah aktif.",
  },
  {
    q: "Deploy saya gagal. Apa yang harus dilakukan?",
    a: "Baca kotak “Yang bisa kamu lakukan” di pesan error, karena langkah perbaikannya spesifik. Klik Coba lagi kalau masalahnya sementara. Kalau masih buntu, tanya Asisten Bantuan atau tekan Laporkan ke developer.",
  },
  {
    q: "Bisa membagikan localhost tanpa deploy?",
    a: "Bisa lewat Link Gaib. Jalankan project-mu, lalu di terminal lain ketik npx depup-cli share. Kamu mendapat link HTTPS untuk dikirim ke dosen atau client. Link mati saat kamu menekan Ctrl+C, atau otomatis setelah 2 jam.",
  },
];

export function FAQ() {
  const [open, setOpen] = React.useState<number | null>(0);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <section id="faq" className="mx-auto w-full max-w-6xl scroll-mt-24 px-4 pb-16 pt-4 sm:px-8 sm:pb-20">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="mx-auto mb-12 max-w-3xl text-center">
        <h2 className="lp-h2">Pertanyaan yang sering muncul.</h2>
        <p className="lp-lead">Jawaban singkat sebelum kamu mulai. Kalau pertanyaanmu belum ada di sini, tanya Asisten Bantuan di dashboard.</p>
      </div>

      <div className="mx-auto flex max-w-3xl flex-col gap-3">
        {FAQS.map((f, i) => {
          const isOpen = open === i;
          return (
            <div key={f.q} className={`rounded-[24px] transition-colors ${isOpen ? "bg-tone-lilac" : "bg-[var(--frame)]"}`}>
              <h3>
                <button
                  type="button"
                  id={`faq-q-${i}`}
                  aria-expanded={isOpen}
                  aria-controls={`faq-a-${i}`}
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-4 rounded-[24px] px-5 py-5 text-left sm:px-7"
                >
                  <span className="text-[16px] font-semibold tracking-[-0.01em] text-text sm:text-[18px]">{f.q}</span>
                  <span
                    className="faq-plus grid h-9 w-9 shrink-0 place-items-center rounded-full"
                    data-open={isOpen}
                    style={{ background: "var(--ink-fill)", color: "var(--ink-fill-text)" }}
                    aria-hidden="true"
                  >
                    <Plus size={16} />
                  </span>
                </button>
              </h3>
              <div id={`faq-a-${i}`} role="region" aria-labelledby={`faq-q-${i}`} className="faq-panel" data-open={isOpen}>
                <div>
                  <p className="px-5 pb-6 text-[14.5px] leading-relaxed text-text-muted sm:px-7 sm:text-[15.5px]">{f.a}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-8 text-center text-[14px] text-text-muted">
        Siap mencoba?{" "}
        <DashboardLink href="/dashboard" className="font-semibold text-lav-text underline underline-offset-4">
          Deploy repo pertamamu
        </DashboardLink>
      </p>
    </section>
  );
}
