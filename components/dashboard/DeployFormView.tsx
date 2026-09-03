"use client";

import * as React from "react";
import { Eye, EyeOff, FolderGit2, KeyRound, Settings2, KeyRound as EnvIcon } from "lucide-react";
import { ViewFade } from "@/components/ui/ViewFade";
import { TokenHelp } from "@/components/ui/TokenHelp";
import { EnvValidationSummary } from "@/components/ui/EnvValidationSummary";
import { cn } from "@/lib/utils";
import { useDeploy } from "@/lib/deploy-context";
import { parseAndValidateEnvText } from "@/lib/env-validate";
import type { Platform } from "@/types";

const PLATFORMS: { id: Platform; label: string }[] = [
  { id: "vercel", label: "Vercel" },
  { id: "cloudflare", label: "Cloudflare Pages" },
  { id: "railway", label: "Railway" },
  { id: "render", label: "Render" },
];

const PLATFORM_SUBTITLE: Record<Platform, string> = {
  vercel: "Import repository dan deploy ke Vercel dalam satu klik.",
  cloudflare: "Import repository dan deploy ke Cloudflare Pages dalam satu klik.",
  railway: "Import repository dan deploy ke Railway dalam satu klik.",
  render: "Import repository dan deploy ke Render dalam satu klik.",
};

const inputCls =
  "h-11 w-full rounded-xl border border-[#2A2D3A] bg-[#0E101A] px-3.5 text-[13px] text-white placeholder:text-white/30 outline-none transition-colors focus:border-violet-500/50 disabled:opacity-50";
const textareaCls =
  "w-full resize-none rounded-xl border border-[#2A2D3A] bg-[#0E101A] px-3.5 py-2.5 text-[13px] text-white placeholder:text-white/30 outline-none transition-colors focus:border-violet-500/50 mono";
const labelCls = "block text-[12px] font-medium text-white/55 mb-1.5";

/* ------------------------------------------------------------------ */
/*  Small reusable field primitives                                    */
/* ------------------------------------------------------------------ */

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-white/35">
      <Icon size={13} />
      {title}
    </div>
  );
}

function Field({
  id,
  label,
  required,
  optional,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className={labelCls}>
        {label} {required && <span className="text-red-400">*</span>}
        {optional && <span className="text-white/35">(opsional)</span>}
      </label>
      {children}
    </div>
  );
}

/** Password-style token input with a show/hide toggle, plus an optional "how do I get this?" guide. */
function TokenField({
  id,
  label,
  value,
  onChange,
  helpSteps,
  helpHref,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  helpSteps?: string[];
  helpHref?: string;
}) {
  const [visible, setVisible] = React.useState(false);
  return (
    <div>
      <label htmlFor={id} className={labelCls}>
        {label} <span className="text-red-400">*</span>
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          required
          placeholder="••••••••••••••••"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(inputCls, "pr-11")}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? `Sembunyikan ${label}` : `Tampilkan ${label}`}
          className="absolute right-2 top-1/2 -translate-y-1/2 grid h-7 w-7 place-items-center rounded-full text-white/40 hover:bg-white/5 hover:text-white/80"
        >
          {visible ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
      {helpSteps && helpHref && <TokenHelp steps={helpSteps} href={helpHref} />}
    </div>
  );
}

/** `KEY=value` textarea with live parsing/validation feedback. */
function EnvTextField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { issues, entries } = React.useMemo(() => parseAndValidateEnvText(value), [value]);
  return (
    <Field id="envText" label="Environment Variables" optional>
      <textarea
        id="envText"
        rows={4}
        placeholder={"KEY=value\nANOTHER_KEY=value"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={textareaCls}
      />
      <p className="mt-1.5 text-[11px] text-white/35">Satu variable per baris, format KEY=value.</p>
      {value.trim() && <EnvValidationSummary issues={issues} validCount={entries.length} />}
    </Field>
  );
}

