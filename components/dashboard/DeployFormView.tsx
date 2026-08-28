"use client";

import * as React from "react";
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

const inputCls =
  "h-11 w-full rounded-xl border border-[#2A2D3A] bg-[#0E101A] px-3.5 text-[13px] text-white placeholder:text-white/30 outline-none transition-colors focus:border-violet-500/50 disabled:opacity-50";
const textareaCls =
  "w-full resize-none rounded-xl border border-[#2A2D3A] bg-[#0E101A] px-3.5 py-2.5 text-[13px] text-white placeholder:text-white/30 outline-none transition-colors focus:border-violet-500/50 mono";
const labelCls = "block text-[12px] font-medium text-white/55 mb-1.5";

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

          <form id="deployForm" onSubmit={submitDeploy} className="space-y-5">
            {platform === "vercel" && (
              <>
                <div>
                  <label htmlFor="projectName" className={labelCls}>
                    Nama Project <span className="text-red-400">*</span>
                  </label>
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
                  <label htmlFor="githubUrl" className={labelCls}>
                    GitHub URL <span className="text-red-400">*</span>
                  </label>
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
                  <label htmlFor="platformToken" className={labelCls}>
                    Vercel Token <span className="text-red-400">*</span>
                  </label>
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
                  <label htmlFor="githubPat" className={labelCls}>
                    GitHub Token <span className="text-white/35">(opsional)</span>
                  </label>
                  <input
                    id="githubPat"
                    type="password"
                    placeholder="ghp_••••••••••••••••"
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
                    <label htmlFor="projectName" className={labelCls}>
                      Nama Project <span className="text-red-400">*</span>
                    </label>
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
                    <label htmlFor="platformDisplay" className={labelCls}>
                      Platform
                    </label>
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
                  <label htmlFor="domain" className={labelCls}>
                    Custom Domain <span className="text-white/35">(opsional)</span>
                  </label>
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
                  <label htmlFor="platformToken" className={labelCls}>
                    Cloudflare Token <span className="text-red-400">*</span>
                  </label>
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
                  <label htmlFor="accountId" className={labelCls}>
                    Account ID <span className="text-red-400">*</span>
                  </label>
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
                  <label htmlFor="githubUrl" className={labelCls}>
                    GitHub URL <span className="text-red-400">*</span>
                  </label>
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
                    <label htmlFor="buildCommand" className={labelCls}>
                      Build Command <span className="text-white/35">(opsional)</span>
                    </label>
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
                    <label htmlFor="outputDir" className={labelCls}>
                      Output Dir <span className="text-white/35">(opsional)</span>
                    </label>
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
                  <label htmlFor="projectName" className={labelCls}>
                    Nama Project <span className="text-red-400">*</span>
                  </label>
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
                  <label htmlFor="platformToken" className={labelCls}>
                    Railway Token <span className="text-red-400">*</span>
                  </label>
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
                  <label htmlFor="githubUrl" className={labelCls}>
                    GitHub URL <span className="text-red-400">*</span>
                  </label>
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
                  <label htmlFor="startCommand" className={labelCls}>
                    Start Command <span className="text-white/35">(opsional)</span>
                  </label>
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
                  <label htmlFor="envText" className={labelCls}>
                    Environment Variables <span className="text-white/35">(opsional)</span>
                  </label>
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
                  <label htmlFor="projectName" className={labelCls}>
                    Nama Project <span className="text-red-400">*</span>
                  </label>
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
                  <label htmlFor="platformToken" className={labelCls}>
                    Render API Key <span className="text-red-400">*</span>
                  </label>
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
                  <label htmlFor="githubUrl" className={labelCls}>
                    GitHub URL <span className="text-red-400">*</span>
                  </label>
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
                    <label htmlFor="buildCommand" className={labelCls}>
                      Build Command <span className="text-white/35">(opsional)</span>
                    </label>
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
                    <label htmlFor="startCommand" className={labelCls}>
                      Start Command <span className="text-white/35">(opsional)</span>
                    </label>
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
