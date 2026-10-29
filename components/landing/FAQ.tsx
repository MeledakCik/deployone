"use client";

import * as React from "react";
import { Plus } from "@/components/ui/icons";
import { DashboardLink } from "./DashboardLink";
import { HOME_FAQS as FAQS } from "@/lib/site-content";
import { jsonLdString } from "@/lib/seo";

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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }} />

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
