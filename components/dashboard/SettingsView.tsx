"use client";

import * as React from "react";
import { Eye, EyeOff, Save, ShieldCheck, ShieldAlert, Loader2 } from "lucide-react";
import { Surface } from "@/components/ui/Surface";
import { ViewFade } from "@/components/ui/ViewFade";
import { useLocalStorage } from "@/lib/useLocalStorage";
import { useToast } from "@/components/ui/Toast";
import type { ApiResponse, SettingsTokens, VercelUserInfo, GithubUserInfo } from "@/types";

const DEFAULT_TOKENS: SettingsTokens = {
  vercelToken: "",
  cloudflareToken: "",
  githubPat: "",
};

async function callApi<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const body = (await res.json().catch(() => null)) as ApiResponse<T> | null;
  if (!body || !body.ok) throw new Error(body?.error ?? `Request gagal (${res.status})`);
  return body.data;
}

type CheckState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "ok"; label: string }
  | { status: "error"; message: string };

function TokenField({
  id,
  label,
  value,
  onChange,
  check,
  onTest,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  check: CheckState;
  onTest?: () => void;
}) {
  const [visible, setVisible] = React.useState(false);

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label htmlFor={id} className="block text-[12px] font-medium text-text-muted">
          {label}
        </label>
        {onTest && (
          <button
            type="button"
            onClick={onTest}
            disabled={!value.trim() || check.status === "checking"}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-violet-400 hover:brightness-110 disabled:opacity-40"
          >
            {check.status === "checking" && <Loader2 size={11} className="animate-spin" />}
            Test Koneksi
          </button>
        )}
      </div>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          placeholder="••••••••••••••••••••"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="input-solid mono h-11 w-full px-3.5 pr-11 text-[13px]"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? `Sembunyikan ${label}` : `Tampilkan ${label}`}
          className="absolute right-2 top-1/2 -translate-y-1/2 grid h-7 w-7 place-items-center rounded-full text-text-muted hover:bg-[var(--row-hover)] hover:text-text"
        >
          {visible ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
      {check.status === "ok" && (
        <p className="mt-1.5 inline-flex items-center gap-1.5 text-[11.5px] text-emerald-400">
          <ShieldCheck size={13} /> {check.label}
        </p>
      )}
      {check.status === "error" && (
        <p className="mt-1.5 inline-flex items-center gap-1.5 text-[11.5px] text-red-400">
          <ShieldAlert size={13} /> {check.message}
        </p>
      )}
    </div>
  );
}

export function SettingsView() {
  const [tokens, setTokens, ready] = useLocalStorage<SettingsTokens>("depush-settings-tokens", DEFAULT_TOKENS);
  const [draft, setDraft] = React.useState<SettingsTokens>(DEFAULT_TOKENS);
  const [vercelCheck, setVercelCheck] = React.useState<CheckState>({ status: "idle" });
  const [githubCheck, setGithubCheck] = React.useState<CheckState>({ status: "idle" });
  const { showToast } = useToast();

  React.useEffect(() => {
    if (ready) setDraft(tokens);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTokens(draft);
    showToast("Perubahan berhasil disimpan!");
  }

  async function testVercel() {
    setVercelCheck({ status: "checking" });
    try {
      const user = await callApi<VercelUserInfo>("/api/vercel/whoami", {
        headers: { "x-vercel-token": draft.vercelToken },
      });
      setVercelCheck({ status: "ok", label: `Terhubung sebagai @${user.username}` });
    } catch (err) {
      setVercelCheck({ status: "error", message: err instanceof Error ? err.message : "Token tidak valid." });
    }
  }

  async function testGithub() {
    setGithubCheck({ status: "checking" });
    try {
      const user = await callApi<GithubUserInfo>("/api/github/whoami", {
        headers: { "x-github-pat": draft.githubPat },
      });
      setGithubCheck({ status: "ok", label: `Terhubung sebagai @${user.login}` });
    } catch (err) {
      setGithubCheck({ status: "error", message: err instanceof Error ? err.message : "Token tidak valid." });
    }
  }

  return (
    <ViewFade>
      <div className="space-y-6">
        <div>
          <h2 className="text-[22px] font-semibold">Settings</h2>
          <p className="text-[13px] text-text-muted">
            Token global ini dipakai sebagai default saat kamu deploy project baru. Klik{" "}
            <span className="font-medium text-text">Test Koneksi</span> untuk memastikan token-nya benar-benar
            valid ke akun kamu.
          </p>
        </div>

        <Surface className="mx-auto max-w-2xl p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <TokenField
              id="settingsVercelToken"
              label="Vercel Token"
              value={draft.vercelToken}
              onChange={(v) => {
                setDraft((prev) => ({ ...prev, vercelToken: v }));
                setVercelCheck({ status: "idle" });
              }}
              check={vercelCheck}
              onTest={testVercel}
            />
            <TokenField
              id="settingsCloudflareToken"
              label="Cloudflare Token"
              value={draft.cloudflareToken}
              onChange={(v) => setDraft((prev) => ({ ...prev, cloudflareToken: v }))}
              check={{ status: "idle" }}
            />
            <TokenField
              id="settingsGithubPat"
              label="GitHub PAT"
              value={draft.githubPat}
              onChange={(v) => {
                setDraft((prev) => ({ ...prev, githubPat: v }));
                setGithubCheck({ status: "idle" });
              }}
              check={githubCheck}
              onTest={testGithub}
            />

            <button type="submit" className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-[13px]">
              <Save size={15} /> Simpan
            </button>
          </form>
        </Surface>
      </div>
    </ViewFade>
  );
}
