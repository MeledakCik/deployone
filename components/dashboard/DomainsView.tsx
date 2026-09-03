"use client";

import * as React from "react";
import { Globe2, Plus, Trash2, X, RefreshCw, AlertTriangle, Loader2 } from "lucide-react";
import { Surface } from "@/components/ui/Surface";
import { ViewFade } from "@/components/ui/ViewFade";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDeploy } from "@/lib/deploy-context";
import { useToast } from "@/components/ui/Toast";
import type { Platform } from "@/types";

function useProjects() {
  const { history } = useDeploy();
  return React.useMemo(() => {
    const map = new Map<string, Platform>();
    history.forEach((h) => {
      if (!map.has(h.name)) map.set(h.name, h.platform);
    });
    return Array.from(map.entries()).map(([name, platform]) => ({ name, platform }));
  }, [history]);
}

function AddDomainModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addDomain, settingsTokens } = useDeploy();
  const { showToast } = useToast();
  const projects = useProjects();
  const [domain, setDomain] = React.useState("");
  const [project, setProject] = React.useState(projects[0]?.name ?? "");
  const [vercelToken, setVercelToken] = React.useState(settingsTokens.vercelToken);
  const [submitting, setSubmitting] = React.useState(false);

  const selectedPlatform = projects.find((p) => p.name === project)?.platform;
  const isVercel = selectedPlatform === "vercel";

  React.useEffect(() => {
    if (open) {
      setProject(projects[0]?.name ?? "");
      setVercelToken(settingsTokens.vercelToken);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!domain.trim()) {
      showToast("Masukkan nama domain terlebih dahulu");
      return;
    }
    if (!project) {
      showToast("Pilih project untuk domain ini");
      return;
    }
    if (isVercel && !vercelToken.trim()) {
      showToast("Isi Vercel Token supaya domain bisa langsung dipasang ke project-nya");
      return;
    }

    setSubmitting(true);
    try {
      await addDomain(domain.trim(), project, isVercel ? vercelToken.trim() : undefined);
      setDomain("");
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4">
      <Surface className="w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[15px] font-semibold">Tambah Domain</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="grid h-8 w-8 place-items-center rounded-full hover:bg-[var(--row-hover)]"
          >
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="newDomain" className="block text-[12px] font-medium text-text-muted mb-1.5">
              Domain
            </label>
            <input
              id="newDomain"
              type="text"
              autoFocus
              placeholder="app.namadomain.com"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="input-solid h-11 w-full px-3.5 text-[13px] mono"
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-text-muted mb-1.5">Project</label>
            {projects.length === 0 ? (
              <p className="input-solid h-11 flex items-center px-3.5 text-[13px] text-text-faint">
                Belum ada project
              </p>
            ) : (
              <Select value={project} onValueChange={setProject}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.name} value={p.name}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {isVercel && (
            <div>
              <label htmlFor="domainVercelToken" className="block text-[12px] font-medium text-text-muted mb-1.5">
                Vercel Token
              </label>
              <input
                id="domainVercelToken"
                type="password"
                placeholder="••••••••••••••••"
                value={vercelToken}
                onChange={(e) => setVercelToken(e.target.value)}
                className="input-solid h-11 w-full px-3.5 text-[13px]"
              />
              <p className="mt-1.5 text-[11px] text-text-faint">
                Dipakai buat memasang domain ini langsung ke project di akun Vercel kamu.
                {settingsTokens.vercelToken && " Terisi otomatis dari Settings."}
              </p>
            </div>
          )}

          <button type="submit" disabled={submitting} className="btn-primary w-full py-2.5 text-[13px] disabled:opacity-60">
            {submitting ? "Menambahkan..." : "Tambah Domain"}
          </button>
        </form>
      </Surface>
    </div>
  );
}

function DomainStatusCell({
  status,
  misconfigured,
}: {
  status: "Active" | "Pending";
  misconfigured?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span
        className={`inline-flex w-fit items-center gap-1.5 rounded-pill border px-2.5 py-0.5 text-[11px] font-medium ${
          status === "Active"
            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
            : "border-amber-500/20 bg-amber-500/10 text-amber-400"
        }`}
      >
        {status}
      </span>
      {misconfigured && (
        <span className="inline-flex items-center gap-1 text-[10.5px] text-red-400">
          <AlertTriangle size={10} /> DNS salah arah
        </span>
      )}
    </div>
  );
}

export function DomainsView() {
  const { domains, removeDomain, refreshDomainStatus, settingsTokens } = useDeploy();
  const [modalOpen, setModalOpen] = React.useState(false);
  const [checkingId, setCheckingId] = React.useState<string | null>(null);

  async function handleCheck(id: string) {
    if (!settingsTokens.vercelToken) return;
    setCheckingId(id);
    try {
      await refreshDomainStatus(id, settingsTokens.vercelToken);
    } finally {
      setCheckingId(null);
    }
  }

  return (
    <ViewFade>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-[22px] font-semibold">Domains</h2>
            <p className="text-[13px] text-text-muted">
              Kelola custom domain untuk project kamu — domain di project Vercel langsung terhubung ke akun Vercel-mu.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-[13px]"
          >
            <Plus size={15} /> Add Domain
          </button>
        </div>

        {domains.length === 0 ? (
          <Surface className="flex flex-col items-center justify-center gap-3 px-6 py-24 text-center">
            <Globe2 size={52} className="text-text-faint" strokeWidth={1.5} />
            <h3 className="text-[16px] font-semibold">Belum ada domain</h3>
            <p className="max-w-xs text-[13px] text-text-muted">
              Tambahkan custom domain dan arahkan DNS kamu ke project Depush.
            </p>
          </Surface>
        ) : (
          <Surface className="overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-text-faint">
                  <th className="px-6 py-3 font-medium">Domain</th>
                  <th className="px-6 py-3 font-medium">Project</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {domains.map((d) => (
                  <tr
                    key={d.id}
                    className="surface-solid-row border-b last:border-0 transition-colors"
                    style={{ borderColor: "var(--surface-line)" }}
                  >
                    <td className="px-6 py-4 mono text-[13px]">{d.domain}</td>
                    <td className="px-6 py-4 text-[12px] text-text-muted">{d.project}</td>
                    <td className="px-6 py-4">
                      <DomainStatusCell status={d.status} misconfigured={d.misconfigured} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {d.platform === "vercel" && (
                          <button
                            type="button"
                            onClick={() => handleCheck(d.id)}
                            disabled={!settingsTokens.vercelToken || checkingId === d.id}
                            title={!settingsTokens.vercelToken ? "Isi Vercel Token di Settings dulu" : undefined}
                            className="pill inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-medium hover:brightness-110 disabled:opacity-50"
                          >
                            {checkingId === d.id ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <RefreshCw size={12} />
                            )}
                            Cek Status
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => removeDomain(d.id, settingsTokens.vercelToken || undefined)}
                          aria-label={`Hapus ${d.domain}`}
                          className="pill inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-medium text-red-400 hover:brightness-110"
                        >
                          <Trash2 size={12} /> Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Surface>
        )}
      </div>

      <AddDomainModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </ViewFade>
  );
}
