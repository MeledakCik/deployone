"use client";

import * as React from "react";
import {
  HelpCircle,
  Loader2,
  ShieldCheck,
  Terminal,
  Check,
  Rocket,
  ArrowRight,
  ArrowLeft,
  X,
  Globe,
  Cloud,
  TramFront,
  Box,
  Github,
  KeyRound,
  CircleAlert,
  ExternalLink,
  Hammer,
  FolderOutput,
} from "lucide-react";
import { ViewFade } from "@/components/ui/ViewFade";
import { cn } from "@/lib/utils";
import { useDeploy } from "@/lib/deploy-context";
import type { Platform } from "@/types";

/* ---------------- Platform config ---------------- */

const PLATFORMS: {
  id: Platform;
  label: string;
  desc: string;
  accent: string;
  letter: string;
  Icon: any;
}[] = [
  {
    id: "vercel",
    label: "Vercel",
    desc: "Frontend Cloud terbaik untuk Next.js",
    accent: "#0a0a0f", // di-override CSS var di render
    letter: "▲",
    Icon: Globe,
  },
  {
    id: "cloudflare",
    label: "Cloudflare",
    desc: "Pages & Workers global edge network",
    accent: "#f6821f",
    letter: "☁️",
    Icon: Cloud,
  },
  {
    id: "railway",
    label: "Railway",
    desc: "Deploy app & database tanpa ribet",
    accent: "#a78bfa",
    letter: "◧",
    Icon: TramFront,
  },
  {
    id: "render",
    label: "Render",
    desc: "Cloud serbaguna untuk web services",
    accent: "#5ee9a8",
    letter: "◍",
    Icon: Box,
  },
];

/** Best-effort preview domain suffix per platform — mirrors `resolveDomain` in lib/utils.ts. */
function domainSuffixFor(p: Platform): string {
  if (p === "cloudflare") return "pages.dev";
  if (p === "railway") return "up.railway.app";
  if (p === "render") return "onrender.com";
  return "vercel.app";
}

/* ---------------- Shared classes ---------------- */

const inputCls =
  "w-full h-11 sm:h-[46px] rounded-xl sm:rounded-[12px] bg-[var(--dc-input)] border border-[var(--dc-line)] px-3.5 sm:px-4 text-[13.5px] sm:text-[14px] text-[var(--dc-text)] placeholder:text-[var(--dc-text-faint)] focus:outline-none focus:border-[var(--dc-line-strong)] focus:bg-[var(--dc-input-focus)] transition-colors";

const textareaCls =
  "w-full rounded-xl sm:rounded-[12px] bg-[var(--dc-input)] border border-[var(--dc-line)] px-3.5 sm:px-4 py-2.5 sm:py-3 text-[12.5px] sm:text-[13px] text-[var(--dc-text)] placeholder:text-[var(--dc-text-faint)] focus:outline-none focus:border-[var(--dc-line-strong)] focus:bg-[var(--dc-input-focus)] transition-colors resize-none font-mono";

const labelCls =
  "block text-[10.5px] sm:text-[11px] tracking-wide uppercase text-[var(--dc-text-faint)] font-medium";

/* ---------------- Step definitions ---------------- */

type StepDef = {
  id: string;
  title: string;
  desc: string;
  required?: boolean;
  optional?: boolean;
  icon: any;
};

function getStepsForPlatform(p: Platform): StepDef[] {
  const base: StepDef[] = [
    {
      id: "projectName",
      title: "Nama Project",
      desc: "Nama unik untuk project kamu. Ini akan jadi subdomain kamu nantinya.",
      required: true,
      icon: Rocket,
    },
    {
      id: "githubUrl",
      title: "GitHub URL",
      desc: "Link repository GitHub yang mau di-deploy. Pastikan repo public atau isi token private nanti.",
      required: true,
      icon: Github,
    },
  ];

  if (p === "vercel")
    return [
      ...base,
      {
        id: "platformToken",
        title: "Vercel Token",
        desc: "Token untuk autentikasi ke akun Vercel kamu. Kalau sudah ada di Settings, bisa langsung pakai.",
        required: true,
        icon: KeyRound,
      },
      {
        id: "githubPat",
        title: "GitHub Token",
        desc: "Hanya untuk repo private. Bisa dilewati kalau repo kamu public.",
        optional: true,
        icon: Github,
      },
    ];
  if (p === "cloudflare")
    return [
      ...base,
      {
        id: "platformToken",
        title: "Cloudflare Token",
        desc: "API Token Cloudflare dengan permission Pages:Edit",
        required: true,
        icon: KeyRound,
      },
      {
        id: "accountId",
        title: "Account ID",
        desc: "ID akun Cloudflare kamu. Otomatis terisi kalau token dari Settings.",
        required: true,
        icon: Globe,
      },
      {
        id: "build",
        title: "Build Config",
        desc: "Opsional. Kosongkan = auto-detect framework (Next.js, Vite, dll).",
        optional: true,
        icon: Hammer,
      },
      {
        id: "githubPat",
        title: "GitHub Token",
        desc: "Untuk repo private. Bisa dilewati.",
        optional: true,
        icon: Github,
      },
    ];
  if (p === "railway")
    return [
      ...base,
      {
        id: "platformToken",
        title: "Railway Token",
        desc: "Token Railway kamu.",
        required: true,
        icon: KeyRound,
      },
      {
        id: "env",
        title: "Environment Variables",
        desc: "Opsional. Format KEY=value per baris.",
        optional: true,
        icon: FolderOutput,
      },
    ];
  return [
    ...base,
    {
      id: "platformToken",
      title: "Render API Key",
      desc: "API Key dari dashboard Render.",
      required: true,
      icon: KeyRound,
    },
    {
      id: "build",
      title: "Build & Start Command",
      desc: "Opsional, kosongkan untuk auto-detect.",
      optional: true,
      icon: Hammer,
    },
  ];
}

