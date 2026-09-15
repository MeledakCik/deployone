"use client";

import * as React from "react";
import { 
  HelpCircle, Loader2, ShieldCheck, ShieldAlert,
  Terminal, Check, Rocket, ArrowRight, ArrowLeft, X,
  Globe, Cloud, TramFront, Box, Github, KeyRound, ExternalLink, CircleAlert
} from "lucide-react";
import { ViewFade } from "@/components/ui/ViewFade";
import { cn } from "@/lib/utils";
import { useDeploy } from "@/lib/deploy-context";
import type { Platform } from "@/types";

const PLATFORMS: { id: Platform; label: string; desc: string; accent: string; letter: string; Icon: any }[] = [
  { id: "vercel", label: "Vercel", desc: "Frontend Cloud terbaik untuk Next.js", accent: "#ffffff", letter: "▲", Icon: Globe },
  { id: "cloudflare", label: "Cloudflare", desc: "Pages & Workers global edge network", accent: "#f6821f", letter: "☁", Icon: Cloud },
  { id: "railway", label: "Railway", desc: "Deploy app & database tanpa ribet", accent: "#a78bfa", letter: "◧", Icon: TramFront },
  { id: "render", label: "Render", desc: "Cloud serbaguna untuk web services", accent: "#5ee9a8", letter: "◍", Icon: Box },
];

const inputCls = "w-full h-[46px] rounded-[12px] bg-[#1e1e2f] border border-white/[0.08] px-4 text-[13px] placeholder:text-white/20 focus:outline-none focus:border-white/20 focus:bg-[#23233a] transition-colors";
const textareaCls = "w-full rounded-[12px] bg-[#1e1e2f] border border-white/[0.08] px-4 py-3 text-[13px] placeholder:text-white/20 focus:outline-none focus:border-white/20 focus:bg-[#23233a] transition-colors resize-none mono";
const labelCls = "block text-[11px] tracking-wide uppercase text-white/30 font-medium mb-1.5";

function TokenHelpLink({ topic }: { topic: string }) {
  const { setView } = useDeploy();
  return (
    <button
      type="button"
      onClick={() => setView("docs")}
      className="inline-flex items-center gap-1.5 text-[11px] font-medium text-violet-400 hover:text-white transition-colors"
    >
      <HelpCircle size={12} /> Cara dapetin {topic}
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
    <div className="mb-2 flex items-center justify-between gap-2">
      <label htmlFor={htmlFor} className={labelCls}>
        {children} {required && <span className="text-red-400">*</span>}
        {optional && <span className="text-white/20 lowercase normal-case">(opsional)</span>}
      </label>
      {help && <TokenHelpLink topic={help} />}
    </div>
  );
}

