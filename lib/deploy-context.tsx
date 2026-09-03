"use client";

import * as React from "react";
import { useToast } from "@/components/ui/Toast";
import { resolveDomain, formatDate } from "@/lib/utils";
import { useLocalStorage } from "@/lib/useLocalStorage";
import { parseAndValidateEnvText } from "@/lib/env-validate";
import type {
  ApiResponse,
  CreateDeployResult,
  DashboardView,
  DeployFormValues,
  DeployStatusResult,
  DomainItem,
  EnvItem,
  GithubValidation,
  HistoryItem,
  Platform,
  SettingsTokens,
  SyncStatus,
  VercelDomainResult,
  VercelProjectStatusResult,
} from "@/types";

export const DEPLOY_STEPS = [
  "Menghubungkan ke GitHub",
  "Mengunduh source code",
  "Install dependencies",
  "Build project",
  "Deploy ke edge network",
] as const;

const MAX_HISTORY = 10;
const STEP_INTERVAL_MS = 700;
const FINISH_DELAY_MS = 300;
const POLL_INTERVAL_MS = 2000;

const GITHUB_REPO_RE = /^https:\/\/github\.com\/[^/]+\/[^/]+/;

const DEFAULT_SETTINGS_TOKENS: SettingsTokens = {
  vercelToken: "",
  cloudflareToken: "",
  githubPat: "",
};

/** Small fetch wrapper for our own /api routes — throws with the server's error message. */
async function callApi<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const body = (await res.json().catch(() => null)) as ApiResponse<T> | null;
  if (!body || !body.ok) {
    throw new Error(body?.error ?? `Request gagal (${res.status})`);
  }
  return body.data;
}

const DEFAULT_MODAL_TITLE = "Deploy Project";
const DEFAULT_MODAL_SUBTITLE = "Import repository dan deploy ke edge network dalam satu klik.";

const emptyForm: DeployFormValues = {
  projectName: "",
  platform: "cloudflare",
  domain: "",
  platformToken: "",
  githubUrl: "",
  githubPat: "",
  note: "",
  accountId: "",
  buildCommand: "",
  outputDir: "",
  startCommand: "",
  envText: "",
};

function seedHistory(): HistoryItem[] {
  return [
    {
      id: "seed-3",
      name: "depush-marketing",
      platform: "vercel",
      domain: "depush-marketing.vercel.app",
      date: formatDate(new Date(Date.now() - 1000 * 60 * 60 * 20)),
      status: "ready",
    },
    {
      id: "seed-2",
      name: "docs-portal",
      platform: "cloudflare",
      domain: "docs-portal.pages.dev",
      date: formatDate(new Date(Date.now() - 1000 * 60 * 60 * 44)),
      status: "ready",
    },
    {
      id: "seed-1",
      name: "internal-api-gateway",
      platform: "vercel",
      domain: "internal-api-gateway.vercel.app",
      date: formatDate(new Date(Date.now() - 1000 * 60 * 60 * 70)),
      status: "failed",
    },
  ];
}

interface ModalState {
  open: boolean;
  stepIndex: number; // 0..5, how many of the 5 steps are marked done
  barWidth: number; // 0..100
  title: string;
  subtitle: string;
  resultVisible: boolean;
  closeVisible: boolean;
  result: { name: string; domain: string; inspectorUrl?: string } | null;
  /** Set when a real deploy (Vercel) fails — DeployModal renders this instead of the result block. */
  error: string | null;
}

const defaultModal: ModalState = {
  open: false,
  stepIndex: 0,
  barWidth: 0,
  title: DEFAULT_MODAL_TITLE,
  subtitle: DEFAULT_MODAL_SUBTITLE,
  resultVisible: false,
  closeVisible: false,
  result: null,
  error: null,
};

