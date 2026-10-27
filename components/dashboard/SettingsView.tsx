"use client";

import { Btn, Badge, PageTitle } from "@/components/ui/primitives";
import { notifySessionExpired } from "@/lib/session-expired";
import * as React from "react";
import { HardHat } from "lucide-react";
import { Eye, EyeOff, Save, ShieldCheck, ShieldAlert, Trash2, Bug, Rocket, Check, ExternalLink, KeyRound, Network as SpiderIcon } from "@/components/ui/icons";
import { VercelIcon, CloudflareIcon, RailwayIcon } from "@/components/ui/PlatformIcon";
import { Surface } from "@/components/ui/Surface";
import { Switch } from "@/components/ui/Switch";
import { ClaudeConnectCard } from "@/components/dashboard/ClaudeConnectCard";
import { ViewFade } from "@/components/ui/ViewFade";
import { useCloudStorage } from "@/lib/useCloudStorage";
import { useToast } from "@/components/ui/Toast";
import { useDeployPreferences, type DeployAnimation } from "@/lib/preferences";
import { cn } from "@/lib/utils";
import type {
  ApiResponse,
  SettingsTokens,
  VercelUserInfo,
  GithubUserInfo,
  CloudflareAccountInfo,
  RailwayUserInfo,
} from "@/types";

const DEFAULT_TOKENS: SettingsTokens = {
  vercelToken: "",
  cloudflareToken: "",
  cloudflareAccountId: "",
  githubPat: "",
  railwayToken: "",
};

/** Kolom yang diisi lewat form ini (dipakai untuk mendeteksi perubahan yang belum disimpan). */
const FORM_FIELDS = ["vercelToken", "cloudflareToken", "cloudflareAccountId", "githubPat", "railwayToken"] as const;

async function callApi<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const body = (await res.json().catch(() => null)) as ApiResponse<T> | null;
  notifySessionExpired(body);
  if (!body || !body.ok) throw new Error(body?.error ?? `Permintaan gagal (${res.status})`);
  return body.data;
}

type CheckState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "ok"; label: string }
  | { status: "error"; message: string };

/**
 * Satu platform = satu kartu: nama + status tersimpan, isian token, lalu aksi (Test, Hapus, ambil token).
 * Status tidak hanya lewat warna: selalu ada teks ("Tersimpan" / "Belum diisi") dan ikon.
 */