function VercelTokenField() {
  const { form, setFormField, savedVercelToken, savedVercelTokenStatus } = useDeploy();
  const [manualOverride, setManualOverride] = React.useState(false);

  const usingSavedToken = savedVercelTokenStatus === "ok" && Boolean(savedVercelToken) && !manualOverride;

  React.useEffect(() => {
    if (usingSavedToken && savedVercelToken) {
      setFormField("platformToken", savedVercelToken.token);
    }
  }, [usingSavedToken, savedVercelToken?.token, setFormField]);

  if (savedVercelTokenStatus === "checking") {
    return (
      <div>
        <FieldLabel htmlFor="platformToken" required>Vercel Token</FieldLabel>
        <p className="inline-flex items-center gap-2 text-[12px] text-white/40">
          <Loader2 size={13} className="animate-spin" /> Mengecek token tersimpan...
        </p>
      </div>
    );
  }

  if (usingSavedToken && savedVercelToken) {
    return (
      <div>
        <FieldLabel htmlFor="platformToken" required>Vercel Token</FieldLabel>
        <div className="flex items-center justify-between gap-3 rounded-[14px] border border-emerald-400/20 bg-[#0f2a22] p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-400/20 flex items-center justify-center shrink-0">
              <ShieldCheck size={16} className="text-emerald-300" />
            </div>
            <div>
              <div className="text-[13px] font-medium text-emerald-100">
                Terhubung sebagai @{savedVercelToken.username}
              </div>
              <div className="text-[11px] text-emerald-200/50 mt-0.5">
                Token aman dari Settings
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setManualOverride(true)}
            className="h-8 px-3 rounded-full bg-white/[0.06] border border-white/[0.08] text-white/70 text-[11px] font-medium hover:bg-white/[0.1] transition-colors"
          >
            Ganti
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <FieldLabel htmlFor="platformToken" required help="Vercel Token">Vercel Token</FieldLabel>
      <div className="relative">
        <input
          id="platformToken"
          type="password"
          required
          placeholder="••••••••••••••••"
          value={form.platformToken}
          onChange={(e) => setFormField("platformToken", e.target.value)}
          className={cn(inputCls, "pr-10")}
        />
        <KeyRound className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
      </div>
      {savedVercelTokenStatus === "invalid" && !manualOverride && (
        <p className="mt-2 inline-flex items-center gap-1.5 text-[11.5px] text-red-400">
          <ShieldAlert size={13} /> Token di Settings tidak valid, masukkan yang baru.
        </p>
      )}
      {manualOverride && savedVercelToken && (
        <button
          type="button"
          onClick={() => {
            setManualOverride(false);
            setFormField("platformToken", savedVercelToken.token);
          }}
          className="mt-2 text-[11.5px] text-white/50 hover:text-white underline underline-offset-4"
        >
          Pakai token tersimpan lagi
        </button>
      )}
    </div>
  );
}

function CloudflareTokenField() {
  const { form, setFormField, savedCloudflareToken, savedCloudflareTokenStatus, cloudflareAccounts } = useDeploy();
  const [manualOverride, setManualOverride] = React.useState(false);

  const usingSavedToken = savedCloudflareTokenStatus === "ok" && Boolean(savedCloudflareToken) && !manualOverride;

  React.useEffect(() => {
    if (usingSavedToken && savedCloudflareToken) {
      setFormField("platformToken", savedCloudflareToken.token);
      setFormField("accountId", savedCloudflareToken.accountId);
    }
  }, [usingSavedToken, savedCloudflareToken?.token, savedCloudflareToken?.accountId, setFormField]);

  if (savedCloudflareTokenStatus === "checking") {
    return (
      <div>
        <FieldLabel htmlFor="platformToken" required>Cloudflare Token</FieldLabel>
        <p className="inline-flex items-center gap-2 text-[12px] text-white/40">
          <Loader2 size={13} className="animate-spin" /> Mengecek token tersimpan...
        </p>
      </div>
    );
  }

  if (usingSavedToken && savedCloudflareToken) {
    return (
      <div>
        <FieldLabel htmlFor="platformToken" required>Cloudflare Token</FieldLabel>
        <div className="flex items-center justify-between gap-3 rounded-[14px] border border-emerald-400/20 bg-[#0f2a22] p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-400/20 flex items-center justify-center shrink-0">
              <ShieldCheck size={16} className="text-emerald-300" />
            </div>
            <div>
              <div className="text-[13px] font-medium text-emerald-100">
                Akun: {savedCloudflareToken.accountName}
              </div>
              <div className="text-[11px] text-emerald-200/50 mt-0.5">
                Token aman dari Settings
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setManualOverride(true)}
            className="h-8 px-3 rounded-full bg-white/[0.06] border border-white/[0.08] text-white/70 text-[11px] font-medium hover:bg-white/[0.1] transition-colors"
          >
            Ganti
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <FieldLabel htmlFor="platformToken" required help="Cloudflare Token">Cloudflare Token</FieldLabel>
        <div className="relative">
          <input
            id="platformToken"
            type="password"
            required
            placeholder="••••••••••••••••"
            value={form.platformToken}
            onChange={(e) => setFormField("platformToken", e.target.value)}
            className={cn(inputCls, "pr-10")}
          />
          <KeyRound className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
        </div>
        {savedCloudflareTokenStatus === "invalid" && !manualOverride && (
          <p className="mt-2 inline-flex items-center gap-1.5 text-[11.5px] text-red-400">
            <ShieldAlert size={13} /> Token di Settings tidak valid.
          </p>
        )}
        {savedCloudflareTokenStatus === "needs_account" && cloudflareAccounts.length > 1 && !manualOverride && (
          <p className="mt-2 text-[11.5px] text-white/40">
            Token valid, pilih Account ID di bawah.
          </p>
        )}
        {manualOverride && savedCloudflareToken && (
          <button
            type="button"
            onClick={() => {
              setManualOverride(false);
              setFormField("platformToken", savedCloudflareToken.token);
              setFormField("accountId", savedCloudflareToken.accountId);
            }}
            className="mt-2 text-[11.5px] text-white/50 hover:text-white underline underline-offset-4"
          >
            Pakai token tersimpan lagi
          </button>
        )}
      </div>
      <div>
        <FieldLabel htmlFor="accountId" required>Account ID</FieldLabel>
        {cloudflareAccounts.length > 0 ? (
          <select
            id="accountId"
            required
            value={form.accountId}
            onChange={(e) => setFormField("accountId", e.target.value)}
            className={cn(inputCls, "mono appearance-none")}
          >
            <option value="" disabled>Pilih akun...</option>
            {cloudflareAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} — {a.id}
              </option>
            ))}
          </select>
        ) : (
          <input
            id="accountId"
            type="text"
            required
            placeholder="a1b2c3d4e5f6..."
            value={form.accountId}
            onChange={(e) => setFormField("accountId", e.target.value)}
            className={cn(inputCls, "mono")}
          />
        )}
      </div>
    </div>
  );
}

