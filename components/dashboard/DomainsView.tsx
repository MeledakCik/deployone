"use client";

import * as React from "react";
import { Globe2, Plus, Trash2, X } from "lucide-react";
import { Surface } from "@/components/ui/Surface";
import { ViewFade } from "@/components/ui/ViewFade";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDeploy } from "@/lib/deploy-context";
import { useToast } from "@/components/ui/Toast";

function useProjectNames() {
  const { history } = useDeploy();
  return React.useMemo(() => Array.from(new Set(history.map((h) => h.name))), [history]);
}

function AddDomainModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addDomain } = useDeploy();
  const { showToast } = useToast();
  const projectNames = useProjectNames();
  const [domain, setDomain] = React.useState("");
  const [project, setProject] = React.useState(projectNames[0] ?? "");

  React.useEffect(() => {
    if (open) setProject(projectNames[0] ?? "");
  }, [open, projectNames]);

  if (!open) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!domain.trim()) {
      showToast("Masukkan nama domain terlebih dahulu");
      return;
    }
    if (!project) {
      showToast("Pilih project untuk domain ini");
      return;
    }
    addDomain(domain.trim(), project);
    setDomain("");
    onClose();
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
            {projectNames.length === 0 ? (
              <p className="input-solid h-11 flex items-center px-3.5 text-[13px] text-text-faint">
                Belum ada project
              </p>
            ) : (
              <Select value={project} onValueChange={setProject}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Project" />
                </SelectTrigger>
                <SelectContent>
                  {projectNames.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <button type="submit" className="btn-primary w-full py-2.5 text-[13px]">
            Tambah Domain
          </button>
        </form>
      </Surface>
    </div>
  );
}

export function DomainsView() {
  const { domains, removeDomain } = useDeploy();
  const [modalOpen, setModalOpen] = React.useState(false);

  return (
    <ViewFade>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-[22px] font-semibold">Domains</h2>
            <p className="text-[13px] text-text-muted">Kelola custom domain untuk project kamu.</p>
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
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-0.5 text-[11px] font-medium ${
                          d.status === "Active"
                            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                            : "border-amber-500/20 bg-amber-500/10 text-amber-400"
                        }`}
                      >
                        {d.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => removeDomain(d.id)}
                        aria-label={`Hapus ${d.domain}`}
                        className="pill inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-medium text-red-400 hover:brightness-110"
                      >
                        <Trash2 size={12} /> Hapus
                      </button>
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
