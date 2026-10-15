"use client";

import * as React from "react";

type State = { kind: "idle" } | { kind: "busy" } | { kind: "done" } | { kind: "error"; message: string };

export function AbuseReportForm({ initialTarget }: { initialTarget: string }) {
  const [target, setTarget] = React.useState(initialTarget);
  const [reason, setReason] = React.useState("");
  const [contact, setContact] = React.useState("");
  const [state, setState] = React.useState<State>({ kind: "idle" });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (state.kind === "busy") return;
    setState({ kind: "busy" });
    try {
      const res = await fetch("/api/abuse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target, reason, contact }),
      });
      const body = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (res.ok && body?.ok) {
        setState({ kind: "done" });
      } else {
        setState({ kind: "error", message: body?.error ?? `Gagal mengirim laporan (${res.status}).` });
      }
    } catch {
      setState({ kind: "error", message: "Tidak bisa terhubung ke server. Coba lagi." });
    }
  }

  if (state.kind === "done") {
    return (
      <div className="w-full max-w-md rounded-2xl border border-[var(--line)] p-6 text-center">
        <h2 className="text-lg font-semibold text-[var(--text)]">Terima kasih</h2>
        <p className="mt-2 text-[13.5px] text-[var(--text-muted)]">
          Laporanmu sudah diteruskan ke admin Depup dan akan ditinjau.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex w-full max-w-md flex-col gap-3 text-left">
      <label className="flex flex-col gap-1 text-[13px] text-[var(--text-muted)]">
        Alamat link yang dilaporkan
        <input
          className="input-solid rounded-lg px-3 py-2 text-[14px] text-[var(--text)]"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          placeholder="https://nama-link.domain/"
          maxLength={300}
          required
        />
      </label>
      <label className="flex flex-col gap-1 text-[13px] text-[var(--text-muted)]">
        Kenapa dilaporkan? (phishing, penipuan, malware, dll.)
        <textarea
          className="input-solid min-h-[96px] rounded-lg px-3 py-2 text-[14px] text-[var(--text)]"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={500}
          required
        />
      </label>
      <label className="flex flex-col gap-1 text-[13px] text-[var(--text-muted)]">
        Kontak kamu (opsional, kalau perlu ditanya lagi)
        <input
          className="input-solid rounded-lg px-3 py-2 text-[14px] text-[var(--text)]"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          maxLength={100}
        />
      </label>
      {state.kind === "error" && (
        <p role="alert" className="text-[13px] text-red-500">
          {state.message}
        </p>
      )}
      <button
        type="submit"
        disabled={state.kind === "busy"}
        className="btn-primary mt-1 rounded-full px-5 py-2.5 text-[13px] disabled:opacity-60"
      >
        {state.kind === "busy" ? "Mengirim…" : "Kirim laporan"}
      </button>
    </form>
  );
}