function TokenField({
  id,
  label,
  icon,
  tokenUrl,
  saved,
  value,
  onChange,
  check,
  onTest,
  onRemove,
}: {
  id: string;
  label: string;
  icon: React.ReactNode;
  /** Halaman resmi untuk membuat token ini. */
  tokenUrl: string;
  /** Sudah ada token tersimpan di akun. */
  saved: boolean;
  value: string;
  onChange: (v: string) => void;
  check: CheckState;
  onTest: () => void;
  /** Hapus token ini dari akun (langsung tersimpan, setelah konfirmasi). */
  onRemove: () => void;
}) {
  const [visible, setVisible] = React.useState(false);
  const [confirming, setConfirming] = React.useState(false);
  const { showToast } = useToast();
  const hasValue = !!value?.trim();
  const statusId = `${id}-status`;

  // Kalau kolom dikosongkan (mis. setelah dihapus), tutup konfirmasi yang masih terbuka.
  React.useEffect(() => {
    if (!value?.trim()) setConfirming(false);
  }, [value]);

  return (
    <div className="rounded-2xl bg-[var(--surface-solid-2)] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-tone-lilac text-lav-text">{icon}</span>
          <label htmlFor={id} className="min-w-0 truncate text-[14px] font-semibold">
            {label}
          </label>
        </div>
        {saved ? (
          <Badge tone="good">
            <Check size={12} aria-hidden /> Tersimpan
          </Badge>
        ) : (
          <Badge>Belum diisi</Badge>
        )}
      </div>

      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          placeholder="Tempel token di sini"
          autoComplete="off"
          spellCheck={false}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          aria-describedby={statusId}
          className="input-solid mono h-11 w-full px-3.5 pr-12 text-[13px]"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? `Sembunyikan ${label}` : `Tampilkan ${label}`}
          className="absolute right-1.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-text-muted hover:bg-[var(--row-hover)] hover:text-text"
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Btn
          onClick={onTest}
          busy={check.status === "checking"}
          softDisabled
          disabled={!hasValue}
          onDisabledClick={() => showToast(`Isi ${label} dulu sebelum tes koneksi.`)}
        >
          <ShieldCheck size={13} /> Test Koneksi
        </Btn>
        {saved && !confirming && (
          <Btn variant="danger" onClick={() => setConfirming(true)} aria-label={`Hapus ${label}`}>
            <Trash2 size={13} /> Hapus
          </Btn>
        )}
        <a
          href={tokenUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto inline-flex items-center gap-1 rounded-full px-2 py-1.5 text-[12px] font-medium text-lav-text underline-offset-4 hover:underline"
        >
          Ambil token <ExternalLink size={12} aria-hidden />
          <span className="sr-only">(buka di tab baru)</span>
        </a>
      </div>

      {confirming && (
        <div
          role="alert"
          className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[var(--bad-bg)] px-3 py-2.5 text-[12.5px] text-bad-fg"
        >
          <span>Hapus {label} dari akunmu? Deploy ke platform ini tidak bisa jalan sampai diisi lagi.</span>
          <span className="flex gap-2">
            <Btn
              variant="destructive"
              onClick={() => {
                setConfirming(false);
                onRemove();
              }}
            >
              Ya, hapus
            </Btn>
            <Btn onClick={() => setConfirming(false)}>Batal</Btn>
          </span>
        </div>
      )}

      <div id={statusId} aria-live="polite">
        {check.status === "ok" && (
          <p className="mt-3 inline-flex items-start gap-1.5 text-[12.5px] text-ok-fg">
            <ShieldCheck size={14} className="mt-0.5 shrink-0" aria-hidden /> {check.label}
          </p>
        )}
        {check.status === "error" && (
          <p className="mt-3 inline-flex items-start gap-1.5 text-[12.5px] text-bad-fg">
            <ShieldAlert size={14} className="mt-0.5 shrink-0" aria-hidden /> {check.message}
          </p>
        )}
      </div>
    </div>
  );
}

/** Baris saklar: ikon + judul + penjelasan di kiri, saklar di kanan. Klik judul juga menyalakan saklar. */
function SwitchRow({
  id,
  icon,
  title,
  description,
  checked,
  onChange,
}: {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex min-w-0 items-start gap-3">
        <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-tone-lilac text-text">{icon}</div>
        <div className="min-w-0">
          <label htmlFor={id} className="block cursor-pointer text-[14px] font-medium">
            {title}
          </label>
          <p id={`${id}-desc`} className="text-[12.5px] leading-relaxed text-text-muted">
            {description}
          </p>
        </div>
      </div>
      <Switch id={id} checked={checked} onChange={onChange} aria-describedby={`${id}-desc`} />
    </div>
  );
}

const ANIMATION_OPTIONS: { value: DeployAnimation; label: string; hint: string; icon: React.ReactNode }[] = [
  { value: "default", label: "Default", hint: "Spinner roket seperti sekarang", icon: <Rocket size={16} /> },
  { value: "spider", label: "Spider Crawler AI", hint: "Laba-laba merayap di jaring saraf, satu node per tahap", icon: <SpiderIcon size={16} /> },
  { value: "kuli", label: "Kuli Proyek", hint: "Kuli dan mandor membangun gedung selagi deploy berjalan", icon: <HardHat size={16} /> },
];

