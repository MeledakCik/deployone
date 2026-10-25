"use client";

import * as React from "react";
import { Btn, Notice, api, heading, subtle, surface } from "@/components/db/ui";

type Params = Record<string, string>;
type Preview = { clientName: string; redirectHost: string; email: string };
type View =
  | { kind: "loading" }
  | { kind: "login" }
  | { kind: "error"; message: string }
  | { kind: "ready"; preview: Preview }
  | { kind: "redirecting"; text: string };

const KEYS = ["client_id", "redirect_uri", "response_type", "code_challenge", "code_challenge_method", "state", "resource"] as const;

/** Layar izin untuk konektor MCP (Claude web & app HP). Semua validasi sebenarnya dilakukan di server. */
export default function AuthorizeClient() {
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
      setView({ kind: "error", message: "Link tidak lengkap. Mulai lagi dengan menambahkan konektor Depup dari Claude." });
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
      setView({ kind: "redirecting", text: action === "approve" ? "Mengembalikan kamu ke Claude…" : "Akses ditolak. Mengembalikan kamu ke Claude…" });
      window.location.assign(redirectTo);
    } catch (e) {
      setView({ kind: "error", message: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-4 py-10">
      <div className={`${surface} w-full space-y-4 p-5 sm:p-6`}>
        <h1 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">Hubungkan Depup</h1>

        {view.kind === "loading" && <p className={subtle}>Memeriksa permintaan…</p>}

        {view.kind === "error" && <Notice kind="error">{view.message}</Notice>}

        {view.kind === "redirecting" && <p className={subtle}>{view.text}</p>}

        {view.kind === "login" && (
          <>
            <p className="text-sm text-slate-700 dark:text-slate-300">Masuk dengan akun Google dulu supaya Claude bisa menayangkan website ke akun Depup-mu.</p>
            <a
              href={loginHref}
              className="inline-flex w-full items-center justify-center rounded-xl bg-violet-500 px-3.5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-violet-600 dark:bg-lime-500 dark:text-[#1e1150] dark:hover:bg-lime-400"
            >
              Masuk dengan Google
            </a>
          </>
        )}

        {view.kind === "ready" && (
          <>
            <p className="text-sm text-slate-700 dark:text-slate-300">
              <strong>{view.preview.clientName}</strong> ({view.preview.redirectHost}) meminta izin memakai akun Depup <strong>{view.preview.email}</strong>.
            </p>
            <div className="rounded-xl border border-violet-100 bg-violet-50/60 p-3 text-sm dark:border-white/10 dark:bg-white/5">
              <p className={heading}>Claude akan bisa:</p>
              <ul className="mt-1.5 list-disc space-y-1 pl-5 text-slate-700 dark:text-slate-300">
                <li>Menayangkan website statis jadi Link Instan di akunmu</li>
                <li>Melihat daftar link aktifmu</li>
                <li>Menghapus link yang kamu minta</li>
              </ul>
              <p className={`${subtle} mt-2`}>Claude tidak bisa melihat token platform, environment variable, atau database-mu. Akses bisa dicabut kapan saja dari menu Link Instan.</p>
            </div>
            <div className="flex gap-2">
              <Btn variant="primary" className="flex-1" disabled={busy} onClick={() => decide("approve")}>
                Izinkan
              </Btn>
              <Btn className="flex-1" disabled={busy} onClick={() => decide("deny")}>
                Tolak
              </Btn>
            </div>
            <p className={subtle}>Bukan kamu yang memulai ini? Tekan Tolak dan tutup halaman ini.</p>
          </>
        )}
      </div>
    </main>
  );
}
