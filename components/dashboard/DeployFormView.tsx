"use client";

import { useDialogA11y } from "@/components/ui/useDialogA11y";
import { Icon } from "@/components/ui/Icon";
import { CloudflareIcon, RailwayIcon, VercelIcon } from "@/components/ui/PlatformIcon";
import * as React from "react";
import { HelpCircle, Loader2, ShieldCheck, Terminal, Check, Rocket, ArrowRight, ArrowLeft, X, Globe, KeyRound, CircleAlert, ExternalLink, Hammer, FolderOutput } from "@/components/ui/icons";
import { Github } from "lucide-react";
import { ViewFade } from "@/components/ui/ViewFade";
import { PageTitle } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import { useDeploy } from "@/lib/deploy-context";
import type { Platform } from "@/types";
import { RepoCheckCard } from "@/components/dashboard/RepoCheckCard";
import { PLATFORM_META, PLATFORM_ORDER, suggestRepoName } from "@/lib/platforms";

/* ---------------- Platform config ---------------- */

const PLATFORM_ICON: Record<Platform, any> = {
  vercel: VercelIcon,
  cloudflare: CloudflareIcon,
  railway: RailwayIcon,
};

const PLATFORMS = PLATFORM_ORDER.map((id) => ({
  id,
  label: PLATFORM_META[id].name,
  desc: PLATFORM_META[id].desc,
  Icon: PLATFORM_ICON[id],
}));

/** Best-effort preview domain suffix per platform — mirrors `resolveDomain` in lib/utils.ts. */
function domainSuffixFor(p: Platform): string {
  if (p === "cloudflare") return "pages.dev";
  if (p === "railway") return "up.railway.app";
  return "vercel.app";
}

/* ---------------- Shared classes ---------------- */

const inputCls =
  "w-full h-11 sm:h-[46px] rounded-[14px] bg-[var(--dc-input)] border border-transparent px-3.5 sm:px-4 text-[16px] sm:text-[14px] text-[var(--dc-text)] placeholder:text-[var(--dc-text-faint)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:bg-[var(--dc-input-focus)] transition-colors";

const textareaCls =
  "w-full rounded-[14px] bg-[var(--dc-input)] border border-transparent px-3.5 sm:px-4 py-2.5 sm:py-3 text-[13px] sm:text-[13px] text-[var(--dc-text)] placeholder:text-[var(--dc-text-faint)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:bg-[var(--dc-input-focus)] transition-colors resize-none font-mono";

