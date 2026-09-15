"use client";

import * as React from "react";
import { HelpCircle, Loader2, ShieldCheck, ShieldAlert } from "lucide-react";
import { ViewFade } from "@/components/ui/ViewFade";
import { cn } from "@/lib/utils";
import { useDeploy } from "@/lib/deploy-context";
import type { Platform } from "@/types";

const PLATFORMS: { id: Platform; label: string }[] = [
  { id: "vercel", label: "Vercel" },
  { id: "cloudflare", label: "Cloudflare" },
  { id: "railway", label: "Railway" },
  { id: "render", label: "Render" },
];

const PLATFORM_SUBTITLE: Record<Platform, string> = {
  vercel: "Import repository dan deploy ke Vercel dalam satu klik.",
  cloudflare: "Import repository dan deploy ke Cloudflare Pages dalam satu klik.",
  railway: "Import repository dan deploy ke Railway dalam satu klik.",
  render: "Import repository dan deploy ke Render dalam satu klik.",
};

const inputCls = "input-solid h-11 w-full px-3.5 text-[13px] placeholder:text-text-faint disabled:opacity-50";
const textareaCls = "input-solid w-full resize-none px-3.5 py-2.5 text-[13px] placeholder:text-text-faint mono";
const labelCls = "block text-[12px] font-medium text-text-muted mb-1.5";

/** Small "cara dapetin token" hint that jumps the user to the Docs tab. */
function TokenHelpLink({ topic }: { topic: string }) {
  const { setView } = useDeploy();
  return (
    <button
      type="button"
      onClick={() => setView("docs")}
      className="inline-flex items-center gap-1 text-[11px] font-medium text-violet-400 hover:brightness-110"
    >
      <HelpCircle size={12} /> Cara dapetin {topic}
    </button>
  );
}

function FieldLabel({
  htmlFor,
  required,
  optional,
  help,
  children,
}: {
  htmlFor: string;
  required?: boolean;
  optional?: boolean;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-1.5 flex items-center justify-between gap-2">
      <label htmlFor={htmlFor} className="block text-[12px] font-medium text-text-muted">
        {children} {required && <span className="text-red-400">*</span>}
        {optional && <span className="text-text-faint">(opsional)</span>}
      </label>
      {help && <TokenHelpLink topic={help} />}
    </div>
  );
}

/**
 * Vercel token field for the deploy form. If the token saved in Settings has
 * already been verified against the Vercel API, it's reused automatically
 * and the field collapses into a "connected as @user" badge — no retyping.
 * If there's no saved token, or it fails the check, it falls back to asking
 * for one manually (same as before).
 */
