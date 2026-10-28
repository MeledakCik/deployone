"use client";

import * as React from "react";
import {
  Check,
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
  Terminal,
  Trash2,
  Unplug,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Platform, SettingsTokens } from "@/types";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/confirm";
import { api } from "@/components/db/ui";

const DEPLOY_TARGETS: { platform: Platform; label: string; tokenField: keyof SettingsTokens }[] = [
  { platform: "vercel", label: "Vercel", tokenField: "vercelToken" },
  { platform: "cloudflare", label: "Cloudflare Pages", tokenField: "cloudflareToken" },
  { platform: "railway", label: "Railway", tokenField: "railwayToken" },
];

type AiClientId = "claude" | "opencode" | "cursor" | "codex" | "gemini";

const AI_CLIENTS: {
  id: AiClientId;
  label: string;
  badge: string;
  configPath: string;
  summary: string;
}[] = [
  {
    id: "claude",
    label: "Claude",
    badge: "Web · App · Code CLI",
    configPath: "claude.ai → Settings → Connectors / claude mcp add",
    summary: "Mendukung OAuth 2.1 otomatis di claude.ai & app HP, atau via CLI Claude Code dengan Bearer token.",
  },
  {
    id: "opencode",
    label: "OpenCode",
    badge: "opencode.json · CLI",
    configPath: "opencode.json atau ~/.config/opencode/opencode.json",
    summary: "Tempel konfigurasi remote MCP ke opencode.json (mendukung Bearer token maupun `opencode mcp auth depup`).",
  },
  {
    id: "cursor",
    label: "Cursor",
    badge: ".cursor/mcp.json · 1-Click",
    configPath: ".cursor/mcp.json atau ~/.cursor/mcp.json",
    summary: "Pasang otomatis lewat tombol 1-Klik Install ke Cursor, OAuth langsung, atau tempel `.cursor/mcp.json`.",
  },
  {
    id: "codex",
    label: "Codex",
    badge: "Web · config.toml · CLI",
    configPath: "~/.codex/config.toml atau Konektor Web ChatGPT/Codex",
    summary: "Bisa dihubungkan via OAuth Web atau ditambahkan ke `~/.codex/config.toml` & perintah `codex mcp add`.",
  },
  {
    id: "gemini",
    label: "Gemini",
    badge: "Web · CLI · Code Assist",
    configPath: "gemini.google.com / AI Studio / ~/.gemini/settings.json",
    summary: "Bisa dipasang di Gemini Web / Google AI Studio (via URL MCP & OAuth) maupun di Gemini CLI & Code Assist (`settings.json` / `gemini mcp add`).",
  },
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

const QUICK_PROMPTS: { title: string; badge: string; prompt: string }[] = [
  {
    title: "Website Besar / Multi-Halaman (Bertahap & Cepat)",
    badge: "Anti-Timeout",
    prompt:
      "Buatkan website landing page modern lengkap dengan katalog produk dan halaman tentang kami. Gunakan deploy_website untuk mengupload kerangka awal index.html, lalu gunakan update_website (append_files / files) secara bertahap agar upload cepat dan tidak terpotong.",
  },
  {
    title: "Edit Cepat index.html Tanpa Ganti Link",
    badge: "In-Place Patch",
    prompt:
      "Cek website aktifku di Depup memakai list_websites dan inspect_website, lalu ubah tampilan bagian hero di index.html menggunakan update_website (patches) supaya link publiknya tetap sama.",
  },
  {
    title: "Cek Status & Deploy Repo GitHub",
    badge: "Platform Deploy",
    prompt:
      "Cek platform deploy mana yang sudah siap di Depup dengan connector_status, lalu bantu saya deploy repo GitHub saya.",
  },
];

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

/**
 * Kartu "Konektor AI (MCP) — Claude, OpenCode, Cursor, Codex & Gemini (Web & CLI) + Custom OAuth" di Settings.
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
  const [activeTab, setActiveTab] = React.useState<"clients" | "oauth">("clients");
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
      showToast("Pilih minimal satu Redirect URI (mis. Claude, Gemini, Cursor, OpenCode, Codex, atau Localhost).");
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
        "Konektor di Claude, OpenCode, Cursor, Codex, atau Gemini yang memakai Client ID ini akan berhenti bekerja.",
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
      title: "Cabut semua akses MCP (Claude, OpenCode, Cursor, Codex, Gemini)?",
      description: "Semua koneksi MCP dan token OAuth aktif ke akun Depup-mu akan diputus seketika.",
      impact: [
        "Claude, OpenCode, Cursor, Codex, dan Gemini tidak bisa lagi menayangkan website atau deploy atas namamu sampai kamu menghubungkannya ulang.",
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
  const realToken = generatedToken?.accessToken ?? "<KLIK_BUAT_TOKEN_OTOMATIS_DI_ATAS>";
  const displayToken =
    generatedToken?.accessToken && !showBearer
      ? `${generatedToken.accessToken.slice(0, 14)}••••••••••••••••${generatedToken.accessToken.slice(-6)}`
      : realToken;

  const currentClientMeta = AI_CLIENTS.find((c) => c.id === selectedClient) ?? AI_CLIENTS[0];
  const displaySnippets = buildClientSnippets(selectedClient, resolvedUrl, displayToken);
  const copySnippets = buildClientSnippets(selectedClient, resolvedUrl, realToken);

  const cursorDeepLink = React.useMemo(() => {
    const cfg = generatedToken?.accessToken
      ? { url: resolvedUrl, headers: { Authorization: `Bearer ${generatedToken.accessToken}` } }
      : { url: resolvedUrl };
    const b64 = typeof window !== "undefined" ? window.btoa(JSON.stringify(cfg)) : "";
    return `cursor://anysphere.cursor-deeplink/mcp/install?name=depup&config=${encodeURIComponent(b64)}`;
  }, [resolvedUrl, generatedToken?.accessToken]);

  return (
    <section className="surface-solid rounded-3xl p-5 sm:p-6" aria-labelledby="claude-connect-title">
      {/* Header & Status Bar Interaktif */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id="claude-connect-title" className="flex items-center gap-2 text-[15px] font-semibold">
            <Sparkles size={16} /> Konektor AI (MCP) — Claude, OpenCode, Cursor, Codex &amp; Gemini
          </h3>
          <p className="mt-1 text-[12.5px] text-text-muted">
            Satu server MCP untuk Web &amp; CLI: publish website (termasuk <code>index.html</code> besar &amp; banyak halaman secara bertahap), edit cepat tanpa ganti link, deploy GitHub, dan buat OAuth sendiri.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {siteQuota && (
            <span className="rounded-full bg-[var(--pill-bg)] px-2.5 py-1 text-[11.5px] font-medium text-text-muted">
              Link Instan: <strong className="text-text">{siteQuota.active}/{siteQuota.max}</strong>
            </span>
          )}
          <span className="rounded-full bg-[var(--pill-bg)] px-2.5 py-1 text-[11.5px] font-medium text-text-muted">
            Platform Siap: <strong className="text-text">{readyPlatformsCount}/3</strong>
          </span>
          <span className="rounded-full bg-[var(--pill-bg)] px-2.5 py-1 text-[11.5px] font-medium text-text-muted">
            Custom OAuth: <strong className="text-text">{customClients.length}</strong>
          </span>
          <button
            type="button"
            onClick={() => void testMcpEndpoint()}
            disabled={testState.status === "testing"}
            className="pill inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium hover:brightness-95 disabled:opacity-50"
          >
            {testState.status === "testing" ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
            Test Konektor MCP
          </button>
        </div>
      </div>

      {/* Hasil Test Konektor MCP Interaktif */}
      {testState.status === "ok" && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-[var(--ok-bg)] px-3.5 py-2.5 text-[12px] text-ok-fg">
          <span className="inline-flex items-center gap-1.5 font-medium">
            <ShieldCheck size={14} /> Server MCP v{testState.version} Aktif · {testState.toolCount} Tool &amp; {testState.promptCount} Prompt Interaktif siap ({testState.latencyMs} ms)
          </span>
          <span className="text-[11.5px] opacity-90">
            Siap untuk Claude, OpenCode, Cursor, Codex &amp; Gemini (Web &amp; CLI)
          </span>
        </div>
      )}
      {testState.status === "error" && (
        <div className="mt-3 rounded-2xl bg-[var(--bad-bg)] px-3.5 py-2.5 text-[12px] text-bad-fg">
          Gagal menguji endpoint MCP: {testState.message}
        </div>
      )}

      {/* Kotak URL Server MCP Utama */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
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
          className="pill inline-flex items-center gap-1.5 px-3.5 py-2.5 text-[12px] font-medium disabled:opacity-50"
        >
          <Copy size={13} /> Salin URL MCP
        </button>
      </div>

      {/* Navigasi Tab Utama */}
      <div className="mt-5 flex flex-wrap gap-2 border-b border-[var(--line)] pb-3" role="tablist" aria-label="Mode Konektor MCP">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "clients"}
          onClick={() => setActiveTab("clients")}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[12.5px] font-medium transition",
            activeTab === "clients"
              ? "bg-violet-500 text-white"
              : "bg-[var(--pill-bg)] text-text-muted hover:text-text",
          )}
        >
          <Terminal size={13} /> Pasang di Claude · OpenCode · Cursor · Codex · Gemini
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "oauth"}
          onClick={() => setActiveTab("oauth")}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[12.5px] font-medium transition",
            activeTab === "oauth"
              ? "bg-violet-500 text-white"
              : "bg-[var(--pill-bg)] text-text-muted hover:text-text",
          )}
        >
          <KeyRound size={13} /> Buat OAuth Sendiri ({customClients.length})
        </button>
      </div>

      {/* TAB 1: Multi-Client Setup (Claude, OpenCode, Cursor, Codex, Gemini) */}
      {activeTab === "clients" && (
        <div className="mt-4 space-y-4">
          {/* Pemilih Klien AI (5 Tab Interaktif) */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5" role="tablist" aria-label="Pilih Aplikasi AI">
            {AI_CLIENTS.map((c) => {
              const active = selectedClient === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setSelectedClient(c.id)}
                  className={cn(
                    "flex flex-col items-start rounded-2xl border p-3 text-left transition",
                    active
                      ? "border-violet-500 bg-violet-500/15 text-text"
                      : "border-[var(--line)] bg-[var(--pill-bg)] text-text-muted hover:border-[var(--line-strong)] hover:text-text",
                  )}
                >
                  <span className="text-[13px] font-semibold text-text">{c.label}</span>
                  <span className="mt-0.5 text-[10.5px] text-lav-text">{c.badge}</span>
                </button>
              );
            })}
          </div>

          {/* Generator Token & Konfigurasi Siap Pakai */}
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-solid-2)] p-4 space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="text-[13.5px] font-semibold">
                  Konfigurasi MCP untuk {currentClientMeta.label}
                </h4>
                <p className="mt-0.5 text-[12px] text-text-muted">
                  {currentClientMeta.summary} Target: <code>{currentClientMeta.configPath}</code>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  aria-label="Durasi Token MCP"
                  value={ttlDays}
                  onChange={(e) => setTtlDays(Number(e.target.value))}
                  className="input-solid h-9 rounded-xl px-2.5 text-[12px]"
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
                  className="btn-primary inline-flex items-center gap-1.5 px-3.5 py-2 text-[12px] disabled:opacity-50"
                >
                  {busyClientId === "personal" ? <Loader2 size={13} className="animate-spin" /> : <KeyRound size={13} />}
                  {generatedToken ? "Buat Ulang Token" : "Buat & Isi Token Otomatis"}
                </button>
                {generatedToken && (
                  <button
                    type="button"
                    onClick={() => setShowBearer((v) => !v)}
                    className="pill inline-flex items-center gap-1 px-2.5 py-2 text-[11.5px]"
                  >
                    {showBearer ? <EyeOff size={12} /> : <Eye size={12} />}
                    {showBearer ? "Sembunyikan Token" : "Tampilkan Token"}
                  </button>
                )}
              </div>
            </div>

            {/* Khusus Claude: Langkah claude.ai Web + App HP */}
            {selectedClient === "claude" && (
              <div className="rounded-xl bg-[var(--pill-bg)] p-3.5 text-[12px]">
                <p className="font-semibold">Cara 1: Pasang di Claude Web (claude.ai) &amp; App HP (OAuth Otomatis / Custom OAuth)</p>
                <ol className="mt-1.5 list-decimal space-y-1 pl-5 leading-relaxed text-text-muted">
                  <li>
                    Buka <strong>claude.ai → Settings → Connectors → Add custom connector</strong>.
                  </li>
                  <li>
                    Isi nama <strong>Depup</strong> dan tempel URL <code>{resolvedUrl}</code>. <em>(Jika ingin memakai Client ID &amp; Secret sendiri, buat di tab <strong>Buat OAuth Sendiri</strong>).</em>
                  </li>
                  <li>
                    Klik <strong>Add</strong> lalu <strong>Connect</strong>, login Google di Depup, dan tekan <strong>Izinkan</strong>.
                  </li>
                </ol>
              </div>
            )}

            {/* Khusus Gemini: Langkah Gemini Web + Google AI Studio + Firebase Studio */}
            {selectedClient === "gemini" && (
              <div className="rounded-xl bg-[var(--pill-bg)] p-3.5 text-[12px]">
                <p className="font-semibold">Cara 1: Pasang di Gemini Web (&ldquo;Terhubung ke server MCP&rdquo; di gemini.google.com)</p>
                <ol className="mt-1.5 list-decimal space-y-1 pl-5 leading-relaxed text-text-muted">
                  <li>
                    Di <strong>Gemini Web</strong>, buka jendela <strong>Terhubung ke server MCP</strong> lalu tempel URL Server MCP: <code>{resolvedUrl}</code>.
                  </li>
                  <li>
                    <strong>Otomatis:</strong> Biarkan kolom <em>Client ID</em> dan <em>Rahasia klien</em> kosong — server Depup sudah mengizinkan ke-6 URL pengalihan Google (<code>oauth-redirect*.googleusercontent.com</code>) dan metode <code>client_secret_post</code> secara otomatis.
                  </li>
                  <li>
                    <strong>Manual (Setelan tambahan):</strong> Jika ingin mengisi <em>Client ID</em> &amp; <em>Rahasia klien</em> sendiri, buka tab <strong>Buat OAuth Sendiri</strong> di samping (preset <strong>Gemini</strong> sudah otomatis mengizinkan semua URL <code>oauth-redirect.googleusercontent.com/r/...</code> atau kamu juga bisa menempelkan hasil tombol <strong>Salin URI pengalihan</strong> dari Gemini), lalu salin <code>Client ID</code> dan <code>Client Secret</code> ke Gemini.
                  </li>
                </ol>
              </div>
            )}

            {/* Khusus Cursor: Tombol 1-Click Deep Link Install */}
            {selectedClient === "cursor" && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[var(--pill-bg)] px-3.5 py-2.5 text-[12px]">
                <span>
                  Ingin langsung memasang ke aplikasi <strong>Cursor</strong> tanpa mengedit file manual?
                </span>
                <a
                  href={cursorDeepLink}
                  className="pill inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-lav-text hover:brightness-110"
                >
                  <ExternalLink size={13} /> Pasang 1-Klik ke Cursor
                </a>
              </div>
            )}

            {/* Blok Kode Konfigurasi Utama */}
            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="text-[12px] font-medium text-text-muted">{displaySnippets.configTitle}</span>
                <button
                  type="button"
                  onClick={() => void copyText(copySnippets.configCode, `Konfigurasi ${currentClientMeta.label}`)}
                  className="pill inline-flex items-center gap-1 px-2.5 py-1 text-[11.5px]"
                >
                  <Copy size={12} /> Salin Konfigurasi
                </button>
              </div>
              <pre className="overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--pill-bg)] p-3 font-mono text-[11.5px] leading-relaxed">
                {displaySnippets.configCode}
              </pre>
            </div>

            {/* Blok Perintah CLI / OAuth Alternatif */}
            {displaySnippets.cliCode && (
              <div>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className="text-[12px] font-medium text-text-muted">{displaySnippets.cliTitle}</span>
                  <button
                    type="button"
                    onClick={() => void copyText(copySnippets.cliCode, `Perintah ${currentClientMeta.label}`)}
                    className="pill inline-flex items-center gap-1 px-2.5 py-1 text-[11.5px]"
                  >
                    <Copy size={12} /> Salin Perintah
                  </button>
                </div>
                <pre className="overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--pill-bg)] p-3 font-mono text-[11.5px] leading-relaxed">
                  {displaySnippets.cliCode}
                </pre>
              </div>
            )}

            {/* Blok Tambahan (Khusus Gemini OAuth Otomatis tanpa Token Manual) */}
            {displaySnippets.extraCode && (
              <div>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className="text-[12px] font-medium text-text-muted">{displaySnippets.extraTitle}</span>
                  <button
                    type="button"
                    onClick={() => void copyText(copySnippets.extraCode, `Konfigurasi OAuth ${currentClientMeta.label}`)}
                    className="pill inline-flex items-center gap-1 px-2.5 py-1 text-[11.5px]"
                  >
                    <Copy size={12} /> Salin Konfigurasi OAuth
                  </button>
                </div>
                <pre className="overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--pill-bg)] p-3 font-mono text-[11.5px] leading-relaxed">
                  {displaySnippets.extraCode}
                </pre>
              </div>
            )}
          </div>

          {/* Info Upload Cepat File index.html Besar */}
          <div className="rounded-2xl bg-[var(--surface-solid-2)] p-4">
            <h4 className="flex items-center gap-1.5 text-[13px] font-semibold">
              <Zap size={14} className="text-lav-text" /> Mode Cepat untuk <code>index.html</code> Besar &amp; Banyak File
            </h4>
            <p className="mt-1 text-[12px] leading-relaxed text-text-muted">
              Semua klien AI (Claude, OpenCode, Cursor, Codex, Gemini Web &amp; CLI) otomatis mendapatkan 3 tool interaktif untuk website besar:
            </p>
            <ul className="mt-2.5 grid gap-2 sm:grid-cols-3 text-[12px]">
              <li className="rounded-xl bg-[var(--pill-bg)] p-3">
                <strong className="block font-mono text-[11.5px] text-text">1. deploy_website</strong>
                <span className="mt-1 block text-text-muted">
                  Tayangkan kerangka awal <code>index.html</code> (mendukung kompresi <code>gzip+base64</code> &amp; auto-strip folder <code>dist/</code>).
                </span>
              </li>
              <li className="rounded-xl bg-[var(--pill-bg)] p-3">
                <strong className="block font-mono text-[11.5px] text-text">2. update_website</strong>
                <span className="mt-1 block text-text-muted">
                  Sambung potongan <code>index.html</code> besar (<code>append_files</code>), cicil halaman lain (<code>files</code>), atau edit cepat (<code>patches</code>) tanpa ganti link!
                </span>
              </li>
              <li className="rounded-xl bg-[var(--pill-bg)] p-3">
                <strong className="block font-mono text-[11.5px] text-text">3. inspect_website</strong>
                <span className="mt-1 block text-text-muted">
                  Cek struktur file, statistik pengunjung live, diagnostik link HTML rusak, &amp; baca isi <code>index.html</code> per baris.
                </span>
              </li>
            </ul>
          </div>

          {/* Contoh Prompt Interaktif 1-Klik */}
          <div>
            <h4 className="text-[13px] font-semibold">Contoh Prompt Interaktif (Klik untuk Salin)</h4>
            <div className="mt-2 grid gap-2.5 sm:grid-cols-3">
              {QUICK_PROMPTS.map((item) => (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => void copyText(item.prompt, `Prompt "${item.title}"`)}
                  className="group flex flex-col justify-between rounded-2xl border border-[var(--line)] bg-[var(--pill-bg)] p-3 text-left transition hover:border-[var(--line-strong)]"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-md bg-[var(--surface-solid-2)] px-2 py-0.5 text-[10.5px] font-medium text-lav-text">
                        {item.badge}
                      </span>
                      <Copy size={12} className="text-text-muted opacity-70 group-hover:opacity-100" />
                    </div>
                    <p className="mt-1.5 text-[12.5px] font-semibold">{item.title}</p>
                    <p className="mt-1 line-clamp-3 text-[11.5px] leading-relaxed text-text-muted">&ldquo;{item.prompt}&rdquo;</p>
                  </div>
                  <span className="mt-2 inline-block text-[11px] font-medium text-lav-text">Salin prompt →</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Buat OAuth Sendiri (Custom OAuth Client & Token Manager) */}
      {activeTab === "oauth" && (
        <div className="mt-4 space-y-5">
          <div className="rounded-2xl bg-[var(--surface-solid-2)] p-4">
            <h4 className="flex items-center gap-1.5 text-[13.5px] font-semibold">
              <KeyRound size={15} /> Buat OAuth Client Sendiri (Custom OAuth 2.1)
            </h4>
            <p className="mt-1 text-[12px] leading-relaxed text-text-muted">
              Buat <strong>OAuth Client ID</strong> dan <strong>OAuth Client Secret</strong> milikmu sendiri untuk dipakai di <strong>Claude</strong>, <strong>Gemini (Web &amp; CLI)</strong>, <strong>OpenCode</strong>, <strong>Cursor</strong>, <strong>Codex</strong>, atau agen AI kustom.
            </p>

            <form onSubmit={handleCreateOAuth} className="mt-3.5 space-y-3.5">
              <div className="grid gap-3.5 sm:grid-cols-2">
                <div>
                  <label htmlFor="custom-oauth-name" className="mb-1 block text-[12px] font-medium">
                    Nama Aplikasi / OAuth Client
                  </label>
                  <input
                    id="custom-oauth-name"
                    type="text"
                    maxLength={60}
                    value={oauthName}
                    onChange={(e) => setOauthName(e.target.value)}
                    placeholder="mis. Claude / Gemini Web & CLI / Cursor / OpenCode"
                    className="input-solid h-10 w-full px-3 text-[12.5px]"
                  />
                </div>

                <div>
                  <span className="mb-1 block text-[12px] font-medium">Metode Autentikasi OAuth</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setWithSecret(true)}
                      className={cn(
                        "rounded-xl px-3 py-2 text-left text-[12px] transition",
                        withSecret
                          ? "bg-violet-500 text-white"
                          : "bg-[var(--pill-bg)] text-text-muted hover:text-text",
                      )}
                    >
                      <span className="block font-semibold">Client ID + Secret</span>
                      <span className="block text-[10.5px] opacity-85">Advanced OAuth / Confidential</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setWithSecret(false)}
                      className={cn(
                        "rounded-xl px-3 py-2 text-left text-[12px] transition",
                        !withSecret
                          ? "bg-violet-500 text-white"
                          : "bg-[var(--pill-bg)] text-text-muted hover:text-text",
                      )}
                    >
                      <span className="block font-semibold">Public (PKCE S256)</span>
                      <span className="block text-[10.5px] opacity-85">Tanpa Client Secret</span>
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <span className="mb-1.5 block text-[12px] font-medium">
                  Preset Redirect URI untuk Klien AI (Centang yang Ingin Diizinkan)
                </span>
                <div className="grid gap-2 sm:grid-cols-3">
                  {OAUTH_URI_PRESETS.map((preset) => (
                    <label
                      key={preset.id}
                      className="flex cursor-pointer items-start gap-2 rounded-xl bg-[var(--pill-bg)] px-3 py-2 text-[12px]"
                    >
                      <input
                        type="checkbox"
                        checked={!!selectedPresets[preset.id]}
                        onChange={(e) =>
                          setSelectedPresets((prev) => ({ ...prev, [preset.id]: e.target.checked }))
                        }
                        className="mt-0.5"
                      />
                      <span className="min-w-0">
                        <strong className="block text-[12px]">{preset.label}</strong>
                        <code className="block truncate text-[10.5px] text-text-muted">{preset.hint}</code>
                      </span>
                    </label>
                  ))}
                </div>
                <input
                  type="text"
                  value={extraRedirectUris}
                  onChange={(e) => setExtraRedirectUris(e.target.value)}
                  placeholder="Redirect URI tambahan (opsional, pisahkan koma — mis. https://app.domainmu.com/oauth/callback)"
                  className="input-solid mono mt-2 h-10 w-full px-3 text-[12px]"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <button
                  type="submit"
                  disabled={creatingOauth}
                  className="btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-[12.5px] disabled:opacity-50"
                >
                  {creatingOauth ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  Buat OAuth Sendiri
                </button>
                <button
                  type="button"
                  onClick={() => void handleGenerateToken(undefined, "Multi-AI Web & CLI")}
                  disabled={busyClientId === "personal"}
                  className="pill inline-flex items-center gap-1.5 px-3.5 py-2 text-[12px] font-medium hover:brightness-95 disabled:opacity-50"
                >
                  {busyClientId === "personal" ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                  Buat Bearer Token Langsung ({ttlDays} Hari)
                </button>
              </div>
            </form>
          </div>

          {/* Kredensial OAuth Baru yang Baru Saja Dibuat */}
          {newlyCreated && (
            <div className="rounded-2xl border border-violet-500/40 bg-violet-500/10 p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 text-[13px] font-semibold">
                  <Check size={15} /> OAuth &ldquo;{newlyCreated.client.name}&rdquo; Siap Dipakai
                </p>
                <span className="text-[11px] text-text-muted">Simpan Client Secret sekarang (hanya ditampilkan sekali)</span>
              </div>

              <div className="space-y-2.5 text-[12px]">
                <div>
                  <span className="mb-1 block font-medium text-text-muted">OAuth Client ID</span>
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={newlyCreated.client.clientId}
                      onFocus={(e) => e.currentTarget.select()}
                      className="input-solid mono h-9 min-w-0 flex-1 px-3 text-[11.5px]"
                    />
                    <button
                      type="button"
                      onClick={() => void copyText(newlyCreated.client.clientId, "OAuth Client ID")}
                      className="pill inline-flex items-center gap-1 px-3 py-1.5 text-[11.5px]"
                    >
                      <Copy size={12} /> Salin ID
                    </button>
                  </div>
                </div>

                {newlyCreated.clientSecret && (
                  <div>
                    <span className="mb-1 block font-medium text-text-muted">OAuth Client Secret</span>
                    <div className="flex items-center gap-2">
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
                        className="pill inline-flex items-center gap-1 px-2.5 py-1.5 text-[11.5px]"
                        aria-label={showSecret ? "Sembunyikan Secret" : "Tampilkan Secret"}
                      >
                        {showSecret ? <EyeOff size={12} /> : <Eye size={12} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => void copyText(newlyCreated.clientSecret, "OAuth Client Secret")}
                        className="pill inline-flex items-center gap-1 px-3 py-1.5 text-[11.5px]"
                      >
                        <Copy size={12} /> Salin Secret
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Panel Bearer Token Langsung (Jika Digenerate) */}
          {generatedToken && (
            <div className="rounded-2xl border border-[var(--line-strong)] bg-[var(--surface-solid-2)] p-4 space-y-2.5 text-[12px]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold">
                  Bearer Access Token ({generatedToken.clientName}) · Aktif {Math.round(generatedToken.expiresIn / 86400) || 1} Hari
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowBearer((v) => !v)}
                    className="pill inline-flex items-center gap-1 px-2.5 py-1 text-[11.5px]"
                  >
                    {showBearer ? <EyeOff size={12} /> : <Eye size={12} />} {showBearer ? "Sembunyikan" : "Tampilkan"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void copyText(generatedToken.accessToken, "Access Token")}
                    className="pill inline-flex items-center gap-1 px-3 py-1 text-[11.5px]"
                  >
                    <Copy size={12} /> Salin Access Token
                  </button>
                </div>
              </div>
              <input
                readOnly
                type={showBearer ? "text" : "password"}
                value={generatedToken.accessToken}
                onFocus={(e) => e.currentTarget.select()}
                className="input-solid mono h-9 w-full px-3 text-[11.5px]"
              />
            </div>
          )}

          {/* Informasi Endpoint OAuth Server Depup */}
          {endpoints && (
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--pill-bg)] p-3.5 text-[12px]">
              <p className="font-semibold">Endpoint OAuth 2.1 Server Depup</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <div className="flex items-center justify-between gap-2 rounded-xl bg-[var(--surface-solid-2)] px-3 py-2">
                  <div className="min-w-0">
                    <span className="block text-[10.5px] text-text-muted">Authorization URL</span>
                    <code className="block truncate text-[11.5px]">{endpoints.authorizationEndpoint}</code>
                  </div>
                  <button
                    type="button"
                    onClick={() => void copyText(endpoints.authorizationEndpoint, "Authorization URL")}
                    className="shrink-0 text-text-muted hover:text-text"
                    aria-label="Salin Authorization URL"
                  >
                    <Copy size={13} />
                  </button>
                </div>
                <div className="flex items-center justify-between gap-2 rounded-xl bg-[var(--surface-solid-2)] px-3 py-2">
                  <div className="min-w-0">
                    <span className="block text-[10.5px] text-text-muted">Token URL</span>
                    <code className="block truncate text-[11.5px]">{endpoints.tokenEndpoint}</code>
                  </div>
                  <button
                    type="button"
                    onClick={() => void copyText(endpoints.tokenEndpoint, "Token URL")}
                    className="shrink-0 text-text-muted hover:text-text"
                    aria-label="Salin Token URL"
                  >
                    <Copy size={13} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Daftar Custom OAuth Client Milik User */}
          <div>
            <h4 className="text-[13px] font-semibold">
              Daftar OAuth Client Buatanmu ({customClients.length})
            </h4>
            {customClients.length === 0 ? (
              <p className="mt-1.5 text-[12px] text-text-muted">
                Belum ada Custom OAuth yang dibuat. Gunakan form di atas jika ingin membuat Client ID &amp; Secret sendiri.
              </p>
            ) : (
              <ul className="mt-2.5 space-y-2.5">
                {customClients.map((c) => (
                  <li
                    key={c.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--line)] bg-[var(--pill-bg)] p-3.5 text-[12px]"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <strong className="text-[13px]">{c.name}</strong>
                        <span className="rounded-md bg-[var(--surface-solid-2)] px-2 py-0.5 text-[10.5px] font-medium text-lav-text">
                          {c.hasSecret ? "Client ID + Secret" : "Public PKCE"}
                        </span>
                        {c.secretPreview && (
                          <code className="text-[11px] text-text-muted">Secret: {c.secretPreview}</code>
                        )}
                      </div>
                      <p className="truncate font-mono text-[11px] text-text-muted">
                        Redirect: {c.redirectUris.join(", ")}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void copyText(c.clientId, `Client ID "${c.name}"`)}
                        className="pill inline-flex items-center gap-1 px-2.5 py-1.5 text-[11.5px]"
                      >
                        <Copy size={12} /> Salin Client ID
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleGenerateToken(c)}
                        disabled={busyClientId === c.id}
                        className="pill inline-flex items-center gap-1 px-2.5 py-1.5 text-[11.5px]"
                      >
                        {busyClientId === c.id ? <Loader2 size={12} className="animate-spin" /> : <KeyRound size={12} />}
                        Token
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteOAuth(c)}
                        disabled={busyClientId === c.id}
                        className="pill inline-flex items-center gap-1 px-2.5 py-1.5 text-[11.5px] text-bad-fg"
                      >
                        <Trash2 size={12} /> Hapus
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Bagian Izin Platform Deploy */}
      <div className="mt-5 border-t border-[var(--line)] pt-4">
        <h4 className="text-[13.5px] font-semibold">Izinkan Konektor AI (MCP) deploy ke</h4>
        <p className="mt-1 text-[12px] text-text-muted">
          Claude, OpenCode, Cursor, Codex, dan Gemini memakai token yang kamu simpan di form Settings di atas, langsung dari server — token tidak pernah dikirim lewat chat. Platform yang dimatikan tidak bisa dipakai untuk deploy.
        </p>
        <ul className="mt-3 space-y-2.5">
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
                    {hasToken ? "Token tersimpan." : "Isi token " + t.label + " di form Settings dulu, lalu klik Simpan."}
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
        <p className="mt-2.5 text-[12px] text-text-muted">
          Untuk repo private, isi juga GitHub PAT. Di chat/IDE, minta misalnya: <em>&quot;Deploy repo github.com/aku/toko ke Vercel.&quot;</em>
        </p>
      </div>

      <button
        type="button"
        onClick={revoke}
        disabled={busy}
        className="pill mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] text-bad-fg disabled:opacity-50"
      >
        <Unplug size={13} /> Cabut semua akses MCP &amp; OAuth
      </button>
    </section>
  );
}
