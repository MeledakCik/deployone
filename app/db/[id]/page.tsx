"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import AdminPanel from "../../../components/db/AdminPanel";
import type { PublicDb } from "../../../components/db/types";
import { ApiError, Btn, Field, Notice, UsageBar, api, inputCls, surface } from "../../../components/db/ui";

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

  if (state === "loading") return <p className="p-6 text-sm text-slate-500">Memuat…</p>;
  if (state === "error") return <div className="p-6"><Notice kind="error">{err}</Notice></div>;
  if (state === "login") return <Login id={id} onDone={load} />;

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-3 sm:p-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">{d?.database.displayName}</h1>
          <p className="text-xs text-slate-500">Masuk sebagai {d?.access === "owner" ? "pemilik (akun Google Depup)" : "pengguna database"}</p>
        </div>
        <div className="flex gap-2">
          {d?.access === "owner" ? (
            <Link href={`/dashboard?view=database&db=${id}`} className="inline-flex items-center rounded-md border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800">
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
        <div className={`${surface} p-4`}>
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
    <div className="flex min-h-screen items-center justify-center p-4">
      <form
        className={`${surface} w-full max-w-sm space-y-4 p-6`}
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
          <h1 className="text-lg font-semibold">Login database</h1>
          <p className="text-sm text-slate-500">Masukkan username dan password database. Pemilik yang sudah login di Depup masuk otomatis.</p>
        </div>
        <Field label="Username">
          <input className={inputCls} value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoFocus required />
        </Field>
        <Field label="Password">
          <input className={inputCls} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        </Field>
        {err && <Notice kind="error">{err}</Notice>}
        <Btn variant="primary" type="submit" disabled={busy} className="w-full">
          {busy ? "Masuk…" : "Masuk"}
        </Btn>
        <Link href={`/dashboard?view=database&db=${id}`} className="block text-center text-sm text-indigo-600 hover:underline dark:text-indigo-400">
          Login dengan akun Google Depup
        </Link>
      </form>
    </div>
  );
}
