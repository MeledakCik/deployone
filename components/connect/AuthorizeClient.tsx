"use client";

import { useT } from "@/lib/i18n";
import "@/lib/i18n/dict/app";
import * as React from "react";
import Image from "next/image";
import { Check, Lock } from "@/components/ui/icons";
import { Notice, api, subtle, surface } from "@/components/db/ui";

type Params = Record<string, string>;
type Preview = { clientName: string; redirectHost: string; email: string; isCustomClient?: boolean };
type View =
  | { kind: "loading" }
  | { kind: "login" }
  | { kind: "error"; message: string }
  | { kind: "ready"; preview: Preview }
  | { kind: "redirecting"; text: string };

const KEYS = ["client_id", "redirect_uri", "response_type", "code_challenge", "code_challenge_method", "state", "resource"] as const;

/** Layar izin untuk konektor MCP (Claude web, app HP & Custom OAuth). Semua validasi sebenarnya dilakukan di server. */
export default function AuthorizeClient() {
  const tr = useT();
  const [view, setView] = React.useState<View>({ kind: "loading" });
  const [busy, setBusy] = React.useState(false);
  const paramsRef = React.useRef<Params>({});
  // Dihitung di browser (SSR tidak punya window); dipakai tombol login supaya setelah login kembali ke layar izin ini.
  const [loginHref, setLoginHref] = React.useState("/api/auth/google");

  React.useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const params: Params = {};
    for (const k of KEYS) {
      const v = q.get(k);
      if (v) params[k] = v;
    }
    paramsRef.current = params;
    setLoginHref(`/api/auth/google?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
    if (!params.client_id || !params.redirect_uri) {
      setView({ kind: "error", message: tr("Link tidak lengkap. Mulai lagi dengan menambahkan konektor Depup dari Claude atau aplikasi OAuth-mu.") });
      return;
    }
    api<Preview>("/api/mcp/connect", { method: "POST", json: { action: "preview", params } })
      .then((preview) => setView({ kind: "ready", preview }))
      .catch((e: Error & { status?: number }) => {
        if (e.status === 401) setView({ kind: "login" });
        else setView({ kind: "error", message: e.message });
      });
  }, []);

  async function decide(action: "approve" | "deny") {
    setBusy(true);
    try {
      const { redirectTo } = await api<{ redirectTo: string }>("/api/mcp/connect", {
        method: "POST",
        json: { action, params: paramsRef.current },
      });
      setView({ kind: "redirecting", text: action === "approve" ? tr("Mengembalikan kamu ke aplikasi…") : tr("Akses ditolak. Mengembalikan kamu…") });
      window.location.assign(redirectTo);
    } catch (e) {
      setView({ kind: "error", message: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  const title = view.kind === "ready" ? tr("Izinkan {clientName}?", { clientName: view.preview.clientName }) : tr("Hubungkan Depup");

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-md items-center px-4 py-10">
      <div className={`${surface} w-full space-y-5 p-6 sm:p-8`}>
        <div className="flex items-center gap-3.5">
          <Image src="/logo.png" alt="" width={48} height={48} priority className="h-12 w-12 shrink-0 rounded-[14px]" />
          <div className="min-w-0">
            <h1 className="text-[22px] font-bold leading-tight tracking-tight">{title}</h1>
            {view.kind === "ready" && <p className={`${subtle} mt-0.5 truncate`}>{view.preview.redirectHost}</p>}
          </div>
        </div>

        {view.kind === "loading" && <p className={subtle} role="status">{tr("Memeriksa permintaan…")}</p>}

        {view.kind === "error" && <Notice kind="error">{view.message}</Notice>}

        {view.kind === "redirecting" && <p className={subtle} role="status">{view.text}</p>}

        {view.kind === "login" && (
          <>
            <p className="text-[14px] leading-relaxed text-text-muted">{tr("Masuk dengan akun Google dulu supaya aplikasi bisa terhubung ke akun Depup-mu.")}</p>
            <a href={loginHref} className="btn-primary btn-lg w-full">
              {tr("Masuk dengan Google")}
            </a>
          </>
        )}

        {view.kind === "ready" && (
          <>
            <p className="text-[14px] leading-relaxed text-text-muted">
              {tr("Aplikasi ini meminta izin memakai akun Depup")}{" "}<strong className="font-semibold text-text">{view.preview.email}</strong>
              {view.preview.isCustomClient ? tr(", melalui Custom OAuth milikmu.") : "."}
            </p>

            <section aria-labelledby="izin-bisa" className="rounded-[14px] bg-[var(--surface-solid-2)] p-4">
              <h2 id="izin-bisa" className="text-[13px] font-semibold">{tr("Yang bisa dilakukan konektor")}</h2>
              <ul className="mt-3 space-y-2.5 text-[13px] leading-snug">
                {[
                  tr("Menayangkan dan memperbarui website statis (Link Instan) di akunmu, secara bertahap"),
                  tr("Melihat daftar file, statistik kunjungan, dan daftar link aktifmu"),
                  tr("Menghapus link yang kamu minta, dan men-deploy ke platform yang kamu izinkan di Pengaturan"),
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2.5">
                    <span className="mt-px grid h-5 w-5 shrink-0 place-items-center rounded-full bg-tone-mint text-ok-fg">
                      <Check size={12} aria-hidden />
                    </span>
                    {t}
                  </li>
                ))}
              </ul>
              <h2 className="mt-4 text-[13px] font-semibold">{tr("Yang tidak bisa dilihat")}</h2>
              <p className="mt-2 flex items-start gap-2.5 text-[13px] leading-snug text-text-muted">
                <span className="mt-px grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--pill-bg)] text-text-muted">
                  <Lock size={11} aria-hidden />
                </span>
                {tr("Token platform, environment variable, dan database-mu. Akses bisa dicabut kapan saja di Pengaturan → Konektor AI (MCP).")}
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
            <p className="notice notice-info">{tr("Bukan kamu yang memulai ini? Tekan Tolak dan tutup halaman ini.")}</p>
          </>
        )}
      </div>
    </main>
  );
}
