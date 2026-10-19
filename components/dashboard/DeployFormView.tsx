"use client";

import { useDialogA11y } from "@/components/ui/useDialogA11y";
import { Icon } from "@/components/ui/Icon";
import { CloudflareIcon, RailwayIcon, VercelIcon } from "@/components/ui/PlatformIcon";
import * as React from "react";
import { HelpCircle, Loader2, ShieldCheck, Terminal, Check, Rocket, ArrowRight, ArrowLeft, X, Globe, KeyRound, CircleAlert, ExternalLink, Hammer, FolderOutput } from "@/components/ui/icons";
import { Github } from "lucide-react";
import { ViewFade } from "@/components/ui/ViewFade";
import { cn } from "@/lib/utils";
import { useDeploy } from "@/lib/deploy-context";
import type { Platform } from "@/types";
import { RepoCheckCard } from "@/components/dashboard/RepoCheckCard";

/* ---------------- Platform config ---------------- */

const PLATFORMS: {
  id: Platform;
  label: string;
  desc: string;
  accent: string;
  tone: string;
  toneVar: string;
  Icon: any;
}[] = [
  {
    id: "vercel",
    label: "Vercel",
    desc: "Frontend Cloud terbaik untuk Next.js",
    accent: "#120B2E", // di-override CSS var di render
    tone: "bg-tone-peri",
    toneVar: "--tone-peri",
    Icon: VercelIcon,
  },
  {
    id: "railway",
    label: "Railway",
    desc: "Deploy app & database tanpa repot",
    accent: "#7b50ff",
    tone: "bg-tone-lilac",
    toneVar: "--tone-lilac",
    Icon: RailwayIcon,
  },
  {
    id: "cloudflare",
    label: "Cloudflare",
    desc: "Pages & Workers global edge network",
    accent: "#f6821f",
    tone: "bg-tone-peach",
    toneVar: "--tone-peach",
    Icon: CloudflareIcon,
  },
];

/** Best-effort preview domain suffix per platform — mirrors `resolveDomain` in lib/utils.ts. */
function domainSuffixFor(p: Platform): string {
  if (p === "cloudflare") return "pages.dev";
  if (p === "railway") return "up.railway.app";
  return "vercel.app";
}

/* ---------------- Shared classes ---------------- */

const inputCls =
  "w-full h-11 sm:h-[46px] rounded-[14px] bg-[var(--dc-input)] border border-transparent px-3.5 sm:px-4 text-[13.5px] sm:text-[14px] text-[var(--dc-text)] placeholder:text-[var(--dc-text-faint)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:bg-[var(--dc-input-focus)] transition-colors";

const textareaCls =
  "w-full rounded-[14px] bg-[var(--dc-input)] border border-transparent px-3.5 sm:px-4 py-2.5 sm:py-3 text-[12.5px] sm:text-[13px] text-[var(--dc-text)] placeholder:text-[var(--dc-text-faint)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:bg-[var(--dc-input-focus)] transition-colors resize-none font-mono";

