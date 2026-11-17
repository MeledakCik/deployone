"use client";

import { useT } from "@/lib/i18n";
import "@/lib/i18n/dict/app";
import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { BookOpen, Terminal } from "@/components/ui/icons";
import { SectionHead } from "@/components/ui/primitives";
import { CodeBlock } from "@/components/dashboard/ClaudeConnectCard";
import { useToast } from "@/components/ui/Toast";
import { useDeploy } from "@/lib/deploy-context";

const COMMANDS = `npx depup-cli@latest login   # sekali saja: hubungkan CLI ke akunmu
npx depup-cli share          # deteksi otomatis port yang sedang jalan
npx depup-cli share 8000     # atau sebutkan port-nya
npx depup-cli share 5173 --name skripsi --ttl 240`;

const STEPS = [
  "Jalankan project-mu seperti biasa di komputer, misalnya npm run dev di localhost:5173.",
  "Buka terminal baru, lalu jalankan perintah di bawah. Saat pertama kali, browser terbuka untuk login dan menekan Izinkan; setelah itu tidak perlu login lagi.",
  "Link HTTPS muncul di terminal. Kirim ke dosen atau client; mereka langsung bisa membukanya tanpa login. Tekan Ctrl+C untuk mematikannya.",
];

const OPTIONS: { flag: string; desc: string }[] = [
  { flag: "--name <awalan>", desc: "Awalan nama link. Bagian acak tetap ditambahkan supaya tidak bisa ditebak." },
  { flag: "--ttl <menit>", desc: "Masa aktif link. Bawaannya 120 menit, maksimal 480." },
  { flag: "--token <token>", desc: "Pakai token CLI dari tombol di bawah (atau env DEPUP_TOKEN), untuk server/CI tanpa browser." },
  { flag: "--host <url>", desc: "Server Depup yang dipakai. Bawaannya https://depup.cloud." },
];

const NOTES = [
  "Butuh Node.js 18 ke atas, tanpa instal. Hanya pembuat link yang login; pengunjung link tidak perlu login.",
  "Hanya localhost yang bisa dibagikan. WebSocket (live reload, chat realtime) belum didukung, dan upload file dibatasi sekitar 600 KB.",
  "Siapa pun yang punya link bisa membuka websitemu selama perintahnya jalan. Jangan bagikan project yang berisi data rahasia.",
];

/** Menuju panduan Link Gaib di Docs, baik di web maupun di app mobile. */
function DocsLink({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { setView } = useDeploy();
  function go() {
    if (pathname?.startsWith("/m")) {
      router.push("/m/docs#docs-features");
      return;
    }
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#docs-features`);
    setView("docs");
  }
  return (
    <button type="button" onClick={go} className="inline-flex items-center gap-1 font-medium text-lav-text underline-offset-4 hover:underline">
      <BookOpen size={12} /> {children}
    </button>
  );
}

/**
 * Kartu "Depup CLI · Share" di Pengaturan, tepat di bawah Konektor AI (MCP).
 * Hanya ringkasan yang dipakai langsung; panduan lengkap ada di Docs → "Link Gaib".
 */
export function CliShareCard() {
  const t = useT();
  const { showToast } = useToast();
  const [token, setToken] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function createToken() {
    setBusy(true);
    try {
      const res = await fetch("/api/cli/token", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
      const json = await res.json().catch(() => null);
      if (!json?.ok) throw new Error(json?.error || t("Gagal membuat token CLI."));
      setToken(json.data.token as string);
    } catch (e) {
      showToast((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      showToast(t("Perintah disalin."));
    } catch {
      showToast(t("Gagal menyalin. Salin perintahnya secara manual."));
    }
  }

  return (
    <section className="surface-solid p-4 sm:p-6" aria-labelledby="cli-share-title">
      <SectionHead
        id="cli-share-title"
        icon={Terminal}
        title={t("Depup CLI · Share")}
        desc={
          <>
            {t("Bagikan website yang masih jalan di localhost lewat link HTTPS sementara, tanpa deploy.")}{" "}
            <DocsLink>{t("Lihat panduan lengkap")}</DocsLink>
          </>
        }
      />

      <ol className="mt-4 space-y-3">
        {STEPS.map((text, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-tone-lilac text-[12px] font-bold text-lav-text">
              {i + 1}
            </span>
            <p className="text-[13px] leading-relaxed text-text-muted">{t(text)}</p>
          </li>
        ))}
      </ol>

      <div className="mt-4">
        <CodeBlock title={t("Perintah di terminal")} code={t(COMMANDS)} onCopy={() => void copy(COMMANDS)} />
      </div>

      <div className="mt-4 overflow-hidden rounded-[14px] border border-[var(--line)]">
        <p className="bg-[var(--surface-solid-2)] px-4 py-2.5 text-[14px] font-semibold">{t("Opsi")}</p>
        <ul className="divide-y divide-[var(--line)] border-t border-[var(--line)]">
          {OPTIONS.map((o) => (
            <li key={o.flag} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-start sm:gap-4">
              <code className="mono w-40 shrink-0 text-[12px] font-medium text-lav-text">{t(o.flag)}</code>
              <span className="text-[13px] leading-relaxed text-text-muted">{t(o.desc)}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4 rounded-[14px] border border-[var(--line)] p-4">
        <p className="text-[14px] font-semibold">{t("Token CLI (tanpa browser)")}</p>
        <p className="mt-1 text-[13px] leading-relaxed text-text-muted">
          {t("Untuk server, CI, atau terminal tanpa browser. Berlaku 90 hari; cabut lewat Konektor AI (MCP) → Cabut semua akses.")}
        </p>
        {token ? (
          <div className="mt-3">
            <CodeBlock
              title={t("Jalankan di terminal")}
              code={`npx depup-cli@latest login --token ${token}`}
              onCopy={() => void copy(`npx depup-cli@latest login --token ${token}`)}
            />
          </div>
        ) : (
          <button type="button" className="pill mt-3 font-medium disabled:cursor-not-allowed disabled:opacity-60" disabled={busy} onClick={() => void createToken()}>
            {busy ? t("Membuat…") : t("Buat token CLI")}
          </button>
        )}
      </div>

      <ul className="notice notice-info mt-4 list-none flex-col !items-stretch gap-1.5">
        {NOTES.map((n) => (
          <li key={n} className="text-[13px] leading-relaxed">
            {t(n)}
          </li>
        ))}
      </ul>
    </section>
  );
}