function CloudflareGithubConnectionStep() {
  const { githubConnectionStatus, checkGithubConnection, savedCloudflareToken } = useDeploy();

  if (!savedCloudflareToken) return null;

  if (githubConnectionStatus.status === "connected") {
    return (
      <div className="rounded-[14px] border border-emerald-400/20 bg-[#0f2a22] px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-emerald-400/20 flex items-center justify-center shrink-0">
          <Github className="w-4 h-4 text-emerald-300" />
        </div>
        <div>
          <div className="text-[13px] font-medium text-emerald-100">GitHub Terhubung</div>
          <div className="text-[11px] text-emerald-200/50 mt-0.5">Deploy otomatis berjalan.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[14px] border border-amber-400/20 bg-amber-400/[0.08] p-4 flex gap-3">
      <div className="w-8 h-8 rounded-full bg-amber-400/15 flex items-center justify-center shrink-0">
        <CircleAlert className="w-4 h-4 text-amber-300" />
      </div>
      <div className="flex-1">
        <div className="text-[13px] font-medium text-amber-200">Koneksi GitHub Diperlukan</div>
        <div className="text-[11px] text-amber-200/60 mt-1 leading-relaxed">
          Aktifkan koneksi di Cloudflare sekali, deploy berikutnya akan otomatis.
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {githubConnectionStatus.connectUrl && (
            <a
              href={githubConnectionStatus.connectUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-8 items-center gap-1.5 rounded-full bg-amber-400 px-4 text-[11px] font-medium text-black hover:bg-amber-300 transition-colors"
            >
              <ExternalLink size={12} /> Hubungkan
            </a>
          )}
          <button
            type="button"
            onClick={() => void checkGithubConnection()}
            disabled={githubConnectionStatus.status === "checking"}
            className="inline-flex h-8 items-center gap-1.5 rounded-full bg-white/[0.06] border border-white/[0.08] px-4 text-[11px] font-medium text-white/70 hover:bg-white/[0.1] transition-colors disabled:opacity-50"
          >
            {githubConnectionStatus.status === "checking" && <Loader2 size={11} className="animate-spin" />}
            Cek Ulang
          </button>
        </div>
      </div>
    </div>
  );
}

export function DeployFormView() {
  const { form, setFormField, submitDeploy } = useDeploy();
  
  const [isModalOpen, setModalOpen] = React.useState(false);
  const [currentStep, setCurrentStep] = React.useState(0);
  
  const platform = (form.platform || "vercel") as Platform;
  const activePlatformInfo = PLATFORMS.find(p => p.id === platform);

  // Default step headers based on position
  const STEPS = [
    { title: "Informasi Project", desc: "Tentukan nama project dan repository yang akan di-deploy." },
    { title: "Konfigurasi & Token", desc: "Pengaturan framework dan akses autentikasi." }
  ];
  
  const currentStepData = STEPS[currentStep];
  
  // Basic validation to disable Next on Step 0
  const canGoNext = Boolean(form.projectName?.trim() && form.githubUrl?.trim());

  React.useEffect(() => {
    if (!form.platform) {
      setFormField("platform", "vercel");
    }
  }, [form.platform, setFormField]);

  const openDeployWizard = (p: Platform) => {
    setFormField("platform", p);
    setCurrentStep(0);
    setModalOpen(true);
  };

  const handleCloseModal = () => setModalOpen(false);
  const handleNextStep = () => setCurrentStep(1);
  const handlePrevStep = () => setCurrentStep(0);

  return (
    <ViewFade>
      <div className="relative min-h-[80vh] w-full bg-[#0a0a0f] text-white overflow-hidden rounded-2xl border border-white/[0.05] shadow-2xl">
        {/* Background Blurs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-[15%] left-[15%] w-[60%] h-[40%] bg-violet-600/15 blur-[100px] rounded-full" />
          <div className="absolute -bottom-[10%] right-[5%] w-[50%] h-[35%] bg-cyan-500/10 blur-[110px] rounded-full" />
          <div className="absolute top-[35%] left-[50%] -translate-x-1/2 w-[35%] h-[25%] bg-white/[0.03] blur-[80px] rounded-full" />
        </div>

        <div className="relative z-10 max-w-[980px] mx-auto px-6 md:px-10 py-12 md:py-20">
          <div className="flex items-center justify-between mb-12">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#15151f] border border-white/10 flex items-center justify-center">
                <Terminal className="w-4 h-4 text-white/70" />
              </div>
              <span className="text-[13px] tracking-[0.18em] text-white/40 font-medium uppercase">Deploy Console</span>
            </div>
            <div className="hidden md:flex items-center gap-2 text-[12px] text-white/30">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              All systems operational
            </div>
          </div>

          <div className="text-center mb-10">
            <h1 className="text-[32px] md:text-[44px] font-[700] tracking-tight leading-[0.95]">Pilih Platform Deploy</h1>
            <p className="mt-3 text-[14px] md:text-[15px] text-white/45 max-w-[460px] mx-auto leading-relaxed">
              Pilih provider favorit kamu. Kami akan bantu setup deploy otomatis dengan panduan step-by-step.
            </p>
          </div>

          {/* Grid Platform Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 max-w-[720px] mx-auto">
            {PLATFORMS.map((p) => {
              const isSelected = platform === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => openDeployWizard(p.id)}
                  className={cn(
                    "group text-left relative rounded-[22px] p-[1px] transition-all duration-300",
                    isSelected ? "scale-[1.01]" : "hover:scale-[1.01]"
                  )}
                  style={{ background: isSelected ? p.accent : "rgba(255,255,255,0.08)" }}
                >
                  <div className={cn(
                    "relative rounded-[21px] bg-[#15151f] p-5 md:p-6 h-full flex flex-col justify-between overflow-hidden transition-all",
                    isSelected ? "bg-[#181826] shadow-[0_0_0_1px_rgba(255,255,255,0.08)_inset,0_10px_40px_-10px_rgba(0,0,0,0.6)]" : "hover:bg-[#1a1a28]"
                  )}>
                    <div className="absolute -top-20 -right-20 w-48 h-48 rounded-full opacity-20 blur-[30px] transition-opacity group-hover:opacity-30" style={{ background: p.accent }} />
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3.5">
                        <div className="w-[42px] h-[42px] rounded-[13px] flex items-center justify-center border text-[18px] font-bold tracking-tight" style={{ background: `${p.accent}14`, borderColor: `${p.accent}30`, color: p.accent }}>
                          {p.letter}
                        </div>
                        <div>
                          <div className="text-[16px] font-semibold tracking-tight leading-none">{p.label}</div>
                          <div className="mt-1.5 text-[12px] leading-[1.3] text-white/40 max-w-[170px]">{p.desc}</div>
                        </div>
                      </div>
                      <div className={cn("w-5 h-5 rounded-full border flex items-center justify-center transition-all", isSelected ? "bg-white border-white" : "border-white/15 bg-white/[0.03]")}>
                        {isSelected && <Check className="w-3 h-3 text-black" strokeWidth={3} />}
                      </div>
                    </div>
                    <div className="mt-5 flex items-center gap-2 text-[11px] font-medium tracking-wide">
                      <span className={cn("px-2.5 py-1 rounded-full border", isSelected ? "bg-white/10 border-white/15 text-white/80" : "bg-white/[0.04] border-white/[0.06] text-white/30 group-hover:text-white/50")}>Auto Deploy</span>
                      <span className={cn("px-2.5 py-1 rounded-full border", isSelected ? "bg-white/10 border-white/15 text-white/80" : "bg-white/[0.04] border-white/[0.06] text-white/30 group-hover:text-white/50")}>GitHub</span>
                    </div>
                    {isSelected && <div className="absolute bottom-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Modal Wizard */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 text-white font-sans">
            <div className="absolute inset-0 bg-[#06060a]/80 backdrop-blur-[14px]" onClick={handleCloseModal} />
            <div className="relative w-full max-w-[520px] rounded-[28px] bg-[#15151f] border border-white/[0.08] shadow-[0_20px_80px_-20px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.05)_inset] overflow-hidden flex flex-col max-h-[90vh]">
              <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-white/15 to-transparent shrink-0" />
              
              {/* Header Modal */}
              <div className="px-7 md:px-8 pt-6 pb-5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#1e1e2f] border border-white/10 flex items-center justify-center" style={{ color: activePlatformInfo?.accent }}>
                    {activePlatformInfo && <activePlatformInfo.Icon className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="text-[13px] font-semibold leading-none">Deploy ke {activePlatformInfo?.label}</div>
                    <div className="text-[11px] text-white/40 mt-1">Langkah {currentStep + 1} dari 2 • {currentStepData?.title}</div>
                  </div>
                </div>
                <button onClick={handleCloseModal} className="w-8 h-8 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center hover:bg-white/10 transition-colors">
                  <X className="w-4 h-4 text-white/60" />
                </button>
              </div>

              {/* Progress Bar */}
              <div className="px-7 md:px-8 pb-5 shrink-0">
                <div className="flex items-center gap-2">
                  {[0, 1].map((stepIdx) => {
                    const isCompleted = stepIdx < currentStep;
                    const isCurrent = stepIdx === currentStep;
                    return (
                      <div key={stepIdx} className="flex items-center gap-2 flex-1">
                        <div className={cn("relative h-[28px] flex-1 rounded-full overflow-hidden transition-all duration-500", isCompleted ? "bg-white" : isCurrent ? "bg-white/20" : "bg-white/[0.07]")}>
                          {isCurrent && <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-white/40 animate-[shimmer_1.5s_infinite]" />}
                          {isCompleted && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Check className="w-3 h-3 text-black" strokeWidth={3} />
                            </div>
                          )}
                        </div>
                        {stepIdx === 0 && <div className={cn("w-1 h-1 rounded-full", isCompleted ? "bg-white" : "bg-white/15")} />}
                      </div>
                    );
                  })}
                </div>
              </div>
              
              <div className="h-[1px] bg-white/[0.06] mx-7 md:mx-8 shrink-0" />
              
              {/* Form Content - Scrollable */}
              <div className="px-7 md:px-8 py-6 relative overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
                <div className={cn("transition-all duration-300", currentStep === 1 ? "animate-[slideInRight_0.35s_ease]" : "animate-[slideInLeft_0.35s_ease]")}>
                  
                  <div className="flex items-start gap-3.5 mb-6">
                    <div className="mt-0.5 w-9 h-9 shrink-0 rounded-xl bg-[#1e1e2f] border border-white/[0.08] flex items-center justify-center text-white/70">
                      {currentStep === 0 ? <Rocket className="w-4 h-4" /> : <KeyRound className="w-4 h-4" />}
                    </div>
                    <div>
                      <h3 className="text-[17px] font-semibold tracking-tight">{currentStepData.title}</h3>
                      <p className="mt-1.5 text-[13px] leading-[1.5] text-white/45">{currentStepData.desc}</p>
                    </div>
                  </div>

                  <form id="deployForm" onSubmit={submitDeploy} className="space-y-5">
                    
                    {/* --- STEP 0 : Semua Platform --- */}
                    {currentStep === 0 && (
                      <>
                        <div>
                          <FieldLabel htmlFor="projectName" required>Nama Project</FieldLabel>
                          <div className="relative">
                            <input
                              id="projectName"
                              type="text"
                              required
                              placeholder="acme-storefront"
                              value={form.projectName}
                              onChange={(e) => setFormField("projectName", e.target.value)}
                              className={inputCls}
                              autoFocus
                            />
                            {form.projectName && platform === "vercel" && (
                              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-white/25">
                                .vercel.app
                              </div>
                            )}
                          </div>
                        </div>

                        <div>
                          <FieldLabel htmlFor="githubUrl" required>GitHub URL</FieldLabel>
                          <input
                            id="githubUrl"
                            type="text"
                            required
                            placeholder="https://github.com/username/repo"
                            value={form.githubUrl}
                            onChange={(e) => setFormField("githubUrl", e.target.value)}
                            className={cn(inputCls, "mono")}
                          />
                        </div>
                      </>
                    )}

                    {/* --- STEP 1 : Vercel --- */}
                    {currentStep === 1 && platform === "vercel" && (
                      <>
                        <VercelTokenField />
                        <div>
                          <FieldLabel htmlFor="githubPat" optional help="GitHub Token">GitHub Token</FieldLabel>
                          <div className="relative">
                            <input
                              id="githubPat"
                              type="password"
                              placeholder="ghp_•••••••••••••••• (repo private)"
                              value={form.githubPat}
                              onChange={(e) => setFormField("githubPat", e.target.value)}
                              className={cn(inputCls, "pr-10")}
                            />
                            <Github className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                          </div>
                        </div>
                      </>
                    )}

                    {/* --- STEP 1 : Cloudflare --- */}
                    {currentStep === 1 && platform === "cloudflare" && (
                      <>
                        <CloudflareTokenField />
                        <CloudflareGithubConnectionStep />
                        <div>
                          <FieldLabel htmlFor="githubPat" optional help="GitHub Token">GitHub Token</FieldLabel>
                          <div className="relative">
                            <input
                              id="githubPat"
                              type="password"
                              placeholder="ghp_•••••••••••••••• (repo private)"
                              value={form.githubPat}
                              onChange={(e) => setFormField("githubPat", e.target.value)}
                              className={cn(inputCls, "pr-10")}
                            />
                            <Github className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                          </div>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <FieldLabel htmlFor="buildCommand" optional>Build Cmd</FieldLabel>
                            <input
                              id="buildCommand"
                              type="text"
                              placeholder="npm run build"
                              value={form.buildCommand}
                              onChange={(e) => setFormField("buildCommand", e.target.value)}
                              className={cn(inputCls, "mono")}
                            />
                          </div>
                          <div>
                            <FieldLabel htmlFor="outputDir" optional>Output Dir</FieldLabel>
                            <input
                              id="outputDir"
                              type="text"
                              placeholder="dist"
                              value={form.outputDir}
                              onChange={(e) => setFormField("outputDir", e.target.value)}
                              className={cn(inputCls, "mono")}
                            />
                          </div>
                        </div>
                      </>
                    )}

                    {/* --- STEP 1 : Railway --- */}
                    {currentStep === 1 && platform === "railway" && (
                      <>
                        <div>
                          <FieldLabel htmlFor="platformToken" required>Railway Token</FieldLabel>
                          <div className="relative">
                            <input
                              id="platformToken"
                              type="password"
                              required
                              placeholder="••••••••••••••••"
                              value={form.platformToken}
                              onChange={(e) => setFormField("platformToken", e.target.value)}
                              className={cn(inputCls, "pr-10")}
                            />
                            <KeyRound className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                          </div>
                        </div>
                        <div>
                          <FieldLabel htmlFor="startCommand" optional>Start Command</FieldLabel>
                          <input
                            id="startCommand"
                            type="text"
                            placeholder="npm start"
                            value={form.startCommand}
                            onChange={(e) => setFormField("startCommand", e.target.value)}
                            className={cn(inputCls, "mono")}
                          />
                        </div>
                        <div>
                          <FieldLabel htmlFor="envText" optional>Environment Variables</FieldLabel>
                          <textarea
                            id="envText"
                            rows={3}
                            placeholder={"KEY=value\nANOTHER_KEY=value"}
                            value={form.envText}
                            onChange={(e) => setFormField("envText", e.target.value)}
                            className={textareaCls}
                          />
                        </div>
                      </>
                    )}

                    {/* --- STEP 1 : Render --- */}
                    {currentStep === 1 && platform === "render" && (
                      <>
                        <div>
                          <FieldLabel htmlFor="platformToken" required>Render API Key</FieldLabel>
                          <div className="relative">
                            <input
                              id="platformToken"
                              type="password"
                              required
                              placeholder="••••••••••••••••"
                              value={form.platformToken}
                              onChange={(e) => setFormField("platformToken", e.target.value)}
                              className={cn(inputCls, "pr-10")}
                            />
                            <KeyRound className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                          </div>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <FieldLabel htmlFor="buildCommand" optional>Build Cmd</FieldLabel>
                            <input
                              id="buildCommand"
                              type="text"
                              placeholder="npm run build"
                              value={form.buildCommand}
                              onChange={(e) => setFormField("buildCommand", e.target.value)}
                              className={cn(inputCls, "mono")}
                            />
                          </div>
                          <div>
                            <FieldLabel htmlFor="startCommand" optional>Start Cmd</FieldLabel>
                            <input
                              id="startCommand"
                              type="text"
                              placeholder="npm start"
                              value={form.startCommand}
                              onChange={(e) => setFormField("startCommand", e.target.value)}
                              className={cn(inputCls, "mono")}
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </form>
                </div>
              </div>

              {/* Navigasi Footer Modal */}
              <div className="px-7 md:px-8 py-4 bg-[#11111a] border-t border-white/[0.06] flex items-center justify-between shrink-0">
                <button 
                  type="button"
                  onClick={handlePrevStep}
                  disabled={currentStep === 0}
                  className={cn(
                    "h-9 px-4 rounded-full text-[13px] font-medium flex items-center gap-1.5 transition-colors",
                    currentStep === 0 ? "text-white/20 cursor-not-allowed" : "bg-white/[0.06] border border-white/[0.08] text-white/70 hover:bg-white/[0.1] hover:text-white"
                  )}
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Prev
                </button>
                
                <div className="flex items-center gap-2">
                  {currentStep === 0 ? (
                    <button 
                      type="button"
                      onClick={handleNextStep}
                      disabled={!canGoNext}
                      className={cn(
                        "h-9 px-5 rounded-full text-[13px] font-medium flex items-center gap-1.5 transition-all",
                        canGoNext ? "bg-white text-black hover:bg-white/90 shadow-[0_4px_20px_-6px_rgba(255,255,255,0.4)]" : "bg-white/10 text-white/30 cursor-not-allowed"
                      )}
                    >
                      Next <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button 
                      type="submit"
                      form="deployForm"
                      className="h-9 px-5 rounded-full text-[13px] font-medium flex items-center gap-1.5 transition-all bg-white text-black hover:bg-white/90 shadow-[0_4px_20px_-6px_rgba(255,255,255,0.4)]"
                    >
                      Deploy Project <Rocket className="w-3.5 h-3.5" />
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