function VercelTokenField() {
  const { form, setFormField, savedVercelToken, savedVercelTokenStatus } = useDeploy();
  const [manualOverride, setManualOverride] = React.useState(false);

  const usingSavedToken = savedVercelTokenStatus === "ok" && Boolean(savedVercelToken) && !manualOverride;

  // Keep the form's real token value in sync with the saved+verified token,
  // unless the user has explicitly chosen to type a different one.
  React.useEffect(() => {
    if (usingSavedToken && savedVercelToken) {
      setFormField("platformToken", savedVercelToken.token);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usingSavedToken, savedVercelToken?.token]);

  if (savedVercelTokenStatus === "checking") {
    return (
      <div>
        <FieldLabel htmlFor="platformToken" required>
          Vercel Token
        </FieldLabel>
        <p className="inline-flex items-center gap-1.5 text-[12px] text-text-muted">
          <Loader2 size={13} className="animate-spin" /> Mengecek token tersimpan di Settings...
        </p>
      </div>
    );
  }

  if (usingSavedToken && savedVercelToken) {
    return (
      <div>
        <FieldLabel htmlFor="platformToken" required>
          Vercel Token
        </FieldLabel>
        <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5">
          <p className="inline-flex items-center gap-1.5 text-[12.5px] text-emerald-300">
            <ShieldCheck size={14} /> Terhubung sebagai @{savedVercelToken.username} (token dari Settings)
          </p>
          <button
            type="button"
            onClick={() => setManualOverride(true)}
            className="shrink-0 text-[11.5px] font-medium text-violet-400 hover:brightness-110"
          >
            Ganti token
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <FieldLabel htmlFor="platformToken" required help="Vercel Token">
        Vercel Token
      </FieldLabel>
      <input
        id="platformToken"
        type="password"
        required
        placeholder="••••••••••••••••"
        value={form.platformToken}
        onChange={(e) => setFormField("platformToken", e.target.value)}
        className={inputCls}
      />
      {savedVercelTokenStatus === "invalid" && !manualOverride && (
        <p className="mt-1.5 inline-flex items-center gap-1.5 text-[11.5px] text-red-400">
          <ShieldAlert size={13} /> Token di Settings sudah tidak valid — masukin token baru di sini.
        </p>
      )}
      {manualOverride && savedVercelToken && (
        <button
          type="button"
          onClick={() => {
            setManualOverride(false);
            setFormField("platformToken", savedVercelToken.token);
          }}
          className="mt-1.5 text-[11.5px] font-medium text-violet-400 hover:brightness-110"
        >
          Pakai token tersimpan lagi (@{savedVercelToken.username})
        </button>
      )}
    </div>
  );
}

/**
 * Cloudflare token + account field for the deploy form — mirrors
 * VercelTokenField. If the token saved in Settings is already verified and
 * resolved to exactly one account, it's reused automatically ("connected as
 * account X") and the field collapses; otherwise it falls back to asking
 * for a token + account ID manually.
 */
function CloudflareTokenField() {
  const { form, setFormField, savedCloudflareToken, savedCloudflareTokenStatus, cloudflareAccounts } = useDeploy();
  const [manualOverride, setManualOverride] = React.useState(false);

  const usingSavedToken = savedCloudflareTokenStatus === "ok" && Boolean(savedCloudflareToken) && !manualOverride;

  React.useEffect(() => {
    if (usingSavedToken && savedCloudflareToken) {
      setFormField("platformToken", savedCloudflareToken.token);
      setFormField("accountId", savedCloudflareToken.accountId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usingSavedToken, savedCloudflareToken?.token, savedCloudflareToken?.accountId]);

  if (savedCloudflareTokenStatus === "checking") {
    return (
      <div>
        <FieldLabel htmlFor="platformToken" required>
          Cloudflare Token
        </FieldLabel>
        <p className="inline-flex items-center gap-1.5 text-[12px] text-text-muted">
          <Loader2 size={13} className="animate-spin" /> Mengecek token tersimpan di Settings...
        </p>
      </div>
    );
  }

  if (usingSavedToken && savedCloudflareToken) {
    return (
      <div>
        <FieldLabel htmlFor="platformToken" required>
          Cloudflare Token
        </FieldLabel>
        <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5">
          <p className="inline-flex items-center gap-1.5 text-[12.5px] text-emerald-300">
            <ShieldCheck size={14} /> Terhubung ke akun &quot;{savedCloudflareToken.accountName}&quot; (token dari Settings)
          </p>
          <button
            type="button"
            onClick={() => setManualOverride(true)}
            className="shrink-0 text-[11.5px] font-medium text-violet-400 hover:brightness-110"
          >
            Ganti
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div>
        <FieldLabel htmlFor="platformToken" required help="Cloudflare Token">
          Cloudflare Token
        </FieldLabel>
        <input
          id="platformToken"
          type="password"
          required
          placeholder="••••••••••••••••"
          value={form.platformToken}
          onChange={(e) => setFormField("platformToken", e.target.value)}
          className={inputCls}
        />
        {savedCloudflareTokenStatus === "invalid" && !manualOverride && (
          <p className="mt-1.5 inline-flex items-center gap-1.5 text-[11.5px] text-red-400">
            <ShieldAlert size={13} /> Token di Settings sudah tidak valid — masukin token baru di sini.
          </p>
        )}
        {savedCloudflareTokenStatus === "needs_account" && cloudflareAccounts.length > 1 && !manualOverride && (
          <p className="mt-1.5 text-[11.5px] text-text-faint">
            Token di Settings valid tapi punya akses ke {cloudflareAccounts.length} akun Cloudflare — pilih Account ID di
            bawah, atau kunci salah satu akun di Settings.
          </p>
        )}
        {manualOverride && savedCloudflareToken && (
          <button
            type="button"
            onClick={() => {
              setManualOverride(false);
              setFormField("platformToken", savedCloudflareToken.token);
              setFormField("accountId", savedCloudflareToken.accountId);
            }}
            className="mt-1.5 text-[11.5px] font-medium text-violet-400 hover:brightness-110"
          >
            Pakai token tersimpan lagi (&quot;{savedCloudflareToken.accountName}&quot;)
          </button>
        )}
      </div>
      <div>
        <FieldLabel htmlFor="accountId" required>
          Account ID
        </FieldLabel>
        {cloudflareAccounts.length > 0 ? (
          <select
            id="accountId"
            required
            value={form.accountId}
            onChange={(e) => setFormField("accountId", e.target.value)}
            className={cn(inputCls, "mono")}
          >
            <option value="" disabled>
              Pilih akun...
            </option>
            {cloudflareAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} — {a.id}
              </option>
            ))}
          </select>
        ) : (
          <input
            id="accountId"
            type="text"
            required
            placeholder="a1b2c3d4e5f6..."
            value={form.accountId}
            onChange={(e) => setFormField("accountId", e.target.value)}
            className={cn(inputCls, "mono")}
          />
        )}
      </div>
    </>
  );
}

/**
 * Guides the user through connecting the Cloudflare Pages GitHub App the
 * first time — Cloudflare has no public API to trigger that install, only
 * its own dashboard flow, so this opens that screen and lets the user
 * confirm once they're done, or just re-checks silently once a Cloudflare
 * account is known. "unknown" isn't shown as an error — the first deploy
 * attempt confirms either way.
 */
function CloudflareGithubConnectionStep() {
  const { githubConnectionStatus, checkGithubConnection, savedCloudflareToken } = useDeploy();

  if (!savedCloudflareToken) return null;

  if (githubConnectionStatus.status === "connected") {
    return (
      <p className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-[12.5px] text-emerald-300">
        <ShieldCheck size={14} /> GitHub sudah terhubung ke akun Cloudflare ini — deploy langsung jalan otomatis.
      </p>
    );
  }

  return (
    <div className="space-y-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-3">
      <p className="inline-flex items-center gap-1.5 text-[12.5px] text-amber-300">
        <ShieldAlert size={14} /> Belum terdeteksi GitHub yang terhubung ke akun Cloudflare ini.
      </p>
      <p className="text-[11.5px] leading-relaxed text-text-muted">
        Kalau ini pertama kali deploy ke Cloudflare Pages dari repo GitHub, aktifkan dulu koneksinya di Cloudflare
        (sekali saja) — setelah itu deploy berikutnya otomatis kaya Vercel.
      </p>
      <div className="flex flex-wrap gap-2">
        {githubConnectionStatus.connectUrl && (
          <a
            href={githubConnectionStatus.connectUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="pill inline-flex items-center gap-1.5 px-3 py-1.5 text-[11.5px] font-medium hover:brightness-110"
          >
            Hubungkan GitHub ke Cloudflare
          </a>
        )}
        <button
          type="button"
          onClick={() => void checkGithubConnection()}
          disabled={githubConnectionStatus.status === "checking"}
          className="pill inline-flex items-center gap-1.5 px-3 py-1.5 text-[11.5px] font-medium hover:brightness-110 disabled:opacity-50"
        >
          {githubConnectionStatus.status === "checking" && <Loader2 size={11} className="animate-spin" />}
          Sudah connect, cek lagi
        </button>
      </div>
    </div>
  );
}

export function DeployFormView() {
  const { form, setFormField, submitDeploy } = useDeploy();
  
  // Memastikan default local state adalah 'vercel'
  const [platform, setPlatform] = React.useState<Platform>(form.platform || "vercel");

  // Efek untuk sinkronisasi default platform 'vercel' ke global state context
  React.useEffect(() => {
    if (!form.platform) {
      setFormField("platform", "vercel");
    }
  }, [form.platform, setFormField]);

  const choosePlatform = (p: Platform) => {
    setPlatform(p);
    setFormField("platform", p);
  };

  return (
    <ViewFade>
      <div className="mx-auto max-w-2xl">
        {/* Platform selector */}
        <div className="mb-5 flex flex-wrap gap-2">
          {PLATFORMS.map((p) => {
            const active = platform === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => choosePlatform(p.id)}
                className={cn(
                  "rounded-xl border px-4 py-2.5 text-[13px] font-medium transition-colors",
                  active
                    ? "border-violet-500/50 bg-violet-500/15 text-text"
                    : "border-[var(--surface-line)] bg-[var(--surface-solid-2)] text-text-muted hover:text-text"
                )}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        <div className="surface-solid p-6 sm:p-8">
          <h2 className="text-[20px] font-semibold mb-1">Deploy Project</h2>
          <p className="text-[13px] text-text-muted mb-6">{PLATFORM_SUBTITLE[platform]}</p>

          <form id="deployForm" onSubmit={submitDeploy} className="space-y-5">
            {platform === "vercel" && (
              <>
                <div>
                  <FieldLabel htmlFor="projectName" required>
                    Nama Project
                  </FieldLabel>
                  <input
                    id="projectName"
                    type="text"
                    required
                    placeholder="acme-storefront"
                    value={form.projectName}
                    onChange={(e) => setFormField("projectName", e.target.value)}
                    className={inputCls}
                  />
                </div>

                <div>
                  <FieldLabel htmlFor="githubUrl" required>
                    GitHub URL
                  </FieldLabel>
                  <input
                    id="githubUrl"
                    type="text"
                    required
                    placeholder="https://github.com/username/repo"
                    value={form.githubUrl}
                    onChange={(e) => setFormField("githubUrl", e.target.value)}
                    className={cn(inputCls, "mono")}
                  />
                </div>

                <VercelTokenField />

                <div>
                  <FieldLabel htmlFor="githubPat" optional help="GitHub Token">
                    GitHub Token
                  </FieldLabel>
                  <input
                    id="githubPat"
                    type="password"
                    placeholder="ghp_•••••••••••••••• (untuk repo private)"
                    value={form.githubPat}
                    onChange={(e) => setFormField("githubPat", e.target.value)}
                    className={inputCls}
                  />
                </div>
              </>
            )}

            {platform === "cloudflare" && (
              <>
                <div>
                  <FieldLabel htmlFor="projectName" required>
                    Nama Project
                  </FieldLabel>
                  <input
                    id="projectName"
                    type="text"
                    required
                    placeholder="acme-storefront"
                    value={form.projectName}
                    onChange={(e) => setFormField("projectName", e.target.value)}
                    className={inputCls}
                  />
                </div>

                <CloudflareTokenField />
                <CloudflareGithubConnectionStep />

                <div>
                  <FieldLabel htmlFor="githubUrl" required>
                    GitHub URL
                  </FieldLabel>
                  <input
                    id="githubUrl"
                    type="text"
                    required
                    placeholder="https://github.com/username/repo"
                    value={form.githubUrl}
                    onChange={(e) => setFormField("githubUrl", e.target.value)}
                    className={cn(inputCls, "mono")}
                  />
                </div>

                <div>
                  <FieldLabel htmlFor="githubPat" optional help="GitHub Token">
                    GitHub Token
                  </FieldLabel>
                  <input
                    id="githubPat"
                    type="password"
                    placeholder="ghp_•••••••••••••••• (untuk repo private)"
                    value={form.githubPat}
                    onChange={(e) => setFormField("githubPat", e.target.value)}
                    className={inputCls}
                  />
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <FieldLabel htmlFor="buildCommand" optional>
                      Build Command
                    </FieldLabel>
                    <input
                      id="buildCommand"
                      type="text"
                      placeholder="Kosongkan = auto-detect framework"
                      value={form.buildCommand}
                      onChange={(e) => setFormField("buildCommand", e.target.value)}
                      className={cn(inputCls, "mono")}
                    />
                  </div>
                  <div>
                    <FieldLabel htmlFor="outputDir" optional>
                      Output Dir
                    </FieldLabel>
                    <input
                      id="outputDir"
                      type="text"
                      placeholder="Kosongkan = auto-detect framework"
                      value={form.outputDir}
                      onChange={(e) => setFormField("outputDir", e.target.value)}
                      className={cn(inputCls, "mono")}
                    />
                  </div>
                </div>
                <p className="text-[11px] leading-relaxed text-text-faint">
                  Depup mendeteksi framework dari package.json repo (Next.js, Vite, CRA, Astro, dll) dan otomatis
                  pakai build command &amp; output dir yang sesuai kalau dua field di atas dikosongkan.
                </p>
              </>
            )}

            {platform === "railway" && (
              <>
                <div>
                  <FieldLabel htmlFor="projectName" required>
                    Nama Project
                  </FieldLabel>
                  <input
                    id="projectName"
                    type="text"
                    required
                    placeholder="acme-storefront"
                    value={form.projectName}
                    onChange={(e) => setFormField("projectName", e.target.value)}
                    className={inputCls}
                  />
                </div>

                <div>
                  <FieldLabel htmlFor="platformToken" required>
                    Railway Token
                  </FieldLabel>
                  <input
                    id="platformToken"
                    type="password"
                    required
                    placeholder="••••••••••••••••"
                    value={form.platformToken}
                    onChange={(e) => setFormField("platformToken", e.target.value)}
                    className={inputCls}
                  />
                </div>

                <div>
                  <FieldLabel htmlFor="githubUrl" required>
                    GitHub URL
                  </FieldLabel>
                  <input
                    id="githubUrl"
                    type="text"
                    required
                    placeholder="https://github.com/username/repo"
                    value={form.githubUrl}
                    onChange={(e) => setFormField("githubUrl", e.target.value)}
                    className={cn(inputCls, "mono")}
                  />
                </div>

                <div>
                  <FieldLabel htmlFor="startCommand" optional>
                    Start Command
                  </FieldLabel>
                  <input
                    id="startCommand"
                    type="text"
                    placeholder="npm start"
                    value={form.startCommand}
                    onChange={(e) => setFormField("startCommand", e.target.value)}
                    className={cn(inputCls, "mono")}
                  />
                </div>

                <div>
                  <FieldLabel htmlFor="envText" optional>
                    Environment Variables
                  </FieldLabel>
                  <textarea
                    id="envText"
                    rows={4}
                    placeholder={"KEY=value\nANOTHER_KEY=value"}
                    value={form.envText}
                    onChange={(e) => setFormField("envText", e.target.value)}
                    className={textareaCls}
                  />
                </div>
              </>
            )}

            {platform === "render" && (
              <>
                <div>
                  <FieldLabel htmlFor="projectName" required>
                    Nama Project
                  </FieldLabel>
                  <input
                    id="projectName"
                    type="text"
                    required
                    placeholder="acme-storefront"
                    value={form.projectName}
                    onChange={(e) => setFormField("projectName", e.target.value)}
                    className={inputCls}
                  />
                </div>

                <div>
                  <FieldLabel htmlFor="platformToken" required>
                    Render API Key
                  </FieldLabel>
                  <input
                    id="platformToken"
                    type="password"
                    required
                    placeholder="••••••••••••••••"
                    value={form.platformToken}
                    onChange={(e) => setFormField("platformToken", e.target.value)}
                    className={inputCls}
                  />
                </div>

                <div>
                  <FieldLabel htmlFor="githubUrl" required>
                    GitHub URL
                  </FieldLabel>
                  <input
                    id="githubUrl"
                    type="text"
                    required
                    placeholder="https://github.com/username/repo"
                    value={form.githubUrl}
                    onChange={(e) => setFormField("githubUrl", e.target.value)}
                    className={cn(inputCls, "mono")}
                  />
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <FieldLabel htmlFor="buildCommand" optional>
                      Build Command
                    </FieldLabel>
                    <input
                      id="buildCommand"
                      type="text"
                      placeholder="npm run build"
                      value={form.buildCommand}
                      onChange={(e) => setFormField("buildCommand", e.target.value)}
                      className={cn(inputCls, "mono")}
                    />
                  </div>
                  <div>
                    <FieldLabel htmlFor="startCommand" optional>
                      Start Command
                    </FieldLabel>
                    <input
                      id="startCommand"
                      type="text"
                      placeholder="npm start"
                      value={form.startCommand}
                      onChange={(e) => setFormField("startCommand", e.target.value)}
                      className={cn(inputCls, "mono")}
                    />
                  </div>
                </div>
              </>
            )}

            <button type="submit" className="btn-primary w-full py-3 text-[14px]">
              Deploy Project
            </button>
          </form>
        </div>
      </div>
    </ViewFade>
  );
}