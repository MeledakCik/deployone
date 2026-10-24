"use client";
import { useCallback, useEffect, useState } from "react";
import type { KeyInfo } from "./types";
import { Btn, Field, Modal, Notice, SecretRow, api, fmtDate, heading, inputCls, subtle, surface } from "./ui";

/** Kartu pengelolaan (pemilik saja): credentials, REST API key, dan kirim ke Environment Vercel. */
export default function DbInfoCards({ id, username }: { id: string; username: string }) {
  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <CredentialsCard id={id} username={username} />
      <ApiCard id={id} />
      <div className="lg:col-span-2">
        <EnvCard id={id} />
      </div>
    </div>
  );
}

function CredentialsCard({ id, username }: { id: string; username: string }) {
  const [pw, setPw] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [err, setErr] = useState("");
  return (
    <section className={`${surface} min-w-0 space-y-4 p-4 sm:p-5`}>
      <h2 className={heading}>Credentials panel admin</h2>
      <p className={subtle}>Dipakai untuk login ke /db/{"<id>"} dari perangkat yang tidak memakai akun Google Depup.</p>
      <SecretRow label="Username" value={username} />
      {pw ? <SecretRow label="Password baru (tampil sekali)" value={pw} /> : <p className={subtle}>Password tidak bisa dilihat lagi; hanya bisa di-reset.</p>}
      {err && <Notice kind="error">{err}</Notice>}
      <Btn onClick={() => setConfirm(true)} className="w-full sm:w-auto">Reset password</Btn>
      {confirm && (
        <Modal title="Reset password?" onClose={() => setConfirm(false)}>
          <p className="mb-4 text-sm text-slate-700 dark:text-slate-300">Password lama tidak berlaku lagi dan semua sesi login database yang aktif akan keluar.</p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Btn onClick={() => setConfirm(false)}>Batal</Btn>
            <Btn
              variant="primary"
              onClick={async () => {
                try {
                  const r = await api<{ credentials: { password: string } }>(`/api/databases/${id}/credentials`, { method: "POST", json: {} });
                  setPw(r.credentials.password);
                  setErr("");
                } catch (e) {
                  setErr((e as Error).message);
                }
                setConfirm(false);
              }}
            >
              Reset
            </Btn>
          </div>
        </Modal>
      )}
    </section>
  );
}

function ApiCard({ id }: { id: string }) {
  const [keys, setKeys] = useState<KeyInfo[]>([]);
  const [fresh, setFresh] = useState<{ key: string; mode: string } | null>(null);
  const [label, setLabel] = useState("");
  const [mode, setMode] = useState<"ro" | "rw">("ro");
  const [err, setErr] = useState("");
  const endpoint = typeof window !== "undefined" ? `${window.location.origin}/api/v1/db/${id}/query` : `/api/v1/db/${id}/query`;

  const load = useCallback(async () => {
    try {
      setKeys((await api<{ keys: KeyInfo[] }>(`/api/databases/${id}/keys`)).keys);
    } catch (e) {
      setErr((e as Error).message);
    }
  }, [id]);
  useEffect(() => {
    load();
  }, [load]);

  return (
    <section className={`${surface} min-w-0 space-y-4 p-4 sm:p-5`}>
      <h2 className={heading}>REST API</h2>
      <SecretRow label="Endpoint (POST)" value={endpoint} />
      <pre className="overflow-x-auto rounded-xl bg-[#1e1150] dark:bg-[#0d0624] dark:ring-1 dark:ring-white/10 p-3 font-mono text-[11px] leading-relaxed text-violet-100 sm:text-xs">{`curl -X POST ${endpoint} \\
  -H "Authorization: Bearer <api_key>" \\
  -H "Content-Type: application/json" \\
  -d '{"sql":"SELECT * FROM users WHERE id = ?","args":[1]}'`}</pre>
      {fresh && (
        <div className="space-y-1">
          <Notice kind="warn">Key {fresh.mode === "ro" ? "read-only" : "read-write"} baru. Hanya tampil sekali.</Notice>
          <SecretRow label="API key" value={fresh.key} />
        </div>
      )}
      <ul className="divide-y divide-violet-50 rounded-xl border border-violet-100 px-3 text-sm dark:divide-white/5 dark:border-white/10">
        {keys.map((k) => (
          <li key={k.id} className="flex items-center justify-between gap-3 py-2.5">
            <div className="min-w-0">
              <div className="truncate font-medium text-slate-900 dark:text-slate-100">
                {k.label} <span className="ml-1 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-700 dark:bg-white/10 dark:text-violet-200">({k.mode === "ro" ? "read-only" : "read-write"})</span>
              </div>
              <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                {k.prefix}… · {fmtDate(k.createdAt)} {k.revokedAt && "· dicabut"}
              </div>
            </div>
            {!k.revokedAt && (
              <Btn
                small
                variant="danger"
                onClick={async () => {
                  if (!window.confirm(`Cabut key “${k.label}”? Aplikasi yang memakainya akan berhenti bekerja.`)) return;
                  try {
                    await api(`/api/databases/${id}/keys/${k.id}`, { method: "DELETE" });
                    load();
                  } catch (e) {
                    setErr((e as Error).message);
                  }
                }}
              >
                Cabut
              </Btn>
            )}
          </li>
        ))}
      </ul>
      <form
        className="grid items-end gap-2 sm:grid-cols-[1fr_auto_auto]"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            const r = await api<{ key: string }>(`/api/databases/${id}/keys`, { method: "POST", json: { label, mode } });
            setFresh({ key: r.key, mode });
            setLabel("");
            setErr("");
            load();
          } catch (x) {
            setErr((x as Error).message);
          }
        }}
      >
        <div className="min-w-0">
          <Field label="Label key baru">
            <input className={inputCls} value={label} onChange={(e) => setLabel(e.target.value)} maxLength={40} required />
          </Field>
        </div>
        <select className={`${inputCls} sm:!w-auto`} value={mode} onChange={(e) => setMode(e.target.value as "ro" | "rw")} aria-label="Jenis key">
          <option value="ro">Read-only</option>
          <option value="rw">Read-write</option>
        </select>
        <Btn variant="primary" type="submit" className="w-full sm:w-auto">
          Buat key
        </Btn>
      </form>
      {err && <Notice kind="error">{err}</Notice>}
    </section>
  );
}