/* ------------------------------------------------------------------ */
/*  Token acquisition guides, in Indonesian, per platform              */
/* ------------------------------------------------------------------ */

const VERCEL_TOKEN_STEPS = [
  "Login ke akun Vercel kamu di vercel.com.",
  'Buka menu Settings, lalu pilih tab "Tokens" (atau langsung ke vercel.com/account/tokens).',
  'Klik "Create Token", kasih nama bebas — misalnya "depush".',
  'Atur scope & expiration sesuai kebutuhan, lalu klik "Create".',
  "Salin token yang muncul (hanya ditampilkan sekali) dan tempel di field ini.",
];

const GITHUB_PAT_STEPS = [
  "Login ke GitHub, buka Settings akun (bukan settings repo).",
  '(Buka Developer settings, lalu pilih "Personal access tokens".',
  'Klik "Generate new token" — pilih "Tokens (classic)" biar simpel.',
  'Centang scope "repo" supaya Depush bisa akses repo private kamu.',
  "Klik Generate, lalu salin tokennya (hanya ditampilkan sekali) dan tempel di sini.",
];

const CLOUDFLARE_TOKEN_STEPS = [
  "Login ke dashboard Cloudflare.",
  '"Buka My Profile → API Tokens.',
  'Klik "Create Token", pakai template "Edit Cloudflare Workers" atau custom dengan permission Pages: Edit.',
  'Klik "Continue to summary" lalu "Create Token".',
  "Salin token yang muncul dan tempel di field ini.",
];

const RAILWAY_TOKEN_STEPS = [
  "Login ke railway.app, buka Account Settings.",
  'Buka tab "Tokens", klik "Create Token".',
  "Kasih nama bebas untuk token ini.",
  "Salin token yang muncul dan tempel di field ini.",
];

const RENDER_TOKEN_STEPS = [
  "Login ke dashboard.render.com.",
  'Klik avatar kamu di kanan atas → "Account Settings".',
  'Buka tab "API Keys", klik "Create API Key".',
  "Salin key yang muncul dan tempel di field ini.",
];