const labelCls =
  "block text-[12px] sm:text-[12px] tracking-wide uppercase text-[var(--dc-text-faint)] font-medium";

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
      desc: "Nama unik untuk project-mu. Nama ini akan menjadi subdomain situsmu nanti.",
      required: true,
      icon: Rocket,
    },
    {
      id: "githubUrl",
      title: "GitHub URL",
      desc: "Link repository GitHub yang ingin dideploy. Pastikan repo-nya public, atau isi GitHub Token untuk repo private.",
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
        desc: "Token untuk menghubungkan Depup ke akun Vercel-mu. Kalau sudah tersimpan di Settings, langsung pakai saja.",
        required: true,
        icon: KeyRound,
      },
      {
        id: "githubPat",
        title: "GitHub Token",
        desc: "Hanya untuk repo private. Lewati saja kalau repo-mu public.",
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
        desc: "ID akun Cloudflare-mu. Terisi otomatis kalau tokennya diambil dari Settings.",
        required: true,
        icon: Globe,
      },
      {
        id: "build",
        title: "Build Config",
        desc: "Opsional. Kosongkan agar framework (Next.js, Vite, dll.) terdeteksi otomatis.",
        optional: true,
        icon: Hammer,
      },
      {
        id: "githubPat",
        title: "GitHub Token",
        desc: "Untuk repo private. Boleh dilewati.",
        optional: true,
        icon: Github,
      },
    ];
  // railway (last platform)
  return [
      ...base,
      {
        id: "platformToken",
        title: "Railway Token",
        desc: "Token akun Railway-mu.",
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
}

/* ---------------- Small building blocks ---------------- */

function TokenHelpLink({ topic }: { topic: string }) {
  const { setView } = useDeploy();
  return (
    <button
      type="button"
      onClick={() => setView("docs")}
      className="inline-flex items-center gap-1 sm:gap-1.5 text-[12px] sm:text-[12px] font-medium text-lav-text hover:text-[var(--dc-text)] transition-colors shrink-0"
    >
      <HelpCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Cara mendapatkan {topic}
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
        {children} {required && <span className="text-bad-fg">*</span>}
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
      <p className="inline-flex items-center gap-2 text-[12px] sm:text-xs text-[var(--dc-text-muted)]">
        <Loader2 size={13} className="animate-spin" /> Memeriksa token...
      </p>
    );
  }

  if (usingSaved && savedVercelToken) {
    return (
      <div>
        <FieldLabel htmlFor="platformToken" required>
          Vercel Token
        </FieldLabel>
        <div className="rounded-xl sm:rounded-[14px] bg-[var(--dc-green-bg)] p-3.5 sm:p-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[var(--ok-bg)] dark:bg-[var(--ok-bg)] flex items-center justify-center shrink-0">
              <ShieldCheck
                size={14}
                className="sm:hidden text-ok-fg"
              />
              <ShieldCheck
                size={16}
                className="hidden sm:block text-ok-fg"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] sm:text-[13px] font-medium text-[var(--dc-green-fg)] truncate">
                Terhubung sebagai @{savedVercelToken.username}
              </div>
              <div className="text-[12px] sm:text-[12px] text-[var(--dc-green-fg-muted)] mt-0.5">
                Token dari Settings • aman
              </div>
            </div>
          </div>
          <div className="mt-3 sm:mt-4 grid grid-cols-2 gap-2 sm:gap-2.5">
            <button
              type="button"
              onClick={() => setManualOverride(false)}
              className="h-9 rounded-full bg-ok-fg text-white dark:text-midnight text-[12px] sm:text-[13px] font-medium hover:opacity-90 transition-opacity"
            >
              Pakai token ini
            </button>
            <button
              type="button"
              onClick={() => setManualOverride(true)}
              className="h-9 rounded-full bg-[var(--dc-pill)] text-[var(--dc-text-muted)] text-[12px] sm:text-[13px] font-medium hover:bg-[var(--dc-hover)] transition-colors"
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
          className="mt-2 sm:mt-2.5 text-[12px] sm:text-[12px] text-[var(--dc-text-muted)] hover:text-[var(--dc-text)] underline underline-offset-4"
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
      <p className="inline-flex items-center gap-2 text-[12px] sm:text-xs text-[var(--dc-text-muted)]">
        <Loader2 size={13} className="animate-spin" /> Memeriksa token...
      </p>
    );
  }

  if (usingSaved && savedCloudflareToken) {
    return (
      <div>
        <FieldLabel htmlFor="platformToken" required>
          Cloudflare Token
        </FieldLabel>
        <div className="rounded-xl sm:rounded-[14px] bg-[var(--dc-green-bg)] p-3.5 sm:p-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[var(--ok-bg)] dark:bg-[var(--ok-bg)] flex items-center justify-center shrink-0">
              <ShieldCheck
                size={14}
                className="sm:hidden text-ok-fg"
              />
              <ShieldCheck
                size={16}
                className="hidden sm:block text-ok-fg"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] sm:text-[13px] font-medium text-[var(--dc-green-fg)] truncate">
                {savedCloudflareToken.accountName}
              </div>
              <div className="text-[12px] sm:text-[12px] text-[var(--dc-green-fg-muted)] mt-0.5">
                Token dari Settings
              </div>
            </div>
          </div>
          <div className="mt-3 sm:mt-4 grid grid-cols-2 gap-2 sm:gap-2.5">
            <button
              type="button"
              onClick={() => setManualOverride(false)}
              className="h-9 rounded-full bg-ok-fg text-white dark:text-midnight text-[12px] sm:text-[13px] font-medium hover:opacity-90 transition-opacity"
            >
              Pakai token ini
            </button>
            <button
              type="button"
              onClick={() => setManualOverride(true)}
              className="h-9 rounded-full bg-[var(--dc-pill)] text-[var(--dc-text-muted)] text-[12px] sm:text-[13px] font-medium hover:bg-[var(--dc-hover)] transition-colors"
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
          className="mt-2 sm:mt-2.5 text-[12px] sm:text-[12px] text-[var(--dc-text-muted)] hover:text-[var(--dc-text)] underline underline-offset-4"
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
      <p className="inline-flex items-center gap-2 text-[12px] sm:text-xs text-[var(--dc-text-muted)]">
        <Loader2 size={13} className="animate-spin" /> Memeriksa token...
      </p>
    );
  }

  if (usingSaved && savedRailwayToken) {
    return (
      <div>
        <FieldLabel htmlFor="platformToken" required>
          Railway Token
        </FieldLabel>
        <div className="rounded-xl sm:rounded-[14px] bg-[var(--dc-green-bg)] p-3.5 sm:p-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[var(--ok-bg)] dark:bg-[var(--ok-bg)] flex items-center justify-center shrink-0">
              <ShieldCheck
                size={14}
                className="sm:hidden text-ok-fg"
              />
              <ShieldCheck
                size={16}
                className="hidden sm:block text-ok-fg"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] sm:text-[13px] font-medium text-[var(--dc-green-fg)] truncate">
                {savedRailwayToken.name}
              </div>
              <div className="text-[12px] sm:text-[12px] text-[var(--dc-green-fg-muted)] mt-0.5">
                Token dari Settings
              </div>
            </div>
          </div>
          <div className="mt-3 sm:mt-4 grid grid-cols-2 gap-2 sm:gap-2.5">
            <button
              type="button"
              onClick={() => setManualOverride(false)}
              className="h-9 rounded-full bg-ok-fg text-white dark:text-midnight text-[12px] sm:text-[13px] font-medium hover:opacity-90 transition-opacity"
            >
              Pakai token ini
            </button>
            <button
              type="button"
              onClick={() => setManualOverride(true)}
              className="h-9 rounded-full bg-[var(--dc-pill)] text-[var(--dc-text-muted)] text-[12px] sm:text-[13px] font-medium hover:bg-[var(--dc-hover)] transition-colors"
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
          className="mt-2 sm:mt-2.5 text-[12px] sm:text-[12px] text-[var(--dc-text-muted)] hover:text-[var(--dc-text)] underline underline-offset-4"
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
  const { form, setFormField, submitDeploy, repoEnvCheck } = useDeploy();

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

  /* scroll body dikunci oleh useDialogA11y (ref-counted), tidak perlu kunci kedua di sini */

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
        // Jangan lanjut sebelum repo selesai dicek dan terbukti cocok dengan platform tujuan.
        return (
          !!form.githubUrl?.trim() &&
          form.githubUrl.includes("github.com") &&
          repoEnvCheck.status === "ok" &&
          repoEnvCheck.validation?.compat[platform].level !== "blocked"
        );
      case "platformToken":
        return !!form.platformToken?.trim();
      case "accountId":
        return !!form.accountId?.trim();
      default:
        return true;
    }
  }, [step, form, repoEnvCheck.status, repoEnvCheck.validation, platform]);

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

  const dialogRef = useDialogA11y<HTMLDivElement>(isModalOpen, closeModal);

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
        /* Alias ke token global (globals.css). Tema terang/gelap mengikuti [data-theme] otomatis. */
        .dc-root {
          --dc-text: var(--text);
          --dc-text-muted: var(--text-muted);
          --dc-text-faint: var(--text-faint);

          --dc-surface: var(--surface-solid);
          --dc-surface-2: var(--frame);
          --dc-surface-solid: var(--surface-solid-2);

          --dc-input: var(--input-bg);
          --dc-input-focus: var(--surface-solid);

          --dc-line: var(--line);
          --dc-line-strong: var(--line-strong);

          --dc-pill: var(--pill-bg);
          --dc-hover: var(--card-hover);

          --dc-btn-bg: var(--ink-fill);
          --dc-btn-fg: var(--ink-fill-text);

          --dc-backdrop: rgba(18, 11, 46, 0.5);

          --dc-green-bg: var(--ok-bg);
          --dc-green-line: var(--ok-line);
          --dc-green-fg: var(--ok-fg);
          --dc-green-fg-muted: color-mix(in srgb, var(--ok-fg) 78%, var(--ok-bg));

          --dc-shadow-card: var(--surface-shadow);
          --dc-shadow-modal: 0 40px 90px -30px rgba(20, 18, 31, 0.5);
          --dc-shadow-btn: 0 14px 28px -14px rgba(123, 80, 255, 0.6);
        }
        [data-theme="dark"] .dc-root {
          --dc-backdrop: rgba(18, 11, 46, 0.78);
          --dc-shadow-modal: 0 40px 90px -30px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.05) inset;
          --dc-shadow-btn: 0 14px 28px -14px rgba(123, 80, 255, 0.55);
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
            <h1 className="page-title text-[var(--dc-text)]">
              Pilih Platform Deploy
            </h1>
            <p className="mx-auto mt-1.5 max-w-[460px] text-[13.5px] leading-relaxed text-[var(--dc-text-muted)]">
              Pilih platform favoritmu. Depup akan memandu proses deploy otomatis
              langkah demi langkah.
            </p>
          </div>

          {/* ---------- PLATFORM LIST ---------- */}
          <div className="flex flex-col gap-4 sm:gap-6 max-w-[720px] mx-auto" role="radiogroup" aria-label="Platform deploy">
            {PLATFORMS.map((p) => {
              const selected = platform === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setFormField("platform", p.id)}
                  className={cn(
                    "group block w-full text-left rounded-[24px] sm:rounded-[28px] p-5 sm:p-6 min-h-[132px] sm:min-h-[152px]",
                    "flex flex-col justify-between transition-all duration-300 active:scale-[0.995]",
                    selected
                      ? "bg-violet-500 shadow-[0_18px_36px_-22px_rgba(123,80,255,0.8)]"
                      : "bg-white dark:bg-[#1e1150] shadow-[0_10px_30px_-20px_rgba(30,17,80,0.35)] dark:shadow-none sm:hover:-translate-y-0.5",
                  )}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={cn(
                        "w-10 h-10 sm:w-[42px] sm:h-[42px] rounded-[12px] flex items-center justify-center shrink-0 transition-colors duration-300",
                        selected
                          ? "bg-white text-violet-600"
                          : "bg-violet-100 text-violet-500 dark:bg-white dark:text-[#1e1150]",
                      )}
                    >
                      <p.Icon size={22} />
                    </div>
                    <div className="min-w-0">
                      <div
                        className={cn(
                          "text-[15px] sm:text-[16px] font-semibold tracking-[-0.01em] leading-none transition-colors duration-300",
                          selected ? "text-white" : "text-ink dark:text-[#c9c2e6]",
                        )}
                      >
                        {p.label}
                      </div>
                      <div
                        className={cn(
                          "mt-1.5 text-[12px] leading-[1.35] transition-colors duration-300",
                          selected ? "text-violet-100" : "text-[var(--dc-text-muted)]",
                        )}
                      >
                        {p.desc}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex items-center gap-2 text-[12px] font-medium">
                    {["Deploy otomatis", "GitHub"].map((chip) => (
                      <span
                        key={chip}
                        className={cn(
                          "px-2.5 py-1 rounded-full transition-colors duration-300",
                          selected
                            ? "bg-lime-500 text-[#1e1150]"
                            : "bg-mist text-ink dark:bg-ink dark:text-[#b9b3d8]",
                        )}
                      >
                        {chip}
                      </span>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>

          {/* ---------- START BUTTON ---------- */}
          <div className="max-w-[720px] mx-auto mt-6 sm:mt-8 flex justify-center">
            <button
              type="button"
              onClick={openWizard}
              className="group relative w-full sm:w-auto sm:px-8 h-12 sm:h-[48px] rounded-full font-medium text-[14px] flex items-center justify-center gap-2.5 transition-all duration-300 bg-[var(--dc-btn-bg)] text-[var(--dc-btn-fg)] hover:opacity-90 shadow-[var(--dc-shadow-btn)] active:scale-[0.98]"
            >
              <Rocket className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              Mulai deploy
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
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-label={`Deploy ke ${activePlatformInfo?.label ?? "platform"}`}
              tabIndex={-1}
              className={cn(
                "relative w-full bg-[var(--dc-surface)] shadow-[var(--dc-shadow-modal)] overflow-hidden flex flex-col outline-none",
                "max-w-full rounded-t-[24px] max-h-[92dvh]",
                "sm:max-w-[520px] sm:rounded-[28px] sm:max-h-[90dvh]",
              )}
              style={{ animation: "dcSlideUp .3s ease", paddingBottom: "env(safe-area-inset-bottom)" }}
            >
              {/* mobile grab handle */}
              <div className="sm:hidden pt-2.5 pb-1 flex justify-center shrink-0">
                <div className="w-10 h-1 rounded-full bg-[var(--dc-line-strong)]" />
              </div>


              {/* HEADER */}
              <div className="px-4 sm:px-7 md:px-8 pt-4 sm:pt-6 pb-3 sm:pb-5 flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <div
                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-violet-100 text-violet-500 dark:bg-white dark:text-[#1e1150] flex items-center justify-center shrink-0"
                  >
                    {activePlatformInfo && (
                      <activePlatformInfo.Icon size={17} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[12.5px] sm:text-[13px] font-semibold leading-tight truncate text-[var(--dc-text)]">
                      Deploy ke {activePlatformInfo?.label}
                    </div>
                    <div className="text-[12px] sm:text-[12px] text-[var(--dc-text-muted)] mt-0.5 truncate">
                      Langkah {currentStep + 1} dari {steps.length} •{" "}
                      {step?.title}
                    </div>
                  </div>
                </div>
                <button
                  onClick={closeModal}
                  className="w-8 h-8 rounded-full bg-[var(--dc-pill)] flex items-center justify-center hover:bg-[var(--dc-hover)] transition-colors shrink-0"
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
                                className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white"
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
                <div className="mt-1.5 sm:mt-2 flex justify-between text-[9px] sm:text-[12px] tracking-wide text-[var(--dc-text-faint)] uppercase">
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
                      <div className="mt-0.5 w-8 h-8 sm:w-9 sm:h-9 shrink-0 rounded-xl bg-[var(--dc-surface-solid)] flex items-center justify-center text-[var(--dc-text-muted)]">
                        <step.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-[15px] sm:text-[17px] font-semibold tracking-tight leading-tight flex items-center gap-2 flex-wrap text-[var(--dc-text)]">
                          {step.title}
                          {step.optional && (
                            <span className="text-[9.5px] sm:text-[12px] px-1.5 sm:px-2 py-0.5 rounded-full bg-[var(--dc-pill)] text-[var(--dc-text-faint)] font-medium tracking-wide uppercase">
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
                              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] sm:text-[12px] text-[var(--dc-text-faint)] pointer-events-none">
                                .{domainSuffixFor(platform)}
                              </div>
                            )}
                          </div>
                          <div className="mt-2.5 sm:mt-3 rounded-xl sm:rounded-[10px] bg-[var(--dc-surface-2)] px-3 py-2 sm:py-2.5 flex items-center gap-2 text-[12px] sm:text-[12px] text-[var(--dc-text-faint)]">
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
                              <div className="mt-2 text-[12px] sm:text-[12px] text-warn-fg flex items-center gap-1.5">
                                <CircleAlert className="w-3 h-3 shrink-0" /> URL
                                harus mengandung github.com
                              </div>
                            )}
                          <RepoCheckCard platform={platform} />
                          {repoEnvCheck.status === "ok" &&
                            repoEnvCheck.detectedEnvVars.length > 0 && (
                              <div className="mt-2 text-[12px] sm:text-[12px] text-lav-text flex items-start gap-1.5">
                                <CircleAlert className="w-3 h-3 shrink-0 mt-0.5" />
                                <span>
                                  Repo ini butuh env var:{" "}
                                  <span className="font-mono">
                                    {repoEnvCheck.detectedEnvVars.join(", ")}
                                  </span>{" "}
                                  — sudah terisi otomatis di bagian Environment
                                  Variables, tinggal isi nilainya.
                                </span>
                              </div>
                            )}
                          {repoEnvCheck.status === "ok" &&
                            repoEnvCheck.warnings.map((w, i) => (
                              <div
                                key={i}
                                className="mt-2 text-[12px] sm:text-[12px] text-warn-fg flex items-start gap-1.5"
                              >
                                <CircleAlert className="w-3 h-3 shrink-0 mt-0.5" />
                                <span>{w}</span>
                              </div>
                            ))}
                        </div>
                      )}

                      {step.id === "platformToken" && platform === "vercel" && (
                        <VercelTokenField />
                      )}
                      {step.id === "platformToken" &&
                        platform === "cloudflare" && <CloudflareTokenField />}
                      {step.id === "platformToken" &&
                        platform === "railway" && <RailwayTokenField />}

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
                          <div className="mt-2 sm:mt-2.5 flex items-center gap-1.5 text-[12px] sm:text-[12px] text-[var(--dc-text-faint)]">
                            <ExternalLink className="w-3 h-3 shrink-0" />
                            Token hanya dipakai untuk deploy ini dan tidak disimpan
                          </div>
                        </div>
                      )}

                      {step.id === "env" && (
                        <div>
                          <FieldLabel htmlFor="envText" optional>
                            Environment Variables
                          </FieldLabel>
                          {repoEnvCheck.status === "ok" &&
                            repoEnvCheck.detectedEnvVars.length > 0 && (
                              <div className="mb-2 text-[12px] sm:text-[12px] text-lav-text flex items-start gap-1.5">
                                <CircleAlert className="w-3 h-3 shrink-0 mt-0.5" />
                                <span>
                                  Terdeteksi dari repo:{" "}
                                  <span className="font-mono">
                                    {repoEnvCheck.detectedEnvVars.join(", ")}
                                  </span>
                                  . Isi value-nya di bawah sebelum deploy.
                                </span>
                              </div>
                            )}
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
                      : "bg-[var(--dc-pill)] text-[var(--dc-text-muted)] hover:bg-[var(--dc-hover)] hover:text-[var(--dc-text)] active:scale-[0.97]",
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