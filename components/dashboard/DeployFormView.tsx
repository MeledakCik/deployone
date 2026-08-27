"use client";

import { GlassPanel } from "@/components/ui/GlassPanel";
import { useDeploy } from "@/lib/deploy-context";

export function DeployFormView() {
  const { form, setFormField, submitDeploy, platformTokenLabel } = useDeploy();

  return (
    <GlassPanel className="mx-auto max-w-2xl p-6 sm:p-8">
      <h2 className="text-[20px] font-semibold mb-1">Deploy Project</h2>
      <p className="text-[13px] text-text-muted mb-6">
        Import repository dan deploy ke edge network dalam satu klik.
      </p>

      <form id="deployForm" onSubmit={submitDeploy} className="space-y-5">
        <div>
          <label htmlFor="projectName" className="block text-[12px] font-medium text-text-muted mb-1.5">
            Nama Project
          </label>
          <input
            id="projectName"
            name="projectName"
            type="text"
            placeholder="acme-storefront"
            value={form.projectName}
            onChange={(e) => setFormField("projectName", e.target.value)}
            className="input-glass w-full px-3.5 py-2.5 text-[13px]"
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="platform" className="block text-[12px] font-medium text-text-muted mb-1.5">
              Platform
            </label>
            <select
              id="platform"
              name="platform"
              value={form.platform}
              onChange={(e) => setFormField("platform", e.target.value as "vercel" | "cloudflare")}
              className="input-glass w-full px-3.5 py-2.5 text-[13px]"
            >
              <option value="vercel">Vercel</option>
              <option value="cloudflare">Cloudflare Pages</option>
            </select>
          </div>
          <div>
            <label htmlFor="domain" className="block text-[12px] font-medium text-text-muted mb-1.5">
              Custom Domain <span className="text-text-faint">(opsional)</span>
            </label>
            <input
              id="domain"
              name="domain"
              type="text"
              placeholder="app.namadomain.com"
              value={form.domain}
              onChange={(e) => setFormField("domain", e.target.value)}
              className="input-glass w-full px-3.5 py-2.5 text-[13px]"
            />
          </div>
        </div>

        <div>
          <label id="platformTokenLabel" htmlFor="platformToken" className="block text-[12px] font-medium text-text-muted mb-1.5">
            {platformTokenLabel}
          </label>
          <input
            id="platformToken"
            name="platformToken"
            type="password"
            placeholder="••••••••••••••••"
            value={form.platformToken}
            onChange={(e) => setFormField("platformToken", e.target.value)}
            className="input-glass w-full px-3.5 py-2.5 text-[13px]"
          />
        </div>

        <div>
          <label htmlFor="githubToken" className="block text-[12px] font-medium text-text-muted mb-1.5">
            GitHub Repository URL
          </label>
          <input
            id="githubToken"
            name="githubToken"
            type="text"
            placeholder="https://github.com/username/repo"
            value={form.githubToken}
            onChange={(e) => setFormField("githubToken", e.target.value)}
            className="input-glass w-full px-3.5 py-2.5 text-[13px] mono"
          />
        </div>

        <div>
          <label htmlFor="note" className="block text-[12px] font-medium text-text-muted mb-1.5">
            Catatan <span className="text-text-faint">(opsional)</span>
          </label>
          <textarea
            id="note"
            name="note"
            rows={3}
            placeholder="Deploy production release v1.2.0"
            value={form.note}
            onChange={(e) => setFormField("note", e.target.value)}
            className="input-glass w-full resize-none px-3.5 py-2.5 text-[13px]"
          />
        </div>

        <button type="submit" className="btn-primary w-full py-3 text-[14px]">
          Deploy Project
        </button>
      </form>
    </GlassPanel>
  );
}