/* ---------------- Small building blocks ---------------- */

function TokenHelpLink({ topic }: { topic: string }) {
  const { setView } = useDeploy();
  return (
    <button
      type="button"
      onClick={() => setView("docs")}
      className="inline-flex items-center gap-1 sm:gap-1.5 text-[10.5px] sm:text-[11px] font-medium text-violet-500 dark:text-violet-400 hover:text-[var(--dc-text)] transition-colors shrink-0"
    >
      <HelpCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Cara dapetin {topic}
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
    <div className="mb-2 flex items-center justify-between gap-2 flex-wrap">
      <label htmlFor={htmlFor} className={labelCls}>
        {children} {required && <span className="text-red-500 dark:text-red-400">*</span>}
        {optional && (
          <span className="text-[var(--dc-text-faint)] lowercase normal-case ml-1">
            (opsional)
          </span>
        )}
      </label>
      {help && <TokenHelpLink topic={help} />}
    </div>
  );
}

/* ---------------- Token fields ---------------- */

function VercelTokenField() {
  const { form, setFormField, savedVercelToken, savedVercelTokenStatus } =
    useDeploy();
  const [manualOverride, setManualOverride] = React.useState(false);
  const usingSaved =
    savedVercelTokenStatus === "ok" && !!savedVercelToken && !manualOverride;

  React.useEffect(() => {
    if (usingSaved && savedVercelToken) {
      setFormField("platformToken", savedVercelToken.token);
    }
  }, [usingSaved, savedVercelToken, setFormField]);

  if (savedVercelTokenStatus === "checking") {
    return (
      <p className="inline-flex items-center gap-2 text-[11.5px] sm:text-xs text-[var(--dc-text-muted)]">
        <Loader2 size={13} className="animate-spin" /> Mengecek token...
      </p>
    );
  }

  if (usingSaved && savedVercelToken) {
    return (
      <div>
        <FieldLabel htmlFor="platformToken" required>
          Vercel Token
        </FieldLabel>
        <div className="rounded-xl sm:rounded-[14px] border border-[var(--dc-green-line)] bg-[var(--dc-green-bg)] p-3.5 sm:p-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-500/15 dark:bg-emerald-400/20 flex items-center justify-center shrink-0">
              <ShieldCheck
                size={14}
                className="sm:hidden text-emerald-600 dark:text-emerald-300"
              />
              <ShieldCheck
                size={16}
                className="hidden sm:block text-emerald-600 dark:text-emerald-300"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] sm:text-[13px] font-medium text-[var(--dc-green-fg)] truncate">
                Terhubung sebagai @{savedVercelToken.username}
              </div>
              <div className="text-[10.5px] sm:text-[11px] text-[var(--dc-green-fg-muted)] mt-0.5">
                Token dari Settings • aman
              </div>
            </div>
          </div>
          <div className="mt-3 sm:mt-4 grid grid-cols-2 gap-2 sm:gap-2.5">
            <button
              type="button"
              onClick={() => setManualOverride(false)}
              className="h-9 rounded-full bg-emerald-500 text-white dark:bg-emerald-400 dark:text-black text-[12px] sm:text-[13px] font-medium hover:opacity-90 transition-opacity"
            >
              Pakai token ini
            </button>
            <button
              type="button"
              onClick={() => setManualOverride(true)}
              className="h-9 rounded-full bg-[var(--dc-pill)] border border-[var(--dc-line)] text-[var(--dc-text-muted)] text-[12px] sm:text-[13px] font-medium hover:bg-[var(--dc-hover)] transition-colors"
            >
              Ganti token
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <FieldLabel htmlFor="platformToken" required help="Vercel Token">
        Vercel Token
      </FieldLabel>
      <div className="relative">
        <input
          id="platformToken"
          type="password"
          placeholder="••••••••••••••••"
          value={form.platformToken}
          onChange={(e) => setFormField("platformToken", e.target.value)}
          className={cn(inputCls, "pr-10 font-mono text-[12.5px] sm:text-[13px]")}
        />
        <KeyRound className="absolute right-3 sm:right-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-[var(--dc-text-faint)]" />
      </div>
      {savedVercelToken && (
        <button
          type="button"
          onClick={() => setManualOverride(false)}
          className="mt-2 sm:mt-2.5 text-[10.5px] sm:text-[11px] text-[var(--dc-text-muted)] hover:text-[var(--dc-text)] underline underline-offset-4"
        >
          Pakai token tersimpan lagi
        </button>
      )}
    </div>
  );
}

