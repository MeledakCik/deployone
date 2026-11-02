"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Database } from "@/components/ui/icons";
import { Skeleton } from "@/components/ui/primitives";
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
      <div className="mx-auto max-w-7xl space-y-3 p-3 sm:p-5" aria-busy="true" role="status" aria-label="Memuat database">
        <Skeleton className="h-12 w-56" />
        <Skeleton className="h-72 !rounded-[28px]" />
      </div>
    );
  if (state === "error") return <div className="mx-auto max-w-xl p-4 sm:p-6"><Notice kind="error">{err}</Notice></div>;
  if (state === "login") return <Login id={id} onDone={load} />;

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:space-y-5 sm:p-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div aria-hidden className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] bg-tone-lilac text-lav-text">
            <Database size={20} />
          </div>
          <div className="min-w-0">
            <h1 className="page-title truncate">{d?.database.displayName}</h1>
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
    <div className="bg-canvas flex min-h-[100dvh] items-center justify-center p-4">
      <form
        className={`${surface} w-full max-w-sm space-y-5 p-6 sm:p-8`}
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
          <div aria-hidden className="mb-4 grid h-11 w-11 place-items-center rounded-[14px] bg-tone-lilac text-lav-text">
            <Database size={20} />
          </div>
          <h1 className="text-[22px] font-bold leading-tight tracking-tight">Login database</h1>
          <p className="mt-1.5 text-[13px] leading-relaxed text-text-muted">Masukkan username dan password database. Pemilik yang sudah login di Depup masuk otomatis.</p>
        </div>
        <Field label="Username">
          <input className={inputCls} value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoFocus required />
        </Field>
        <Field label="Password">
          <input className={inputCls} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        </Field>
        {err && <Notice kind="error">{err}</Notice>}
        <button type="submit" disabled={busy} className="btn-primary btn-md w-full disabled:cursor-not-allowed disabled:opacity-60">
          {busy ? "Masuk…" : "Masuk"}
        </button>
        <Link href={`/dashboard?view=database&db=${id}`} className="block text-center text-[13px] font-medium text-lav-text underline-offset-4 hover:underline">
          Login dengan akun Google Depup
        </Link>
      </form>
    </div>
  );
}
