"use client";

import * as React from "react";
import { KeyRound, Plus, Trash2, Eye, EyeOff, Info, X } from "lucide-react";
import { Surface } from "@/components/ui/Surface";
import { ViewFade } from "@/components/ui/ViewFade";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDeploy } from "@/lib/deploy-context";
import { useToast } from "@/components/ui/Toast";

function useVercelProjectNames() {
  const { history } = useDeploy();
  return React.useMemo(
    () => Array.from(new Set(history.filter((h) => h.platform === "vercel").map((h) => h.name))),
    [history]
  );
}

function AddSecretModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addEnvVar, vercelToken } = useDeploy();
  const { showToast } = useToast();
  const projectNames = useVercelProjectNames();
  const [key, setKey] = React.useState("");
  const [value, setValue] = React.useState("");
  const [environment, setEnvironment] = React.useState<"Production" | "Preview">("Production");
  const [project, setProject] = React.useState(projectNames[0] ?? "");
  const [pushToVercel, setPushToVercel] = React.useState(true);

  React.useEffect(() => {
    if (open) setProject(projectNames[0] ?? "");
  }, [open, projectNames]);

  if (!open) return null;

  const canPush = Boolean(vercelToken) && projectNames.length > 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!key.trim() || !value.trim()) {
      showToast("Key dan value tidak boleh kosong");
      return;
    }
    addEnvVar(key.trim(), value.trim(), environment, {
      project: canPush && pushToVercel ? project : undefined,
      pushToVercel: canPush && pushToVercel,
    });
    setKey("");
    setValue("");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4">
      <Surface className="w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[15px] font-semibold">Tambah Secret</h3>
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
            <label htmlFor="envKey" className="block text-[12px] font-medium text-text-muted mb-1.5">
              Key
            </label>
            <input
              id="envKey"
              type="text"
              autoFocus
              placeholder="DATABASE_URL"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              className="input-solid mono h-11 w-full px-3.5 text-[13px]"
            />
          </div>
          <div>
            <label htmlFor="envValue" className="block text-[12px] font-medium text-text-muted mb-1.5">
              Value
            </label>
            <input
              id="envValue"
              type="text"
              placeholder="postgres://..."
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="input-solid mono h-11 w-full px-3.5 text-[13px]"
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-text-muted mb-1.5">Environment</label>
            <Select value={environment} onValueChange={(v) => setEnvironment(v as "Production" | "Preview")}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih Environment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Production">Production</SelectItem>
                <SelectItem value="Preview">Preview</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {canPush ? (
            <div className="space-y-2 rounded-2xl border border-[var(--surface-line)] p-3.5">
              <label className="flex items-center gap-2.5 text-[12.5px] font-medium">
                <input
                  type="checkbox"
                  checked={pushToVercel}
                  onChange={(e) => setPushToVercel(e.target.checked)}
                  className="h-4 w-4 accent-violet-500"
                />
                Push otomatis ke project Vercel
              </label>
              {pushToVercel && (
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
          ) : (
            <p className="text-[11.5px] text-text-faint">
              {vercelToken
                ? "Belum ada project Vercel untuk di-push — secret akan disimpan lokal saja."
                : "Isi Vercel Token di Settings untuk push otomatis ke Vercel."}
            </p>
          )}

          <button type="submit" className="btn-primary w-full py-2.5 text-[13px]">
            Simpan Secret
          </button>
        </form>
      </Surface>
    </div>
  );
}

export function EnvironmentView() {
  const { envVars, removeEnvVar, toggleEnvVisible } = useDeploy();
  const [modalOpen, setModalOpen] = React.useState(false);

  return (
    <ViewFade>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-[22px] font-semibold">Environment Variables</h2>
            <p className="text-[13px] text-text-muted">Simpan secret untuk di-inject ke build kamu.</p>
          </div>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-[13px]"
          >
            <Plus size={15} /> Add Secret
          </button>
        </div>

        <Surface className="flex items-start gap-3 px-5 py-4">
          <Info size={16} className="mt-0.5 shrink-0 text-violet-400" />
          <p className="text-[12.5px] leading-relaxed text-text-muted">
            Fitur injeksi <span className="mono">.env</span> saat build — semua secret di sini otomatis
            tersedia sebagai environment variable pada proses build & runtime project kamu.
          </p>
        </Surface>

        {envVars.length === 0 ? (
          <Surface className="flex flex-col items-center justify-center gap-3 px-6 py-24 text-center">
            <KeyRound size={52} className="text-text-faint" strokeWidth={1.5} />
            <h3 className="text-[16px] font-semibold">Belum ada secret</h3>
            <p className="max-w-xs text-[13px] text-text-muted">
              Tambahkan environment variable pertamamu untuk digunakan saat deploy.
            </p>
          </Surface>
        ) : (
          <Surface className="overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-text-faint">
                  <th className="px-6 py-3 font-medium">Key</th>
                  <th className="px-6 py-3 font-medium">Value</th>
                  <th className="px-6 py-3 font-medium">Environment</th>
                  <th className="px-6 py-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {envVars.map((item) => (
                  <tr
                    key={item.id}
                    className="surface-solid-row border-b last:border-0 transition-colors"
                    style={{ borderColor: "var(--surface-line)" }}
                  >
                    <td className="px-6 py-4 mono text-[13px] font-medium">{item.key}</td>
                    <td className="px-6 py-4 mono text-[12px] text-text-muted">
                      {item.visible ? item.value : "•".repeat(Math.min(item.value.length, 14) || 8)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="pill px-2.5 py-0.5 text-[11px] font-medium">{item.environment}</span>
                      {item.syncedProject && (
                        <span className="ml-1.5 inline-flex items-center gap-1 rounded-pill border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10.5px] font-medium text-emerald-400">
                          ✓ Vercel
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => toggleEnvVisible(item.id)}
                          aria-label={item.visible ? "Sembunyikan value" : "Tampilkan value"}
                          className="pill inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-medium hover:brightness-110"
                        >
                          {item.visible ? <EyeOff size={12} /> : <Eye size={12} />}
                          {item.visible ? "Hide" : "Show"}
                        </button>
                        <button
                          type="button"
                          onClick={() => removeEnvVar(item.id)}
                          aria-label={`Hapus ${item.key}`}
                          className="pill inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-medium text-red-400 hover:brightness-110"
                        >
                          <Trash2 size={12} />
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

      <AddSecretModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </ViewFade>
  );
}
