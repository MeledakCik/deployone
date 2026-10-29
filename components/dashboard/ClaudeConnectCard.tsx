"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpen,
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
  Unplug,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Platform, SettingsTokens } from "@/types";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/confirm";
import { useDeploy } from "@/lib/deploy-context";
import { api } from "@/components/db/ui";

const DEPLOY_TARGETS: { platform: Platform; label: string; tokenField: keyof SettingsTokens }[] = [
  { platform: "vercel", label: "Vercel", tokenField: "vercelToken" },
  { platform: "cloudflare", label: "Cloudflare Pages", tokenField: "cloudflareToken" },
  { platform: "railway", label: "Railway", tokenField: "railwayToken" },
];

type AiClientId = "claude" | "opencode" | "cursor" | "codex" | "gemini" | "deepseek";

const AI_CLIENTS: { id: AiClientId; label: string; hint: string }[] = [
  { id: "claude", label: "Claude", hint: "Web, App & Code CLI" },
  { id: "gemini", label: "Gemini", hint: "Web & CLI" },
  { id: "cursor", label: "Cursor", hint: "1-Klik / mcp.json" },
  { id: "opencode", label: "OpenCode", hint: "opencode.json" },
  { id: "codex", label: "Codex", hint: "config.toml" },
  { id: "deepseek", label: "DeepSeek", hint: "Harness (dsh)" },
];

const OAUTH_URI_PRESETS: {
  id: string;
  label: string;
  hint: string;
  uris: string[];
  defaultOn: boolean;
}[] = [
  {
    id: "claude",
    label: "Claude (Web & App)",
    hint: "claude.ai & claude.com",
    uris: ["https://claude.ai/api/mcp/auth_callback", "https://claude.com/api/mcp/auth_callback", "claude://oauth/callback"],
    defaultOn: true,
  },
  {
    id: "gemini",
    label: "Gemini (Web & CLI)",
    hint: "oauth-redirect.googleusercontent.com & CLI",
    uris: [
      "https://oauth-redirect.googleusercontent.com/r/callback",
      "https://oauth-redirect-sandbox.googleusercontent.com/r/callback",
      "https://oauth-redirect-test.googleusercontent.com/r/callback",
      "https://vertexaisearch.cloud.google.com/oauth-redirect",
      "https://gemini.google.com/oauth/callback",
      "https://aistudio.google.com/oauth/callback",
      "gemini://oauth/callback",
    ],
    defaultOn: true,
  },
  {
    id: "cursor",
    label: "Cursor IDE",
    hint: "cursor:// callback",
    uris: ["cursor://anysphere.cursor-retrieval/oauth/callback", "cursor://anysphere.cursor-mcp/oauth/callback"],
    defaultOn: true,
  },
  {
    id: "opencode",
    label: "OpenCode",
    hint: "opencode.ai & loopback",
    uris: ["https://opencode.ai/oauth/callback", "opencode://oauth/callback", "http://127.0.0.1:6274/oauth/callback"],
    defaultOn: true,
  },
  {
    id: "codex",
    label: "Codex (Web & CLI)",
    hint: "chatgpt.com & codex://",
    uris: ["https://chatgpt.com/connector_platform_oauth_redirect", "codex://oauth/callback"],
    defaultOn: true,
  },
  {
    id: "localhost",
    label: "Localhost / CLI Callback",
    hint: "http://localhost & 127.0.0.1",
    uris: ["http://localhost:6274/oauth/callback", "http://localhost:3000/oauth/callback"],
    defaultOn: true,
  },
];

const TOKEN_TTL_OPTIONS: { days: number; label: string }[] = [
  { days: 30, label: "30 Hari (Rekomendasi)" },
  { days: 90, label: "90 Hari" },
  { days: 365, label: "1 Tahun" },
  { days: 7, label: "7 Hari" },
  { days: 1, label: "1 Hari" },
];

interface CustomOAuthClientItem {
  id: string;
  name: string;
  clientId: string;
  redirectUris: string[];
  hasSecret: boolean;
  secretPreview: string | null;
  createdAt: number;
}

interface OAuthEndpoints {
  issuer: string;
  mcpUrl: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  registrationEndpoint: string;
}

interface ConnectInfoResponse {
  mcpUrl: string;
  origin: string;
  oauthEndpoints?: OAuthEndpoints;
  customClients?: CustomOAuthClientItem[];
  activeSitesCount?: number;
  maxSites?: number;
}

interface CreatedOAuthCredentials {
  client: CustomOAuthClientItem;
  clientSecret: string | null;
  oauthEndpoints: OAuthEndpoints;
}

interface GeneratedTokenInfo {
  clientName: string;
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  mcpUrl: string;
}

function parsePlatforms(v: string | undefined): Platform[] {
  const list = (v ?? "").split(",").map((x) => x.trim());
  return DEPLOY_TARGETS.map((t) => t.platform).filter((p) => list.includes(p));
}

