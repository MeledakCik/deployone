"use client";

import * as React from "react";
import { Copy, Sparkles, Unplug } from "lucide-react";
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

function parsePlatforms(v: string | undefined): Platform[] {
  const list = (v ?? "").split(",").map((x) => x.trim());
  return DEPLOY_TARGETS.map((t) => t.platform).filter((p) => list.includes(p));
}

/**
 * Kartu "Konektor Claude" di Settings: URL konektor MCP, langkah memasangnya di Claude web, dan izin platform
 * deploy (Vercel/Cloudflare/Railway). Token platform diisi di form Settings di atasnya dan dibaca server saat Claude
 * memanggil `deploy_project` — tidak pernah lewat chat atau Link Instan.
 * Konektor yang ditambahkan di claude.ai otomatis ikut tersedia di app Claude di HP (akun yang sama).
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
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    api<{ mcpUrl: string }>("/api/mcp/connect")
      .then((d) => setMcpUrl(d.mcpUrl))
      .catch(() => setMcpUrl(null));
  }, []);

  async function copy() {
    if (!mcpUrl) return;
    try {
      await navigator.clipboard.writeText(mcpUrl);
      showToast("URL konektor disalin");
    } catch {
      showToast("Gagal menyalin — salin manual dari kotak URL");
    }
  }

  async function revoke() {
    const { ok } = await confirm({
      title: "Cabut akses Claude?",
      description: "Semua koneksi Claude ke akun Depup-mu akan diputus.",
      impact: ["Claude tidak bisa lagi menayangkan website atau deploy ke Vercel, Cloudflare, dan Railway atas namamu sampai kamu menghubungkannya ulang.", "Link dan deployment yang sudah jalan tetap aktif."],
      confirmLabel: "Ya, cabut akses",
    });
    if (!ok) return;
    setBusy(true);
    try {
      await api("/api/mcp/connect", { method: "POST", json: { action: "revoke" } });
      showToast("Akses Claude dicabut");
    } catch (e) {
      showToast((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="surface-solid mt-8 rounded-3xl p-5 sm:p-6" aria-labelledby="claude-connect-title">
      <h3 id="claude-connect-title" className="flex items-center gap-2 text-[15px] font-semibold">
        <Sparkles size={16} /> Konektor Claude
      </h3>
      <p className="mt-1 text-[12.5px] text-text-muted">
        Hubungkan Depup ke Claude: publish website jadi Link Instan, atau deploy repo GitHub ke Vercel, Cloudflare Pages, dan Railway langsung dari chat.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input
          readOnly
          value={mcpUrl ?? "Memuat…"}
          aria-label="URL konektor MCP Depup"
          onFocus={(e) => e.currentTarget.select()}
          className="min-w-0 flex-1 rounded-xl border border-[var(--line)] bg-[var(--pill-bg)] px-3.5 py-2.5 font-mono text-[12.5px] outline-none"
        />
        <button type="button" onClick={copy} disabled={!mcpUrl} className="pill inline-flex items-center gap-1.5 px-3 py-2 text-[12px] disabled:opacity-50">
          <Copy size={13} /> Salin
        </button>
      </div>

      <ol className="mt-4 list-decimal space-y-1.5 pl-5 text-[12.5px] leading-relaxed">
        <li>Buka <strong>claude.ai</strong> di browser, lalu <strong>Settings → Connectors → Add custom connector</strong>.</li>
        <li>Isi nama <strong>Depup</strong> dan tempel URL di atas, lalu klik <strong>Add</strong> dan <strong>Connect</strong>.</li>
        <li>Masuk dengan Google di Depup dan tekan <strong>Izinkan</strong>.</li>
        <li>Di chat, aktifkan konektor Depup dan ketik: <em>&quot;Buatkan landing page warung kopi, lalu publish ke Depup.&quot;</em></li>
      </ol>
      <p className="mt-3 text-[12px] text-text-muted">
        Di app Claude (HP): konektor yang sudah kamu tambahkan di claude.ai ikut muncul di akun yang sama. Aktifkan dari menu konektor di chat, lalu pakai seperti biasa.
        Link Instan bersifat sementara (maksimal 7 hari); deploy ke Vercel, Cloudflare, dan Railway permanen di akun platformmu.
      </p>

      <div className="mt-5 border-t border-[var(--line)] pt-4">
        <h4 className="text-[13.5px] font-semibold">Izinkan Claude deploy ke</h4>
        <p className="mt-1 text-[12px] text-text-muted">
          Claude memakai token yang kamu simpan di form Settings di atas, langsung dari server — token tidak pernah dikirim lewat chat. Platform yang dimatikan tidak bisa dipakai Claude.
        </p>
        <ul className="mt-3 space-y-2.5">
          {DEPLOY_TARGETS.map((t) => {
            const hasToken = typeof tokens[t.tokenField] === "string" && (tokens[t.tokenField] as string).trim().length > 0;
            const on = allowed.includes(t.platform);
            const id = `mcpAllow-${t.platform}`;
            return (
              <li key={t.platform} className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <label htmlFor={id} className="block cursor-pointer text-[13px] font-medium">{t.label}</label>
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
                    on ? "bg-[var(--ink-fill)]" : "bg-[var(--line-strong)]"
                  )}
                >
                  <span
                    className={cn(
                      "absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition-transform duration-300 [transition-timing-function:var(--ease-soft)]",
                      on ? "translate-x-5" : "translate-x-0"
                    )}
                  />
                </button>
              </li>
            );
          })}
        </ul>
        <p className="mt-2.5 text-[12px] text-text-muted">
          Untuk repo private, isi juga GitHub PAT. Di chat, minta misalnya: <em>&quot;Deploy repo github.com/aku/toko ke Vercel.&quot;</em>
        </p>
      </div>

      <button
        type="button"
        onClick={revoke}
        disabled={busy}
        className="pill mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] text-bad-fg disabled:opacity-50"
      >
        <Unplug size={13} /> Cabut semua akses Claude
      </button>
    </section>
  );
}
