"use client";

import * as React from "react";
import { useToast } from "@/components/ui/Toast";
import { resolveDomain, formatDate } from "@/lib/utils";
import { useCloudStorage } from "@/lib/useCloudStorage";
import type {
  ApiResponse,
  CloudflareAccountInfo,
  CloudflareDeployStatusResult,
  CloudflareDomainResult,
  CloudflareEnvSummary,
  CloudflareProjectStatusResult,
  CloudflareProjectSummary,
  CreateCloudflareDeployResult,
  CreateDeployResult,
  DashboardView,
  DeployFormValues,
  DeployStatusResult,
  DomainItem,
  EnvItem,
  GithubConnectionStatus,
  GithubValidation,
  HistoryItem,
  Platform,
  ProjectStatusResult,
  RailwayDeployStatusResult,
  RailwayDomainResult,
  RailwayEnvSummary,
  RailwayProjectStatusResult,
  RailwayUserInfo,
  CreateRailwayDeployResult,
  RedeployResult,
  SettingsTokens,
  VercelDomainResult,
  VercelEnvSummary,
  VercelProjectSummary,
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

function wwwPairFor(domain: string): string {
  return domain.toLowerCase().startsWith("www.")
    ? domain.slice(4)
    : `www.${domain}`;
}

const SETTINGS_TOKENS_KEY = "depup-settings-tokens";
const DEFAULT_SETTINGS_TOKENS: SettingsTokens = {
  vercelToken: "",
  cloudflareToken: "",
  cloudflareAccountId: "",
  githubPat: "",
  railwayToken: "",
};

async function callApi<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const body = (await res.json().catch(() => null)) as ApiResponse<T> | null;
  if (!body || !body.ok) {
    throw new Error(body?.error ?? `Request gagal (${res.status})`);
  }
  return body.data;
}

const DEFAULT_MODAL_TITLE = "Deploy Project";
const DEFAULT_MODAL_SUBTITLE =
  "Import repository dan deploy ke edge network dalam satu klik.";