/** Preferensi tampilan jendela deploy. Tema gelap/terang sengaja tidak ada di sini: ganti lewat saklar di sidebar. */
function DeploySettings() {
  const [prefs, updatePrefs] = useDeployPreferences();
  const optionRefs = React.useRef<(HTMLButtonElement | null)[]>([]);

  /** Navigasi keyboard radio group: panah memindah sekaligus memilih, Tab hanya berhenti di pilihan aktif. */
  function onKeyDown(e: React.KeyboardEvent, index: number) {
    const last = ANIMATION_OPTIONS.length - 1;
    let next = index;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") next = index === last ? 0 : index + 1;
    else if (e.key === "ArrowUp" || e.key === "ArrowLeft") next = index === 0 ? last : index - 1;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = last;
    else return;
    e.preventDefault();
    updatePrefs({ deployAnimation: ANIMATION_OPTIONS[next].value });
    optionRefs.current[next]?.focus();
  }

  return (
    <Surface className="space-y-5 p-4 sm:p-6">
      <div>
        <h3 className="text-[16px] font-bold tracking-tight">Tampilan deploy</h3>
        <p className="mt-0.5 text-[12.5px] text-text-muted">Langsung berlaku dan tersimpan di perangkat ini.</p>
      </div>

      <div role="radiogroup" aria-labelledby="deployAnimLabel">
        <p id="deployAnimLabel" className="mb-2 text-[14px] font-medium">
          Animasi loading
        </p>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
          {ANIMATION_OPTIONS.map((opt, i) => {
            const selected = prefs.deployAnimation === opt.value;
            return (
              <button
                key={opt.value}
                ref={(el) => {
                  optionRefs.current[i] = el;
                }}
                type="button"
                role="radio"
                aria-checked={selected}
                tabIndex={selected ? 0 : -1}
                onClick={() => updatePrefs({ deployAnimation: opt.value })}
                onKeyDown={(e) => onKeyDown(e, i)}
                className={cn(
                  "flex items-start gap-3 rounded-2xl p-3.5 text-left transition-colors",
                  selected
                    ? "bg-violet-500 text-white [&_.text-text-muted]:!text-violet-100"
                    : "bg-[var(--surface-solid-2)] hover:brightness-95"
                )}
              >
                <span className={cn("mt-0.5", selected ? "text-white" : "text-text-muted")} aria-hidden>
                  {opt.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-medium">{opt.label}</span>
                  <span className="block text-[12.5px] leading-relaxed text-text-muted">{opt.hint}</span>
                </span>
                <span
                  aria-hidden
                  className={cn(
                    "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full",
                    selected ? "bg-white text-violet-600" : "border border-[var(--line-strong)]"
                  )}
                >
                  {selected && <Check size={12} />}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="h-px bg-[var(--surface-line)]" />

      <SwitchRow
        id="settingsDebugLog"
        icon={<Bug size={16} />}
        title="Tampilkan proses debug"
        description="Munculkan log langkah demi langkah (tahap, status, dan pesan error) di jendela deploy. Berlaku untuk semua animasi."
        checked={prefs.showDebug}
        onChange={(v) => updatePrefs({ showDebug: v })}
      />
    </Surface>
  );
}

export function SettingsView() {
  const [tokens, setTokens, ready] = useCloudStorage<SettingsTokens>(
    "settingsTokens",
    DEFAULT_TOKENS,
    "depup-settings-tokens"
  );
  const [draft, setDraft] = React.useState<SettingsTokens>(DEFAULT_TOKENS);
  const [vercelCheck, setVercelCheck] = React.useState<CheckState>({ status: "idle" });
  const [cloudflareCheck, setCloudflareCheck] = React.useState<CheckState>({ status: "idle" });
  const [cloudflareAccounts, setCloudflareAccounts] = React.useState<CloudflareAccountInfo[]>([]);
  const [githubCheck, setGithubCheck] = React.useState<CheckState>({ status: "idle" });
  const [railwayCheck, setRailwayCheck] = React.useState<CheckState>({ status: "idle" });
  const { showToast } = useToast();

  React.useEffect(() => {
    if (ready) setDraft(tokens);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  /** Hapus satu token: langsung tersimpan ke akun, tanpa menyentuh isian lain yang belum disimpan. */
  function removeToken(field: keyof SettingsTokens, label: string, extra?: () => void) {
    setTokens({ ...tokens, [field]: "", ...(field === "cloudflareToken" ? { cloudflareAccountId: "" } : {}) });
    setDraft((prev) => ({
      ...prev,
      [field]: "",
      ...(field === "cloudflareToken" ? { cloudflareAccountId: "" } : {}),
    }));
    extra?.();
    showToast(`${label} dihapus.`);
  }

  const dirty = ready && FORM_FIELDS.some((f) => (draft[f] ?? "") !== (tokens[f] ?? ""));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!dirty) return;
    // Gabungkan ke token tersimpan supaya izin konektor Claude (mcpDeployPlatforms) tidak ikut tertimpa.
    setTokens({ ...tokens, ...Object.fromEntries(FORM_FIELDS.map((f) => [f, draft[f] ?? ""])) });
    showToast("Perubahan berhasil disimpan!");
  }

  function handleReset() {
    setDraft((prev) => ({ ...prev, ...Object.fromEntries(FORM_FIELDS.map((f) => [f, tokens[f] ?? ""])) }));
    setVercelCheck({ status: "idle" });
    setCloudflareCheck({ status: "idle" });
    setCloudflareAccounts([]);
    setGithubCheck({ status: "idle" });
    setRailwayCheck({ status: "idle" });
  }

  const savedHas = (f: keyof SettingsTokens) => typeof tokens[f] === "string" && (tokens[f] as string).trim().length > 0;

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

  async function testRailway() {
    setRailwayCheck({ status: "checking" });
    try {
      const user = await callApi<RailwayUserInfo>("/api/railway/whoami", {
        headers: { "x-railway-token": draft.railwayToken },
      });
      setRailwayCheck({
        status: "ok",
        label: `Terhubung sebagai ${user.name ?? user.email ?? user.id}`,
      });
    } catch (err) {
      setRailwayCheck({ status: "error", message: err instanceof Error ? err.message : "Token tidak valid." });
    }
  }

  async function testCloudflare() {
    setCloudflareCheck({ status: "checking" });
    try {
      const { accounts } = await callApi<{ accounts: CloudflareAccountInfo[] }>("/api/cloudflare/whoami", {
        headers: { "x-cloudflare-token": draft.cloudflareToken },
      });
      setCloudflareAccounts(accounts);
      if (accounts.length === 0) {
        setCloudflareCheck({ status: "error", message: "Token valid tetapi tidak memiliki akses ke akun manapun." });
        return;
      }
      const chosen = accounts.find((a) => a.id === draft.cloudflareAccountId) ?? accounts[0];
      setDraft((prev) => ({ ...prev, cloudflareAccountId: chosen.id }));
      setCloudflareCheck({
        status: "ok",
        label:
          accounts.length > 1
            ? `Terhubung — akun aktif: "${chosen.name}" (${accounts.length} akun tersedia di bawah)`
            : `Terhubung ke akun "${chosen.name}"`,
      });
    } catch (err) {
      setCloudflareAccounts([]);
      setCloudflareCheck({ status: "error", message: err instanceof Error ? err.message : "Token tidak valid." });
    }
  }

  return (
    <ViewFade>
      <div className="space-y-4 sm:space-y-5">
        <PageTitle
          title="Settings"
          desc="Token global dipakai otomatis saat kamu deploy project baru. Isi sekali, lalu klik Test Koneksi untuk memastikan token valid ke akunmu."
        />

        <div className="grid items-start gap-4 sm:gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          <Surface className="p-4 sm:p-6">
            <div className="mb-4">
              <h3 className="flex items-center gap-2 text-[16px] font-bold tracking-tight">
                <KeyRound size={16} aria-hidden /> Token platform
              </h3>
              <p className="mt-0.5 text-[12.5px] text-text-muted">
                Tersimpan di akunmu dan hanya dipakai untuk deploy atas namamu.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-2">
              <TokenField
                id="settingsVercelToken"
                label="Vercel Token"
                icon={<VercelIcon size={16} />}
                tokenUrl="https://vercel.com/account/tokens"
                saved={savedHas("vercelToken")}
                value={draft.vercelToken}
                onChange={(v) => {
                  setDraft((prev) => ({ ...prev, vercelToken: v }));
                  setVercelCheck({ status: "idle" });
                }}
                check={vercelCheck}
                onTest={testVercel}
                onRemove={() => removeToken("vercelToken", "Vercel Token", () => setVercelCheck({ status: "idle" }))}
              />
              <TokenField
                id="settingsCloudflareToken"
                label="Cloudflare Token"
                icon={<CloudflareIcon size={16} />}
                tokenUrl="https://dash.cloudflare.com/profile/api-tokens"
                saved={savedHas("cloudflareToken")}
                value={draft.cloudflareToken}
                onChange={(v) => {
                  setDraft((prev) => ({ ...prev, cloudflareToken: v }));
                  setCloudflareCheck({ status: "idle" });
                  setCloudflareAccounts([]);
                }}
                check={cloudflareCheck}
                onTest={testCloudflare}
                onRemove={() =>
                  removeToken("cloudflareToken", "Cloudflare Token", () => {
                    setCloudflareCheck({ status: "idle" });
                    setCloudflareAccounts([]);
                  })
                }
              />
              {cloudflareAccounts.length > 1 && (
                <div className="rounded-2xl bg-[var(--surface-solid-2)] p-4 md:col-span-2">
                  <label htmlFor="cloudflareAccount" className="mb-1.5 block text-[13px] font-medium">
                    Akun Cloudflare aktif
                  </label>
                  <select
                    id="cloudflareAccount"
                    value={draft.cloudflareAccountId}
                    onChange={(e) => setDraft((prev) => ({ ...prev, cloudflareAccountId: e.target.value }))}
                    className="input-solid h-11 w-full px-3.5 text-[13px]"
                  >
                    {cloudflareAccounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} — {a.id}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1.5 text-[12px] text-text-muted">
                    Token ini memiliki akses ke beberapa akun — pilih satu untuk dipakai deploy Cloudflare Pages.
                  </p>
                </div>
              )}
              <TokenField
                id="settingsGithubPat"
                label="GitHub PAT"
                icon={<KeyRound size={16} />}
                tokenUrl="https://github.com/settings/tokens/new"
                saved={savedHas("githubPat")}
                value={draft.githubPat}
                onChange={(v) => {
                  setDraft((prev) => ({ ...prev, githubPat: v }));
                  setGithubCheck({ status: "idle" });
                }}
                check={githubCheck}
                onTest={testGithub}
                onRemove={() => removeToken("githubPat", "GitHub PAT", () => setGithubCheck({ status: "idle" }))}
              />
              <TokenField
                id="settingsRailwayToken"
                label="Railway Token"
                icon={<RailwayIcon size={16} />}
                tokenUrl="https://railway.com/account/tokens"
                saved={savedHas("railwayToken")}
                value={draft.railwayToken}
                onChange={(v) => {
                  setDraft((prev) => ({ ...prev, railwayToken: v }));
                  setRailwayCheck({ status: "idle" });
                }}
                check={railwayCheck}
                onTest={testRailway}
                onRemove={() => removeToken("railwayToken", "Railway Token", () => setRailwayCheck({ status: "idle" }))}
              />

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--surface-line)] pt-4 md:col-span-2">
                <p role="status" className={cn("inline-flex items-center gap-1.5 text-[12.5px]", dirty ? "text-warn-fg" : "text-text-muted")}>
                  {dirty ? (
                    "Ada perubahan yang belum disimpan."
                  ) : (
                    <>
                      <Check size={14} aria-hidden /> Semua perubahan tersimpan.
                    </>
                  )}
                </p>
                <div className="flex w-full items-center gap-2 sm:w-auto">
                  {dirty && (
                    <Btn onClick={handleReset} className="flex-1 sm:flex-none">
                      Batalkan
                    </Btn>
                  )}
                  <Btn
                    type="submit"
                    variant="primary"
                    softDisabled
                    disabled={!dirty}
                    className="flex-1 px-5 py-2.5 text-[13px] sm:flex-none"
                  >
                    <Save size={15} /> Simpan
                  </Btn>
                </div>
              </div>
            </form>
          </Surface>

          <DeploySettings />
        </div>

        <ClaudeConnectCard
          tokens={tokens}
          onTokensChange={(next) => {
            setTokens(next);
            setDraft((prev) => ({ ...prev, mcpDeployPlatforms: next.mcpDeployPlatforms }));
            showToast("Izin konektor Claude disimpan.");
          }}
        />
      </div>
    </ViewFade>
  );
}