function EnvCard({ id }: { id: string }) {
  const [token, setToken] = useState("");
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [project, setProject] = useState("");
  const [mode, setMode] = useState<"full-access" | "read-only">("full-access");
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  // Best-effort: pakai token Vercel yang sudah tersimpan di Settings (bentuk data /api/user-data bisa berbeda).
  useEffect(() => {
    api<any>("/api/user-data")
      .then((d) => {
        const t = d?.settings?.vercelToken ?? d?.settings?.tokens?.vercel ?? d?.data?.settings?.vercelToken;
        if (typeof t === "string" && t) setToken(t);
      })
      .catch(() => {});
  }, []);

  const headers = { "x-vercel-token": token };
  return (
    <section className={`${surface} min-w-0 space-y-4 p-4 sm:p-5`}>
      <h2 className={heading}>Kirim ke Environment project</h2>
      <p className={subtle}>Menyuntik TURSO_DATABASE_URL dan TURSO_AUTH_TOKEN ke project Vercel. Token Vercel hanya dipakai untuk request ini dan tidak disimpan.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Token Vercel">
          <input className={inputCls} type="password" value={token} onChange={(e) => setToken(e.target.value)} autoComplete="off" />
        </Field>
        <Field label="Project">
          <div className="flex min-w-0 gap-2">
            <select className={inputCls} value={project} onChange={(e) => setProject(e.target.value)}>
              <option value="">{projects.length ? "Pilih project…" : "Muat project dulu"}</option>
              {projects.map((p) => (
                <option key={p.id} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
            <Btn
              disabled={!token}
              onClick={async () => {
                try {
                  setProjects((await api<{ projects: { id: string; name: string }[] }>(`/api/databases/${id}/send-env`, { headers })).projects);
                  setMsg(null);
                } catch (e) {
                  setMsg({ kind: "error", text: (e as Error).message });
                }
              }}
            >
              Muat
            </Btn>
          </div>
        </Field>
      </div>
      <Field label="Hak akses token Turso" hint="Pakai read-only jika project hanya membaca data.">
        <select className={inputCls} value={mode} onChange={(e) => setMode(e.target.value as "full-access" | "read-only")}>
          <option value="full-access">Full access</option>
          <option value="read-only">Read-only</option>
        </select>
      </Field>
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
      <Btn
        variant="primary"
        className="w-full sm:w-auto"
        disabled={!token || !project || busy}
        onClick={async () => {
          setBusy(true);
          try {
            const r = await api<{ note: string }>(`/api/databases/${id}/send-env`, { method: "POST", headers, json: { project, mode } });
            setMsg({ kind: "ok", text: `Variabel berhasil dikirim ke “${project}”. ${r.note}` });
          } catch (e) {
            setMsg({ kind: "error", text: (e as Error).message });
          }
          setBusy(false);
        }}
      >
        {busy ? "Mengirim…" : "Kirim ke Environment"}
      </Btn>
    </section>
  );
}
