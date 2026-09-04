"use client";

import * as React from "react";
import { HelpCircle } from "lucide-react";
import { ViewFade } from "@/components/ui/ViewFade";
import { cn } from "@/lib/utils";
import { useDeploy } from "@/lib/deploy-context";
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
              </>
            )}

            {platform === "cloudflare" && (
              <>
                <div className="grid gap-5 sm:grid-cols-2">
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
                    <FieldLabel htmlFor="platformDisplay">Platform</FieldLabel>
                    <input
                      id="platformDisplay"
                      type="text"
                      disabled
                      value="Cloudflare Pages"
                      className={inputCls}
                    />
                  </div>
                </div>

                <div>
                  <FieldLabel htmlFor="domain" optional>
                    Custom Domain
                  </FieldLabel>
                  <input
                    id="domain"
                    type="text"
                    placeholder="app.namadomain.com"
                    value={form.domain}
                    onChange={(e) => setFormField("domain", e.target.value)}
                    className={inputCls}
                  />
                </div>

                <div>
                  <FieldLabel htmlFor="platformToken" required>
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
                </div>

                <div>
                  <FieldLabel htmlFor="accountId" required>
                    Account ID
                  </FieldLabel>
                  <input
                    id="accountId"
                    type="text"
                    required
                    placeholder="a1b2c3d4e5f6..."
                    value={form.accountId}
                    onChange={(e) => setFormField("accountId", e.target.value)}
                    className={cn(inputCls, "mono")}
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
                    <FieldLabel htmlFor="outputDir" optional>
                      Output Dir
                    </FieldLabel>
                    <input
                      id="outputDir"
                      type="text"
                      placeholder="dist"
                      value={form.outputDir}
                      onChange={(e) => setFormField("outputDir", e.target.value)}
                      className={cn(inputCls, "mono")}
                    />
                  </div>
                </div>
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
