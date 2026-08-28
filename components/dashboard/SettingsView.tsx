"use client";

import * as React from "react";
import { Eye, EyeOff, Save } from "lucide-react";
import { Surface } from "@/components/ui/Surface";
import { ViewFade } from "@/components/ui/ViewFade";
import { useLocalStorage } from "@/lib/useLocalStorage";
import { useToast } from "@/components/ui/Toast";
import type { SettingsTokens } from "@/types";

const DEFAULT_TOKENS: SettingsTokens = {
  vercelToken: "",
  cloudflareToken: "",
  githubPat: "",
};

function TokenField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [visible, setVisible] = React.useState(false);

  return (
    <div>
      <label htmlFor={id} className="block text-[12px] font-medium text-text-muted mb-1.5">
        {label}
      </label>
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
    </div>
  );
}

export function SettingsView() {
  const [tokens, setTokens, ready] = useLocalStorage<SettingsTokens>("deployone-settings-tokens", DEFAULT_TOKENS);
  const [draft, setDraft] = React.useState<SettingsTokens>(DEFAULT_TOKENS);
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

  return (
    <ViewFade>
      <div className="space-y-6">
        <div>
          <h2 className="text-[22px] font-semibold">Settings</h2>
          <p className="text-[13px] text-text-muted">
            Token global ini dipakai sebagai default saat kamu deploy project baru.
          </p>
        </div>

        <Surface className="mx-auto max-w-2xl p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <TokenField
              id="settingsVercelToken"
              label="Vercel Token"
              value={draft.vercelToken}
              onChange={(v) => setDraft((prev) => ({ ...prev, vercelToken: v }))}
            />
            <TokenField
              id="settingsCloudflareToken"
              label="Cloudflare Token"
              value={draft.cloudflareToken}
              onChange={(v) => setDraft((prev) => ({ ...prev, cloudflareToken: v }))}
            />
            <TokenField
              id="settingsGithubPat"
              label="GitHub PAT"
              value={draft.githubPat}
              onChange={(v) => setDraft((prev) => ({ ...prev, githubPat: v }))}
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