function CloudflareTokenField() {
  const {
    form,
    setFormField,
    savedCloudflareToken,
    savedCloudflareTokenStatus,
  } = useDeploy();
  const [manualOverride, setManualOverride] = React.useState(false);
  const usingSaved =
    savedCloudflareTokenStatus === "ok" &&
    !!savedCloudflareToken &&
    !manualOverride;

  React.useEffect(() => {
    if (usingSaved && savedCloudflareToken) {
      setFormField("platformToken", savedCloudflareToken.token);
      setFormField("accountId", savedCloudflareToken.accountId);
    }
  }, [usingSaved, savedCloudflareToken, setFormField]);

  if (savedCloudflareTokenStatus === "checking") {
    return (
      <p className="inline-flex items-center gap-2 text-[11.5px] sm:text-xs text-[var(--dc-text-muted)]">
        <Loader2 size={13} className="animate-spin" /> Mengecek token...
      </p>
    );
  }

  if (usingSaved && savedCloudflareToken) {
    return (
      <div>
        <FieldLabel htmlFor="platformToken" required>
          Cloudflare Token
        </FieldLabel>
        <div className="rounded-xl sm:rounded-[14px] border border-[var(--dc-green-line)] bg-[var(--dc-green-bg)] p-3.5 sm:p-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-500/15 dark:bg-emerald-400/20 flex items-center justify-center shrink-0">
              <ShieldCheck
                size={14}
                className="sm:hidden text-emerald-600 dark:text-emerald-300"
              />
              <ShieldCheck
                size={16}
                className="hidden sm:block text-emerald-600 dark:text-emerald-300"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] sm:text-[13px] font-medium text-[var(--dc-green-fg)] truncate">
                {savedCloudflareToken.accountName}
              </div>
              <div className="text-[10.5px] sm:text-[11px] text-[var(--dc-green-fg-muted)] mt-0.5">
                Token dari Settings
              </div>
            </div>
          </div>
          <div className="mt-3 sm:mt-4 grid grid-cols-2 gap-2 sm:gap-2.5">
            <button
              type="button"
              onClick={() => setManualOverride(false)}
              className="h-9 rounded-full bg-emerald-500 text-white dark:bg-emerald-400 dark:text-black text-[12px] sm:text-[13px] font-medium hover:opacity-90 transition-opacity"
            >
              Pakai token ini
            </button>
            <button
              type="button"
              onClick={() => setManualOverride(true)}
              className="h-9 rounded-full bg-[var(--dc-pill)] border border-[var(--dc-line)] text-[var(--dc-text-muted)] text-[12px] sm:text-[13px] font-medium hover:bg-[var(--dc-hover)] transition-colors"
            >
              Ganti token
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <FieldLabel htmlFor="platformToken" required help="Cloudflare Token">
        Cloudflare Token
      </FieldLabel>
      <div className="relative">
        <input
          id="platformToken"
          type="password"
          placeholder="••••••••••••••••"
          value={form.platformToken}
          onChange={(e) => setFormField("platformToken", e.target.value)}
          className={cn(inputCls, "pr-10 font-mono text-[12.5px] sm:text-[13px]")}
        />
        <KeyRound className="absolute right-3 sm:right-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-[var(--dc-text-faint)]" />
      </div>
      {savedCloudflareToken && (
        <button
          type="button"
          onClick={() => setManualOverride(false)}
          className="mt-2 sm:mt-2.5 text-[10.5px] sm:text-[11px] text-[var(--dc-text-muted)] hover:text-[var(--dc-text)] underline underline-offset-4"
        >
          Pakai token tersimpan lagi
        </button>
      )}
    </div>
  );
}

function RailwayTokenField() {
  const { form, setFormField, savedRailwayToken, savedRailwayTokenStatus } =
    useDeploy();
  const [manualOverride, setManualOverride] = React.useState(false);
  const usingSaved =
    savedRailwayTokenStatus === "ok" && !!savedRailwayToken && !manualOverride;

  React.useEffect(() => {
    if (usingSaved && savedRailwayToken) {
      setFormField("platformToken", savedRailwayToken.token);
    }
  }, [usingSaved, savedRailwayToken, setFormField]);

  if (savedRailwayTokenStatus === "checking") {
    return (
      <p className="inline-flex items-center gap-2 text-[11.5px] sm:text-xs text-[var(--dc-text-muted)]">
        <Loader2 size={13} className="animate-spin" /> Mengecek token...
      </p>
    );
  }

  if (usingSaved && savedRailwayToken) {
    return (
      <div>
        <FieldLabel htmlFor="platformToken" required>
          Railway Token
        </FieldLabel>
        <div className="rounded-xl sm:rounded-[14px] border border-[var(--dc-green-line)] bg-[var(--dc-green-bg)] p-3.5 sm:p-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-500/15 dark:bg-emerald-400/20 flex items-center justify-center shrink-0">
              <ShieldCheck
                size={14}
                className="sm:hidden text-emerald-600 dark:text-emerald-300"
              />
              <ShieldCheck
                size={16}
                className="hidden sm:block text-emerald-600 dark:text-emerald-300"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] sm:text-[13px] font-medium text-[var(--dc-green-fg)] truncate">
                {savedRailwayToken.name}
              </div>
              <div className="text-[10.5px] sm:text-[11px] text-[var(--dc-green-fg-muted)] mt-0.5">
                Token dari Settings
              </div>
            </div>
          </div>
          <div className="mt-3 sm:mt-4 grid grid-cols-2 gap-2 sm:gap-2.5">
            <button
              type="button"
              onClick={() => setManualOverride(false)}
              className="h-9 rounded-full bg-emerald-500 text-white dark:bg-emerald-400 dark:text-black text-[12px] sm:text-[13px] font-medium hover:opacity-90 transition-opacity"
            >
              Pakai token ini
            </button>
            <button
              type="button"
              onClick={() => setManualOverride(true)}
              className="h-9 rounded-full bg-[var(--dc-pill)] border border-[var(--dc-line)] text-[var(--dc-text-muted)] text-[12px] sm:text-[13px] font-medium hover:bg-[var(--dc-hover)] transition-colors"
            >
              Ganti token
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <FieldLabel htmlFor="platformToken" required help="Railway Token">
        Railway Token
      </FieldLabel>
      <div className="relative">
        <input
          id="platformToken"
          type="password"
          placeholder="••••••••••••••••"
          value={form.platformToken}
          onChange={(e) => setFormField("platformToken", e.target.value)}
          className={cn(inputCls, "pr-10 font-mono text-[12.5px] sm:text-[13px]")}
        />
        <KeyRound className="absolute right-3 sm:right-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-[var(--dc-text-faint)]" />
      </div>
      {savedRailwayToken && (
        <button
          type="button"
          onClick={() => setManualOverride(false)}
          className="mt-2 sm:mt-2.5 text-[10.5px] sm:text-[11px] text-[var(--dc-text-muted)] hover:text-[var(--dc-text)] underline underline-offset-4"
        >
          Pakai token tersimpan lagi
        </button>
      )}
    </div>
  );
}

