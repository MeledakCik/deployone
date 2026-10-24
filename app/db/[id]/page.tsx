"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import AdminPanel from "../../../components/db/AdminPanel";
import type { PublicDb } from "../../../components/db/types";
import { ApiError, Btn, Field, Notice, UsageBar, api, inputCls, linkBtn, subtle, surface } from "../../../components/db/ui";

type Detail = { database: PublicDb; access: "owner" | "dbsession"; usageBytes: number | null; userUsedBytes: number; quotaBytes: number };

/** Panel admin layar penuh. Pemilik (session Google Depup) langsung masuk; selain itu login username/password database. */
export default function FullDbPage() {
  const { id } = useParams<{ id: string }>();
  const [d, setD] = useState<Detail | null>(null);
  const [state, setState] = useState<"loading" | "login" | "ready" | "error">("loading");
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    try {
      setD(await api<Detail>(`/api/databases/${id}`));
      setState("ready");
    } catch (e) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 404)) setState("login");
      else {
        setErr((e as Error).message);
        setState("error");
      }
    }
  }, [id]);
  useEffect(() => {
    load();
  }, [load]);

  if (state === "loading")
    return (
      <div className="mx-auto max-w-7xl space-y-3 p-3 sm:p-5" aria-busy="true">
        <div className="h-12 w-56 animate-pulse rounded-xl bg-violet-100/70 dark:bg-white/10" />
        <div className="h-72 animate-pulse rounded-2xl bg-violet-100/70 dark:bg-white/10" />
      </div>
    );
  if (state === "error") return <div className="mx-auto max-w-xl p-4 sm:p-6"><Notice kind="error">{err}</Notice></div>;
  if (state === "login") return <Login id={id} onDone={load} />;

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:space-y-5 sm:p-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div aria-hidden className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-violet-500 text-lg text-white shadow-sm dark:bg-lime-500 dark:text-[#1e1150]">
            ⛁
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold tracking-tight sm:text-xl">{d?.database.displayName}</h1>
            <p className={subtle}>Masuk sebagai {d?.access === "owner" ? "pemilik (akun Google Depup)" : "pengguna database"}</p>
          </div>
        </div>
        <div className="flex gap-2 [&>*]:flex-1 sm:[&>*]:flex-none">
          {d?.access === "owner" ? (
            <Link href={`/dashboard?view=database&db=${id}`} className={linkBtn}>
              Ke dashboard
            </Link>
          ) : (
            <Btn
              onClick={async () => {
                await api(`/api/databases/${id}/login`, { method: "DELETE" }).catch(() => {});
                setD(null);
                setState("login");
              }}
            >
              Keluar
            </Btn>
          )}
        </div>
      </header>
      {d && (
        <div className={`${surface} p-4 sm:p-5`}>
          <UsageBar used={d.userUsedBytes} quota={d.quotaBytes} />
        </div>
      )}
      <AdminPanel id={id} />
    </div>
  );
}

function Login({ id, onDone }: { id: string; onDone: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-gradient-to-br from-violet-100 via-violet-200 to-violet-500 p-4 dark:from-[#120b2e] dark:via-[#1e1150] dark:to-[#382381]">
      <form
        className={`${surface} w-full max-w-sm space-y-5 p-5 shadow-xl sm:p-7`}
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setErr("");
          try {
            await api(`/api/databases/${id}/login`, { method: "POST", json: { username, password } });
            onDone();
          } catch (x) {
            setErr((x as Error).message);
            setBusy(false);
          }
        }}
      >
        <div>
          <div aria-hidden className="mb-3 grid h-11 w-11 place-items-center rounded-2xl bg-violet-500 text-lg text-white dark:bg-lime-500 dark:text-[#1e1150]">⛁</div>
          <h1 className="text-xl font-semibold tracking-tight">Login database</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Masukkan username dan password database. Pemilik yang sudah login di Depup masuk otomatis.</p>
        </div>
        <Field label="Username">
          <input className={inputCls} value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoFocus required />
        </Field>
        <Field label="Password">
          <input className={inputCls} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        </Field>
        {err && <Notice kind="error">{err}</Notice>}
        <Btn variant="primary" type="submit" disabled={busy} className="w-full !py-2.5">
          {busy ? "Masuk…" : "Masuk"}
        </Btn>
        <Link href={`/dashboard?view=database&db=${id}`} className="block text-center text-sm font-medium text-violet-600 hover:underline dark:text-lime-300">
          Login dengan akun Google Depup
        </Link>
      </form>
    </div>
  );
}
