"use client";

import * as React from "react";
import { useToast } from "@/components/ui/Toast";
import { resolveDomain, formatDate } from "@/lib/utils";
import type { DashboardView, DeployFormValues, HistoryItem, Platform } from "@/types";

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

const GITHUB_REPO_RE = /^https:\/\/github\.com\/[^/]+\/[^/]+/;

const DEFAULT_MODAL_TITLE = "Deploy Project";
const DEFAULT_MODAL_SUBTITLE = "Import repository dan deploy ke edge network dalam satu klik.";

const emptyForm: DeployFormValues = {
  projectName: "",
  platform: "vercel",
  domain: "",
  platformToken: "",
  githubToken: "",
  note: "",
};

function seedHistory(): HistoryItem[] {
  return [
    {
      id: "seed-3",
      name: "deployone-marketing",
      platform: "vercel",
      domain: "deployone-marketing.vercel.app",
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
  result: { name: string; domain: string } | null;
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

  const addHistory = React.useCallback((name: string, platform: Platform, domain: string) => {
    const item: HistoryItem = {
      id: `${Date.now()}`,
      name,
      platform,
      domain,
      date: formatDate(new Date()),
      status: "ready",
    };
    setHistory((prev) => {
      const next = [item, ...prev];
      // Keep max 10: drop the oldest (last) entry once the cap is exceeded.
      return next.length > MAX_HISTORY ? next.slice(0, MAX_HISTORY) : next;
    });
    setStats((prev) => ({ ...prev, total: prev.total + 1, ready: prev.ready + 1 }));
  }, []);

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

  const startDeploy = React.useCallback(
    (data: DeployFormValues) => {
      if (intervalRef.current) clearInterval(intervalRef.current);

      setModal({
        open: true,
        stepIndex: 0,
        barWidth: 0,
        title: DEFAULT_MODAL_TITLE,
        subtitle: DEFAULT_MODAL_SUBTITLE,
        resultVisible: false,
        closeVisible: false,
        result: null,
      });

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
    [finishDeploy]
  );

  const submitDeploy = React.useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const repoCandidate = (form.githubToken || form.projectName || "").trim();

      if (!GITHUB_REPO_RE.test(repoCandidate)) {
        showToast("Format URL GitHub belum benar");
        return;
      }

      if (history.length >= MAX_HISTORY) {
        pendingFormRef.current = form;
        setConfirmOpen(true);
        return;
      }

      startDeploy(form);
    },
    [form, history.length, showToast, startDeploy]
  );

  const proceedDeploy = React.useCallback(() => {
    setConfirmOpen(false);
    if (pendingFormRef.current) {
      startDeploy(pendingFormRef.current);
      pendingFormRef.current = null;
    }
  }, [startDeploy]);

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
    }));
  }, []);

  const handleCloseAfterDeploy = React.useCallback(() => {
    closeModal();
    setView("dashboard");
    setForm(emptyForm);
    showToast("Deploy berhasil — cek dashboard!");
  }, [closeModal, showToast]);

  const redeploy = React.useCallback(
    (name: string) => {
      setForm((prev) => ({ ...prev, projectName: name }));
      setView("deploy");
      showToast("Project dimuat ke form deploy");
    },
    [showToast]
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
  };

  return <DeployContext.Provider value={value}>{children}</DeployContext.Provider>;
}