/* ================================================================ */
/*  MAIN VIEW                                                       */
/* ================================================================ */

export function DeployFormView() {
  const { form, setFormField, submitDeploy } = useDeploy();

  const [isModalOpen, setModalOpen] = React.useState(false);
  const [currentStep, setCurrentStep] = React.useState(0);
  const [dir, setDir] = React.useState<1 | -1>(1);

  const platform = (form.platform || "vercel") as Platform;
  const steps = React.useMemo(() => getStepsForPlatform(platform), [platform]);
  const step = steps[currentStep];
  const activePlatformInfo = PLATFORMS.find((p) => p.id === platform);
  const isLast = currentStep === steps.length - 1;

  React.useEffect(() => {
    if (!form.platform) setFormField("platform", "vercel");
  }, [form.platform, setFormField]);

  /* lock body scroll saat wizard buka */
  React.useEffect(() => {
    if (!isModalOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [isModalOpen]);

  /* Validation */
  const canNext = React.useMemo(() => {
    if (!step) return false;
    if (step.optional) return true;
    switch (step.id) {
      case "projectName":
        return (
          !!form.projectName?.trim() && form.projectName.trim().length >= 3
        );
      case "githubUrl":
        return !!form.githubUrl?.trim() && form.githubUrl.includes("github.com");
      case "platformToken":
        return !!form.platformToken?.trim();
      case "accountId":
        return !!form.accountId?.trim();
      default:
        return true;
    }
  }, [step, form]);

  const repoHost = React.useMemo(() => {
    const raw = form.githubUrl?.trim();
    if (!raw) return "github.com/username/repo";
    try {
      const u = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
      const host = u.hostname + u.pathname;
      return host.length > 32 ? host.slice(0, 30) + "…" : host;
    } catch {
      return raw.length > 32 ? raw.slice(0, 30) + "…" : raw;
    }
  }, [form.githubUrl]);

  const previewDomain = `${(form.projectName || "my-project")
    .toLowerCase()
    .replace(/\s+/g, "-")}.${domainSuffixFor(platform)}`;

  /* Navigation */
  const openWizard = () => {
    setCurrentStep(0);
    setDir(1);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setTimeout(() => {
      setCurrentStep(0);
      setDir(1);
    }, 200);
  };

  const goNext = () => {
    if (isLast) return;
    if (!canNext) return;
    setDir(1);
    setCurrentStep((s) => s + 1);
  };
  const goPrev = () => {
    if (currentStep === 0) return;
    setDir(-1);
    setCurrentStep((s) => s - 1);
  };
  const skip = () => {
    if (isLast) return;
    setDir(1);
    setCurrentStep((s) => s + 1);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setModalOpen(false);
    setCurrentStep(0);
    setDir(1);
    submitDeploy(e);
  };

  /* Vercel accent mengikuti tema (putih di dark, gelap di light) */
  const accentFor = (p: (typeof PLATFORMS)[number]) =>
    p.id === "vercel" ? "var(--dc-text)" : p.accent;

  /* ---------------------------------------------------------------- */

  return (
    <ViewFade>
      {/* ============ THEME TOKENS (dark ↔ light) ============ */}
      <style>{`
        .dc-root {
          --dc-text: #0a0a0f;
          --dc-text-muted: rgba(10, 10, 15, 0.55);
          --dc-text-faint: rgba(10, 10, 15, 0.35);

          --dc-surface: #ffffff;
          --dc-surface-2: #f5f5f8;
          --dc-surface-solid: #f0f0f4;

          --dc-input: #ffffff;
          --dc-input-focus: #fafafc;

          --dc-line: rgba(10, 10, 15, 0.08);
          --dc-line-strong: rgba(10, 10, 15, 0.16);

          --dc-pill: rgba(10, 10, 15, 0.05);
          --dc-hover: rgba(10, 10, 15, 0.07);

          --dc-btn-bg: #0a0a0f;
          --dc-btn-fg: #ffffff;

          --dc-backdrop: rgba(10, 10, 15, 0.45);

          --dc-green-bg: #ecfdf5;
          --dc-green-line: rgba(16, 185, 129, 0.25);
          --dc-green-fg: #065f46;
          --dc-green-fg-muted: rgba(6, 95, 70, 0.55);

          --dc-shadow-card:
            0 0 0 1px rgba(0, 0, 0, 0.04) inset,
            0 10px 40px -10px rgba(10, 10, 15, 0.12);
          --dc-shadow-modal:
            0 20px 80px -20px rgba(10, 10, 15, 0.25),
            0 0 0 1px rgba(0, 0, 0, 0.04) inset;
          --dc-shadow-btn: 0 4px 20px -6px rgba(10, 10, 15, 0.35);
        }

        .dark .dc-root,
        [data-theme="dark"] .dc-root,
        html[data-theme="dark"] .dc-root,
        .dark.dc-root,
        [data-theme="dark"].dc-root {
          --dc-text: #ffffff;
          --dc-text-muted: rgba(255, 255, 255, 0.55);
          --dc-text-faint: rgba(255, 255, 255, 0.35);

          --dc-surface: #15151f;
          --dc-surface-2: #1a1a28;
          --dc-surface-solid: #1e1e2f;

          --dc-input: #1e1e2f;
          --dc-input-focus: #23233a;

          --dc-line: rgba(255, 255, 255, 0.08);
          --dc-line-strong: rgba(255, 255, 255, 0.16);

          --dc-pill: rgba(255, 255, 255, 0.06);
          --dc-hover: rgba(255, 255, 255, 0.1);

          --dc-btn-bg: #ffffff;
          --dc-btn-fg: #000000;

          --dc-backdrop: rgba(6, 6, 10, 0.8);

          --dc-green-bg: #0f2a22;
          --dc-green-line: rgba(52, 211, 153, 0.2);
          --dc-green-fg: #d1fae5;
          --dc-green-fg-muted: rgba(209, 250, 229, 0.5);

          --dc-shadow-card:
            0 0 0 1px rgba(255, 255, 255, 0.08) inset,
            0 10px 40px -10px rgba(0, 0, 0, 0.6);
          --dc-shadow-modal:
            0 20px 80px -20px rgba(0, 0, 0, 0.8),
            0 0 0 1px rgba(255, 255, 255, 0.05) inset;
          --dc-shadow-btn: 0 4px 20px -6px rgba(255, 255, 255, 0.4);
        }

        @keyframes dcSlideInRight { from { opacity:0; transform: translateX(18px) } to { opacity:1; transform: translateX(0) } }
        @keyframes dcSlideInLeft  { from { opacity:0; transform: translateX(-18px) } to { opacity:1; transform: translateX(0) } }
        @keyframes dcFadeIn       { from { opacity:0 } to { opacity:1 } }
        @keyframes dcSlideUp      { from { transform: translateY(100%) } to { transform: translateY(0) } }
      `}</style>

      <div className="dc-root relative mx-auto w-full text-[var(--dc-text)] overflow-hidden font-sans selection:bg-[var(--dc-pill)]">
        <div className="relative z-10">
          {/* ---------- HERO ---------- */}
          <div className="text-center mb-8 sm:mb-10 px-1">
            <h1 className="text-[26px] xs:text-[30px] sm:text-[36px] md:text-[44px] font-[700] tracking-tight leading-[1.05] sm:leading-[0.95] text-[var(--dc-text)]">
              Pilih Platform Deploy
            </h1>
            <p className="mt-3 text-[13px] sm:text-[14px] md:text-[15px] text-[var(--dc-text-muted)] max-w-[460px] mx-auto leading-relaxed px-2">
              Pilih provider favorit kamu. Kami akan bantu setup deploy otomatis
              dengan panduan step-by-step.
            </p>
          </div>

          {/* ---------- PLATFORM GRID ---------- */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 md:gap-5 max-w-[720px] mx-auto">
            {PLATFORMS.map((p) => {
              const selected = platform === p.id;
              const accent = accentFor(p);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setFormField("platform", p.id)}
                  className={cn(
                    "group text-left relative rounded-[18px] sm:rounded-[22px] p-[1px] transition-all duration-300",
                    selected ? "sm:scale-[1.01]" : "sm:hover:scale-[1.01]",
                  )}
                  style={{
                    background: selected ? accent : "var(--dc-line)",
                  }}
                >
                  <div
                    className={cn(
                      "relative rounded-[17px] sm:rounded-[21px] bg-[var(--dc-surface)] p-4 sm:p-5 md:p-6 h-full flex flex-col justify-between overflow-hidden transition-all",
                      selected
                        ? "shadow-[var(--dc-shadow-card)]"
                        : "hover:bg-[var(--dc-surface-2)]",
                    )}
                  >
                    <div
                      className="absolute -top-20 -right-20 w-40 sm:w-48 h-40 sm:h-48 rounded-full opacity-20 blur-[30px] transition-opacity group-hover:opacity-30"
                      style={{ background: accent }}
                    />

                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
                        <div
                          className="w-10 h-10 sm:w-[42px] sm:h-[42px] rounded-[12px] sm:rounded-[13px] flex items-center justify-center border text-[16px] sm:text-[18px] font-bold tracking-tight shrink-0"
                          style={{
                            background: `color-mix(in srgb, ${accent} 12%, transparent)`,
                            borderColor: `color-mix(in srgb, ${accent} 25%, transparent)`,
                            color: accent,
                          }}
                        >
                          {p.letter}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[14.5px] sm:text-[16px] font-semibold tracking-tight leading-none text-[var(--dc-text)]">
                            {p.label}
                          </div>
                          <div className="mt-1 sm:mt-1.5 text-[11.5px] sm:text-[12px] leading-[1.35] text-[var(--dc-text-muted)] sm:max-w-[170px]">
                            {p.desc}
                          </div>
                        </div>
                      </div>

                      <div
                        className={cn(
                          "w-[18px] h-[18px] sm:w-5 sm:h-5 rounded-full border flex items-center justify-center transition-all shrink-0 mt-0.5",
                          selected
                            ? "bg-[var(--dc-text)] border-[var(--dc-text)]"
                            : "border-[var(--dc-line-strong)] bg-[var(--dc-pill)]",
                        )}
                      >
                        {selected && (
                          <Check
                            className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[var(--dc-surface)]"
                            strokeWidth={3}
                          />
                        )}
                      </div>
                    </div>

                    <div className="mt-4 sm:mt-5 flex items-center gap-2 text-[10.5px] sm:text-[11px] font-medium tracking-wide">
                      <span
                        className={cn(
                          "px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full border transition-colors",
                          selected
                            ? "bg-[var(--dc-pill)] border-[var(--dc-line-strong)] text-[var(--dc-text)]"
                            : "bg-[var(--dc-pill)] border-[var(--dc-line)] text-[var(--dc-text-faint)] group-hover:text-[var(--dc-text-muted)]",
                        )}
                      >
                        Auto Deploy
                      </span>
                      <span
                        className={cn(
                          "px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full border transition-colors",
                          selected
                            ? "bg-[var(--dc-pill)] border-[var(--dc-line-strong)] text-[var(--dc-text)]"
                            : "bg-[var(--dc-pill)] border-[var(--dc-line)] text-[var(--dc-text-faint)] group-hover:text-[var(--dc-text-muted)]",
                        )}
                      >
                        GitHub
                      </span>
                    </div>

                    {selected && (
                      <div
                        className="absolute bottom-0 left-5 right-5 sm:left-6 sm:right-6 h-[1px]"
                        style={{
                          background: `linear-gradient(to right, transparent, color-mix(in srgb, ${accent} 50%, transparent), transparent)`,
                        }}
                      />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* ---------- PREVIEW BAR ---------- */}
          <div className="max-w-[720px] mx-auto mt-4 sm:mt-6">
            <div className="rounded-2xl sm:rounded-[18px] bg-[var(--dc-surface-2)] border border-[var(--dc-line)] p-3 sm:p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                <div className="w-8 h-8 rounded-full bg-[var(--dc-surface-solid)] border border-[var(--dc-line)] flex items-center justify-center shrink-0"
                  style={{ color: activePlatformInfo ? accentFor(activePlatformInfo) : undefined }}
                >
                  {activePlatformInfo && (
                    <activePlatformInfo.Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] sm:text-[13px] font-medium truncate text-[var(--dc-text)]">
                    Siap deploy ke {activePlatformInfo?.label}
                  </div>
                  <div className="text-[10.5px] sm:text-[11px] text-[var(--dc-text-muted)] flex items-center gap-1.5 mt-0.5 min-w-0">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    <span className="truncate">
                      {previewDomain}
                      <span className="hidden sm:inline"> • {repoHost}</span>
                    </span>
                  </div>
                </div>
              </div>
              <div className="hidden md:flex items-center gap-2 text-[11px] text-[var(--dc-text-faint)]">
                <span className="px-2 py-1 rounded-md bg-[var(--dc-pill)] border border-[var(--dc-line)]">
                  Preview
                </span>
              </div>
            </div>
          </div>

          {/* ---------- START BUTTON ---------- */}
          <div className="max-w-[720px] mx-auto mt-5 sm:mt-7 flex justify-center">
            <button
              type="button"
              onClick={openWizard}
              className="group relative w-full sm:w-auto sm:px-8 h-12 sm:h-[48px] rounded-full font-medium text-[14px] flex items-center justify-center gap-2.5 transition-all duration-300 bg-[var(--dc-btn-bg)] text-[var(--dc-btn-fg)] hover:opacity-90 shadow-[var(--dc-shadow-btn)] active:scale-[0.98]"
            >
              <Rocket className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              Mulai Deploy
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>

        {/* ================= WIZARD MODAL ================= */}
        {isModalOpen && (
          <div
            className={cn(
              "fixed inset-0 z-50 flex justify-center",
              "items-end p-0",
              "sm:items-center sm:p-4 md:p-6",
            )}
          >
            <div
              className="absolute inset-0 bg-[var(--dc-backdrop)] backdrop-blur-[14px]"
              onClick={closeModal}
            />

            <div
              className={cn(
                "relative w-full bg-[var(--dc-surface)] border border-[var(--dc-line)] shadow-[var(--dc-shadow-modal)] overflow-hidden flex flex-col",
                "max-w-full rounded-t-[24px] max-h-[92vh]",
                "sm:max-w-[520px] sm:rounded-[28px] sm:max-h-[90vh]",
              )}
              style={{ animation: "dcSlideUp .3s ease" }}
            >
              {/* mobile grab handle */}
              <div className="sm:hidden pt-2.5 pb-1 flex justify-center shrink-0">
                <div className="w-10 h-1 rounded-full bg-[var(--dc-line-strong)]" />
              </div>

              <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-[var(--dc-line-strong)] to-transparent shrink-0" />

              {/* HEADER */}
              <div className="px-4 sm:px-7 md:px-8 pt-4 sm:pt-6 pb-3 sm:pb-5 flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <div
                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[var(--dc-surface-solid)] border border-[var(--dc-line)] flex items-center justify-center shrink-0"
                    style={{ color: activePlatformInfo ? accentFor(activePlatformInfo) : undefined }}
                  >
                    {activePlatformInfo && (
                      <activePlatformInfo.Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[12.5px] sm:text-[13px] font-semibold leading-tight truncate text-[var(--dc-text)]">
                      Deploy ke {activePlatformInfo?.label}
                    </div>
                    <div className="text-[10.5px] sm:text-[11px] text-[var(--dc-text-muted)] mt-0.5 truncate">
                      Langkah {currentStep + 1} dari {steps.length} •{" "}
                      {step?.title}
                    </div>
                  </div>
                </div>
                <button
                  onClick={closeModal}
                  className="w-8 h-8 rounded-full bg-[var(--dc-pill)] border border-[var(--dc-line)] flex items-center justify-center hover:bg-[var(--dc-hover)] transition-colors shrink-0"
                  aria-label="Tutup"
                >
                  <X className="w-4 h-4 text-[var(--dc-text-muted)]" />
                </button>
              </div>

              {/* PROGRESS PILLS */}
              <div className="px-4 sm:px-7 md:px-8 pb-3 sm:pb-5 shrink-0">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {steps.map((_, i) => {
                    const complete = i < currentStep;
                    const active = i === currentStep;
                    return (
                      <div
                        key={i}
                        className="flex items-center gap-1.5 sm:gap-2 flex-1"
                      >
                        <div
                          className={cn(
                            "relative h-5 sm:h-[28px] flex-1 rounded-full overflow-hidden transition-all duration-500",
                            complete
                              ? "bg-[var(--dc-text)]"
                              : active
                                ? "bg-[var(--dc-line-strong)]"
                                : "bg-[var(--dc-pill)]",
                          )}
                        >
                          {complete && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Check
                                className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[var(--dc-surface)]"
                                strokeWidth={3}
                              />
                            </div>
                          )}
                        </div>
                        {i !== steps.length - 1 && (
                          <div
                            className={cn(
                              "w-1 h-1 rounded-full shrink-0",
                              i < currentStep
                                ? "bg-[var(--dc-text)]"
                                : "bg-[var(--dc-line-strong)]",
                            )}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="mt-1.5 sm:mt-2 flex justify-between text-[9px] sm:text-[10px] tracking-wide text-[var(--dc-text-faint)] uppercase">
                  <span>1. Mulai</span>
                  <span className="hidden xs:inline">2. Input + Penjelasan</span>
                  <span className="xs:hidden">2. Input</span>
                  <span>3. Token</span>
                </div>
              </div>

              <div className="h-[1px] bg-[var(--dc-line)] mx-4 sm:mx-7 md:mx-8 shrink-0" />

              {/* BODY */}
              <div className="px-4 sm:px-7 md:px-8 py-4 sm:py-6 min-h-[280px] sm:min-h-[300px] relative overflow-y-auto flex-1">
                {step && (
                  <div
                    key={currentStep}
                    style={{
                      animation: `${
                        dir === 1 ? "dcSlideInRight" : "dcSlideInLeft"
                      } .35s ease`,
                    }}
                  >
                    <div className="flex items-start gap-3 sm:gap-3.5 mb-4 sm:mb-6">
                      <div className="mt-0.5 w-8 h-8 sm:w-9 sm:h-9 shrink-0 rounded-xl bg-[var(--dc-surface-solid)] border border-[var(--dc-line)] flex items-center justify-center text-[var(--dc-text-muted)]">
                        <step.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-[15px] sm:text-[17px] font-semibold tracking-tight leading-tight flex items-center gap-2 flex-wrap text-[var(--dc-text)]">
                          {step.title}
                          {step.optional && (
                            <span className="text-[9.5px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full bg-[var(--dc-pill)] border border-[var(--dc-line)] text-[var(--dc-text-faint)] font-medium tracking-wide uppercase">
                              Opsional
                            </span>
                          )}
                        </h3>
                        <p className="mt-1 sm:mt-1.5 text-[12px] sm:text-[13px] leading-[1.5] text-[var(--dc-text-muted)]">
                          {step.desc}
                        </p>
                      </div>
                    </div>

                    <form
                      id="deployForm"
                      onSubmit={handleSubmit}
                      className="space-y-4 sm:space-y-5"
                    >
                      {step.id === "projectName" && (
                        <div>
                          <FieldLabel htmlFor="projectName" required>
                            Nama Project
                          </FieldLabel>
                          <div className="relative">
                            <input
                              id="projectName"
                              type="text"
                              autoFocus
                              placeholder="acme-storefront"
                              value={form.projectName}
                              onChange={(e) =>
                                setFormField("projectName", e.target.value)
                              }
                              className={cn(inputCls, "pr-24")}
                            />
                            {(form.projectName || "").length > 0 && (
                              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10.5px] sm:text-[11px] text-[var(--dc-text-faint)] pointer-events-none">
                                .{domainSuffixFor(platform)}
                              </div>
                            )}
                          </div>
                          <div className="mt-2.5 sm:mt-3 rounded-xl sm:rounded-[10px] bg-[var(--dc-surface-2)] border border-[var(--dc-line)] px-3 py-2 sm:py-2.5 flex items-center gap-2 text-[10.5px] sm:text-[11px] text-[var(--dc-text-faint)]">
                            <Globe className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                            <span className="truncate">
                              Preview:{" "}
                              <span className="text-[var(--dc-text-muted)]">
                                {previewDomain}
                              </span>
                            </span>
                          </div>
                        </div>
                      )}

                      {step.id === "githubUrl" && (
                        <div>
                          <FieldLabel htmlFor="githubUrl" required>
                            GitHub URL
                          </FieldLabel>
                          <input
                            id="githubUrl"
                            type="text"
                            autoFocus
                            placeholder="https://github.com/username/repo"
                            value={form.githubUrl}
                            onChange={(e) =>
                              setFormField("githubUrl", e.target.value)
                            }
                            className={cn(
                              inputCls,
                              "font-mono text-[12px] sm:text-[13px]",
                            )}
                          />
                          {form.githubUrl &&
                            !form.githubUrl.includes("github.com") && (
                              <div className="mt-2 text-[10.5px] sm:text-[11px] text-amber-600 dark:text-amber-300/70 flex items-center gap-1.5">
                                <CircleAlert className="w-3 h-3 shrink-0" /> URL
                                harus mengandung github.com
                              </div>
                            )}
                        </div>
                      )}

                      {step.id === "platformToken" && platform === "vercel" && (
                        <VercelTokenField />
                      )}
                      {step.id === "platformToken" &&
                        platform === "cloudflare" && <CloudflareTokenField />}
                      {step.id === "platformToken" &&
                        platform === "railway" && <RailwayTokenField />}

                      {step.id === "platformToken" &&
                        platform === "render" && (
                          <div>
                            <FieldLabel htmlFor="platformToken" required>
                              Render API Key
                            </FieldLabel>
                            <div className="relative">
                              <input
                                id="platformToken"
                                type="password"
                                autoFocus
                                placeholder="••••••••••••••••"
                                value={form.platformToken}
                                onChange={(e) =>
                                  setFormField("platformToken", e.target.value)
                                }
                                className={cn(
                                  inputCls,
                                  "pr-10 font-mono text-[12.5px] sm:text-[13px]",
                                )}
                              />
                              <KeyRound className="absolute right-3 sm:right-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-[var(--dc-text-faint)]" />
                            </div>
                            <div className="mt-2 sm:mt-2.5 flex items-center justify-between">
                              <span className="text-[10.5px] sm:text-[11px] text-[var(--dc-text-faint)]">
                                Disimpan lokal • terenkripsi
                              </span>
                            </div>
                          </div>
                        )}

                      {step.id === "accountId" && (
                        <div>
                          <FieldLabel htmlFor="accountId" required>
                            Account ID
                          </FieldLabel>
                          <input
                            id="accountId"
                            type="text"
                            autoFocus
                            placeholder="a1b2c3d4e5f6..."
                            value={form.accountId}
                            onChange={(e) =>
                              setFormField("accountId", e.target.value)
                            }
                            className={cn(
                              inputCls,
                              "font-mono text-[12px] sm:text-[13px]",
                            )}
                          />
                        </div>
                      )}

                      {step.id === "build" && (
                        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
                          <div>
                            <FieldLabel htmlFor="buildCommand" optional>
                              Build Cmd
                            </FieldLabel>
                            <input
                              id="buildCommand"
                              type="text"
                              autoFocus
                              placeholder="npm run build"
                              value={form.buildCommand}
                              onChange={(e) =>
                                setFormField("buildCommand", e.target.value)
                              }
                              className={cn(
                                inputCls,
                                "font-mono text-[12.5px] sm:text-[13px]",
                              )}
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
                              onChange={(e) =>
                                setFormField("outputDir", e.target.value)
                              }
                              className={cn(
                                inputCls,
                                "font-mono text-[12.5px] sm:text-[13px]",
                              )}
                            />
                          </div>
                        </div>
                      )}

                      {step.id === "githubPat" && (
                        <div>
                          <FieldLabel
                            htmlFor="githubPat"
                            optional
                            help="GitHub Token"
                          >
                            GitHub Token
                          </FieldLabel>
                          <div className="relative">
                            <input
                              id="githubPat"
                              type="password"
                              autoFocus
                              placeholder="ghp_•••••••••••••••• (repo private)"
                              value={form.githubPat}
                              onChange={(e) =>
                                setFormField("githubPat", e.target.value)
                              }
                              className={cn(
                                inputCls,
                                "pr-10 font-mono text-[12.5px] sm:text-[13px]",
                              )}
                            />
                            <Github className="absolute right-3 sm:right-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-[var(--dc-text-faint)]" />
                          </div>
                          <div className="mt-2 sm:mt-2.5 flex items-center gap-1.5 text-[10.5px] sm:text-[11px] text-[var(--dc-text-faint)]">
                            <ExternalLink className="w-3 h-3 shrink-0" />
                            Token tidak pernah dikirim ke server manapun
                          </div>
                        </div>
                      )}

                      {step.id === "env" && (
                        <div>
                          <FieldLabel htmlFor="envText" optional>
                            Environment Variables
                          </FieldLabel>
                          <textarea
                            id="envText"
                            rows={4}
                            autoFocus
                            placeholder={"KEY=value\nANOTHER_KEY=value"}
                            value={form.envText}
                            onChange={(e) =>
                              setFormField("envText", e.target.value)
                            }
                            className={textareaCls}
                          />
                        </div>
                      )}
                    </form>
                  </div>
                )}
              </div>

              {/* FOOTER */}
              <div
                className={cn(
                  "px-4 sm:px-7 md:px-8 py-3 sm:py-4 bg-[var(--dc-surface-2)] border-t border-[var(--dc-line)] flex items-center justify-between gap-2 shrink-0",
                  "pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-4",
                )}
              >
                <button
                  type="button"
                  onClick={goPrev}
                  disabled={currentStep === 0}
                  className={cn(
                    "h-10 sm:h-9 px-3.5 sm:px-4 rounded-full text-[12.5px] sm:text-[13px] font-medium flex items-center gap-1.5 transition-colors shrink-0",
                    currentStep === 0
                      ? "text-[var(--dc-text-faint)] cursor-not-allowed"
                      : "bg-[var(--dc-pill)] border border-[var(--dc-line)] text-[var(--dc-text-muted)] hover:bg-[var(--dc-hover)] hover:text-[var(--dc-text)] active:scale-[0.97]",
                  )}
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline">Prev</span>
                </button>

                <div className="flex items-center gap-2 min-w-0">
                  {step?.optional && !isLast && (
                    <button
                      type="button"
                      onClick={skip}
                      className="h-10 sm:h-9 px-3 sm:px-4 rounded-full text-[12.5px] sm:text-[13px] font-medium text-[var(--dc-text-faint)] hover:text-[var(--dc-text-muted)] transition-colors shrink-0"
                    >
                      Lewati
                    </button>
                  )}

                  {isLast ? (
                    <button
                      type="submit"
                      form="deployForm"
                      className="h-10 sm:h-9 px-5 rounded-full text-[12.5px] sm:text-[13px] font-medium flex items-center gap-1.5 transition-all bg-[var(--dc-btn-bg)] text-[var(--dc-btn-fg)] hover:opacity-90 shadow-[var(--dc-shadow-btn)] active:scale-[0.97] shrink-0"
                    >
                      <span className="whitespace-nowrap">Deploy Project</span>
                      <Rocket className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={!canNext}
                      onClick={goNext}
                      className={cn(
                        "h-10 sm:h-9 px-5 rounded-full text-[12.5px] sm:text-[13px] font-medium flex items-center gap-1.5 transition-all shrink-0",
                        canNext
                          ? "bg-[var(--dc-btn-bg)] text-[var(--dc-btn-fg)] hover:opacity-90 shadow-[var(--dc-shadow-btn)] active:scale-[0.97]"
                          : "bg-[var(--dc-pill)] text-[var(--dc-text-faint)] cursor-not-allowed",
                      )}
                    >
                      Next <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ViewFade>
  );
}