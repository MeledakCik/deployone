"use client";

import * as React from "react";
import { useToast } from "@/components/ui/Toast";
import { resolveDomain, formatDate } from "@/lib/utils";
import { useCloudStorage } from "@/lib/useCloudStorage";
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
  ProjectStatusResult,
  SettingsTokens,
  VercelDomainResult,
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
const ENV_KEY_RE = /^[A-Z][A-Z0-9_]*$/;
const SETTINGS_TOKENS_KEY = "depush-settings-tokens";
const DEFAULT_SETTINGS_TOKENS: SettingsTokens = { vercelToken: "", cloudflareToken: "", githubPat: "" };

async function callApi<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const body = (await res.json().catch(() => null)) as ApiResponse<T> | null;
  if (!body ||!body.ok) {
    throw new Error(body?.error?? `Request gagal (${res.status})`);
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

interface ModalState {
  open: boolean;
  stepIndex: number;
  barWidth: number;
  title: string;
  subtitle: string;
  resultVisible: boolean;
  closeVisible: boolean;
  result: { name: string; domain: string; inspectorUrl?: string } | null;
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
  vercelToken: string;
  syncingProjects: boolean;
  syncProjectStatus: (name: string) => Promise<"exists" | "deleted" | "skipped" | "error">;
  syncAllProjects: () => Promise<void>;
  domains: DomainItem[];
  addDomain: (domain: string, project: string) => Promise<void>;
  removeDomain: (id: string) => Promise<void>;
  envVars: EnvItem[];
  addEnvVar: (
    key: string,
    value: string,
    environment: "Production" | "Preview",
    project: string,
    options?: { pushToVercel?: boolean }
  ) => Promise<void>;
  removeEnvVar: (id: string) => Promise<void>;
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
  const [history, setHistory] = useCloudStorage<HistoryItem[]>("history", [], "depush-history");
  const stats = React.useMemo(
    () => {
      const safeHistory = Array.isArray(history)? history : [];
      return {
        total: safeHistory.length,
        ready: safeHistory.filter((h) => h.status === "ready").length,
        failed: safeHistory.filter((h) => h.status === "failed").length,
      };
    },
    [history]
  );
  const [form, setForm] = React.useState<DeployFormValues>(emptyForm);
  const [modal, setModal] = React.useState<ModalState>(defaultModal);
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  const [domains, setDomains] = useCloudStorage<DomainItem[]>("domains", [], "depush-domains");
  const [envVars, setEnvVars] = useCloudStorage<EnvItem[]>("envVars", [], "depush-env");
  const [settingsTokens] = useCloudStorage<SettingsTokens>(
    "settingsTokens",
    DEFAULT_SETTINGS_TOKENS,
    SETTINGS_TOKENS_KEY
  );
  const vercelToken = settingsTokens.vercelToken;
  const [syncingProjects, setSyncingProjects] = React.useState(false);

  const pendingFormRef = React.useRef<DeployFormValues | null>(null);
  const intervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  React.useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const setFormField = React.useCallback(
    <K extends keyof DeployFormValues>(key: K, value: DeployFormValues[K]) => {
      setForm((prev) => ({...prev, [key]: value }));
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
        const safePrev = Array.isArray(prev)? prev : [];
        const next = [item,...safePrev];
        return next.length > MAX_HISTORY? next.slice(0, MAX_HISTORY) : next;
      });
    },
    [setHistory]
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

  const startSimulatedDeploy = React.useCallback(
    (data: DeployFormValues) => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      openModal();
      let step = 0;
      intervalRef.current = setInterval(() => {
        step += 1;
        setModal((prev) => ({...prev, stepIndex: step, barWidth: (step / 5) * 100 }));
        if (step >= 5) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setTimeout(() => finishDeploy(data), FINISH_DELAY_MS);
        }
      }, STEP_INTERVAL_MS);
    },
    [finishDeploy, openModal]
  );

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
        failDeploy(data, err instanceof Error? err.message : "Validasi GitHub gagal.");
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
        failDeploy(data, err instanceof Error? err.message : "Gagal membuat deployment di Vercel.");
        return;
      }
      setModal((prev) => ({...prev, stepIndex: 2, barWidth: 40 }));
      intervalRef.current = setInterval(async () => {
        let status: DeployStatusResult;
        try {
          status = await callApi<DeployStatusResult>(`/api/deploy/${created.deploymentId}`, {
            headers: { "x-vercel-token": data.platformToken },
          });
        } catch (err) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          failDeploy(data, err instanceof Error? err.message : "Gagal memantau status deploy.");
          return;
        }
        if (status.readyState === "BUILDING" || status.readyState === "INITIALIZING") {
          setModal((prev) => (prev.stepIndex < 3? {...prev, stepIndex: 3, barWidth: 70 } : prev));
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
            status.errorMessage?? "Build gagal di Vercel. Cek inspector url untuk detail log."
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
      const safeHistory = Array.isArray(history)? history : [];
      if (safeHistory.length >= MAX_HISTORY) {
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
    [form, history, showToast, startSimulatedDeploy, startVercelDeploy]
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
      setForm((prev) => ({...prev, projectName: name }));
      setView("deploy");
      showToast("Project dimuat ke form deploy");
    },
    [showToast]
  );

  const syncProjectStatus = React.useCallback(
    async (name: string): Promise<"exists" | "deleted" | "skipped" | "error"> => {
      if (!vercelToken) return "skipped";
      try {
        const status = await callApi<ProjectStatusResult>(
          `/api/vercel/status?project=${encodeURIComponent(name)}`,
          { headers: { "x-vercel-token": vercelToken } }
        );
        if (!status.exists) {
          setHistory((prev) => (Array.isArray(prev)? prev : []).filter((h) => h.name!== name));
          return "deleted";
        }
        return "exists";
      } catch {
        return "error";
      }
    },
    [vercelToken, setHistory]
  );

  const syncAllProjects = React.useCallback(async () => {
    if (!vercelToken) return;
    const safeHistory = Array.isArray(history)? history : [];
    const names = Array.from(
      new Set(safeHistory.filter((h) => h.platform === "vercel").map((h) => h.name))
    );
    if (names.length === 0) return;
    setSyncingProjects(true);
    let deletedCount = 0;
    for (const name of names) {
      // eslint-disable-next-line no-await-in-loop
      const result = await syncProjectStatus(name);
      if (result === "deleted") deletedCount += 1;
    }
    setSyncingProjects(false);
    if (deletedCount > 0) {
      showToast(
        `${deletedCount} project sudah dihapus di Vercel — dihapus juga dari daftar di sini.`
      );
    }
  }, [history, syncProjectStatus, vercelToken, showToast]);

  const addDomain = React.useCallback(
    async (domain: string, project: string) => {
      const safeHistory = Array.isArray(history)? history : [];
      const targetItem = safeHistory.find((h) => h.name === project);
      const canSync = Boolean(vercelToken) && targetItem?.platform === "vercel";
      if (!canSync) {
        setDomains((prev) => {
          const safePrev = Array.isArray(prev)? prev : [];
          return [
            { id: `${Date.now()}`, domain, project, status: "Pending" as const, syncedToVercel: false },
           ...safePrev,
          ];
        });
        showToast(
          vercelToken
           ? "Domain disimpan lokal (project ini bukan platform Vercel)."
            : "Domain disimpan lokal — isi Vercel Token di Settings untuk push otomatis ke Vercel."
        );
        return;
      }
      try {
        const result = await callApi<VercelDomainResult>("/api/vercel/domains", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ project, domain, vercelToken }),
        });
        setDomains((prev) => {
          const safePrev = Array.isArray(prev)? prev : [];
          return [
            {
              id: `${Date.now()}`,
              domain: result.name,
              project,
              status: result.verified? "Active" : "Pending",
              syncedToVercel: true,
            },
           ...safePrev,
          ];
        });
        showToast(
          result.verified
           ? "Domain berhasil ditambahkan & terverifikasi di Vercel."
            : "Domain ditambahkan di Vercel — arahkan DNS sesuai instruksi untuk verifikasi."
        );
      } catch (err) {
        showToast(err instanceof Error? err.message : "Gagal menambahkan domain ke Vercel.");
      }
    },
    [history, setDomains, showToast, vercelToken]
  );

  const removeDomain = React.useCallback(
    async (id: string) => {
      const safeDomains = Array.isArray(domains)? domains : [];
      const item = safeDomains.find((d) => d.id === id);
      if (item?.syncedToVercel && vercelToken) {
        try {
          await callApi(
            `/api/vercel/domains/${encodeURIComponent(item.domain)}?project=${encodeURIComponent(item.project)}`,
            { method: "DELETE", headers: { "x-vercel-token": vercelToken } }
          );
        } catch (err) {
          showToast(err instanceof Error? err.message : "Gagal menghapus domain di Vercel.");
          return;
        }
      }
      setDomains((prev) => (Array.isArray(prev)? prev : []).filter((d) => d.id!== id));
    },
    [domains, setDomains, showToast, vercelToken]
  );

  const addEnvVar = React.useCallback(
    async (
      key: string,
      value: string,
      environment: "Production" | "Preview",
      project: string,
      options?: { pushToVercel?: boolean }
    ) => {
      const trimmedKey = key.trim();
      const trimmedProject = project.trim();
      if (!ENV_KEY_RE.test(trimmedKey)) {
        showToast('Key harus UPPER_SNAKE_CASE, contoh: DATABASE_URL (huruf besar & underscore).');
        return;
      }
      if (!trimmedProject) {
        showToast("Pilih project untuk secret ini — env var selalu disimpan per-project.");
        return;
      }
      const safeEnvVars = Array.isArray(envVars)? envVars : [];
      if (
        safeEnvVars.some(
          (v) => v.key === trimmedKey && v.environment === environment && v.project === trimmedProject
        )
      ) {
        showToast(`Key "${trimmedKey}" sudah ada untuk project "${trimmedProject}" (${environment}).`);
        return;
      }
      let syncedToVercel = false;
      if (options?.pushToVercel) {
        if (!vercelToken) {
          showToast("Isi Vercel Token di Settings dulu untuk push env ke Vercel.");
          return;
        }
        try {
          await callApi("/api/vercel/env", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              project: trimmedProject,
              key: trimmedKey,
              value,
              target: environment === "Production"? ["production"] : ["preview"],
              vercelToken,
            }),
          });
          syncedToVercel = true;
        } catch (err) {
          showToast(err instanceof Error? err.message : "Gagal push env var ke Vercel.");
          return;
        }
      }
      setEnvVars((prev) => {
        const safePrev = Array.isArray(prev)? prev : [];
        return [
          {
            id: `${Date.now()}`,
            key: trimmedKey,
            value,
            environment,
            visible: false,
            project: trimmedProject,
            syncedToVercel,
          },
         ...safePrev,
        ];
      });
      showToast(
        syncedToVercel
         ? `Secret disimpan untuk "${trimmedProject}" & di-push ke Vercel.`
          : `Secret disimpan untuk project "${trimmedProject}".`
      );
    },
    [envVars, setEnvVars, showToast, vercelToken]
  );

  const removeEnvVar = React.useCallback(
    async (id: string) => {
      const safeEnvVars = Array.isArray(envVars)? envVars : [];
      const item = safeEnvVars.find((v) => v.id === id);
      if (item?.syncedToVercel && vercelToken) {
        try {
          await callApi(
            `/api/vercel/env?project=${encodeURIComponent(item.project)}&key=${encodeURIComponent(item.key)}`,
            { method: "DELETE", headers: { "x-vercel-token": vercelToken } }
          );
        } catch (err) {
          showToast(err instanceof Error? err.message : "Gagal menghapus env var di Vercel.");
          return;
        }
      }
      setEnvVars((prev) => (Array.isArray(prev)? prev : []).filter((v) => v.id!== id));
    },
    [envVars, setEnvVars, showToast, vercelToken]
  );

  const toggleEnvVisible = React.useCallback(
    (id: string) => {
      setEnvVars((prev) => (Array.isArray(prev)? prev : []).map((v) => (v.id === id? {...v, visible:!v.visible } : v)));
    },
    [setEnvVars]
  );

  const value: DeployContextValue = {
    view,
    setView,
    stats,
    history: Array.isArray(history)? history : [],
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
    vercelToken,
    syncingProjects,
    syncProjectStatus,
    syncAllProjects,
    domains: Array.isArray(domains)? domains : [],
    addDomain,
    removeDomain,
    envVars: Array.isArray(envVars)? envVars : [],
    addEnvVar,
    removeEnvVar,
    toggleEnvVisible,
  };

  return <DeployContext.Provider value={value}>{children}</DeployContext.Provider>;
}