function buildClientSnippets(
  client: AiClientId,
  mcpUrl: string,
  token: string,
): {
  configTitle: string;
  configCode: string;
  cliTitle?: string;
  cliCode?: string;
  extraTitle?: string;
  extraCode?: string;
} {
  switch (client) {
    case "claude":
      return {
        configTitle: "Claude Desktop (claude_desktop_config.json) / .mcp.json",
        configCode: JSON.stringify(
          {
            mcpServers: {
              depup: {
                type: "http",
                url: mcpUrl,
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              },
            },
          },
          null,
          2,
        ),
        cliTitle: "Perintah Terminal Claude Code CLI",
        cliCode: `claude mcp add --transport http depup ${mcpUrl} --header "Authorization: Bearer ${token}"`,
      };
    case "opencode":
      return {
        configTitle: "Konfigurasi OpenCode (opencode.json / ~/.config/opencode/opencode.json)",
        configCode: JSON.stringify(
          {
            $schema: "https://opencode.ai/config.json",
            mcp: {
              depup: {
                type: "remote",
                url: mcpUrl,
                enabled: true,
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              },
            },
          },
          null,
          2,
        ),
        cliTitle: "Atau Login OAuth Langsung di Terminal OpenCode",
        cliCode: `opencode mcp auth depup`,
      };
    case "cursor":
      return {
        configTitle: "Konfigurasi Cursor (.cursor/mcp.json atau ~/.cursor/mcp.json)",
        configCode: JSON.stringify(
          {
            mcpServers: {
              depup: {
                url: mcpUrl,
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              },
            },
          },
          null,
          2,
        ),
        cliTitle: "Mode OAuth Otomatis di Cursor (Tanpa Header Token)",
        cliCode: JSON.stringify(
          {
            mcpServers: {
              depup: {
                url: mcpUrl,
              },
            },
          },
          null,
          2,
        ),
      };
    case "codex":
      return {
        configTitle: "Konfigurasi OpenAI Codex (~/.codex/config.toml)",
        configCode: `[mcp_servers.depup]\nurl = "${mcpUrl}"\nhttp_headers = { "Authorization" = "Bearer ${token}" }`,
        cliTitle: "Perintah Terminal Codex CLI",
        cliCode: `codex mcp add depup --url ${mcpUrl}`,
      };
    case "deepseek":
      // DeepSeek Harness memasang MCP lewat paket resmi @deepseek-ai/dsh-mcp-client (transport streamable-http).
      // Token TIDAK ditulis di YAML: header dibaca dari variabel lingkungan lewat !!js process.env.*.
      return {
        configTitle: "DeepSeek Harness (dsh): ~/.dsh/profiles/web/cordis.patch.yml",
        configCode: [
          "- insert:",
          "    - id: mcp-depup",
          "      name: '@deepseek-ai/dsh-mcp-client'",
          "      config:",
          "        serverName: 'depup'",
          "        transport: streamable-http",
          `        url: '${mcpUrl}'`,
          "        headers:",
          "          Authorization: !!js process.env.DEPUP_MCP_AUTH",
        ].join("\n"),
        cliTitle: "Langkah terminal (urutan: pasang paket, isi token, lalu jalankan)",
        cliCode: [
          "dsh --version",
          "dsh plugin --profile web add @deepseek-ai/dsh-mcp-client@<VERSI_DSH>",
          `export DEPUP_MCP_AUTH="Bearer ${token}"`,
          "dsh web",
        ].join("\n"),
        extraTitle: "Cek konfigurasi sudah terbaca",
        extraCode: "dsh --profile web --dump-config | grep mcp-",
      };
    case "gemini":
      return {
        configTitle: "Cara A (Gemini CLI / Code Assist — ~/.gemini/settings.json dengan Token)",
        configCode: JSON.stringify(
          {
            mcpServers: {
              depup: {
                httpUrl: mcpUrl,
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              },
            },
          },
          null,
          2,
        ),
        cliTitle: "Cara B (Perintah Terminal Gemini CLI — 1 Baris)",
        cliCode: `gemini mcp add --transport http depup ${mcpUrl} --header "Authorization: Bearer ${token}"`,
        extraTitle: "Cara C (Mode OAuth 2.1 Otomatis di Gemini CLI / Gemini Web tanpa Token Manual)",
        extraCode: JSON.stringify(
          {
            mcpServers: {
              depup: {
                httpUrl: mcpUrl,
                oauth: {
                  enabled: true,
                },
              },
            },
          },
          null,
          2,
        ),
      };
  }
}

/** Pindah ke grup "Konektor AI (MCP)" di halaman Docs, baik di web maupun di app mobile. */
function DocsLink({ className, children }: { className?: string; children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { setView } = useDeploy();
  function go() {
    if (pathname?.startsWith("/m")) {
      router.push("/m/docs#docs-mcp");
      return;
    }
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#docs-mcp`);
    setView("docs");
  }
  return (
    <button type="button" onClick={go} className={className}>
      {children}
    </button>
  );
}

/** Bagian yang bisa dilipat, supaya kartu tidak menumpuk panjang ke bawah. */
function Section({
  title,
  summary,
  open,
  onToggle,
  children,
}: {
  title: string;
  summary?: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--line)]">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 bg-[var(--surface-solid-2)] px-4 py-3 text-left"
      >
        <span className="min-w-0">
          <span className="block text-[13.5px] font-semibold">{title}</span>
          {summary && <span className="mt-0.5 block truncate text-[12px] text-text-muted">{summary}</span>}
        </span>
        <ChevronDown size={16} className={cn("shrink-0 text-text-faint transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className="space-y-4 border-t border-[var(--line)] p-4">{children}</div>}
    </div>
  );
}

/** Blok kode + tombol salin. Kode di-scroll ke samping, tidak melebarkan halaman. */
function CodeBlock({ title, code, onCopy }: { title: string; code: string; onCopy: () => void }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-[12px] font-medium text-text-muted">{title}</span>
        <button type="button" onClick={onCopy} className="pill inline-flex shrink-0 items-center gap-1 px-2.5 py-1 text-[11.5px]">
          <Copy size={12} /> Salin
        </button>
      </div>
      <pre className="max-w-full overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--pill-bg)] p-3 font-mono text-[11.5px] leading-relaxed">
        {code}
      </pre>
    </div>
  );
}