const labelCls =
  "block text-[14px] text-[var(--dc-text)] font-medium";

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
      title: "Nama project",
      desc: "Nama unik untuk project-mu. Nama ini menjadi subdomain situsmu nanti.",
      required: true,
      icon: Rocket,
    },
  ];

  if (p === "vercel")
    return [
      ...base,
      {
        id: "platformToken",
        title: "Token Vercel",
        desc: "Token untuk menghubungkan Depup ke akun Vercel-mu. Kalau sudah tersimpan di Pengaturan, langsung pakai saja.",
        required: true,
        icon: KeyRound,
      },
      {
        id: "githubPat",
        title: "Token GitHub",
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
        title: "Token Cloudflare",
        desc: "API token Cloudflare dengan izin Pages:Edit.",
        required: true,
        icon: KeyRound,
      },
      {
        id: "accountId",
        title: "ID akun Cloudflare",
        desc: "ID akun Cloudflare-mu. Terisi otomatis kalau tokennya diambil dari Pengaturan.",
        required: true,
        icon: Globe,
      },
      {
        id: "build",
        title: "Pengaturan build",
        desc: "Opsional. Kosongkan agar framework (Next.js, Vite, dll.) terdeteksi otomatis.",
        optional: true,
        icon: Hammer,
      },
      {
        id: "githubPat",
        title: "Token GitHub",
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
        title: "Token Railway",
        desc: "Token akun Railway-mu.",
        required: true,
        icon: KeyRound,
      },
      {
        id: "env",
        title: "Variabel environment",
        desc: "Opsional. Format KEY=value, satu per baris.",
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
        <div className="rounded-[14px] sm:rounded-[14px] bg-[var(--dc-green-bg)] p-3.5 sm:p-4">
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
                Token dari Pengaturan • aman
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
          placeholder="Tempel token di sini"
          value={form.platformToken}
          onChange={(e) => setFormField("platformToken", e.target.value)}
          className={cn(inputCls, "pr-10 font-mono text-[13px] sm:text-[13px]")}
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
        <div className="rounded-[14px] sm:rounded-[14px] bg-[var(--dc-green-bg)] p-3.5 sm:p-4">
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
                Token dari Pengaturan
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
          placeholder="Tempel token di sini"
          value={form.platformToken}
          onChange={(e) => setFormField("platformToken", e.target.value)}
          className={cn(inputCls, "pr-10 font-mono text-[13px] sm:text-[13px]")}
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
        <div className="rounded-[14px] sm:rounded-[14px] bg-[var(--dc-green-bg)] p-3.5 sm:p-4">
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
                Token dari Pengaturan
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
          placeholder="Tempel token di sini"
          value={form.platformToken}
          onChange={(e) => setFormField("platformToken", e.target.value)}
          className={cn(inputCls, "pr-10 font-mono text-[13px] sm:text-[13px]")}
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

function StepHeading({ n, id, done, children }: { n: number; id: string; done: boolean; children: React.ReactNode }) {
  return (
    <h2 id={id} className="flex items-center gap-2.5 text-[18px] font-semibold tracking-[-0.01em] text-[var(--dc-text)]">
      <span
        aria-hidden="true"
        className={cn(
          "grid h-7 w-7 place-items-center rounded-full text-[13px] font-bold",
          done ? "bg-[var(--accent)] text-white" : "bg-tone-lilac text-lav-text",
        )}
      >
        {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : n}
      </span>
      {children}
    </h2>
  );
}

/* ================================================================ */
/*  MAIN VIEW                                                       */
/* ================================================================ */

export function DeployFormView() {
  const {
    form,
    setFormField,
    submitDeploy,
    repoEnvCheck,
    setView,
    vercelToken,
    cloudflareToken,
    cloudflareAccountId,
    railwayToken,
  } = useDeploy();

  const [isModalOpen, setModalOpen] = React.useState(false);
  const [currentStep, setCurrentStep] = React.useState(0);
  const [dir, setDir] = React.useState<1 | -1>(1);
  const [nameTouched, setNameTouched] = React.useState(false);

  const platform = (form.platform || "vercel") as Platform;
  const steps = React.useMemo(() => getStepsForPlatform(platform), [platform]);
  const step = steps[currentStep];
  const activePlatformInfo = PLATFORMS.find((p) => p.id === platform);
  const isLast = currentStep === steps.length - 1;

  React.useEffect(() => {
    if (!form.platform) setFormField("platform", "vercel");
  }, [form.platform, setFormField]);

  const hasToken: Record<Platform, boolean> = {
    vercel: !!vercelToken,
    cloudflare: !!cloudflareToken && !!cloudflareAccountId,
    railway: !!railwayToken,
  };

  const validation = repoEnvCheck.status === "ok" ? repoEnvCheck.validation : null;
  const compatOf = (p: Platform) => validation?.compat[p] ?? null;

  /*
   * Begitu repo selesai diperiksa, pilihkan platform yang paling cocok
   * (urutan: "ok" dulu, lalu "warn"). Hanya sekali per repo, supaya pilihan
   * manual pengguna sesudahnya tidak ditimpa.
   */
  const autoPickedFor = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!validation) return;
    if (autoPickedFor.current === validation.fullName) return;
    autoPickedFor.current = validation.fullName;
    const best =
      PLATFORM_ORDER.find((p) => validation.compat[p].level === "ok") ??
      PLATFORM_ORDER.find((p) => validation.compat[p].level === "warn");
    if (best) setFormField("platform", best);
  }, [validation, setFormField]);

  const onRepoChange = (v: string) => {
    setFormField("githubUrl", v);
    if (!nameTouched) setFormField("projectName", suggestRepoName(v));
  };

  const repoReady =
    !!form.githubUrl?.trim() &&
    repoEnvCheck.status === "ok" &&
    compatOf(platform)?.level !== "blocked";

  /* Validation */
  const canNext = React.useMemo(() => {
    if (!step) return false;
    if (step.optional) return true;
    switch (step.id) {
      case "projectName":
        return (
          !!form.projectName?.trim() && form.projectName.trim().length >= 3
        );
      case "platformToken":
        return !!form.platformToken?.trim();
      case "accountId":
        return !!form.accountId?.trim();
      default:
        return true;
    }
  }, [step, form]);

  const previewDomain = `${(form.projectName || "my-project")
    .toLowerCase()
    .replace(/\s+/g, "-")}.${domainSuffixFor(platform)}`;

  /* Navigation */
  const openWizard = () => {
    if (!repoReady) return;
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
          {/* ---------- HEADER ---------- */}
          <div className="mb-6">
            <PageTitle
              title="Deploy dari GitHub"
              desc="Tempel link repo. Depup memeriksa isinya, lalu menyarankan platform yang cocok sebelum deploy dimulai."
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start max-w-5xl">
            {/* ---------- 1. REPO ---------- */}
            <section aria-labelledby="deploy-step-repo" className="surface-solid p-5 sm:p-6">
              <StepHeading n={1} id="deploy-step-repo" done={repoEnvCheck.status === "ok"}>
                Tempel link repo
              </StepHeading>
              <label htmlFor="githubUrl" className="mt-4 block text-[14px] font-medium text-[var(--dc-text)]">
                Link repo GitHub
              </label>
              <input
                id="githubUrl"
                type="url"
                inputMode="url"
                autoComplete="off"
                spellCheck={false}
                placeholder="https://github.com/nama-akun/nama-repo"
                value={form.githubUrl}
                onChange={(e) => onRepoChange(e.target.value)}
                aria-describedby="githubUrl-hint"
                className={cn(inputCls, "mt-2 font-mono")}
              />
              <p id="githubUrl-hint" className="mt-2 text-[13px] text-[var(--dc-text-muted)]">
                Repo private? Isi{" "}
                <button type="button" onClick={() => setView("settings")} className="font-medium text-lav-text underline underline-offset-4">
                  token GitHub di Pengaturan
                </button>{" "}
                dulu.
              </p>
              {form.githubUrl && !form.githubUrl.includes("github.com") && (
                <p className="mt-2 text-[13px] text-warn-fg flex items-center gap-1.5" role="alert">
                  <CircleAlert className="w-3.5 h-3.5 shrink-0" /> Link harus dari github.com
                </p>
              )}
              <div aria-live="polite">
                <RepoCheckCard platform={platform} />
              </div>
              {repoEnvCheck.status === "ok" && repoEnvCheck.detectedEnvVars.length > 0 && (
                <p className="mt-2 text-[13px] text-lav-text flex items-start gap-1.5">
                  <CircleAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>
                    Repo ini butuh variabel:{" "}
                    <span className="font-mono">{repoEnvCheck.detectedEnvVars.join(", ")}</span>. Nanti tinggal isi nilainya.
                  </span>
                </p>
              )}
              {repoEnvCheck.status === "ok" &&
                repoEnvCheck.warnings.map((w, i) => (
                  <p key={i} className="mt-2 text-[13px] text-warn-fg flex items-start gap-1.5">
                    <CircleAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{w}</span>
                  </p>
                ))}
            </section>

            {/* ---------- 2. PLATFORM ---------- */}
            <section aria-labelledby="deploy-step-platform" className="surface-solid p-5 sm:p-6">
              <StepHeading n={2} id="deploy-step-platform" done={false}>
                Pilih platform
              </StepHeading>
              <p className="mt-1 text-[13px] text-[var(--dc-text-muted)]">
                {validation
                  ? "Platform yang paling cocok sudah dipilihkan. Kamu tetap bisa menggantinya."
                  : "Kecocokan tiap platform muncul setelah repo diperiksa."}
              </p>

              <div className="mt-4 flex flex-col gap-2.5" role="radiogroup" aria-labelledby="deploy-step-platform">
                {PLATFORMS.map((p) => {
                  const selected = platform === p.id;
                  const compat = compatOf(p.id);
                  const blocked = compat?.level === "blocked";
                  return (
                    <button
                      key={p.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      aria-describedby={`plat-${p.id}-status`}
                      onClick={() => setFormField("platform", p.id)}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-[14px] p-4 text-left transition-colors",
                        selected
                          ? "bg-tone-lilac ring-2 ring-[color:var(--accent)]"
                          : "bg-[var(--dc-surface-2)] hover:bg-[var(--dc-hover)]",
                      )}
                    >
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-[var(--surface-solid)] text-lav-text">
                        <p.Icon size={20} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[16px] font-semibold tracking-[-0.01em] text-[var(--dc-text)]">{p.label}</span>
                        <span className="mt-0.5 block text-[13px] leading-snug text-[var(--dc-text-muted)]">{p.desc}</span>
                        <span id={`plat-${p.id}-status`} className="mt-2 flex flex-wrap gap-1.5">
                          {compat && (
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 text-[12px] font-semibold",
                                compat.level === "ok" && "bg-ok-bg text-ok-fg",
                                compat.level === "warn" && "bg-warn-bg text-warn-fg",
                                blocked && "bg-bad-bg text-bad-fg",
                              )}
                            >
                              {compat.level === "ok" ? "Cocok" : compat.level === "warn" ? "Dengan catatan" : "Tidak cocok"}
                            </span>
                          )}
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[12px] font-semibold",
                              hasToken[p.id] ? "bg-ok-bg text-ok-fg" : "bg-[var(--dc-pill)] text-[var(--dc-text-muted)]",
                            )}
                          >
                            {hasToken[p.id] ? "Token tersimpan" : "Belum ada token"}
                          </span>
                        </span>
                      </span>
                      <span
                        aria-hidden="true"
                        className={cn(
                          "mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full",
                          selected ? "bg-[var(--accent)] text-white" : "border-2 border-[var(--dc-line-strong)]",
                        )}
                      >
                        {selected && <Check className="h-3 w-3" strokeWidth={3} />}
                      </span>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={openWizard}
                disabled={!repoReady}
                aria-describedby="deploy-start-hint"
                className={cn(
                  "mt-5 w-full h-12 rounded-full font-semibold text-[15px] flex items-center justify-center gap-2 transition-all",
                  repoReady
                    ? "bg-[var(--dc-btn-bg)] text-[var(--dc-btn-fg)] hover:opacity-90 shadow-[var(--dc-shadow-btn)] active:scale-[0.98]"
                    : "bg-[var(--dc-pill)] text-[var(--dc-text-muted)] cursor-not-allowed",
                )}
              >
                <Rocket className="w-4 h-4" />
                Lanjut deploy ke {activePlatformInfo?.label}
                <ArrowRight className="w-4 h-4" />
              </button>
              <p id="deploy-start-hint" className="mt-2 text-center text-[13px] text-[var(--dc-text-muted)]">
                {!form.githubUrl?.trim()
                  ? "Tempel link repo dulu."
                  : repoEnvCheck.status === "checking"
                    ? "Sedang memeriksa repo…"
                    : repoEnvCheck.status === "error"
                      ? "Repo belum bisa diperiksa. Lihat penjelasannya di langkah 1."
                      : repoEnvCheck.status !== "ok"
                      ? "Tunggu sampai repo selesai diperiksa."
                      : compatOf(platform)?.level === "blocked"
                        ? `Repo ini tidak cocok untuk ${activePlatformInfo?.label}. Pilih platform lain.`
                        : !hasToken[platform]
                          ? `Token ${activePlatformInfo?.label} bisa diisi di langkah berikutnya.`
                          : "Siap. Tinggal beri nama project."}
              </p>
            </section>
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
                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-[14px] bg-violet-100 text-violet-500 dark:bg-white dark:text-[#1e1150] flex items-center justify-center shrink-0"
                  >
                    {activePlatformInfo && (
                      <activePlatformInfo.Icon size={17} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13px] sm:text-[13px] font-semibold leading-tight truncate text-[var(--dc-text)]">
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
                      <div className="mt-0.5 w-8 h-8 sm:w-9 sm:h-9 shrink-0 rounded-[14px] bg-[var(--dc-surface-solid)] flex items-center justify-center text-[var(--dc-text-muted)]">
                        <step.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-[16px] sm:text-[18px] font-semibold tracking-tight leading-tight flex items-center gap-2 flex-wrap text-[var(--dc-text)]">
                          {step.title}
                          {step.optional && (
                            <span className="text-[12px] px-1.5 sm:px-2 py-0.5 rounded-full bg-[var(--dc-pill)] text-[var(--dc-text-faint)] font-medium">
                              Opsional
                            </span>
                          )}
                        </h3>
                        <p className="mt-1 sm:mt-1.5 text-[13px] sm:text-[14px] leading-[1.5] text-[var(--dc-text-muted)]">
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
                            Nama project
                          </FieldLabel>
                          <div className="relative">
                            <input
                              id="projectName"
                              type="text"
                              autoFocus
                              placeholder="acme-storefront"
                              value={form.projectName}
                              onChange={(e) => {
                                setNameTouched(true);
                                setFormField("projectName", e.target.value);
                              }}
                              className={cn(inputCls, "pr-24")}
                            />
                            {(form.projectName || "").length > 0 && (
                              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] sm:text-[12px] text-[var(--dc-text-faint)] pointer-events-none">
                                .{domainSuffixFor(platform)}
                              </div>
                            )}
                          </div>
                          <div className="mt-2.5 sm:mt-3 rounded-[14px] sm:rounded-[10px] bg-[var(--dc-surface-2)] px-3 py-2 sm:py-2.5 flex items-center gap-2 text-[12px] sm:text-[12px] text-[var(--dc-text-faint)]">
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
                            ID akun Cloudflare
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
                              Perintah build
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
                                "font-mono text-[13px] sm:text-[13px]",
                              )}
                            />
                          </div>
                          <div>
                            <FieldLabel htmlFor="outputDir" optional>
                              Folder output
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
                                "font-mono text-[13px] sm:text-[13px]",
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
                            Token GitHub
                          </FieldLabel>
                          <div className="relative">
                            <input
                              id="githubPat"
                              type="password"
                              autoFocus
                              placeholder="ghp_… (khusus repo private)"
                              value={form.githubPat}
                              onChange={(e) =>
                                setFormField("githubPat", e.target.value)
                              }
                              className={cn(
                                inputCls,
                                "pr-10 font-mono text-[13px] sm:text-[13px]",
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
                            Variabel environment
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
                    "h-10 sm:h-9 px-3.5 sm:px-4 rounded-full text-[13px] sm:text-[13px] font-medium flex items-center gap-1.5 transition-colors shrink-0",
                    currentStep === 0
                      ? "text-[var(--dc-text-faint)] cursor-not-allowed"
                      : "bg-[var(--dc-pill)] text-[var(--dc-text-muted)] hover:bg-[var(--dc-hover)] hover:text-[var(--dc-text)] active:scale-[0.97]",
                  )}
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline">Kembali</span>
                </button>

                <div className="flex items-center gap-2 min-w-0">
                  {step?.optional && !isLast && (
                    <button
                      type="button"
                      onClick={skip}
                      className="h-10 sm:h-9 px-3 sm:px-4 rounded-full text-[13px] sm:text-[13px] font-medium text-[var(--dc-text-faint)] hover:text-[var(--dc-text-muted)] transition-colors shrink-0"
                    >
                      Lewati
                    </button>
                  )}

                  {isLast ? (
                    <button
                      type="submit"
                      form="deployForm"
                      className="h-10 sm:h-9 px-5 rounded-full text-[13px] sm:text-[13px] font-medium flex items-center gap-1.5 transition-all bg-[var(--dc-btn-bg)] text-[var(--dc-btn-fg)] hover:opacity-90 shadow-[var(--dc-shadow-btn)] active:scale-[0.97] shrink-0"
                    >
                      <span className="whitespace-nowrap">Deploy sekarang</span>
                      <Rocket className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={!canNext}
                      onClick={goNext}
                      className={cn(
                        "h-10 sm:h-9 px-5 rounded-full text-[13px] sm:text-[13px] font-medium flex items-center gap-1.5 transition-all shrink-0",
                        canNext
                          ? "bg-[var(--dc-btn-bg)] text-[var(--dc-btn-fg)] hover:opacity-90 shadow-[var(--dc-shadow-btn)] active:scale-[0.97]"
                          : "bg-[var(--dc-pill)] text-[var(--dc-text-faint)] cursor-not-allowed",
                      )}
                    >
                      Lanjut <ArrowRight className="w-3.5 h-3.5" />
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