interface DeployContextValue {
  view: DashboardView;
  setView: (v: DashboardView) => void;
  stats: { total: number; ready: number; failed: number };
  history: HistoryItem[];
  form: DeployFormValues;
  setFormField: <K extends keyof DeployFormValues>(key: K, value: DeployFormValues[K]) => void;
  platformTokenLabel: string;
  modal: ModalState;
  confirmOpen: boolean;
  submitDeploy: (e: React.FormEvent<HTMLFormElement>) => void;
  proceedDeploy: () => void;
  closeConfirm: () => void;
  closeModal: () => void;
  handleCloseAfterDeploy: () => void;
  redeploy: (name: string) => void;
  removeHistoryItem: (name: string) => void;
  // Global tokens saved on the Settings page — used as defaults for sync/domain checks
  settingsTokens: SettingsTokens;
  // Vercel <-> local sync ("kalau di Vercel udah dihapus, di sini otomatis kehapus juga?")
  projectSync: Record<string, SyncStatus>;
  checkProjectStatus: (name: string, vercelToken: string) => Promise<void>;
  // Domains
  domains: DomainItem[];
  addDomain: (domain: string, project: string, vercelToken?: string) => Promise<void>;
  removeDomain: (id: string, vercelToken?: string) => void;
  refreshDomainStatus: (id: string, vercelToken: string) => Promise<void>;
  // Environment variables
  envVars: EnvItem[];
  addEnvVar: (key: string, value: string, environment: "Production" | "Preview") => void;
  removeEnvVar: (id: string) => void;
  toggleEnvVisible: (id: string) => void;
}

const DeployContext = React.createContext<DeployContextValue | null>(null);

export function useDeploy() {
  const ctx = React.useContext(DeployContext);
  if (!ctx) throw new Error("useDeploy must be used within <DeployProvider>");
  return ctx;
}

