"use client";

import { useT } from "@/lib/i18n";
import "@/lib/i18n/dict/app";
import * as React from "react";
import Image from "next/image";
import { Check, Lock } from "@/components/ui/icons";
import { Notice, api, subtle, surface } from "@/components/db/ui";

type View =
  | { kind: "loading" }
  | { kind: "login" }
  | { kind: "error"; message: string }
  | { kind: "ready"; email: string; code: string }
  | { kind: "done"; approved: boolean; email: string };

/** Layar izin `depup login`: menghubungkan Depup CLI di komputer ini ke akun pembuat link. */
export default function CliLoginClient() {
  const tr = useT();
  const [view, setView] = React.useState<View>({ kind: "loading" });
  const [busy, setBusy] = React.useState(false);
  const [loginHref, setLoginHref] = React.useState("/api/auth/google");
  const codeRef = React.useRef("");

  React.useEffect(() => {
    const code = (new URLSearchParams(window.location.search).get("code") || "").toUpperCase();
    codeRef.current = code;
    setLoginHref(`/api/auth/google?next=${encodeURIComponent(`/cli/login?code=${code}`)}`);
    if (!code) {
      setView({ kind: "error", message: tr("Kode login tidak ada. Jalankan lagi depup login di terminal.") });
      return;
    }
    api<{ email: string; code: string }>("/api/cli/login", { method: "POST", json: { action: "preview", code } })
      .then((r) => setView({ kind: "ready", email: r.email, code: r.code }))
      .catch((e: Error & { status?: number }) => {
        if (e.status === 401) setView({ kind: "login" });
        else setView({ kind: "error", message: e.message });
      });
  }, []);

  async function decide(action: "approve" | "deny") {
    setBusy(true);
    try {
      const r = await api<{ status: string; email: string }>("/api/cli/login", {
        method: "POST",
        json: { action, code: codeRef.current },
      });
      setView({ kind: "done", approved: r.status === "approved", email: r.email });
    } catch (e) {
      setView({ kind: "error", message: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-md items-center px-4 py-10">
      <div className={`${surface} w-full space-y-5 p-6 sm:p-8`}>
        <div className="flex items-center gap-3.5">
          <Image src="/logo.png" alt="" width={48} height={48} priority className="h-12 w-12 shrink-0 rounded-[14px]" />
          <div className="min-w-0">
            <h1 className="text-[22px] font-bold leading-tight tracking-tight">{tr("Login Depup CLI")}</h1>
            <p className={`${subtle} mt-0.5`}>depup share</p>
          </div>
        </div>

        {view.kind === "loading" && <p className={subtle} role="status">{tr("Memeriksa permintaan…")}</p>}

        {view.kind === "error" && <Notice kind="error">{view.message}</Notice>}

        {view.kind === "login" && (
          <>
            <p className="text-[14px] leading-relaxed text-text-muted">
              {tr("Masuk dengan akun Google dulu. Link yang kamu bagikan lewat CLI akan tercatat atas nama akunmu.")}
            </p>
            <a href={loginHref} className="btn-primary btn-lg w-full">
              {tr("Masuk dengan Google")}
            </a>
          </>
        )}

        {view.kind === "ready" && (
          <>
            <p className="text-[14px] leading-relaxed text-text-muted">
              {tr("Pastikan kode ini sama dengan yang tampil di terminal:")}
            </p>
            <p className="rounded-[14px] bg-[var(--surface-solid-2)] p-4 text-center font-mono text-[26px] font-bold tracking-[0.2em]">
              {view.code}
            </p>
            <p className="text-[14px] leading-relaxed text-text-muted">
              {tr("Depup CLI di komputer itu akan memakai akun")}{" "}
              <strong className="font-semibold text-text">{view.email}</strong>.
            </p>
            <section className="rounded-[14px] bg-[var(--surface-solid-2)] p-4">
              <ul className="space-y-2.5 text-[13px] leading-snug">
                {[
                  tr("Membuat link sementara (depup share) untuk website di localhost"),
                  tr("Orang yang kamu kirimi link bisa langsung membukanya tanpa login"),
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2.5">
                    <span className="mt-px grid h-5 w-5 shrink-0 place-items-center rounded-full bg-tone-mint text-ok-fg">
                      <Check size={12} aria-hidden />
                    </span>
                    {t}
                  </li>
                ))}
              </ul>
              <p className="mt-3 flex items-start gap-2.5 text-[13px] leading-snug text-text-muted">
                <span className="mt-px grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--pill-bg)] text-text-muted">
                  <Lock size={11} aria-hidden />
                </span>
                {tr("Akses bisa dicabut kapan saja di Pengaturan → Konektor AI (MCP) → Cabut semua akses.")}
              </p>
            </section>
            <div className="grid grid-cols-2 gap-2.5">
              <button type="button" className="pill btn-lg font-medium disabled:cursor-not-allowed disabled:opacity-60" disabled={busy} onClick={() => decide("deny")}>
                {tr("Tolak")}
              </button>
              <button type="button" className="btn-primary btn-lg disabled:cursor-not-allowed disabled:opacity-60" disabled={busy} onClick={() => decide("approve")}>
                {tr("Izinkan")}
              </button>
            </div>
            <p className="notice notice-info">{tr("Bukan kamu yang menjalankan depup login? Tekan Tolak dan tutup halaman ini.")}</p>
          </>
        )}

        {view.kind === "done" && (
          <Notice kind={view.approved ? "ok" : "info"}>
            {view.approved
              ? tr("CLI sudah login sebagai {email}. Kembali ke terminal, halaman ini boleh ditutup.", { email: view.email })
              : tr("Login CLI ditolak. Halaman ini boleh ditutup.")}
          </Notice>
        )}
      </div>
    </main>
  );
}