const emptyForm: DeployFormValues = {
  projectName: "",
  platform: "vercel",
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

/* ================================================================
 *  State modern — sumber tunggal untuk progress deploy
 * ================================================================ */

export type DeployStatus = "idle" | "deploying" | "success" | "error";

export interface DeployState {
  status: DeployStatus;
  stepIndex: number;
  barWidth: number;
  title: string;
  subtitle: string;
  error: string | null;
  result: {
    name: string;
    domain: string;
    inspectorUrl?: string;
    analyticsEnabled?: boolean | null;
    analyticsUrl?: string;
  } | null;
}

const defaultDeployState: DeployState = {
  status: "idle",
  stepIndex: 0,
  barWidth: 0,
  title: DEFAULT_MODAL_TITLE,
  subtitle: DEFAULT_MODAL_SUBTITLE,
  error: null,
  result: null,
};

/* ================================================================
 *  State legacy — bentuk ModalState yang dipakai DeployModal.tsx
 * ================================================================ */

interface ModalState {
  open: boolean;
  stepIndex: number;
  barWidth: number;
  title: string;
  subtitle: string;
  resultVisible: boolean;
  closeVisible: boolean;
  result: {
    name: string;
    domain: string;
    inspectorUrl?: string;
    analyticsEnabled?: boolean | null;
    analyticsUrl?: string;
  } | null;
  error: string | null;
}

/* ================================================================
 *  Context value
 * ================================================================ */

interface DeployContextValue {
  view: DashboardView;
  setView: (v: DashboardView) => void;
  stats: { total: number; ready: number; failed: number };
  history: HistoryItem[];
  form: DeployFormValues;
  setFormField: <K extends keyof DeployFormValues>(
    key: K,
    value: DeployFormValues[K],
  ) => void;
  platformTokenLabel: string;
  repoEnvCheck: {
    status: "idle" | "checking" | "ok" | "error";
    detectedEnvVars: string[];
    framework: string | null;
    warnings: string[];
  };

  /** Legacy derived view — dipakai DeployModal.tsx. */
  modal: ModalState;
  /** Modern state — dipakai DeployFormView wizard. */
  deployState: DeployState;

  closeModal: () => void;
  handleCloseAfterDeploy: () => void;
  resetDeployState: () => void;

  savedVercelToken: { token: string; username: string } | null;
  savedVercelTokenStatus: "idle" | "checking" | "ok" | "invalid";

  savedCloudflareToken: {
    token: string;
    accountId: string;
    accountName: string;
  } | null;
  savedCloudflareTokenStatus:
    | "idle"
    | "checking"
    | "ok"
    | "invalid"
    | "needs_account";
  cloudflareAccounts: CloudflareAccountInfo[];

  savedRailwayToken: { token: string; name: string } | null;
  savedRailwayTokenStatus: "idle" | "checking" | "ok" | "invalid";

  githubConnectionStatus: {
    status: "idle" | "checking" | "connected" | "unknown";
    connectUrl: string | null;
  };
  checkGithubConnection: () => Promise<void>;

  confirmOpen: boolean;
  submitDeploy: (e: React.FormEvent<HTMLFormElement>) => void;
  proceedDeploy: () => void;
  closeConfirm: () => void;

  redeploy: (name: string) => void;

  vercelToken: string;
  cloudflareToken: string;
  cloudflareAccountId: string;
  railwayToken: string;

  syncingProjects: boolean;
  syncProjectStatus: (
    name: string,
    platform: Platform,
  ) => Promise<"exists" | "deleted" | "skipped" | "error">;
  syncAllProjects: () => Promise<void>;

  deletingProject: string | null;
  deleteProject: (
    name: string,
    platform: Platform,
    options: {
      alsoDeleteFromVercel?: boolean;
      alsoDeleteFromCloudflare?: boolean;
      alsoDeleteFromRailway?: boolean;
    },
  ) => Promise<void>;

  fetchImportableVercelProjects: () => Promise<VercelProjectSummary[]>;
  importVercelProject: (project: VercelProjectSummary) => void;
  fetchImportableCloudflareProjects: () => Promise<CloudflareProjectSummary[]>;
  importCloudflareProject: (project: CloudflareProjectSummary) => void;

  domains: DomainItem[];
  addDomain: (domain: string, project: string) => Promise<void>;
  removeDomain: (id: string) => Promise<void>;
  refreshDomainStatus: (id: string) => Promise<void>;
  syncingDomains: boolean;
  syncDomainsForProject: (
    project: string,
  ) => Promise<"synced" | "skipped" | "error">;
  syncAllDomains: () => Promise<void>;

  envVars: EnvItem[];
  addEnvVar: (
    key: string,
    value: string,
    environment: "Production" | "Preview",
    project: string,
    options?: { pushToVercel?: boolean; pushToCloudflare?: boolean; pushToRailway?: boolean },
  ) => Promise<void>;
  removeEnvVar: (id: string) => Promise<void>;
  toggleEnvVisible: (id: string) => void;
  syncingEnvVars: boolean;
  syncEnvVarsForProject: (
    project: string,
  ) => Promise<"synced" | "skipped" | "error">;
  syncAllEnvVars: () => Promise<void>;

  focusedTrafficProject: string | null;
  setFocusedTrafficProject: (name: string | null) => void;
}

const DeployContext = React.createContext<DeployContextValue | null>(null);

export function useDeploy() {
  const ctx = React.useContext(DeployContext);
  if (!ctx) throw new Error("useDeploy must be used within <DeployProvider>");
  return ctx;
}

/* ================================================================
 *  Provider
 * ================================================================ */

export function DeployProvider({ children }: { children: React.ReactNode }) {
  const { showToast } = useToast();

  const [view, setView] = React.useState<DashboardView>("dashboard");
  const [focusedTrafficProject, setFocusedTrafficProject] = React.useState<
    string | null
  >(null);

  const [history, setHistory] = useCloudStorage<HistoryItem[]>(
    "history",
    [],
    "depup-history",
  );
  const stats = React.useMemo(() => {
    const safeHistory = Array.isArray(history) ? history : [];
    return {
      total: safeHistory.length,
      ready: safeHistory.filter((h) => h.status === "ready").length,
      failed: safeHistory.filter((h) => h.status === "failed").length,
    };
  }, [history]);

  const [form, setForm] = React.useState<DeployFormValues>(emptyForm);
  const [deployState, setDeployState] =
    React.useState<DeployState>(defaultDeployState);

  /* ---------- auto-detect env vars needed by the repo ---------- */
  const [repoEnvCheck, setRepoEnvCheck] = React.useState<{
    status: "idle" | "checking" | "ok" | "error";
    detectedEnvVars: string[];
    framework: string | null;
    warnings: string[];
  }>({ status: "idle", detectedEnvVars: [], framework: null, warnings: [] });
  const lastCheckedRepoRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    const raw = form.githubUrl?.trim();
    if (!raw || !GITHUB_REPO_RE.test(raw)) {
      setRepoEnvCheck({ status: "idle", detectedEnvVars: [], framework: null, warnings: [] });
      lastCheckedRepoRef.current = null;
      return;
    }

    const key = `${raw}::${form.githubPat}`;
    if (lastCheckedRepoRef.current === key) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      lastCheckedRepoRef.current = key;
      setRepoEnvCheck((prev) => ({ ...prev, status: "checking" }));
      try {
        const result = await callApi<GithubValidation>("/api/github/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ githubUrl: raw, githubPat: form.githubPat }),
        });
        if (cancelled) return;
        // The env-var line is already shown separately (with the auto-fill
        // callout below), so drop it here to avoid saying the same thing twice.
        const otherWarnings = result.warnings.filter(
          (w) => !w.startsWith("Repo ini kemungkinan butuh env var"),
        );
        setRepoEnvCheck({
          status: "ok",
          detectedEnvVars: result.detectedEnvVars,
          framework: result.framework,
          warnings: otherWarnings,
        });
        // Auto-fill the Environment Variables step with `KEY=` placeholders
        // for anything detected — only when the user hasn't typed anything
        // there yet, so this never clobbers a value they already entered.
        if (result.detectedEnvVars.length > 0) {
          setForm((prev) => {
            if (prev.envText.trim()) return prev;
            const template = result.detectedEnvVars.map((k) => `${k}=`).join("\n");
            return { ...prev, envText: template };
          });
        }
      } catch {
        if (!cancelled)
          setRepoEnvCheck({ status: "error", detectedEnvVars: [], framework: null, warnings: [] });
      }
    }, 700);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [form.githubUrl, form.githubPat]);

  const [domains, setDomains] = useCloudStorage<DomainItem[]>(
    "domains",
    [],
    "depup-domains",
  );
  const [envVars, setEnvVars] = useCloudStorage<EnvItem[]>(
    "envVars",
    [],
    "depup-env",
  );
  const [settingsTokens] = useCloudStorage<SettingsTokens>(
    "settingsTokens",
    DEFAULT_SETTINGS_TOKENS,
    SETTINGS_TOKENS_KEY,
  );
  const vercelToken = settingsTokens.vercelToken;
  const cloudflareToken = settingsTokens.cloudflareToken;
  const cloudflareAccountId = settingsTokens.cloudflareAccountId ?? "";
  const railwayToken = settingsTokens.railwayToken;

  const [syncingProjects, setSyncingProjects] = React.useState(false);
  const [deletingProject, setDeletingProject] = React.useState<string | null>(
    null,
  );
  const [syncingEnvVars, setSyncingEnvVars] = React.useState(false);
  const [syncingDomains, setSyncingDomains] = React.useState(false);

  /* ---------- saved Vercel token ---------- */
  const [savedVercelToken, setSavedVercelToken] = React.useState<{
    token: string;
    username: string;
  } | null>(null);
  const [savedVercelTokenStatus, setSavedVercelTokenStatus] = React.useState<
    "idle" | "checking" | "ok" | "invalid"
  >("idle");

  React.useEffect(() => {
    let cancelled = false;
    if (!vercelToken) {
      setSavedVercelToken(null);
      setSavedVercelTokenStatus("idle");
      return;
    }
    setSavedVercelTokenStatus("checking");
    (async () => {
      try {
        const user = await callApi<{ username: string; email: string | null }>(
          "/api/vercel/whoami",
          { headers: { "x-vercel-token": vercelToken } },
        );
        if (cancelled) return;
        setSavedVercelToken({ token: vercelToken, username: user.username });
        setSavedVercelTokenStatus("ok");
      } catch {
        if (cancelled) return;
        setSavedVercelToken(null);
        setSavedVercelTokenStatus("invalid");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [vercelToken]);

  /* ---------- saved Cloudflare token ---------- */
  const [savedCloudflareToken, setSavedCloudflareToken] = React.useState<{
    token: string;
    accountId: string;
    accountName: string;
  } | null>(null);
  const [savedCloudflareTokenStatus, setSavedCloudflareTokenStatus] =
    React.useState<
      "idle" | "checking" | "ok" | "invalid" | "needs_account"
    >("idle");
  const [cloudflareAccounts, setCloudflareAccounts] = React.useState<
    CloudflareAccountInfo[]
  >([]);

  React.useEffect(() => {
    let cancelled = false;
    if (!cloudflareToken) {
      setSavedCloudflareToken(null);
      setSavedCloudflareTokenStatus("idle");
      setCloudflareAccounts([]);
      return;
    }
    setSavedCloudflareTokenStatus("checking");
    (async () => {
      try {
        const { accounts } = await callApi<{
          accounts: CloudflareAccountInfo[];
        }>("/api/cloudflare/whoami", {
          headers: { "x-cloudflare-token": cloudflareToken },
        });
        if (cancelled) return;
        setCloudflareAccounts(accounts);
        const chosen =
          accounts.find((a) => a.id === cloudflareAccountId) ??
          (accounts.length === 1 ? accounts[0] : undefined);
        if (chosen) {
          setSavedCloudflareToken({
            token: cloudflareToken,
            accountId: chosen.id,
            accountName: chosen.name,
          });
          setSavedCloudflareTokenStatus("ok");
        } else {
          setSavedCloudflareToken(null);
          setSavedCloudflareTokenStatus("needs_account");
        }
      } catch {
        if (cancelled) return;
        setSavedCloudflareToken(null);
        setCloudflareAccounts([]);
        setSavedCloudflareTokenStatus("invalid");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cloudflareToken, cloudflareAccountId]);

  /* ---------- saved Railway token ---------- */
  const [savedRailwayToken, setSavedRailwayToken] = React.useState<{
    token: string;
    name: string;
  } | null>(null);
  const [savedRailwayTokenStatus, setSavedRailwayTokenStatus] = React.useState<
    "idle" | "checking" | "ok" | "invalid"
  >("idle");

  React.useEffect(() => {
    let cancelled = false;
    if (!railwayToken) {
      setSavedRailwayToken(null);
      setSavedRailwayTokenStatus("idle");
      return;
    }
    setSavedRailwayTokenStatus("checking");
    (async () => {
      try {
        const user = await callApi<RailwayUserInfo>("/api/railway/whoami", {
          headers: { "x-railway-token": railwayToken },
        });
        if (cancelled) return;
        setSavedRailwayToken({ token: railwayToken, name: user.name ?? user.email ?? user.id });
        setSavedRailwayTokenStatus("ok");
      } catch {
        if (cancelled) return;
        setSavedRailwayToken(null);
        setSavedRailwayTokenStatus("invalid");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [railwayToken]);

  /* ---------- GitHub connection (Cloudflare Pages App) ---------- */
  const [githubConnectionStatus, setGithubConnectionStatus] = React.useState<{
    status: "idle" | "checking" | "connected" | "unknown";
    connectUrl: string | null;
  }>({ status: "idle", connectUrl: null });

  const checkGithubConnection = React.useCallback(async () => {
    if (!savedCloudflareToken) {
      setGithubConnectionStatus({ status: "idle", connectUrl: null });
      return;
    }
    setGithubConnectionStatus((prev) => ({ ...prev, status: "checking" }));
    try {
      const result = await callApi<GithubConnectionStatus>(
        `/api/cloudflare/github-status?accountId=${encodeURIComponent(
          savedCloudflareToken.accountId,
        )}`,
        { headers: { "x-cloudflare-token": savedCloudflareToken.token } },
      );
      setGithubConnectionStatus({
        status: result.status,
        connectUrl: result.connectUrl,
      });
    } catch {
      setGithubConnectionStatus({ status: "unknown", connectUrl: null });
    }
  }, [savedCloudflareToken]);

  React.useEffect(() => {
    void checkGithubConnection();
  }, [checkGithubConnection]);

  const intervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  React.useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const setFormField = React.useCallback(
    <K extends keyof DeployFormValues>(
      key: K,
      value: DeployFormValues[K],
    ) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const platformTokenLabel = `${form.platform
    .charAt(0)
    .toUpperCase()}${form.platform.slice(1)} Token`;

  const addHistory = React.useCallback(
    (
      name: string,
      platform: Platform,
      domain: string,
      status: HistoryItem["status"] = "ready",
    ) => {
      const item: HistoryItem = {
        id: `${Date.now()}`,
        name,
        platform,
        domain,
        date: formatDate(new Date()),
        status,
      };
      setHistory((prev) => {
        const safePrev = Array.isArray(prev) ? prev : [];
        const next = [item, ...safePrev];
        return next.length > MAX_HISTORY ? next.slice(0, MAX_HISTORY) : next;
      });
    },
    [setHistory],
  );

  /* ---------- deploy helpers ---------- */

  const beginDeploy = React.useCallback(() => {
    setDeployState({ ...defaultDeployState, status: "deploying" });
  }, []);

  const finishDeploy = React.useCallback(
    (data: DeployFormValues) => {
      const projectName =
        (data.projectName || "my-project").trim() || "my-project";
      const domain = resolveDomain(projectName, data.platform);
      setDeployState((prev) => ({
        ...prev,
        status: "success",
        stepIndex: 5,
        barWidth: 100,
        title: "Deploy Berhasil!",
        subtitle: `Project ${projectName} siap di ${domain}`,
        result: { name: projectName, domain },
        error: null,
      }));
      addHistory(projectName, data.platform, domain);
    },
    [addHistory],
  );

  const failDeploy = React.useCallback(
    (data: DeployFormValues, message: string) => {
      const projectName =
        (data.projectName || "my-project").trim() || "my-project";
      setDeployState((prev) => ({
        ...prev,
        status: "error",
        title: "Deploy Gagal",
        subtitle: message,
        error: message,
      }));
      addHistory(projectName, data.platform, "-", "failed");
    },
    [addHistory],
  );

  const resetDeployState = React.useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setDeployState(defaultDeployState);
  }, []);

  /* ---------- simulated (railway / render / fallback) ---------- */
  const startSimulatedDeploy = React.useCallback(
    (data: DeployFormValues) => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      beginDeploy();
      let step = 0;
      intervalRef.current = setInterval(() => {
        step += 1;
        setDeployState((prev) => ({
          ...prev,
          stepIndex: step,
          barWidth: (step / 5) * 100,
        }));
        if (step >= 5) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setTimeout(() => finishDeploy(data), FINISH_DELAY_MS);
        }
      }, STEP_INTERVAL_MS);
    },
    [beginDeploy, finishDeploy],
  );

  /* ---------- Vercel ---------- */
  const startVercelDeploy = React.useCallback(
    async (data: DeployFormValues) => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      beginDeploy();
      const projectName =
        (data.projectName || "my-project").trim() || "my-project";

      let validation: GithubValidation;
      try {
        validation = await callApi<GithubValidation>("/api/github/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            githubUrl: data.githubUrl,
            githubPat: data.githubPat,
          }),
        });
      } catch (err) {
        failDeploy(
          data,
          err instanceof Error ? err.message : "Validasi GitHub gagal.",
        );
        return;
      }
      setDeployState((prev) => ({
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
        failDeploy(
          data,
          err instanceof Error
            ? err.message
            : "Gagal membuat deployment di Vercel.",
        );
        return;
      }
      setDeployState((prev) => ({ ...prev, stepIndex: 2, barWidth: 40 }));

      intervalRef.current = setInterval(async () => {
        let status: DeployStatusResult;
        try {
          status = await callApi<DeployStatusResult>(
            `/api/deploy/${created.deploymentId}`,
            { headers: { "x-vercel-token": data.platformToken } },
          );
        } catch (err) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          failDeploy(
            data,
            err instanceof Error
              ? err.message
              : "Gagal memantau status deploy.",
          );
          return;
        }
        if (
          status.readyState === "BUILDING" ||
          status.readyState === "INITIALIZING"
        ) {
          setDeployState((prev) =>
            prev.stepIndex < 3
              ? { ...prev, stepIndex: 3, barWidth: 70 }
              : prev,
          );
          return;
        }
        if (status.readyState === "READY") {
          if (intervalRef.current) clearInterval(intervalRef.current);

          const scopeMatch = status.inspectorUrl.match(
            /^https:\/\/vercel\.com\/([^/]+)\/([^/]+)/,
          );
          const analyticsUrl = scopeMatch
            ? `https://vercel.com/${scopeMatch[1]}/${scopeMatch[2]}/analytics`
            : undefined;

          setDeployState((prev) => ({
            ...prev,
            status: "success",
            stepIndex: 5,
            barWidth: 100,
            title: "Deploy Berhasil!",
            subtitle: `Project ${projectName} siap di ${status.url}`,
            result: {
              name: projectName,
              domain: status.url,
              inspectorUrl: status.inspectorUrl,
              analyticsEnabled: null,
              analyticsUrl,
            },
          }));
          addHistory(projectName, "vercel", status.url, "ready");

          void (async () => {
            try {
              const projectStatus = await callApi<ProjectStatusResult>(
                `/api/vercel/status?project=${encodeURIComponent(projectName)}`,
                { headers: { "x-vercel-token": data.platformToken } },
              );
              setDeployState((prev) =>
                prev.result
                  ? {
                      ...prev,
                      result: {
                        ...prev.result,
                        analyticsEnabled: projectStatus.webAnalyticsEnabled,
                      },
                    }
                  : prev,
              );
            } catch {
              setDeployState((prev) =>
                prev.result
                  ? {
                      ...prev,
                      result: { ...prev.result, analyticsEnabled: null },
                    }
                  : prev,
              );
            }
          })();
          return;
        }
        if (
          status.readyState === "ERROR" ||
          status.readyState === "CANCELED"
        ) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          failDeploy(
            data,
            status.errorMessage ??
              "Build gagal di Vercel. Cek inspector url untuk detail log.",
          );
        }
      }, POLL_INTERVAL_MS);
    },
    [addHistory, beginDeploy, failDeploy, showToast],
  );

  /* ---------- Cloudflare ---------- */
  const startCloudflareDeploy = React.useCallback(
    async (data: DeployFormValues) => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      const cfToken = (data.platformToken ?? "").trim();
      const accountId = (data.accountId ?? "").trim();
      if (!cfToken || !accountId) {
        showToast("Cloudflare Token & Account ID wajib diisi.");
        return;
      }
      beginDeploy();
      const projectName =
        (data.projectName || "my-project").trim() || "my-project";

      let validation: GithubValidation;
      try {
        validation = await callApi<GithubValidation>("/api/github/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            githubUrl: data.githubUrl,
            githubPat: data.githubPat,
          }),
        });
      } catch (err) {
        failDeploy(
          data,
          err instanceof Error ? err.message : "Validasi GitHub gagal.",
        );
        return;
      }
      setDeployState((prev) => ({
        ...prev,
        stepIndex: 1,
        barWidth: 20,
        subtitle: `Repo ${validation.fullName} (${validation.visibility}) terverifikasi.`,
      }));
      validation.warnings.forEach((w) => showToast(w));

      let created: CreateCloudflareDeployResult;
      try {
        created = await callApi<CreateCloudflareDeployResult>(
          "/api/cloudflare/deploy",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              projectName,
              githubUrl: data.githubUrl,
              cloudflareToken: cfToken,
              accountId,
              githubPat: data.githubPat,
              buildCommand: data.buildCommand,
              outputDir: data.outputDir,
            }),
          },
        );
      } catch (err) {
        if (
          err instanceof Error &&
          err.message.toLowerCase().includes("github belum terhubung")
        ) {
          void checkGithubConnection();
        }
        failDeploy(
          data,
          err instanceof Error
            ? err.message
            : "Gagal membuat deployment di Cloudflare Pages.",
        );
        return;
      }
      if (created.frameworkWarning) showToast(created.frameworkWarning);
      setDeployState((prev) => ({ ...prev, stepIndex: 2, barWidth: 40 }));

      intervalRef.current = setInterval(async () => {
        let status: CloudflareDeployStatusResult;
        try {
          status = await callApi<CloudflareDeployStatusResult>(
            `/api/cloudflare/deploy/${created.deploymentId}?project=${encodeURIComponent(
              projectName,
            )}&accountId=${encodeURIComponent(accountId)}`,
            { headers: { "x-cloudflare-token": cfToken } },
          );
        } catch (err) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          failDeploy(
            data,
            err instanceof Error
              ? err.message
              : "Gagal memantau status deploy.",
          );
          return;
        }
        if (
          status.readyState === "BUILDING" ||
          status.readyState === "INITIALIZING" ||
          status.readyState === "QUEUED"
        ) {
          setDeployState((prev) =>
            prev.stepIndex < 3
              ? { ...prev, stepIndex: 3, barWidth: 70 }
              : prev,
          );
          return;
        }
        if (status.readyState === "READY") {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setDeployState((prev) => ({
            ...prev,
            status: "success",
            stepIndex: 5,
            barWidth: 100,
            title: "Deploy Berhasil!",
            subtitle: `Project ${projectName} siap di ${status.url}`,
            result: {
              name: projectName,
              domain: status.url,
              inspectorUrl: status.inspectorUrl,
            },
          }));
          addHistory(projectName, "cloudflare", status.url, "ready");
          return;
        }
        if (
          status.readyState === "ERROR" ||
          status.readyState === "CANCELED"
        ) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          failDeploy(
            data,
            status.errorMessage ??
              "Build gagal di Cloudflare Pages. Cek dashboard untuk detail log.",
          );
        }
      }, POLL_INTERVAL_MS);
    },
    [addHistory, beginDeploy, checkGithubConnection, failDeploy, showToast],
  );

  /* ---------- Railway ---------- */
  const startRailwayDeploy = React.useCallback(
    async (data: DeployFormValues) => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      const railwayTokenValue = (data.platformToken ?? "").trim();
      if (!railwayTokenValue) {
        showToast("Railway Token wajib diisi.");
        return;
      }
      beginDeploy();
      const projectName =
        (data.projectName || "my-project").trim() || "my-project";

      let validation: GithubValidation;
      try {
        validation = await callApi<GithubValidation>("/api/github/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            githubUrl: data.githubUrl,
            githubPat: data.githubPat,
          }),
        });
      } catch (err) {
        failDeploy(
          data,
          err instanceof Error ? err.message : "Validasi GitHub gagal.",
        );
        return;
      }
      setDeployState((prev) => ({
        ...prev,
        stepIndex: 1,
        barWidth: 20,
        subtitle: `Repo ${validation.fullName} (${validation.visibility}) terverifikasi.`,
      }));
      validation.warnings.forEach((w) => showToast(w));

      let created: CreateRailwayDeployResult;
      try {
        created = await callApi<CreateRailwayDeployResult>(
          "/api/railway/deploy",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              projectName,
              githubUrl: data.githubUrl,
              railwayToken: railwayTokenValue,
              githubPat: data.githubPat,
              startCommand: data.startCommand,
              envText: data.envText,
            }),
          },
        );
      } catch (err) {
        failDeploy(
          data,
          err instanceof Error
            ? err.message
            : "Gagal membuat deployment di Railway.",
        );
        return;
      }
      setDeployState((prev) => ({ ...prev, stepIndex: 2, barWidth: 40 }));

      intervalRef.current = setInterval(async () => {
        let status: RailwayDeployStatusResult;
        try {
          status = await callApi<RailwayDeployStatusResult>(
            `/api/railway/deploy/${created.deploymentId}`,
            { headers: { "x-railway-token": railwayTokenValue } },
          );
        } catch (err) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          failDeploy(
            data,
            err instanceof Error
              ? err.message
              : "Gagal memantau status deploy.",
          );
          return;
        }
        if (status.readyState === "BUILDING" || status.readyState === "QUEUED") {
          setDeployState((prev) =>
            prev.stepIndex < 3
              ? { ...prev, stepIndex: 3, barWidth: 70 }
              : prev,
          );
          return;
        }
        if (status.readyState === "READY") {
          if (intervalRef.current) clearInterval(intervalRef.current);
          const domain = status.url || created.url || resolveDomain(projectName, "railway");
          setDeployState((prev) => ({
            ...prev,
            status: "success",
            stepIndex: 5,
            barWidth: 100,
            title: "Deploy Berhasil!",
            subtitle: `Project ${projectName} siap di ${domain}`,
            result: {
              name: projectName,
              domain,
              inspectorUrl: status.inspectorUrl,
            },
          }));
          addHistory(projectName, "railway", domain, "ready");
          return;
        }
        if (
          status.readyState === "ERROR" ||
          status.readyState === "CANCELED"
        ) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          failDeploy(
            data,
            status.errorMessage ??
              "Build gagal di Railway. Cek log di dashboard Railway untuk detail.",
          );
        }
      }, POLL_INTERVAL_MS);
    },
    [addHistory, beginDeploy, failDeploy, showToast],
  );

  /* ---------- submit ---------- */
  const submitDeploy = React.useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const repoCandidate = (form.githubUrl || form.projectName || "").trim();
      if (!GITHUB_REPO_RE.test(repoCandidate)) {
        showToast("Format URL GitHub belum benar");
        return;
      }
      if (form.platform === "vercel") {
        void startVercelDeploy(form);
      } else if (form.platform === "cloudflare") {
        void startCloudflareDeploy(form);
      } else if (form.platform === "railway") {
        void startRailwayDeploy(form);
      } else {
        startSimulatedDeploy(form);
      }
    },
    [
      form,
      showToast,
      startCloudflareDeploy,
      startRailwayDeploy,
      startSimulatedDeploy,
      startVercelDeploy,
    ],
  );

  /* legacy no-ops */
  const proceedDeploy = React.useCallback(() => {}, []);
  const closeConfirm = React.useCallback(() => {}, []);

  const redeploy = React.useCallback(
    (name: string) => {
      setForm((prev) => ({ ...prev, projectName: name }));
      setView("deploy");
      showToast("Project dimuat ke form deploy");
    },
    [showToast],
  );

  /* ================================================================
   *  Legacy modal view + handlers (dipakai DeployModal.tsx)
   * ================================================================ */

  const modal: ModalState = React.useMemo(
    () => ({
      open: deployState.status !== "idle",
      stepIndex: deployState.stepIndex,
      barWidth: deployState.barWidth,
      title: deployState.title,
      subtitle: deployState.subtitle,
      resultVisible:
        deployState.status === "success" || deployState.status === "error",
      closeVisible:
        deployState.status === "success" || deployState.status === "error",
      result: deployState.result,
      error: deployState.error,
    }),
    [deployState],
  );

  const closeModal = React.useCallback(() => {
    resetDeployState();
  }, [resetDeployState]);

  const handleCloseAfterDeploy = React.useCallback(() => {
    const failed = deployState.status === "error";
    resetDeployState();
    if (failed) {
      showToast("Deploy gagal — cek pesan error dan coba lagi.");
      return;
    }
    setView("dashboard");
    setForm(emptyForm);
    showToast("Deploy berhasil — cek dashboard!");
  }, [deployState.status, resetDeployState, showToast]);

  /* ================================================================
   *  Domain / Env / Sync / Delete — tidak berubah dari aslinya
   * ================================================================ */

  const syncProjectStatus = React.useCallback(
    async (
      name: string,
      platform: Platform,
    ): Promise<"exists" | "deleted" | "skipped" | "error"> => {
      // Project identity is (name + platform), never name alone — the same
      // project name can legitimately exist on more than one platform (e.g.
      // deployed to Vercel once, then again to Railway under the same
      // name). Matching on name only here previously meant checking one
      // platform's status could wipe *every* history entry sharing that
      // name, including ones on a completely different, still-very-much-
      // alive platform.
      const safeHistory = Array.isArray(history) ? history : [];
      const targetItem = safeHistory.find(
        (h) => h.name === name && h.platform === platform,
      );
      if (!targetItem) return "skipped";

      const removeThisEntry = () => {
        setHistory((prev) =>
          (Array.isArray(prev) ? prev : []).filter(
            (h) => !(h.name === name && h.platform === platform),
          ),
        );
      };

      if (platform === "cloudflare") {
        if (!savedCloudflareToken) return "skipped";
        try {
          const status = await callApi<CloudflareProjectStatusResult>(
            `/api/cloudflare/status?project=${encodeURIComponent(
              name,
            )}&accountId=${encodeURIComponent(
              savedCloudflareToken.accountId,
            )}`,
            { headers: { "x-cloudflare-token": savedCloudflareToken.token } },
          );
          if (!status.exists) {
            removeThisEntry();
            return "deleted";
          }
          return "exists";
        } catch {
          return "error";
        }
      }
      if (platform === "railway") {
        if (!savedRailwayToken) return "skipped";
        try {
          const status = await callApi<RailwayProjectStatusResult>(
            `/api/railway/status?project=${encodeURIComponent(name)}`,
            { headers: { "x-railway-token": savedRailwayToken.token } },
          );
          if (!status.exists) {
            removeThisEntry();
            return "deleted";
          }
          return "exists";
        } catch {
          return "error";
        }
      }
      if (platform === "vercel") {
        if (!vercelToken) return "skipped";
        try {
          const status = await callApi<ProjectStatusResult>(
            `/api/vercel/status?project=${encodeURIComponent(name)}`,
            { headers: { "x-vercel-token": vercelToken } },
          );
          if (!status.exists) {
            removeThisEntry();
            return "deleted";
          }
          return "exists";
        } catch {
          return "error";
        }
      }
      // "render" (or any future platform with no real API behind it yet) —
      // nothing to check against, so leave it alone rather than guessing.
      return "skipped";
    },
    [history, savedCloudflareToken, savedRailwayToken, vercelToken, setHistory],
  );

  const syncAllProjects = React.useCallback(async () => {
    const safeHistory = Array.isArray(history) ? history : [];
    // Key by name+platform, not name alone — two different platforms can
    // share a project name and each needs to be checked against its own
    // remote independently (see syncProjectStatus).
    const pairs = new Map<string, { name: string; platform: Platform }>();
    for (const h of safeHistory) {
      const canCheck =
        (h.platform === "vercel" && vercelToken) ||
        (h.platform === "cloudflare" && savedCloudflareToken) ||
        (h.platform === "railway" && savedRailwayToken);
      if (!canCheck) continue;
      pairs.set(`${h.name}::${h.platform}`, { name: h.name, platform: h.platform });
    }
    if (pairs.size === 0) return;
    setSyncingProjects(true);
    let deletedCount = 0;
    for (const { name, platform } of pairs.values()) {
      const result = await syncProjectStatus(name, platform);
      if (result === "deleted") deletedCount += 1;
    }
    setSyncingProjects(false);
    if (deletedCount > 0) {
      showToast(
        `${deletedCount} project sudah dihapus di platform aslinya — dihapus juga dari daftar di sini.`,
      );
    }
  }, [
    history,
    syncProjectStatus,
    vercelToken,
    savedCloudflareToken,
    savedRailwayToken,
    showToast,
  ]);

  const deleteProject = React.useCallback(
    async (
      name: string,
      platform: Platform,
      options: {
        alsoDeleteFromVercel?: boolean;
        alsoDeleteFromCloudflare?: boolean;
        alsoDeleteFromRailway?: boolean;
      },
    ) => {
      // Look up (and later remove) strictly by name+platform — the same
      // project name can exist on more than one platform, and deleting one
      // must never touch the other's still-live history entry.
      const safeHistory = Array.isArray(history) ? history : [];
      const targetItem = safeHistory.find(
        (h) => h.name === name && h.platform === platform,
      );
      const isVercelProject = targetItem?.platform === "vercel";
      const isCloudflareProject = targetItem?.platform === "cloudflare";
      const isRailwayProject = targetItem?.platform === "railway";
      const alsoDelete = Boolean(
        options.alsoDeleteFromVercel || options.alsoDeleteFromCloudflare || options.alsoDeleteFromRailway,
      );

      if (options.alsoDeleteFromVercel && isVercelProject) {
        if (!vercelToken) {
          showToast(
            "Isi Vercel Token di Settings dulu untuk hapus project di Vercel.",
          );
          return;
        }
        setDeletingProject(name);
        try {
          await callApi(
            `/api/vercel/project?project=${encodeURIComponent(name)}`,
            {
              method: "DELETE",
              headers: { "x-vercel-token": vercelToken },
            },
          );
        } catch (err) {
          setDeletingProject(null);
          showToast(
            err instanceof Error
              ? `Gagal menghapus "${name}" di Vercel: ${err.message}`
              : `Gagal menghapus "${name}" di Vercel.`,
          );
          return;
        }
        setDeletingProject(null);
      }

      if (options.alsoDeleteFromCloudflare && isCloudflareProject) {
        if (!savedCloudflareToken) {
          showToast(
            "Konek-kan Cloudflare Token di Settings dulu untuk hapus project di Cloudflare.",
          );
          return;
        }
        setDeletingProject(name);
        try {
          await callApi(
            `/api/cloudflare/project?project=${encodeURIComponent(
              name,
            )}&accountId=${encodeURIComponent(
              savedCloudflareToken.accountId,
            )}`,
            {
              method: "DELETE",
              headers: { "x-cloudflare-token": savedCloudflareToken.token },
            },
          );
        } catch (err) {
          setDeletingProject(null);
          showToast(
            err instanceof Error
              ? `Gagal menghapus "${name}" di Cloudflare: ${err.message}`
              : `Gagal menghapus "${name}" di Cloudflare.`,
          );
          return;
        }
        setDeletingProject(null);
      }

      if (options.alsoDeleteFromRailway && isRailwayProject) {
        if (!savedRailwayToken) {
          showToast(
            "Konek-kan Railway Token di Settings dulu untuk hapus project di Railway.",
          );
          return;
        }
        setDeletingProject(name);
        try {
          await callApi(
            `/api/railway/project?project=${encodeURIComponent(name)}`,
            {
              method: "DELETE",
              headers: { "x-railway-token": savedRailwayToken.token },
            },
          );
        } catch (err) {
          setDeletingProject(null);
          showToast(
            err instanceof Error
              ? `Gagal menghapus "${name}" di Railway: ${err.message}`
              : `Gagal menghapus "${name}" di Railway.`,
          );
          return;
        }
        setDeletingProject(null);
      }

      setHistory((prev) =>
        (Array.isArray(prev) ? prev : []).filter(
          (h) => !(h.name === name && h.platform === platform),
        ),
      );
      showToast(
        alsoDelete
          ? `Project "${name}" dihapus dari Depup & ${
              isVercelProject ? "Vercel" : isCloudflareProject ? "Cloudflare" : "Railway"
            }.`
          : `Project "${name}" dihapus dari Depup (tetap ada di platform aslinya).`,
      );
    },
    [history, setHistory, showToast, vercelToken, savedCloudflareToken, savedRailwayToken],
  );

  const fetchImportableVercelProjects = React.useCallback(async () => {
    if (!vercelToken) {
      throw new Error(
        "Isi Vercel Token di Settings dulu untuk konek ke Vercel.",
      );
    }
    const remote = await callApi<VercelProjectSummary[]>("/api/vercel/project", {
      headers: { "x-vercel-token": vercelToken },
    });
    const safeHistory = Array.isArray(history) ? history : [];
    const existingNames = new Set(safeHistory.map((h) => h.name));
    return remote.filter((p) => !existingNames.has(p.name));
  }, [vercelToken, history]);

  const importVercelProject = React.useCallback(
    (project: VercelProjectSummary) => {
      const safeHistory = Array.isArray(history) ? history : [];
      if (safeHistory.some((h) => h.name === project.name)) {
        showToast(`Project "${project.name}" sudah ada di Depup.`);
        return;
      }
      const readyState = project.latestDeploymentReadyState;
      const status: HistoryItem["status"] =
        readyState === "ERROR" || readyState === "CANCELED"
          ? "failed"
          : "ready";
      addHistory(
        project.name,
        "vercel",
        project.domain ?? `${project.name}.vercel.app`,
        status,
      );
      showToast(`Project "${project.name}" berhasil diimport dari Vercel.`);
    },
    [history, addHistory, showToast],
  );

  const fetchImportableCloudflareProjects = React.useCallback(async () => {
    if (!savedCloudflareToken) {
      throw new Error(
        "Konek-kan Cloudflare Token di Settings dulu untuk konek ke Cloudflare.",
      );
    }
    const remote = await callApi<CloudflareProjectSummary[]>(
      `/api/cloudflare/project?accountId=${encodeURIComponent(
        savedCloudflareToken.accountId,
      )}`,
      { headers: { "x-cloudflare-token": savedCloudflareToken.token } },
    );
    const safeHistory = Array.isArray(history) ? history : [];
    const existingNames = new Set(safeHistory.map((h) => h.name));
    return remote.filter((p) => !existingNames.has(p.name));
  }, [savedCloudflareToken, history]);

  const importCloudflareProject = React.useCallback(
    (project: CloudflareProjectSummary) => {
      const safeHistory = Array.isArray(history) ? history : [];
      if (safeHistory.some((h) => h.name === project.name)) {
        showToast(`Project "${project.name}" sudah ada di Depup.`);
        return;
      }
      const readyState = project.latestDeploymentReadyState;
      const status: HistoryItem["status"] =
        readyState === "ERROR" || readyState === "CANCELED"
          ? "failed"
          : "ready";
      addHistory(
        project.name,
        "cloudflare",
        project.domain ?? `${project.name}.pages.dev`,
        status,
      );
      showToast(
        `Project "${project.name}" berhasil diimport dari Cloudflare Pages.`,
      );
    },
    [history, addHistory, showToast],
  );

  const syncEnvVarsForProject = React.useCallback(
    async (project: string): Promise<"synced" | "skipped" | "error"> => {
      const safeHistory = Array.isArray(history) ? history : [];
      const targetItem = safeHistory.find((h) => h.name === project);
      if (targetItem?.platform === "cloudflare") {
        if (!savedCloudflareToken) return "skipped";
        try {
          const remote = await callApi<CloudflareEnvSummary[]>(
            `/api/cloudflare/env?project=${encodeURIComponent(
              project,
            )}&accountId=${encodeURIComponent(
              savedCloudflareToken.accountId,
            )}`,
            { headers: { "x-cloudflare-token": savedCloudflareToken.token } },
          );
          let removedCount = 0;
          setEnvVars((prev) => {
            const safePrev = Array.isArray(prev) ? prev : [];
            return safePrev.filter((v) => {
              if (v.project !== project || !v.syncedToCloudflare) return true;
              const targetKey =
                v.environment === "Production" ? "production" : "preview";
              const stillExists = remote.some(
                (r) => r.key === v.key && r.target.includes(targetKey),
              );
              if (!stillExists) removedCount += 1;
              return stillExists;
            });
          });
          if (removedCount > 0) {
            showToast(
              `${removedCount} secret untuk "${project}" sudah dihapus di Cloudflare — dihapus juga di sini.`,
            );
          }
          return "synced";
        } catch {
          return "error";
        }
      }
      if (targetItem?.platform === "railway") {
        if (!savedRailwayToken) return "skipped";
        try {
          const remote = await callApi<RailwayEnvSummary[]>(
            `/api/railway/env?project=${encodeURIComponent(project)}`,
            { headers: { "x-railway-token": savedRailwayToken.token } },
          );
          let removedCount = 0;
          setEnvVars((prev) => {
            const safePrev = Array.isArray(prev) ? prev : [];
            return safePrev.filter((v) => {
              if (v.project !== project || !v.syncedToRailway) return true;
              const stillExists = remote.some((r) => r.key === v.key);
              if (!stillExists) removedCount += 1;
              return stillExists;
            });
          });
          if (removedCount > 0) {
            showToast(
              `${removedCount} secret untuk "${project}" sudah dihapus di Railway — dihapus juga di sini.`,
            );
          }
          return "synced";
        } catch {
          return "error";
        }
      }
      if (!vercelToken) return "skipped";
      try {
        const remote = await callApi<VercelEnvSummary[]>(
          `/api/vercel/env?project=${encodeURIComponent(project)}`,
          { headers: { "x-vercel-token": vercelToken } },
        );
        let removedCount = 0;
        setEnvVars((prev) => {
          const safePrev = Array.isArray(prev) ? prev : [];
          return safePrev.filter((v) => {
            if (v.project !== project || !v.syncedToVercel) return true;
            const targetKey =
              v.environment === "Production" ? "production" : "preview";
            const stillExists = remote.some(
              (r) => r.key === v.key && r.target.includes(targetKey),
            );
            if (!stillExists) removedCount += 1;
            return stillExists;
          });
        });
        if (removedCount > 0) {
          showToast(
            `${removedCount} secret untuk "${project}" sudah dihapus di Vercel — dihapus juga di sini.`,
          );
        }
        return "synced";
      } catch {
        return "error";
      }
    },
    [history, savedCloudflareToken, savedRailwayToken, vercelToken, setEnvVars, showToast],
  );

  const syncAllEnvVars = React.useCallback(async () => {
    const safeEnvVars = Array.isArray(envVars) ? envVars : [];
    const projects = Array.from(
      new Set(
        safeEnvVars
          .filter(
            (v) =>
              (v.syncedToVercel && vercelToken) ||
              (v.syncedToCloudflare && savedCloudflareToken) ||
              (v.syncedToRailway && savedRailwayToken),
          )
          .map((v) => v.project),
      ),
    );
    if (projects.length === 0) return;
    setSyncingEnvVars(true);
    for (const project of projects) {
      await syncEnvVarsForProject(project);
    }
    setSyncingEnvVars(false);
  }, [envVars, syncEnvVarsForProject, vercelToken, savedCloudflareToken, savedRailwayToken]);

  const triggerAutoRedeploy = React.useCallback(
    async (projectName: string, platform: Platform) => {
      if (platform === "cloudflare") {
        if (!savedCloudflareToken) return;
        showToast(
          `Redeploy otomatis "${projectName}" dimulai karena secret berubah...`,
        );
        try {
          await callApi<RedeployResult>("/api/cloudflare/redeploy", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              project: projectName,
              cloudflareToken: savedCloudflareToken.token,
              accountId: savedCloudflareToken.accountId,
            }),
          });
          showToast(
            `Redeploy "${projectName}" berhasil — perubahan secret sudah live.`,
          );
        } catch (err) {
          showToast(
            err instanceof Error
              ? `Redeploy otomatis "${projectName}" gagal: ${err.message}`
              : `Redeploy otomatis "${projectName}" gagal.`,
          );
        }
        return;
      }
      if (platform === "railway") {
        if (!savedRailwayToken) return;
        showToast(
          `Redeploy otomatis "${projectName}" dimulai karena secret berubah...`,
        );
        try {
          await callApi<RedeployResult>("/api/railway/redeploy", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              project: projectName,
              railwayToken: savedRailwayToken.token,
            }),
          });
          showToast(
            `Redeploy "${projectName}" berhasil — perubahan secret sudah live.`,
          );
        } catch (err) {
          showToast(
            err instanceof Error
              ? `Redeploy otomatis "${projectName}" gagal: ${err.message}`
              : `Redeploy otomatis "${projectName}" gagal.`,
          );
        }
        return;
      }
      if (!vercelToken) return;
      showToast(
        `Redeploy otomatis "${projectName}" dimulai karena secret berubah...`,
      );
      try {
        await callApi<RedeployResult>("/api/vercel/redeploy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ project: projectName, vercelToken }),
        });
        showToast(
          `Redeploy "${projectName}" berhasil — perubahan secret sudah live.`,
        );
      } catch (err) {
        showToast(
          err instanceof Error
            ? `Redeploy otomatis "${projectName}" gagal: ${err.message}`
            : `Redeploy otomatis "${projectName}" gagal.`,
        );
      }
    },
    [vercelToken, savedCloudflareToken, savedRailwayToken, showToast],
  );

  const addDomain = React.useCallback(
    async (domain: string, project: string, options?: { pairId?: string }) => {
      const trimmedDomain = domain.trim();
      if (!trimmedDomain) return;
      const isPairCall = Boolean(options?.pairId);
      const pairId =
        options?.pairId ??
        `pair-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      const safeDomainsNow = Array.isArray(domains) ? domains : [];
      const alreadyExists = safeDomainsNow.some(
        (d) =>
          d.project === project &&
          d.domain.toLowerCase() === trimmedDomain.toLowerCase(),
      );
      if (alreadyExists) {
        if (!isPairCall)
          showToast(`Domain "${trimmedDomain}" sudah ada untuk project ini.`);
        return;
      }

      const safeHistory = Array.isArray(history) ? history : [];
      const targetItem = safeHistory.find((h) => h.name === project);
      const canSyncVercel =
        Boolean(vercelToken) && targetItem?.platform === "vercel";
      const canSyncCloudflare =
        Boolean(savedCloudflareToken) && targetItem?.platform === "cloudflare";
      const canSyncRailway =
        Boolean(savedRailwayToken) && targetItem?.platform === "railway";

      if (!canSyncVercel && !canSyncCloudflare && !canSyncRailway) {
        setDomains((prev) => {
          const safePrev = Array.isArray(prev) ? prev : [];
          return [
            {
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              domain: trimmedDomain,
              project,
              status: "Pending" as const,
              syncedToVercel: false,
              syncedToCloudflare: false,
              syncedToRailway: false,
              pairId,
            },
            ...safePrev,
          ];
        });
        if (!isPairCall) {
          showToast(
            targetItem?.platform === "vercel" ||
              targetItem?.platform === "cloudflare" ||
              targetItem?.platform === "railway"
              ? `Domain disimpan lokal — konek-kan ${
                  targetItem.platform === "vercel"
                    ? "Vercel"
                    : targetItem.platform === "cloudflare"
                      ? "Cloudflare"
                      : "Railway"
                } Token di Settings untuk push otomatis.`
              : "Domain disimpan lokal (project ini bukan platform Vercel/Cloudflare/Railway).",
          );
        }
      } else if (canSyncCloudflare && savedCloudflareToken) {
        try {
          const result = await callApi<CloudflareDomainResult>(
            "/api/cloudflare/domains",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                project,
                domain: trimmedDomain,
                cloudflareToken: savedCloudflareToken.token,
                accountId: savedCloudflareToken.accountId,
              }),
            },
          );
          setDomains((prev) => {
            const safePrev = Array.isArray(prev) ? prev : [];
            return [
              {
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                domain: result.name,
                project,
                status: result.verified ? "Active" : "Pending",
                syncedToCloudflare: true,
                dns: result.dns,
                pairId,
              },
              ...safePrev,
            ];
          });
          if (!isPairCall) {
            showToast(
              result.verified
                ? "Domain berhasil ditambahkan & terverifikasi di Cloudflare."
                : "Domain ditambahkan di Cloudflare — arahkan DNS sesuai instruksi untuk verifikasi.",
            );
          }
        } catch (err) {
          if (isPairCall) {
            showToast(
              `Domain utama tersimpan, tapi gagal menambahkan pasangan "${trimmedDomain}" otomatis: ${
                err instanceof Error ? err.message : "unknown error"
              }`,
            );
            return;
          }
          showToast(
            err instanceof Error
              ? err.message
              : "Gagal menambahkan domain ke Cloudflare.",
          );
          return;
        }
      } else if (canSyncRailway && savedRailwayToken) {
        try {
          const result = await callApi<RailwayDomainResult>(
            "/api/railway/domains",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                project,
                domain: trimmedDomain,
                railwayToken: savedRailwayToken.token,
              }),
            },
          );
          setDomains((prev) => {
            const safePrev = Array.isArray(prev) ? prev : [];
            return [
              {
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                domain: result.domain,
                project,
                status: result.verified ? "Active" : "Pending",
                syncedToRailway: true,
                dns: result.dns,
                verificationDns: result.verificationDns,
                pairId,
              },
              ...safePrev,
            ];
          });
          if (!isPairCall) {
            showToast(
              result.verified
                ? "Domain berhasil ditambahkan & terverifikasi di Railway."
                : "Domain ditambahkan di Railway — arahkan DNS (CNAME + TXT) sesuai instruksi untuk verifikasi.",
            );
          }
        } catch (err) {
          if (isPairCall) {
            showToast(
              `Domain utama tersimpan, tapi gagal menambahkan pasangan "${trimmedDomain}" otomatis: ${
                err instanceof Error ? err.message : "unknown error"
              }`,
            );
            return;
          }
          showToast(
            err instanceof Error
              ? err.message
              : "Gagal menambahkan domain ke Railway.",
          );
          return;
        }
      } else {
        try {
          const result = await callApi<VercelDomainResult>(
            "/api/vercel/domains",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                project,
                domain: trimmedDomain,
                vercelToken,
              }),
            },
          );
          setDomains((prev) => {
            const safePrev = Array.isArray(prev) ? prev : [];
            return [
              {
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                domain: result.name,
                project,
                status: result.verified ? "Active" : "Pending",
                syncedToVercel: true,
                dns: result.dns,
                pairId,
              },
              ...safePrev,
            ];
          });
          if (!isPairCall) {
            showToast(
              result.verified
                ? "Domain berhasil ditambahkan & terverifikasi di Vercel."
                : "Domain ditambahkan di Vercel — arahkan DNS sesuai instruksi untuk verifikasi.",
            );
          }
        } catch (err) {
          if (isPairCall) {
            showToast(
              `Domain utama tersimpan, tapi gagal menambahkan pasangan "${trimmedDomain}" otomatis: ${
                err instanceof Error ? err.message : "unknown error"
              }`,
            );
            return;
          }
          showToast(
            err instanceof Error
              ? err.message
              : "Gagal menambahkan domain ke Vercel.",
          );
          return;
        }
      }

      if (!isPairCall) {
        const pairDomain = wwwPairFor(trimmedDomain);
        void addDomain(pairDomain, project, { pairId });
      }
    },
    [
      domains,
      history,
      setDomains,
      showToast,
      vercelToken,
      savedCloudflareToken,
      savedRailwayToken,
    ],
  );

  const removeDomain = React.useCallback(
    async (id: string) => {
      const safeDomains = Array.isArray(domains) ? domains : [];
      const item = safeDomains.find((d) => d.id === id);
      if (!item) return;

      const group = item.pairId
        ? safeDomains.filter((d) => d.pairId === item.pairId)
        : [item];

      const removedIds: string[] = [];
      for (const target of group) {
        if (target.syncedToVercel && vercelToken) {
          try {
            await callApi(
              `/api/vercel/domains/${encodeURIComponent(
                target.domain,
              )}?project=${encodeURIComponent(target.project)}`,
              { method: "DELETE", headers: { "x-vercel-token": vercelToken } },
            );
          } catch (err) {
            showToast(
              err instanceof Error
                ? `Gagal menghapus "${target.domain}" di Vercel: ${err.message}`
                : `Gagal menghapus "${target.domain}" di Vercel.`,
            );
            continue;
          }
        } else if (target.syncedToCloudflare && savedCloudflareToken) {
          try {
            await callApi(
              `/api/cloudflare/domains/${encodeURIComponent(
                target.domain,
              )}?project=${encodeURIComponent(
                target.project,
              )}&accountId=${encodeURIComponent(
                savedCloudflareToken.accountId,
              )}`,
              {
                method: "DELETE",
                headers: {
                  "x-cloudflare-token": savedCloudflareToken.token,
                },
              },
            );
          } catch (err) {
            showToast(
              err instanceof Error
                ? `Gagal menghapus "${target.domain}" di Cloudflare: ${err.message}`
                : `Gagal menghapus "${target.domain}" di Cloudflare.`,
            );
            continue;
          }
        } else if (target.syncedToRailway && savedRailwayToken) {
          try {
            await callApi(
              `/api/railway/domains/${encodeURIComponent(
                target.domain,
              )}?project=${encodeURIComponent(target.project)}`,
              {
                method: "DELETE",
                headers: { "x-railway-token": savedRailwayToken.token },
              },
            );
          } catch (err) {
            showToast(
              err instanceof Error
                ? `Gagal menghapus "${target.domain}" di Railway: ${err.message}`
                : `Gagal menghapus "${target.domain}" di Railway.`,
            );
            continue;
          }
        }
        removedIds.push(target.id);
      }

      if (removedIds.length === 0) return;

      setDomains((prev) =>
        (Array.isArray(prev) ? prev : []).filter(
          (d) => !removedIds.includes(d.id),
        ),
      );

      if (removedIds.length > 1) {
        showToast(
          `${removedIds.length} domain (termasuk pasangan www) berhasil dihapus.`,
        );
      }
    },
    [domains, setDomains, showToast, vercelToken, savedCloudflareToken, savedRailwayToken],
  );

  const syncDomainsForProject = React.useCallback(
    async (project: string): Promise<"synced" | "skipped" | "error"> => {
      const safeHistory = Array.isArray(history) ? history : [];
      const targetItem = safeHistory.find((h) => h.name === project);
      if (targetItem?.platform === "cloudflare") {
        if (!savedCloudflareToken) return "skipped";
        try {
          const remote = await callApi<{ name: string; verified: boolean }[]>(
            `/api/cloudflare/domains?project=${encodeURIComponent(
              project,
            )}&accountId=${encodeURIComponent(
              savedCloudflareToken.accountId,
            )}`,
            { headers: { "x-cloudflare-token": savedCloudflareToken.token } },
          );
          let removedCount = 0;
          setDomains((prev) => {
            const safePrev = Array.isArray(prev) ? prev : [];
            return safePrev.filter((d) => {
              if (d.project !== project || !d.syncedToCloudflare) return true;
              const stillExists = remote.some((r) => r.name === d.domain);
              if (!stillExists) removedCount += 1;
              return stillExists;
            });
          });
          if (removedCount > 0) {
            showToast(
              `${removedCount} domain untuk "${project}" sudah dihapus di Cloudflare — dihapus juga di sini.`,
            );
          }
          return "synced";
        } catch {
          return "error";
        }
      }
      if (targetItem?.platform === "railway") {
        if (!savedRailwayToken) return "skipped";
        try {
          const remote = await callApi<RailwayDomainResult[]>(
            `/api/railway/domains?project=${encodeURIComponent(project)}`,
            { headers: { "x-railway-token": savedRailwayToken.token } },
          );
          let removedCount = 0;
          setDomains((prev) => {
            const safePrev = Array.isArray(prev) ? prev : [];
            return safePrev.filter((d) => {
              if (d.project !== project || !d.syncedToRailway) return true;
              const stillExists = remote.some((r) => r.domain === d.domain);
              if (!stillExists) removedCount += 1;
              return stillExists;
            });
          });
          if (removedCount > 0) {
            showToast(
              `${removedCount} domain untuk "${project}" sudah dihapus di Railway — dihapus juga di sini.`,
            );
          }
          return "synced";
        } catch {
          return "error";
        }
      }
      if (!vercelToken) return "skipped";
      try {
        const remote = await callApi<{ name: string; verified: boolean }[]>(
          `/api/vercel/domains?project=${encodeURIComponent(project)}`,
          { headers: { "x-vercel-token": vercelToken } },
        );
        let removedCount = 0;
        setDomains((prev) => {
          const safePrev = Array.isArray(prev) ? prev : [];
          return safePrev.filter((d) => {
            if (d.project !== project || !d.syncedToVercel) return true;
            const stillExists = remote.some((r) => r.name === d.domain);
            if (!stillExists) removedCount += 1;
            return stillExists;
          });
        });
        if (removedCount > 0) {
          showToast(
            `${removedCount} domain untuk "${project}" sudah dihapus di Vercel — dihapus juga di sini.`,
          );
        }
        return "synced";
      } catch {
        return "error";
      }
    },
    [history, savedCloudflareToken, savedRailwayToken, vercelToken, setDomains, showToast],
  );

  const syncAllDomains = React.useCallback(async () => {
    const safeDomains = Array.isArray(domains) ? domains : [];
    const projects = Array.from(
      new Set(
        safeDomains
          .filter(
            (d) =>
              (d.syncedToVercel && vercelToken) ||
              (d.syncedToCloudflare && savedCloudflareToken) ||
              (d.syncedToRailway && savedRailwayToken),
          )
          .map((d) => d.project),
      ),
    );
    if (projects.length === 0) return;
    setSyncingDomains(true);
    for (const project of projects) {
      await syncDomainsForProject(project);
    }
    setSyncingDomains(false);
  }, [domains, syncDomainsForProject, vercelToken, savedCloudflareToken, savedRailwayToken]);

  const refreshDomainStatus = React.useCallback(
    async (id: string) => {
      const safeDomains = Array.isArray(domains) ? domains : [];
      const item = safeDomains.find((d) => d.id === id);
      if (!item) return;

      if (item.syncedToCloudflare && savedCloudflareToken) {
        try {
          const list = await callApi<{ name: string; verified: boolean }[]>(
            `/api/cloudflare/domains?project=${encodeURIComponent(
              item.project,
            )}&accountId=${encodeURIComponent(
              savedCloudflareToken.accountId,
            )}`,
            { headers: { "x-cloudflare-token": savedCloudflareToken.token } },
          );
          const match = list.find((d) => d.name === item.domain);
          if (!match) {
            setDomains((prev) =>
              (Array.isArray(prev) ? prev : []).filter((d) => d.id !== id),
            );
            showToast(
              `${item.domain} sudah tidak ada di Cloudflare — dihapus juga di sini.`,
            );
            return;
          }
          setDomains((prev) =>
            (Array.isArray(prev) ? prev : []).map((d) =>
              d.id === id
                ? {
                    ...d,
                    status: match.verified
                      ? ("Active" as const)
                      : ("Pending" as const),
                  }
                : d,
            ),
          );
          showToast(
            match.verified
              ? `${item.domain} sudah aktif — DNS terverifikasi.`
              : `${item.domain} masih menunggu DNS provider (belum terverifikasi).`,
          );
        } catch (err) {
          showToast(
            err instanceof Error ? err.message : "Gagal cek status domain.",
          );
        }
        return;
      }

      if (item.syncedToRailway && savedRailwayToken) {
        try {
          const list = await callApi<RailwayDomainResult[]>(
            `/api/railway/domains?project=${encodeURIComponent(item.project)}`,
            { headers: { "x-railway-token": savedRailwayToken.token } },
          );
          const match = list.find((d) => d.domain === item.domain);
          if (!match) {
            setDomains((prev) =>
              (Array.isArray(prev) ? prev : []).filter((d) => d.id !== id),
            );
            showToast(
              `${item.domain} sudah tidak ada di Railway — dihapus juga di sini.`,
            );
            return;
          }
          setDomains((prev) =>
            (Array.isArray(prev) ? prev : []).map((d) =>
              d.id === id
                ? {
                    ...d,
                    status: match.verified
                      ? ("Active" as const)
                      : ("Pending" as const),
                    dns: match.dns ?? d.dns,
                    verificationDns: match.verificationDns ?? d.verificationDns,
                  }
                : d,
            ),
          );
          showToast(
            match.verified
              ? `${item.domain} sudah aktif — DNS terverifikasi.`
              : `${item.domain} masih menunggu DNS provider (belum terverifikasi).`,
          );
        } catch (err) {
          showToast(
            err instanceof Error ? err.message : "Gagal cek status domain.",
          );
        }
        return;
      }

      if (!item.syncedToVercel || !vercelToken) return;
      try {
        const list = await callApi<{ name: string; verified: boolean }[]>(
          `/api/vercel/domains?project=${encodeURIComponent(item.project)}`,
          { headers: { "x-vercel-token": vercelToken } },
        );
        const match = list.find((d) => d.name === item.domain);
        if (!match) {
          setDomains((prev) =>
            (Array.isArray(prev) ? prev : []).filter((d) => d.id !== id),
          );
          showToast(
            `${item.domain} sudah tidak ada di Vercel — dihapus juga di sini.`,
          );
          return;
        }
        setDomains((prev) =>
          (Array.isArray(prev) ? prev : []).map((d) =>
            d.id === id
              ? {
                  ...d,
                  status: match.verified
                    ? ("Active" as const)
                    : ("Pending" as const),
                }
              : d,
          ),
        );
        showToast(
          match.verified
            ? `${item.domain} sudah aktif — DNS terverifikasi.`
            : `${item.domain} masih menunggu DNS provider (belum terverifikasi).`,
        );
      } catch (err) {
        showToast(
          err instanceof Error ? err.message : "Gagal cek status domain.",
        );
      }
    },
    [domains, setDomains, showToast, vercelToken, savedCloudflareToken, savedRailwayToken],
  );

  const addEnvVar = React.useCallback(
    async (
      key: string,
      value: string,
      environment: "Production" | "Preview",
      project: string,
      options?: { pushToVercel?: boolean; pushToCloudflare?: boolean; pushToRailway?: boolean },
    ) => {
      const trimmedKey = key.trim();
      const trimmedProject = project.trim();
      if (!ENV_KEY_RE.test(trimmedKey)) {
        showToast(
          "Key harus UPPER_SNAKE_CASE, contoh: DATABASE_URL (huruf besar & underscore).",
        );
        return;
      }
      if (!trimmedProject) {
        showToast(
          "Pilih project untuk secret ini — env var selalu disimpan per-project.",
        );
        return;
      }
      const safeEnvVars = Array.isArray(envVars) ? envVars : [];
      if (
        safeEnvVars.some(
          (v) =>
            v.key === trimmedKey &&
            v.environment === environment &&
            v.project === trimmedProject,
        )
      ) {
        showToast(
          `Key "${trimmedKey}" sudah ada untuk project "${trimmedProject}" (${environment}).`,
        );
        return;
      }
      let syncedToVercel = false;
      let syncedToCloudflare = false;
      let syncedToRailway = false;
      if (options?.pushToVercel) {
        if (!vercelToken) {
          showToast(
            "Isi Vercel Token di Settings dulu untuk push env ke Vercel.",
          );
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
              target:
                environment === "Production" ? ["production"] : ["preview"],
              vercelToken,
            }),
          });
          syncedToVercel = true;
        } catch (err) {
          showToast(
            err instanceof Error
              ? err.message
              : "Gagal push env var ke Vercel.",
          );
          return;
        }
      } else if (options?.pushToCloudflare) {
        if (!savedCloudflareToken) {
          showToast(
            "Konek-kan Cloudflare Token di Settings dulu untuk push env ke Cloudflare.",
          );
          return;
        }
        try {
          await callApi("/api/cloudflare/env", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              project: trimmedProject,
              key: trimmedKey,
              value,
              target:
                environment === "Production" ? ["production"] : ["preview"],
              cloudflareToken: savedCloudflareToken.token,
              accountId: savedCloudflareToken.accountId,
            }),
          });
          syncedToCloudflare = true;
        } catch (err) {
          showToast(
            err instanceof Error
              ? err.message
              : "Gagal push env var ke Cloudflare.",
          );
          return;
        }
      } else if (options?.pushToRailway) {
        if (!savedRailwayToken) {
          showToast(
            "Konek-kan Railway Token di Settings dulu untuk push env ke Railway.",
          );
          return;
        }
        try {
          await callApi("/api/railway/env", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              project: trimmedProject,
              key: trimmedKey,
              value,
              railwayToken: savedRailwayToken.token,
            }),
          });
          syncedToRailway = true;
        } catch (err) {
          showToast(
            err instanceof Error
              ? err.message
              : "Gagal push env var ke Railway.",
          );
          return;
        }
      }
      setEnvVars((prev) => {
        const safePrev = Array.isArray(prev) ? prev : [];
        return [
          {
            id: `${Date.now()}`,
            key: trimmedKey,
            value,
            environment,
            visible: false,
            project: trimmedProject,
            syncedToVercel,
            syncedToCloudflare,
            syncedToRailway,
          },
          ...safePrev,
        ];
      });
      showToast(
        syncedToVercel
          ? `Secret disimpan untuk "${trimmedProject}" & di-push ke Vercel.`
          : syncedToCloudflare
            ? `Secret disimpan untuk "${trimmedProject}" & di-push ke Cloudflare.`
            : syncedToRailway
              ? `Secret disimpan untuk "${trimmedProject}" & di-push ke Railway.`
              : `Secret disimpan untuk project "${trimmedProject}".`,
      );
      if (syncedToVercel) {
        void triggerAutoRedeploy(trimmedProject, "vercel");
      } else if (syncedToCloudflare) {
        void triggerAutoRedeploy(trimmedProject, "cloudflare");
      } else if (syncedToRailway) {
        void triggerAutoRedeploy(trimmedProject, "railway");
      }
    },
    [
      envVars,
      setEnvVars,
      showToast,
      vercelToken,
      savedCloudflareToken,
      savedRailwayToken,
      triggerAutoRedeploy,
    ],
  );

  const removeEnvVar = React.useCallback(
    async (id: string) => {
      const safeEnvVars = Array.isArray(envVars) ? envVars : [];
      const item = safeEnvVars.find((v) => v.id === id);
      if (item?.syncedToVercel && vercelToken) {
        try {
          await callApi(
            `/api/vercel/env?project=${encodeURIComponent(
              item.project,
            )}&key=${encodeURIComponent(item.key)}`,
            { method: "DELETE", headers: { "x-vercel-token": vercelToken } },
          );
        } catch (err) {
          showToast(
            err instanceof Error
              ? err.message
              : "Gagal menghapus env var di Vercel.",
          );
          return;
        }
      } else if (item?.syncedToCloudflare && savedCloudflareToken) {
        try {
          await callApi(
            `/api/cloudflare/env?project=${encodeURIComponent(
              item.project,
            )}&accountId=${encodeURIComponent(
              savedCloudflareToken.accountId,
            )}&key=${encodeURIComponent(item.key)}`,
            {
              method: "DELETE",
              headers: { "x-cloudflare-token": savedCloudflareToken.token },
            },
          );
        } catch (err) {
          showToast(
            err instanceof Error
              ? err.message
              : "Gagal menghapus env var di Cloudflare.",
          );
          return;
        }
      } else if (item?.syncedToRailway && savedRailwayToken) {
        try {
          await callApi(
            `/api/railway/env?project=${encodeURIComponent(
              item.project,
            )}&key=${encodeURIComponent(item.key)}`,
            {
              method: "DELETE",
              headers: { "x-railway-token": savedRailwayToken.token },
            },
          );
        } catch (err) {
          showToast(
            err instanceof Error
              ? err.message
              : "Gagal menghapus env var di Railway.",
          );
          return;
        }
      }
      setEnvVars((prev) =>
        (Array.isArray(prev) ? prev : []).filter((v) => v.id !== id),
      );
      if (item?.syncedToVercel && vercelToken) {
        void triggerAutoRedeploy(item.project, "vercel");
      } else if (item?.syncedToCloudflare && savedCloudflareToken) {
        void triggerAutoRedeploy(item.project, "cloudflare");
      } else if (item?.syncedToRailway && savedRailwayToken) {
        void triggerAutoRedeploy(item.project, "railway");
      }
    },
    [
      envVars,
      setEnvVars,
      showToast,
      vercelToken,
      savedCloudflareToken,
      savedRailwayToken,
      triggerAutoRedeploy,
    ],
  );

  const toggleEnvVisible = React.useCallback(
    (id: string) => {
      setEnvVars((prev) =>
        (Array.isArray(prev) ? prev : []).map((v) =>
          v.id === id ? { ...v, visible: !v.visible } : v,
        ),
      );
    },
    [setEnvVars],
  );

  /* ================================================================
   *  Context value
   * ================================================================ */

  const value: DeployContextValue = {
    view,
    setView,
    stats,
    history: Array.isArray(history) ? history : [],
    form,
    setFormField,
    platformTokenLabel,
    repoEnvCheck,

    // legacy + modern deploy views
    modal,
    deployState,
    closeModal,
    handleCloseAfterDeploy,
    resetDeployState,

    savedVercelToken,
    savedVercelTokenStatus,
    savedCloudflareToken,
    savedCloudflareTokenStatus,
    cloudflareAccounts,
    savedRailwayToken,
    savedRailwayTokenStatus,
    githubConnectionStatus,
    checkGithubConnection,

    confirmOpen: false,
    submitDeploy,
    proceedDeploy,
    closeConfirm,

    redeploy,

    vercelToken,
    cloudflareToken,
    cloudflareAccountId,
    railwayToken,

    syncingProjects,
    syncProjectStatus,
    syncAllProjects,
    deletingProject,
    deleteProject,

    fetchImportableVercelProjects,
    importVercelProject,
    fetchImportableCloudflareProjects,
    importCloudflareProject,

    domains: Array.isArray(domains) ? domains : [],
    addDomain,
    removeDomain,
    refreshDomainStatus,
    syncingDomains,
    syncDomainsForProject,
    syncAllDomains,

    envVars: Array.isArray(envVars) ? envVars : [],
    addEnvVar,
    removeEnvVar,
    toggleEnvVisible,
    syncingEnvVars,
    syncEnvVarsForProject,
    syncAllEnvVars,

    focusedTrafficProject,
    setFocusedTrafficProject,
  };

  return (
    <DeployContext.Provider value={value}>{children}</DeployContext.Provider>
  );
}