export function DeployProvider({ children }: { children: React.ReactNode }) {
  const { showToast } = useToast();

  const [view, setView] = React.useState<DashboardView>("dashboard");
  const [stats, setStats] = React.useState({ total: 3, ready: 2, failed: 1 });
  const [history, setHistory] = React.useState<HistoryItem[]>(() => seedHistory());
  const [form, setForm] = React.useState<DeployFormValues>(emptyForm);
  const [modal, setModal] = React.useState<ModalState>(defaultModal);
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  const [domains, setDomains] = useLocalStorage<DomainItem[]>("depush-domains", []);
  const [envVars, setEnvVars] = useLocalStorage<EnvItem[]>("depush-env", []);
  const [settingsTokens] = useLocalStorage<SettingsTokens>(
    "depush-settings-tokens",
    DEFAULT_SETTINGS_TOKENS
  );
  const [projectSync, setProjectSync] = React.useState<Record<string, SyncStatus>>({});

  const pendingFormRef = React.useRef<DeployFormValues | null>(null);
  const intervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  React.useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const setFormField = React.useCallback(
    <K extends keyof DeployFormValues>(key: K, value: DeployFormValues[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const platformTokenLabel = `${form.platform.charAt(0).toUpperCase()}${form.platform.slice(1)} Token`;

  const addHistory = React.useCallback(
    (name: string, platform: Platform, domain: string, status: HistoryItem["status"] = "ready") => {
      const item: HistoryItem = {
        id: `${Date.now()}`,
        name,
        platform,
        domain,
        date: formatDate(new Date()),
        status,
      };
      setHistory((prev) => {
        const next = [item, ...prev];
        // Keep max 10: drop the oldest (last) entry once the cap is exceeded.
        return next.length > MAX_HISTORY ? next.slice(0, MAX_HISTORY) : next;
      });
      setStats((prev) => ({
        ...prev,
        total: prev.total + 1,
        ready: prev.ready + (status === "ready" ? 1 : 0),
        failed: prev.failed + (status === "failed" ? 1 : 0),
      }));
    },
    []
  );

  const finishDeploy = React.useCallback(
    (data: DeployFormValues) => {
      const projectName = (data.projectName || "my-project").trim() || "my-project";
      const domain = resolveDomain(projectName, data.platform);

      setModal((prev) => ({
        ...prev,
        barWidth: 100,
        title: "Deploy Berhasil!",
        subtitle: `Project ${projectName} siap di ${domain}`,
        resultVisible: true,
        closeVisible: true,
        result: { name: projectName, domain },
      }));

      addHistory(projectName, data.platform, domain);
    },
    [addHistory]
  );

  const openModal = React.useCallback(() => {
    setModal({
      open: true,
      stepIndex: 0,
      barWidth: 0,
      title: DEFAULT_MODAL_TITLE,
      subtitle: DEFAULT_MODAL_SUBTITLE,
      resultVisible: false,
      closeVisible: false,
      result: null,
      error: null,
    });
  }, []);

  const failDeploy = React.useCallback(
    (data: DeployFormValues, message: string) => {
      const projectName = (data.projectName || "my-project").trim() || "my-project";
      setModal((prev) => ({
        ...prev,
        title: "Deploy Gagal",
        subtitle: message,
        closeVisible: true,
        error: message,
      }));
      addHistory(projectName, data.platform, "-", "failed");
    },
    [addHistory]
  );

  /** Simulated 5-step progress bar, used for platforms without a real backend yet (CF/Railway/Render). */
  const startSimulatedDeploy = React.useCallback(
    (data: DeployFormValues) => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      openModal();

      let step = 0;
      intervalRef.current = setInterval(() => {
        step += 1;
        setModal((prev) => ({ ...prev, stepIndex: step, barWidth: (step / 5) * 100 }));
        if (step >= 5) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setTimeout(() => finishDeploy(data), FINISH_DELAY_MS);
        }
      }, STEP_INTERVAL_MS);
    },
    [finishDeploy, openModal]
  );

  /**
   * Real deploy flow for Vercel: validates the GitHub repo server-side
   * (public/private + structure check), creates an actual Vercel
   * deployment, then polls it until it's READY or ERROR.
   */
  const startVercelDeploy = React.useCallback(
    async (data: DeployFormValues) => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      openModal();

      const projectName = (data.projectName || "my-project").trim() || "my-project";

      let validation: GithubValidation;
      try {
        validation = await callApi<GithubValidation>("/api/github/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ githubUrl: data.githubUrl, githubPat: data.githubPat }),
        });
      } catch (err) {
        failDeploy(data, err instanceof Error ? err.message : "Validasi GitHub gagal.");
        return;
      }

      setModal((prev) => ({
        ...prev,
        stepIndex: 1,
        barWidth: 20,
        subtitle: `Repo ${validation.fullName} (${validation.visibility}) terverifikasi.`,
      }));
      validation.warnings.forEach((w) => showToast(w));

      let created: CreateDeployResult;
      try {
        created = await callApi<CreateDeployResult>("/api/deploy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectName,
            githubUrl: data.githubUrl,
            vercelToken: data.platformToken,
            githubPat: data.githubPat,
          }),
        });
      } catch (err) {
        failDeploy(data, err instanceof Error ? err.message : "Gagal membuat deployment di Vercel.");
        return;
      }

      setModal((prev) => ({ ...prev, stepIndex: 2, barWidth: 40 }));

      intervalRef.current = setInterval(async () => {
        let status: DeployStatusResult;
        try {
          status = await callApi<DeployStatusResult>(`/api/deploy/${created.deploymentId}`, {
            headers: { "x-vercel-token": data.platformToken },
          });
        } catch (err) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          failDeploy(data, err instanceof Error ? err.message : "Gagal memantau status deploy.");
          return;
        }

        if (status.readyState === "BUILDING" || status.readyState === "INITIALIZING") {
          setModal((prev) => (prev.stepIndex < 3 ? { ...prev, stepIndex: 3, barWidth: 70 } : prev));
          return;
        }

        if (status.readyState === "READY") {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setModal((prev) => ({
            ...prev,
            stepIndex: 5,
            barWidth: 100,
            title: "Deploy Berhasil!",
            subtitle: `Project ${projectName} siap di ${status.url}`,
            resultVisible: true,
            closeVisible: true,
            result: { name: projectName, domain: status.url, inspectorUrl: status.inspectorUrl },
          }));
          addHistory(projectName, "vercel", status.url, "ready");
          return;
        }

        if (status.readyState === "ERROR" || status.readyState === "CANCELED") {
          if (intervalRef.current) clearInterval(intervalRef.current);
          failDeploy(
            data,
            status.errorMessage ?? "Build gagal di Vercel. Cek inspector url untuk detail log."
          );
        }
      }, POLL_INTERVAL_MS);
    },
    [addHistory, failDeploy, openModal, showToast]
  );

  const submitDeploy = React.useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const repoCandidate = (form.githubUrl || form.projectName || "").trim();

      if (!GITHUB_REPO_RE.test(repoCandidate)) {
        showToast("Format URL GitHub belum benar");
        return;
      }

      if ((form.platform === "railway" || form.platform === "render") && form.envText.trim()) {
        const { hasErrors, issues } = parseAndValidateEnvText(form.envText);
        if (hasErrors) {
          showToast(issues.find((i) => i.level === "error")?.message ?? "Ada error di Environment Variables.");
          return;
        }
      }

      if (history.length >= MAX_HISTORY) {
        pendingFormRef.current = form;
        setConfirmOpen(true);
        return;
      }

      if (form.platform === "vercel") {
        void startVercelDeploy(form);
      } else {
        startSimulatedDeploy(form);
      }
    },
    [form, history.length, showToast, startSimulatedDeploy, startVercelDeploy]
  );

  const proceedDeploy = React.useCallback(() => {
    setConfirmOpen(false);
    const pending = pendingFormRef.current;
    if (pending) {
      if (pending.platform === "vercel") {
        void startVercelDeploy(pending);
      } else {
        startSimulatedDeploy(pending);
      }
      pendingFormRef.current = null;
    }
  }, [startSimulatedDeploy, startVercelDeploy]);

  const closeConfirm = React.useCallback(() => {
    setConfirmOpen(false);
    pendingFormRef.current = null;
  }, []);

  const closeModal = React.useCallback(() => {
    setModal((prev) => ({
      ...prev,
      open: false,
      title: DEFAULT_MODAL_TITLE,
      subtitle: DEFAULT_MODAL_SUBTITLE,
      error: null,
    }));
  }, []);

  const handleCloseAfterDeploy = React.useCallback(() => {
    const failed = Boolean(modal.error);
    closeModal();
    if (failed) {
      showToast("Deploy gagal — cek pesan error dan coba lagi.");
      return;
    }
    setView("dashboard");
    setForm(emptyForm);
    showToast("Deploy berhasil — cek dashboard!");
  }, [closeModal, modal.error, showToast]);

  const redeploy = React.useCallback(
    (name: string) => {
      setForm((prev) => ({ ...prev, projectName: name }));
      setView("deploy");
      showToast("Project dimuat ke form deploy");
    },
    [showToast]
  );

  /** Drops a project from the local history/projects list — e.g. after confirming it was deleted on Vercel. */
  const removeHistoryItem = React.useCallback((name: string) => {
    setHistory((prev) => prev.filter((h) => h.name !== name));
    setProjectSync((prev) => {
      if (!(name in prev)) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }, []);

  /**
   * Answers "kalau di Vercel udah dihapus, di sini otomatis kehapus juga?"
   * — no, so this actively asks Vercel whether the project still exists and
   * updates the badge shown next to it (Projects/History views can then
   * offer to remove the now-stale local entry).
   */
  const checkProjectStatus = React.useCallback(
    async (name: string, vercelToken: string) => {
      setProjectSync((prev) => ({ ...prev, [name]: "checking" }));
      try {
        const result = await callApi<VercelProjectStatusResult>("/api/vercel/project-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectName: name, vercelToken }),
        });
        setProjectSync((prev) => ({ ...prev, [name]: result.exists ? "exists" : "deleted" }));
        showToast(
          result.exists
            ? `Project "${name}" masih ada di Vercel.`
            : `Project "${name}" sudah dihapus di Vercel.`
        );
      } catch (err) {
        setProjectSync((prev) => ({ ...prev, [name]: "error" }));
        showToast(err instanceof Error ? err.message : "Gagal mengecek status project di Vercel.");
      }
    },
    [showToast]
  );

  /** Adds a domain locally, and — for Vercel projects with a token available — attaches it for real via the Vercel API. */
  const addDomain = React.useCallback(
    async (domain: string, project: string, vercelToken?: string) => {
      const platform = history.find((h) => h.name === project)?.platform;
      const id = `${Date.now()}`;
      setDomains((prev) => [{ id, domain, project, status: "Pending" as const, platform }, ...prev]);

      if (platform !== "vercel" || !vercelToken) {
        showToast("Domain berhasil ditambahkan");
        return;
      }

      try {
        const result = await callApi<VercelDomainResult>("/api/vercel/domains", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectName: project, domain, vercelToken }),
        });
        setDomains((prev) =>
          prev.map((d) =>
            d.id === id
              ? { ...d, status: result.verified ? "Active" : "Pending", misconfigured: result.misconfigured }
              : d
          )
        );
        showToast(
          result.verified
            ? "Domain berhasil ditambahkan & terverifikasi di Vercel."
            : "Domain ditambahkan ke Vercel — arahkan DNS-nya dulu supaya terverifikasi."
        );
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Gagal menambahkan domain ke Vercel.");
      }
    },
    [history, setDomains, showToast]
  );

  /** Re-checks a Vercel domain's live verification/misconfiguration status. */
  const refreshDomainStatus = React.useCallback(
    async (id: string, vercelToken: string) => {
      const domain = domains.find((d) => d.id === id);
      if (!domain || domain.platform !== "vercel") return;
      try {
        const result = await callApi<VercelDomainResult>(
          `/api/vercel/domains?projectName=${encodeURIComponent(domain.project)}&domain=${encodeURIComponent(
            domain.domain
          )}`,
          { headers: { "x-vercel-token": vercelToken } }
        );
        setDomains((prev) =>
          prev.map((d) =>
            d.id === id
              ? { ...d, status: result.verified ? "Active" : "Pending", misconfigured: result.misconfigured }
              : d
          )
        );
        showToast(result.verified ? "Domain sudah terverifikasi." : "Domain masih pending verifikasi DNS.");
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Gagal mengecek status domain.");
      }
    },
    [domains, setDomains, showToast]
  );

  /** Removes a domain locally, and best-effort detaches it from Vercel too when a token is available. */
  const removeDomain = React.useCallback(
    (id: string, vercelToken?: string) => {
      const domain = domains.find((d) => d.id === id);
      setDomains((prev) => prev.filter((d) => d.id !== id));
      if (domain?.platform === "vercel" && vercelToken) {
        callApi(
          `/api/vercel/domains?projectName=${encodeURIComponent(domain.project)}&domain=${encodeURIComponent(
            domain.domain
          )}`,
          { method: "DELETE", headers: { "x-vercel-token": vercelToken } }
        ).catch(() => {
          /* best-effort — domain may already be gone from Vercel */
        });
      }
    },
    [domains, setDomains]
  );

  const addEnvVar = React.useCallback(
    (key: string, value: string, environment: "Production" | "Preview") => {
      setEnvVars((prev) => [
        { id: `${Date.now()}`, key, value, environment, visible: false },
        ...prev,
      ]);
      showToast("Secret berhasil disimpan");
    },
    [setEnvVars, showToast]
  );

  const removeEnvVar = React.useCallback(
    (id: string) => {
      setEnvVars((prev) => prev.filter((v) => v.id !== id));
    },
    [setEnvVars]
  );

  const toggleEnvVisible = React.useCallback(
    (id: string) => {
      setEnvVars((prev) => prev.map((v) => (v.id === id ? { ...v, visible: !v.visible } : v)));
    },
    [setEnvVars]
  );

  const value: DeployContextValue = {
    view,
    setView,
    stats,
    history,
    form,
    setFormField,
    platformTokenLabel,
    modal,
    confirmOpen,
    submitDeploy,
    proceedDeploy,
    closeConfirm,
    closeModal,
    handleCloseAfterDeploy,
    redeploy,
    removeHistoryItem,
    settingsTokens,
    projectSync,
    checkProjectStatus,
    domains,
    addDomain,
    removeDomain,
    refreshDomainStatus,
    envVars,
    addEnvVar,
    removeEnvVar,
    toggleEnvVisible,
  };

  return <DeployContext.Provider value={value}>{children}</DeployContext.Provider>;
}
