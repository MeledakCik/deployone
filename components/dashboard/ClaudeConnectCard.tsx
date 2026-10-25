"use client";

import * as React from "react";
import { Copy, Sparkles, Unplug } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/confirm";
import { api } from "@/components/db/ui";

/**
 * Kartu "Hubungkan Claude" di menu Link Instan: URL konektor MCP + langkah memasangnya di Claude web.
 * Konektor yang ditambahkan di claude.ai otomatis ikut tersedia di app Claude di HP (akun yang sama).
 */
export function ClaudeConnectCard() {
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
      impact: ["Claude tidak bisa lagi menayangkan website ke akunmu sampai kamu menghubungkannya ulang.", "Link yang sudah tayang tetap aktif sampai kedaluwarsa."],
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
        <Sparkles size={16} /> Hubungkan Claude
      </h3>
      <p className="mt-1 text-[12.5px] text-text-muted">
        Buat website di Claude, lalu minta &quot;publish ke Depup&quot; — Claude langsung memberimu link publik. Tanpa download dan upload manual.
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
        Link hasil publish bersifat sementara (sama seperti Link Instan, maksimal 7 hari).
      </p>

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