export function DeployFormView() {
  const { form, setFormField, submitDeploy } = useDeploy();
  const [platform, setPlatform] = React.useState<Platform>(form.platform || "cloudflare");

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
                    ? "border-violet-500/50 bg-violet-500/15 text-white"
                    : "border-[#2A2D3A] bg-[#0E101A] text-white/55 hover:text-white/80"
                )}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        <div className="rounded-2xl border border-[#2A2D3A] bg-[#13151F] p-6 sm:p-8">
          <h2 className="text-[20px] font-semibold mb-1 text-white">Deploy Project</h2>
          <p className="text-[13px] text-white/55 mb-6">{PLATFORM_SUBTITLE[platform]}</p>

          <form id="deployForm" onSubmit={submitDeploy} className="space-y-7">
            {platform === "vercel" && (
              <>
                <section className="space-y-4">
                  <SectionHeader icon={FolderGit2} title="Source" />
                  <Field id="projectName" label="Nama Project" required>
                    <input
                      id="projectName"
                      type="text"
                      required
                      placeholder="acme-storefront"
                      value={form.projectName}
                      onChange={(e) => setFormField("projectName", e.target.value)}
                      className={inputCls}
                    />
                  </Field>
                  <Field id="githubUrl" label="GitHub URL" required>
                    <input
                      id="githubUrl"
                      type="text"
                      required
                      placeholder="https://github.com/username/repo"
                      value={form.githubUrl}
                      onChange={(e) => setFormField("githubUrl", e.target.value)}
                      className={cn(inputCls, "mono")}
                    />
                  </Field>
                </section>

                <section className="space-y-4 border-t border-[#2A2D3A] pt-6">
                  <SectionHeader icon={KeyRound} title="Kredensial" />
                  <TokenField
                    id="platformToken"
                    label="Vercel Token"
                    value={form.platformToken}
                    onChange={(v) => setFormField("platformToken", v)}
                    helpSteps={VERCEL_TOKEN_STEPS}
                    helpHref="https://vercel.com/account/tokens"
                  />
                  <div>
                    <label htmlFor="githubPat" className={labelCls}>
                      GitHub Token <span className="text-white/35">(opsional, wajib jika repo private)</span>
                    </label>
                    <input
                      id="githubPat"
                      type="password"
                      placeholder="ghp_••••••••••••••••"
                      value={form.githubPat}
                      onChange={(e) => setFormField("githubPat", e.target.value)}
                      className={inputCls}
                    />
                    <TokenHelp
                      label="Cara bikin GitHub Token?"
                      steps={GITHUB_PAT_STEPS}
                      href="https://github.com/settings/tokens"
                    />
                  </div>
                </section>
              </>
            )}

            {platform === "cloudflare" && (
              <>
                <section className="space-y-4">
                  <SectionHeader icon={FolderGit2} title="Source" />
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field id="projectName" label="Nama Project" required>
                      <input
                        id="projectName"
                        type="text"
                        required
                        placeholder="acme-storefront"
                        value={form.projectName}
                        onChange={(e) => setFormField("projectName", e.target.value)}
                        className={inputCls}
                      />
                    </Field>
                    <Field id="platformDisplay" label="Platform">
                      <input id="platformDisplay" type="text" disabled value="Cloudflare Pages" className={inputCls} />
                    </Field>
                  </div>
                  <Field id="githubUrl" label="GitHub URL" required>
                    <input
                      id="githubUrl"
                      type="text"
                      required
                      placeholder="https://github.com/username/repo"
                      value={form.githubUrl}
                      onChange={(e) => setFormField("githubUrl", e.target.value)}
                      className={cn(inputCls, "mono")}
                    />
                  </Field>
                  <Field id="domain" label="Custom Domain" optional>
                    <input
                      id="domain"
                      type="text"
                      placeholder="app.namadomain.com"
                      value={form.domain}
                      onChange={(e) => setFormField("domain", e.target.value)}
                      className={inputCls}
                    />
                  </Field>
                </section>

                <section className="space-y-4 border-t border-[#2A2D3A] pt-6">
                  <SectionHeader icon={KeyRound} title="Kredensial" />
                  <TokenField
                    id="platformToken"
                    label="Cloudflare Token"
                    value={form.platformToken}
                    onChange={(v) => setFormField("platformToken", v)}
                    helpSteps={CLOUDFLARE_TOKEN_STEPS}
                    helpHref="https://dash.cloudflare.com/profile/api-tokens"
                  />
                  <Field id="accountId" label="Account ID" required>
                    <input
                      id="accountId"
                      type="text"
                      required
                      placeholder="a1b2c3d4e5f6..."
                      value={form.accountId}
                      onChange={(e) => setFormField("accountId", e.target.value)}
                      className={cn(inputCls, "mono")}
                    />
                  </Field>
                </section>

                <section className="space-y-4 border-t border-[#2A2D3A] pt-6">
                  <SectionHeader icon={Settings2} title="Konfigurasi Build (opsional)" />
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field id="buildCommand" label="Build Command" optional>
                      <input
                        id="buildCommand"
                        type="text"
                        placeholder="npm run build"
                        value={form.buildCommand}
                        onChange={(e) => setFormField("buildCommand", e.target.value)}
                        className={cn(inputCls, "mono")}
                      />
                    </Field>
                    <Field id="outputDir" label="Output Dir" optional>
                      <input
                        id="outputDir"
                        type="text"
                        placeholder="dist"
                        value={form.outputDir}
                        onChange={(e) => setFormField("outputDir", e.target.value)}
                        className={cn(inputCls, "mono")}
                      />
                    </Field>
                  </div>
                </section>
              </>
            )}

            {platform === "railway" && (
              <>
                <section className="space-y-4">
                  <SectionHeader icon={FolderGit2} title="Source" />
                  <Field id="projectName" label="Nama Project" required>
                    <input
                      id="projectName"
                      type="text"
                      required
                      placeholder="acme-storefront"
                      value={form.projectName}
                      onChange={(e) => setFormField("projectName", e.target.value)}
                      className={inputCls}
                    />
                  </Field>
                  <Field id="githubUrl" label="GitHub URL" required>
                    <input
                      id="githubUrl"
                      type="text"
                      required
                      placeholder="https://github.com/username/repo"
                      value={form.githubUrl}
                      onChange={(e) => setFormField("githubUrl", e.target.value)}
                      className={cn(inputCls, "mono")}
                    />
                  </Field>
                </section>

                <section className="space-y-4 border-t border-[#2A2D3A] pt-6">
                  <SectionHeader icon={KeyRound} title="Kredensial" />
                  <TokenField
                    id="platformToken"
                    label="Railway Token"
                    value={form.platformToken}
                    onChange={(v) => setFormField("platformToken", v)}
                    helpSteps={RAILWAY_TOKEN_STEPS}
                    helpHref="https://railway.app/account/tokens"
                  />
                </section>

                <section className="space-y-4 border-t border-[#2A2D3A] pt-6">
                  <SectionHeader icon={Settings2} title="Konfigurasi Build (opsional)" />
                  <Field id="startCommand" label="Start Command" optional>
                    <input
                      id="startCommand"
                      type="text"
                      placeholder="npm start"
                      value={form.startCommand}
                      onChange={(e) => setFormField("startCommand", e.target.value)}
                      className={cn(inputCls, "mono")}
                    />
                  </Field>
                </section>

                <section className="space-y-4 border-t border-[#2A2D3A] pt-6">
                  <SectionHeader icon={EnvIcon} title="Environment Variables" />
                  <EnvTextField value={form.envText} onChange={(v) => setFormField("envText", v)} />
                </section>
              </>
            )}

            {platform === "render" && (
              <>
                <section className="space-y-4">
                  <SectionHeader icon={FolderGit2} title="Source" />
                  <Field id="projectName" label="Nama Project" required>
                    <input
                      id="projectName"
                      type="text"
                      required
                      placeholder="acme-storefront"
                      value={form.projectName}
                      onChange={(e) => setFormField("projectName", e.target.value)}
                      className={inputCls}
                    />
                  </Field>
                  <Field id="githubUrl" label="GitHub URL" required>
                    <input
                      id="githubUrl"
                      type="text"
                      required
                      placeholder="https://github.com/username/repo"
                      value={form.githubUrl}
                      onChange={(e) => setFormField("githubUrl", e.target.value)}
                      className={cn(inputCls, "mono")}
                    />
                  </Field>
                </section>

                <section className="space-y-4 border-t border-[#2A2D3A] pt-6">
                  <SectionHeader icon={KeyRound} title="Kredensial" />
                  <TokenField
                    id="platformToken"
                    label="Render API Key"
                    value={form.platformToken}
                    onChange={(v) => setFormField("platformToken", v)}
                    helpSteps={RENDER_TOKEN_STEPS}
                    helpHref="https://dashboard.render.com/u/settings#api-keys"
                  />
                </section>

                <section className="space-y-4 border-t border-[#2A2D3A] pt-6">
                  <SectionHeader icon={Settings2} title="Konfigurasi Build (opsional)" />
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field id="buildCommand" label="Build Command" optional>
                      <input
                        id="buildCommand"
                        type="text"
                        placeholder="npm run build"
                        value={form.buildCommand}
                        onChange={(e) => setFormField("buildCommand", e.target.value)}
                        className={cn(inputCls, "mono")}
                      />
                    </Field>
                    <Field id="startCommand" label="Start Command" optional>
                      <input
                        id="startCommand"
                        type="text"
                        placeholder="npm start"
                        value={form.startCommand}
                        onChange={(e) => setFormField("startCommand", e.target.value)}
                        className={cn(inputCls, "mono")}
                      />
                    </Field>
                  </div>
                </section>
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