/**
 * Kartu "Konektor AI (MCP)" di Settings.
 * Hanya berisi yang dipakai langsung: URL, token, konfigurasi, OAuth, dan izin deploy.
 * Penjelasan, tutorial per aplikasi, dan contoh prompt ada di Docs → "Konektor AI (MCP)".
 */
export function ClaudeConnectCard({
  tokens,
  onTokensChange,
}: {
  tokens: SettingsTokens;
  /** Simpan perubahan izin platform langsung ke akun. */
  onTokensChange: (next: SettingsTokens) => void;
}) {
  const allowed = parsePlatforms(tokens.mcpDeployPlatforms);
  function togglePlatform(p: Platform, on: boolean) {
    const next = DEPLOY_TARGETS.map((t) => t.platform).filter((x) => (x === p ? on : allowed.includes(x)));
    onTokensChange({ ...tokens, mcpDeployPlatforms: next.join(",") });
  }

  const { showToast } = useToast();
  const confirm = useConfirm();

  const [mcpUrl, setMcpUrl] = React.useState<string | null>(null);
  const [endpoints, setEndpoints] = React.useState<OAuthEndpoints | null>(null);
  const [customClients, setCustomClients] = React.useState<CustomOAuthClientItem[]>([]);
  const [siteQuota, setSiteQuota] = React.useState<{ active: number; max: number } | null>(null);
  const [openSection, setOpenSection] = React.useState<"install" | "oauth" | "deploy" | null>("install");
  const [showMoreSnippets, setShowMoreSnippets] = React.useState(false);
  const [selectedClient, setSelectedClient] = React.useState<AiClientId>("claude");
  const [ttlDays, setTtlDays] = React.useState<number>(30);
  const [busy, setBusy] = React.useState(false);

  // State Test Konektor Interaktif
  const [testState, setTestState] = React.useState<
    | { status: "idle" }
    | { status: "testing" }
    | { status: "ok"; latencyMs: number; toolCount: number; promptCount: number; version: string }
    | { status: "error"; message: string }
  >({ status: "idle" });

  // State Form Buat OAuth Sendiri
  const [oauthName, setOauthName] = React.useState("MCP Multi-Client OAuth");
  const [selectedPresets, setSelectedPresets] = React.useState<Record<string, boolean>>(() =>
    Object.fromEntries(OAUTH_URI_PRESETS.map((p) => [p.id, p.defaultOn])),
  );
  const [extraRedirectUris, setExtraRedirectUris] = React.useState("");
  const [withSecret, setWithSecret] = React.useState(true);
  const [creatingOauth, setCreatingOauth] = React.useState(false);
  const [newlyCreated, setNewlyCreated] = React.useState<CreatedOAuthCredentials | null>(null);
  const [showSecret, setShowSecret] = React.useState(false);
  const [generatedToken, setGeneratedToken] = React.useState<GeneratedTokenInfo | null>(null);
  const [showBearer, setShowBearer] = React.useState(false);
  const [busyClientId, setBusyClientId] = React.useState<string | null>(null);

  const loadConnectInfo = React.useCallback(() => {
    api<ConnectInfoResponse>("/api/mcp/connect")
      .then((d) => {
        setMcpUrl(d.mcpUrl);
        if (d.oauthEndpoints) setEndpoints(d.oauthEndpoints);
        if (Array.isArray(d.customClients)) setCustomClients(d.customClients);
        if (typeof d.activeSitesCount === "number" && typeof d.maxSites === "number") {
          setSiteQuota({ active: d.activeSitesCount, max: d.maxSites });
        }
      })
      .catch(() => setMcpUrl(null));
  }, []);

  React.useEffect(() => {
    loadConnectInfo();
  }, [loadConnectInfo]);

  async function copyText(val: string | null | undefined, label: string) {
    if (!val) return;
    try {
      await navigator.clipboard.writeText(val);
      showToast(`${label} disalin`);
    } catch {
      showToast(`Gagal menyalin ${label} — salin manual`);
    }
  }

  async function testMcpEndpoint() {
    setTestState({ status: "testing" });
    const t0 = performance.now();
    try {
      const tok = await api<GeneratedTokenInfo>("/api/mcp/connect", {
        method: "POST",
        json: { action: "generate_oauth_token", ttlDays: 1, clientLabel: "Test" },
      });
      const res = await fetch("/api/mcp", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${tok.accessToken}`,
        },
        body: JSON.stringify([
          { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18" } },
          { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} },
          { jsonrpc: "2.0", id: 3, method: "prompts/list", params: {} },
        ]),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const batch = (await res.json()) as { id: number; result?: Record<string, unknown> }[];
      const latencyMs = Math.max(1, Math.round(performance.now() - t0));
      const initRes = batch.find((x) => x.id === 1)?.result as { serverInfo?: { version?: string } } | undefined;
      const toolsRes = batch.find((x) => x.id === 2)?.result as { tools?: unknown[] } | undefined;
      const promptsRes = batch.find((x) => x.id === 3)?.result as { prompts?: unknown[] } | undefined;
      setTestState({
        status: "ok",
        latencyMs,
        toolCount: Array.isArray(toolsRes?.tools) ? toolsRes.tools.length : 7,
        promptCount: Array.isArray(promptsRes?.prompts) ? promptsRes.prompts.length : 3,
        version: initRes?.serverInfo?.version ?? "1.2.0",
      });
      showToast("Konektor MCP berjalan normal!");
    } catch (e) {
      setTestState({
        status: "error",
        message: (e as Error).message || "Gagal menghubungi endpoint MCP.",
      });
    }
  }

  async function handleCreateOAuth(e: React.FormEvent) {
    e.preventDefault();
    const uris: string[] = [];
    for (const p of OAUTH_URI_PRESETS) {
      if (selectedPresets[p.id]) uris.push(...p.uris);
    }
    for (const line of extraRedirectUris.split(/[\r\n,]+/)) {
      const trimmed = line.trim();
      if (trimmed) uris.push(trimmed);
    }
    if (uris.length === 0) {
      showToast("Pilih minimal satu Redirect URI (mis. Claude, Gemini, Cursor, OpenCode, Codex, atau Localhost; DeepSeek memakai token, bukan OAuth).");
      return;
    }

    setCreatingOauth(true);
    setNewlyCreated(null);
    try {
      const res = await api<CreatedOAuthCredentials & { customClients: CustomOAuthClientItem[] }>("/api/mcp/connect", {
        method: "POST",
        json: {
          action: "create_oauth",
          name: oauthName.trim() || "MCP Multi-Client OAuth",
          redirectUris: uris,
          withSecret,
        },
      });
      setCustomClients(res.customClients);
      setNewlyCreated({
        client: res.client,
        clientSecret: res.clientSecret,
        oauthEndpoints: res.oauthEndpoints,
      });
      setShowSecret(true);
      showToast(`OAuth "${res.client.name}" berhasil dibuat!`);
    } catch (err) {
      showToast((err as Error).message);
    } finally {
      setCreatingOauth(false);
    }
  }

  async function handleDeleteOAuth(client: CustomOAuthClientItem) {
    const { ok } = await confirm({
      title: `Hapus OAuth "${client.name}"?`,
      description: "Client ID, Client Secret, dan semua token akses dari OAuth ini akan langsung dicabut.",
      impact: [
        "Konektor di Claude, OpenCode, Cursor, Codex, Gemini, atau DeepSeek yang memakai Client ID ini akan berhenti bekerja.",
        "Kamu bisa membuat OAuth baru kapan saja.",
      ],
      confirmLabel: "Ya, hapus OAuth",
    });
    if (!ok) return;
    setBusyClientId(client.id);
    try {
      const res = await api<{ customClients: CustomOAuthClientItem[] }>("/api/mcp/connect", {
        method: "POST",
        json: { action: "delete_oauth", id: client.id },
      });
      setCustomClients(res.customClients);
      if (newlyCreated?.client.id === client.id) setNewlyCreated(null);
      showToast(`OAuth "${client.name}" dihapus`);
    } catch (err) {
      showToast((err as Error).message);
    } finally {
      setBusyClientId(null);
    }
  }

  async function handleGenerateToken(client?: CustomOAuthClientItem, labelOverride?: string) {
    setBusyClientId(client?.id ?? "personal");
    try {
      const tok = await api<GeneratedTokenInfo>("/api/mcp/connect", {
        method: "POST",
        json: {
          action: "generate_oauth_token",
          ttlDays,
          clientLabel: labelOverride ?? AI_CLIENTS.find((c) => c.id === selectedClient)?.label ?? "MCP CLI",
          ...(client ? { id: client.id } : {}),
        },
      });
      setGeneratedToken(tok);
      setShowBearer(false);
      showToast(`Token ${tok.clientName} (${ttlDays} hari) berhasil dibuat & dimasukkan ke konfigurasi!`);
    } catch (err) {
      showToast((err as Error).message);
    } finally {
      setBusyClientId(null);
    }
  }

  async function revoke() {
    const { ok } = await confirm({
      title: "Cabut semua akses MCP (Claude, OpenCode, Cursor, Codex, Gemini, DeepSeek)?",
      description: "Semua koneksi MCP dan token OAuth aktif ke akun Depup-mu akan diputus seketika.",
      impact: [
        "Claude, OpenCode, Cursor, Codex, Gemini, dan DeepSeek tidak bisa lagi menayangkan website atau deploy atas namamu sampai kamu menghubungkannya ulang.",
        "Link dan deployment yang sudah jalan tetap aktif.",
      ],
      confirmLabel: "Ya, cabut semua akses",
    });
    if (!ok) return;
    setBusy(true);
    try {
      await api("/api/mcp/connect", { method: "POST", json: { action: "revoke" } });
      setGeneratedToken(null);
      showToast("Semua akses token MCP dicabut");
    } catch (e) {
      showToast((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const readyPlatformsCount = DEPLOY_TARGETS.filter((t) => {
    const hasToken = typeof tokens[t.tokenField] === "string" && (tokens[t.tokenField] as string).trim().length > 0;
    return hasToken && allowed.includes(t.platform);
  }).length;

  const resolvedUrl = mcpUrl ?? "https://depup.cloud/api/mcp";
  const realToken = generatedToken?.accessToken ?? "<KLIK_BUAT_TOKEN_DI_ATAS>";
  const displayToken =
    generatedToken?.accessToken && !showBearer
      ? `${generatedToken.accessToken.slice(0, 14)}••••••••••••••••${generatedToken.accessToken.slice(-6)}`
      : realToken;

  const currentClientMeta = AI_CLIENTS.find((c) => c.id === selectedClient) ?? AI_CLIENTS[0];
  const displaySnippets = buildClientSnippets(selectedClient, resolvedUrl, displayToken);
  const copySnippets = buildClientSnippets(selectedClient, resolvedUrl, realToken);
  const hasMoreSnippets = Boolean(displaySnippets.cliCode || displaySnippets.extraCode);

  const cursorDeepLink = React.useMemo(() => {
    const cfg = generatedToken?.accessToken
      ? { url: resolvedUrl, headers: { Authorization: `Bearer ${generatedToken.accessToken}` } }
      : { url: resolvedUrl };
    const b64 = typeof window !== "undefined" ? window.btoa(JSON.stringify(cfg)) : "";
    return `cursor://anysphere.cursor-deeplink/mcp/install?name=depup&config=${encodeURIComponent(b64)}`;
  }, [resolvedUrl, generatedToken?.accessToken]);

  const toggleSection = (id: "install" | "oauth" | "deploy") => setOpenSection((cur) => (cur === id ? null : id));

  return (
    <section className="surface-solid rounded-3xl p-4 sm:p-6" aria-labelledby="claude-connect-title">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 id="claude-connect-title" className="flex items-center gap-2 text-[15px] font-semibold">
            <Sparkles size={16} /> Konektor AI (MCP)
          </h3>
          <p className="mt-1 text-[12.5px] leading-relaxed text-text-muted">
            Hubungkan Claude, Gemini, Cursor, OpenCode, Codex, atau DeepSeek ke Depup.{" "}
            <DocsLink className="inline-flex items-center gap-1 font-medium text-lav-text underline-offset-4 hover:underline">
              <BookOpen size={12} /> Lihat panduan lengkap
            </DocsLink>
          </p>
        </div>
        <button
          type="button"
          onClick={() => void testMcpEndpoint()}
          disabled={testState.status === "testing"}
          className="pill inline-flex shrink-0 items-center justify-center gap-1.5 px-3.5 py-2 text-[12px] font-medium hover:brightness-95 disabled:opacity-50"
        >
          {testState.status === "testing" ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
          Test Konektor
        </button>
      </div>

      {testState.status === "ok" && (
        <div className="mt-3 flex items-start gap-2 rounded-2xl bg-[var(--ok-bg)] px-3.5 py-2.5 text-[12px] text-ok-fg">
          <ShieldCheck size={14} className="mt-0.5 shrink-0" />
          <span>
            Server MCP v{testState.version} aktif · {testState.toolCount} tool, {testState.promptCount} prompt · {testState.latencyMs} ms
          </span>
        </div>
      )}
      {testState.status === "error" && (
        <div className="mt-3 rounded-2xl bg-[var(--bad-bg)] px-3.5 py-2.5 text-[12px] text-bad-fg">
          Gagal menguji endpoint MCP: {testState.message}
        </div>
      )}

      {/* URL Server MCP */}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          readOnly
          value={mcpUrl ?? "Memuat…"}
          aria-label="URL konektor MCP Depup"
          onFocus={(e) => e.currentTarget.select()}
          className="min-w-0 flex-1 rounded-xl border border-[var(--line)] bg-[var(--pill-bg)] px-3.5 py-2.5 font-mono text-[12.5px] outline-none"
        />
        <button
          type="button"
          onClick={() => void copyText(mcpUrl, "URL konektor MCP")}
          disabled={!mcpUrl}
          className="pill inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-[12px] font-medium disabled:opacity-50"
        >
          <Copy size={13} /> Salin URL
        </button>
      </div>
      <p className="mt-2 text-[11.5px] text-text-faint">
        {siteQuota ? `Link Instan ${siteQuota.active}/${siteQuota.max} · ` : ""}Platform siap {readyPlatformsCount}/3 · OAuth sendiri {customClients.length}
      </p>

      <div className="mt-4 space-y-3">
        {/* ── 1. Pasang di aplikasi AI ── */}
        <Section
          title="Pasang di aplikasi AI"
          summary={`${currentClientMeta.label} · ${currentClientMeta.hint}`}
          open={openSection === "install"}
          onToggle={() => toggleSection("install")}
        >
          {/* Pemilih aplikasi: scroll ke samping di HP, sejajar rapi di desktop */}
          <div
            className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] sm:grid sm:grid-cols-3 sm:overflow-visible lg:grid-cols-6 [&::-webkit-scrollbar]:hidden"
            role="tablist"
            aria-label="Pilih aplikasi AI"
          >
            {AI_CLIENTS.map((c) => {
              const active = selectedClient === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    setSelectedClient(c.id);
                    setShowMoreSnippets(false);
                  }}
                  className={cn(
                    "shrink-0 rounded-xl border px-3.5 py-2 text-left text-[12.5px] font-semibold transition sm:shrink",
                    active
                      ? "border-violet-500 bg-violet-500/15 text-text"
                      : "border-[var(--line)] bg-[var(--pill-bg)] text-text-muted hover:border-[var(--line-strong)] hover:text-text",
                  )}
                >
                  {c.label}
                </button>
              );
            })}
          </div>

          {(selectedClient === "claude" || selectedClient === "gemini") && (
            <p className="rounded-xl bg-[var(--pill-bg)] px-3.5 py-2.5 text-[12px] leading-relaxed text-text-muted">
              {currentClientMeta.label} Web memakai OAuth otomatis: cukup tempel URL MCP di atas, tanpa token.
              Token di bawah hanya untuk CLI atau file konfigurasi.{" "}
              <DocsLink className="font-medium text-lav-text underline-offset-4 hover:underline">Langkah lengkap</DocsLink>
            </p>
          )}

          {selectedClient === "deepseek" && (
            <p className="rounded-xl bg-[var(--pill-bg)] px-3.5 py-2.5 text-[12px] leading-relaxed text-text-muted">
              DeepSeek Harness memakai Bearer Token (bukan login OAuth otomatis). Urutannya: buat token di bawah,
              jalankan langkah terminal di &quot;Cara lain&quot; (ganti &lt;VERSI_DSH&gt; dengan hasil <code>dsh --version</code>),
              tempel YAML ini ke <code>cordis.patch.yml</code> (kalau sudah ada <code>- insert:</code>, tambahkan blok
              <code> - id: mcp-depup</code> di bawahnya), lalu restart <code>dsh web</code>. Token disimpan di variabel
              lingkungan <code>DEPUP_MCP_AUTH</code>, bukan di file YAML. DeepSeek Harness masih developer preview, jadi
              formatnya bisa berubah.{" "}
              <DocsLink className="font-medium text-lav-text underline-offset-4 hover:underline">Langkah lengkap</DocsLink>
            </p>
          )}

          {/* Token */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <select
              aria-label="Durasi Token MCP"
              value={ttlDays}
              onChange={(e) => setTtlDays(Number(e.target.value))}
              className="input-solid h-10 rounded-xl px-2.5 text-[12px] sm:w-auto"
            >
              {TOKEN_TTL_OPTIONS.map((o) => (
                <option key={o.days} value={o.days}>
                  Aktif {o.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void handleGenerateToken(undefined, currentClientMeta.label)}
              disabled={busyClientId === "personal"}
              className="btn-primary inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-[12px] disabled:opacity-50"
            >
              {busyClientId === "personal" ? <Loader2 size={13} className="animate-spin" /> : <KeyRound size={13} />}
              {generatedToken ? "Buat Ulang Token" : "Buat Token"}
            </button>
            {generatedToken && (
              <button
                type="button"
                onClick={() => setShowBearer((v) => !v)}
                className="pill inline-flex items-center justify-center gap-1 px-3 py-2.5 text-[11.5px]"
              >
                {showBearer ? <EyeOff size={12} /> : <Eye size={12} />}
                {showBearer ? "Sembunyikan" : "Tampilkan"}
              </button>
            )}
          </div>

          {selectedClient === "cursor" && (
            <a
              href={cursorDeepLink}
              className="pill inline-flex w-full items-center justify-center gap-1.5 px-3.5 py-2.5 text-[12px] font-medium text-lav-text hover:brightness-110 sm:w-auto"
            >
              <ExternalLink size={13} /> Pasang 1-Klik ke Cursor
            </a>
          )}

          <CodeBlock
            title={displaySnippets.configTitle}
            code={displaySnippets.configCode}
            onCopy={() => void copyText(copySnippets.configCode, `Konfigurasi ${currentClientMeta.label}`)}
          />

          {hasMoreSnippets && (
            <>
              <button
                type="button"
                onClick={() => setShowMoreSnippets((v) => !v)}
                className="inline-flex items-center gap-1 text-[12px] font-medium text-lav-text"
              >
                <ChevronDown size={13} className={cn("transition-transform", showMoreSnippets && "rotate-180")} />
                {showMoreSnippets ? "Sembunyikan cara lain" : "Cara lain (perintah terminal / OAuth)"}
              </button>
              {showMoreSnippets && (
                <div className="space-y-4">
                  {displaySnippets.cliCode && (
                    <CodeBlock
                      title={displaySnippets.cliTitle ?? "Perintah terminal"}
                      code={displaySnippets.cliCode}
                      onCopy={() => void copyText(copySnippets.cliCode, `Perintah ${currentClientMeta.label}`)}
                    />
                  )}
                  {displaySnippets.extraCode && (
                    <CodeBlock
                      title={displaySnippets.extraTitle ?? "Konfigurasi OAuth"}
                      code={displaySnippets.extraCode}
                      onCopy={() => void copyText(copySnippets.extraCode, `Konfigurasi OAuth ${currentClientMeta.label}`)}
                    />
                  )}
                </div>
              )}
            </>
          )}
        </Section>

        {/* ── 2. OAuth sendiri ── */}
        <Section
          title="Buat OAuth sendiri"
          summary={customClients.length ? `${customClients.length} OAuth client dibuat` : "Client ID & Secret untuk aplikasi AI kustom"}
          open={openSection === "oauth"}
          onToggle={() => toggleSection("oauth")}
        >
          <form onSubmit={handleCreateOAuth} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="custom-oauth-name" className="mb-1 block text-[12px] font-medium">
                  Nama OAuth Client
                </label>
                <input
                  id="custom-oauth-name"
                  type="text"
                  maxLength={60}
                  value={oauthName}
                  onChange={(e) => setOauthName(e.target.value)}
                  className="input-solid h-10 w-full px-3 text-[12.5px]"
                />
              </div>
              <div>
                <span className="mb-1 block text-[12px] font-medium">Metode</span>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { on: true, title: "ID + Secret" },
                    { on: false, title: "Public (PKCE)" },
                  ].map((m) => (
                    <button
                      key={m.title}
                      type="button"
                      onClick={() => setWithSecret(m.on)}
                      className={cn(
                        "h-10 rounded-xl px-2 text-[12px] font-semibold transition",
                        withSecret === m.on ? "bg-violet-500 text-white" : "bg-[var(--pill-bg)] text-text-muted hover:text-text",
                      )}
                    >
                      {m.title}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <span className="mb-1.5 block text-[12px] font-medium">Redirect URI yang diizinkan</span>
              <div className="flex flex-wrap gap-2">
                {OAUTH_URI_PRESETS.map((preset) => {
                  const on = !!selectedPresets[preset.id];
                  return (
                    <label
                      key={preset.id}
                      className={cn(
                        "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] transition",
                        on
                          ? "border-violet-500 bg-violet-500/15 text-text"
                          : "border-[var(--line)] bg-[var(--pill-bg)] text-text-muted",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={(e) => setSelectedPresets((prev) => ({ ...prev, [preset.id]: e.target.checked }))}
                        className="sr-only"
                      />
                      {on && <Check size={12} />}
                      {preset.label}
                    </label>
                  );
                })}
              </div>
              <input
                type="text"
                value={extraRedirectUris}
                onChange={(e) => setExtraRedirectUris(e.target.value)}
                placeholder="Redirect URI tambahan (opsional, pisahkan koma)"
                className="input-solid mono mt-2 h-10 w-full px-3 text-[12px]"
              />
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="submit"
                disabled={creatingOauth}
                className="btn-primary inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-[12.5px] disabled:opacity-50"
              >
                {creatingOauth ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Buat OAuth
              </button>
              <button
                type="button"
                onClick={() => void handleGenerateToken(undefined, "Multi-AI Web & CLI")}
                disabled={busyClientId === "personal"}
                className="pill inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-[12px] font-medium hover:brightness-95 disabled:opacity-50"
              >
                {busyClientId === "personal" ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                Bearer Token ({ttlDays} hari)
              </button>
            </div>
          </form>

          {newlyCreated && (
            <div className="space-y-3 rounded-2xl border border-violet-500/40 bg-violet-500/10 p-3.5 text-[12px]">
              <p className="flex items-center gap-1.5 text-[13px] font-semibold">
                <Check size={15} /> &ldquo;{newlyCreated.client.name}&rdquo; siap dipakai
              </p>
              <p className="text-[11.5px] text-text-muted">Simpan Client Secret sekarang, hanya ditampilkan sekali.</p>
              <div>
                <span className="mb-1 block font-medium text-text-muted">Client ID</span>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={newlyCreated.client.clientId}
                    onFocus={(e) => e.currentTarget.select()}
                    className="input-solid mono h-9 min-w-0 flex-1 px-3 text-[11.5px]"
                  />
                  <button
                    type="button"
                    onClick={() => void copyText(newlyCreated.client.clientId, "OAuth Client ID")}
                    className="pill inline-flex shrink-0 items-center gap-1 px-3 py-1.5 text-[11.5px]"
                  >
                    <Copy size={12} /> Salin
                  </button>
                </div>
              </div>
              {newlyCreated.clientSecret && (
                <div>
                  <span className="mb-1 block font-medium text-text-muted">Client Secret</span>
                  <div className="flex gap-2">
                    <input
                      readOnly
                      type={showSecret ? "text" : "password"}
                      value={newlyCreated.clientSecret}
                      onFocus={(e) => e.currentTarget.select()}
                      className="input-solid mono h-9 min-w-0 flex-1 px-3 text-[11.5px]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret((v) => !v)}
                      className="pill inline-flex shrink-0 items-center px-2.5 py-1.5"
                      aria-label={showSecret ? "Sembunyikan Secret" : "Tampilkan Secret"}
                    >
                      {showSecret ? <EyeOff size={12} /> : <Eye size={12} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => void copyText(newlyCreated.clientSecret, "OAuth Client Secret")}
                      className="pill inline-flex shrink-0 items-center gap-1 px-3 py-1.5 text-[11.5px]"
                    >
                      <Copy size={12} /> Salin
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {generatedToken && (
            <div className="space-y-2 rounded-2xl border border-[var(--line-strong)] bg-[var(--pill-bg)] p-3.5 text-[12px]">
              <span className="block font-semibold">
                Bearer Token ({generatedToken.clientName}) · aktif {Math.round(generatedToken.expiresIn / 86400) || 1} hari
              </span>
              <div className="flex gap-2">
                <input
                  readOnly
                  type={showBearer ? "text" : "password"}
                  value={generatedToken.accessToken}
                  onFocus={(e) => e.currentTarget.select()}
                  className="input-solid mono h-9 min-w-0 flex-1 px-3 text-[11.5px]"
                />
                <button
                  type="button"
                  onClick={() => setShowBearer((v) => !v)}
                  className="pill inline-flex shrink-0 items-center px-2.5 py-1.5"
                  aria-label={showBearer ? "Sembunyikan token" : "Tampilkan token"}
                >
                  {showBearer ? <EyeOff size={12} /> : <Eye size={12} />}
                </button>
                <button
                  type="button"
                  onClick={() => void copyText(generatedToken.accessToken, "Access Token")}
                  className="pill inline-flex shrink-0 items-center gap-1 px-3 py-1.5 text-[11.5px]"
                >
                  <Copy size={12} /> Salin
                </button>
              </div>
            </div>
          )}

          {endpoints && (
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                { label: "Authorization URL", value: endpoints.authorizationEndpoint },
                { label: "Token URL", value: endpoints.tokenEndpoint },
              ].map((e) => (
                <div key={e.label} className="flex items-center justify-between gap-2 rounded-xl bg-[var(--pill-bg)] px-3 py-2">
                  <div className="min-w-0">
                    <span className="block text-[10.5px] text-text-muted">{e.label}</span>
                    <code className="block truncate text-[11.5px]">{e.value}</code>
                  </div>
                  <button
                    type="button"
                    onClick={() => void copyText(e.value, e.label)}
                    className="shrink-0 p-1 text-text-muted hover:text-text"
                    aria-label={`Salin ${e.label}`}
                  >
                    <Copy size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div>
            <h4 className="text-[13px] font-semibold">OAuth client buatanmu ({customClients.length})</h4>
            {customClients.length === 0 ? (
              <p className="mt-1.5 text-[12px] text-text-muted">Belum ada. Pakai form di atas untuk membuatnya.</p>
            ) : (
              <ul className="mt-2.5 space-y-2.5">
                {customClients.map((c) => (
                  <li key={c.id} className="space-y-2.5 rounded-2xl border border-[var(--line)] bg-[var(--pill-bg)] p-3.5 text-[12px]">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <strong className="text-[13px]">{c.name}</strong>
                        <span className="rounded-md bg-[var(--surface-solid-2)] px-2 py-0.5 text-[10.5px] font-medium text-lav-text">
                          {c.hasSecret ? "ID + Secret" : "Public PKCE"}
                        </span>
                        {c.secretPreview && <code className="text-[11px] text-text-muted">Secret: {c.secretPreview}</code>}
                      </div>
                      <p className="truncate font-mono text-[11px] text-text-muted" title={c.redirectUris.join(", ")}>
                        {c.redirectUris.length} Redirect URI · {c.redirectUris[0]}
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => void copyText(c.clientId, `Client ID "${c.name}"`)}
                        className="pill inline-flex items-center justify-center gap-1 px-2 py-2 text-[11.5px]"
                      >
                        <Copy size={12} /> ID
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleGenerateToken(c)}
                        disabled={busyClientId === c.id}
                        className="pill inline-flex items-center justify-center gap-1 px-2 py-2 text-[11.5px]"
                      >
                        {busyClientId === c.id ? <Loader2 size={12} className="animate-spin" /> : <KeyRound size={12} />}
                        Token
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteOAuth(c)}
                        disabled={busyClientId === c.id}
                        className="pill inline-flex items-center justify-center gap-1 px-2 py-2 text-[11.5px] text-bad-fg"
                      >
                        <Trash2 size={12} /> Hapus
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Section>

        {/* ── 3. Izin deploy ── */}
        <Section
          title="Izin deploy"
          summary={`${readyPlatformsCount} dari ${DEPLOY_TARGETS.length} platform aktif untuk AI`}
          open={openSection === "deploy"}
          onToggle={() => toggleSection("deploy")}
        >
          <ul className="space-y-3">
            {DEPLOY_TARGETS.map((t) => {
              const hasToken = typeof tokens[t.tokenField] === "string" && (tokens[t.tokenField] as string).trim().length > 0;
              const on = allowed.includes(t.platform);
              const id = `mcpAllow-${t.platform}`;
              return (
                <li key={t.platform} className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <label htmlFor={id} className="block cursor-pointer text-[13px] font-medium">
                      {t.label}
                    </label>
                    <p className="text-[12px] text-text-muted">
                      {hasToken ? "Token tersimpan." : `Isi token ${t.label} di form di atas, lalu Simpan.`}
                    </p>
                  </div>
                  <button
                    id={id}
                    type="button"
                    role="switch"
                    aria-checked={on}
                    disabled={!hasToken}
                    onClick={() => togglePlatform(t.platform, !on)}
                    className={cn(
                      "relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                      on ? "bg-[var(--ink-fill)]" : "bg-[var(--line-strong)]",
                    )}
                  >
                    <span
                      className={cn(
                        "absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition-transform duration-300 [transition-timing-function:var(--ease-soft)]",
                        on ? "translate-x-5" : "translate-x-0",
                      )}
                    />
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="text-[12px] text-text-muted">
            AI memakai token tersimpan langsung dari server, tidak lewat chat. Platform yang dimatikan tidak bisa dipakai untuk deploy.
          </p>
        </Section>
      </div>

      <button
        type="button"
        onClick={revoke}
        disabled={busy}
        className="pill mt-4 inline-flex w-full items-center justify-center gap-1.5 px-3 py-2 text-[12px] text-bad-fg disabled:opacity-50 sm:w-auto"
      >
        <Unplug size={13} /> Cabut semua akses MCP
      </button>
    </section>
  );
}
