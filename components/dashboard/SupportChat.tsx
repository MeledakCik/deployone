"use client";

import * as React from "react";
import { Bot, CheckCircle2, Copy, Info, Loader2, MessageCircle, RotateCcw, SendHorizonal, TriangleAlert, X, XCircle } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useDeploy } from "@/lib/deploy-context";
import { useToast } from "@/components/ui/Toast";
import { notifySessionExpired } from "@/lib/session-expired";

export interface DiagCheckView {
  id: string;
  label: string;
  status: "ok" | "problem" | "warn" | "unknown";
  detail: string;
}

export interface SupportMessage {
  role: "user" | "assistant";
  content: string;
  /** Hasil pemeriksaan teknis otomatis yang dijalankan sebelum jawaban ini (kalau pesan berupa laporan masalah). */
  diagnostics?: DiagCheckView[] | null;
  /** Nomor laporan yang otomatis dibuat ke developer untuk jawaban ini. */
  reportId?: string | null;
}

const MAX_INPUT = 1000;

const SUGGESTIONS = [
  "Deploy saya gagal, tolong cek akun saya",
  "Repo saya tidak bisa di-deploy, kenapa?",
  "Cara dapat token Vercel",
  "Kapan pakai Railway, bukan Vercel?",
];

/* ---------- render teks AI tanpa dangerouslySetInnerHTML ---------- */

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  // **tebal**, `kode`, dan URL https
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|https?:\/\/[^\s)]+)/g);
  return parts.map((p, i) => {
    const key = `${keyPrefix}-${i}`;
    if (/^\*\*[^*]+\*\*$/.test(p)) return <strong key={key}>{p.slice(2, -2)}</strong>;
    if (/^`[^`]+`$/.test(p))
      return (
        <code key={key} className="rounded bg-[var(--pill-bg)] px-1 py-0.5 font-mono text-[12px]">
          {p.slice(1, -1)}
        </code>
      );
    if (/^https?:\/\//.test(p)) {
      const href = p.replace(/[.,;:!?]+$/, "");
      const tail = p.slice(href.length);
      return (
        <React.Fragment key={key}>
          <a href={href} target="_blank" rel="noopener noreferrer" className="break-all text-violet-500 underline underline-offset-2">
            {href}
          </a>
          {tail}
        </React.Fragment>
      );
    }
    return <React.Fragment key={key}>{p}</React.Fragment>;
  });
}

function RichText({ text }: { text: string }) {
  const blocks: React.ReactNode[] = [];
  const lines = text.split("\n");
  let list: { ordered: boolean; items: string[] } | null = null;

  const flush = () => {
    if (!list) return;
    const Tag = list.ordered ? "ol" : "ul";
    blocks.push(
      <Tag key={`l${blocks.length}`} className={`my-1 space-y-0.5 pl-5 ${list.ordered ? "list-decimal" : "list-disc"}`}>
        {list.items.map((it, i) => (
          <li key={i}>{renderInline(it, `li${blocks.length}-${i}`)}</li>
        ))}
      </Tag>
    );
    list = null;
  };

  lines.forEach((line, idx) => {
    const ul = line.match(/^\s*[-*•]\s+(.*)/);
    const ol = line.match(/^\s*\d+[.)]\s+(.*)/);
    if (ul || ol) {
      const ordered = !!ol;
      if (!list || list.ordered !== ordered) {
        flush();
        list = { ordered, items: [] };
      }
      list.items.push((ul ?? ol)![1]);
      return;
    }
    flush();
    if (!line.trim()) return;
    blocks.push(
      <p key={`p${idx}`} className="my-1 first:mt-0 last:mb-0">
        {renderInline(line.replace(/^#{1,4}\s+/, ""), `p${idx}`)}
      </p>
    );
  });
  flush();
  return <>{blocks}</>;
}

/* ---------- kartu hasil pemeriksaan teknis ---------- */

function DiagnosticsCard({ checks }: { checks: DiagCheckView[] }) {
  const icon = {
    ok: <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-500" aria-label="OK" />,
    problem: <XCircle size={14} className="mt-0.5 shrink-0 text-red-500" aria-label="Masalah" />,
    warn: <TriangleAlert size={14} className="mt-0.5 shrink-0 text-amber-500" aria-label="Perhatian" />,
    unknown: <Info size={14} className="mt-0.5 shrink-0 text-text-muted" aria-label="Tidak diketahui" />,
  } as const;
  return (
    <div className="w-full max-w-[92%] rounded-2xl border border-[var(--line)] px-3.5 py-3">
      <p className="mb-2 text-[11.5px] font-semibold uppercase tracking-wide text-text-muted">Hasil pemeriksaan akunmu</p>
      <ul className="space-y-1.5">
        {checks.map((c) => (
          <li key={c.id} className="flex gap-2 text-[12.5px] leading-snug">
            {icon[c.status]}
            <span>
              <span className="font-medium">{c.label}:</span> <span className="text-text-muted">{c.detail}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- komponen utama ---------- */

export function SupportChat() {
  const { user } = useAuth();
  const { view } = useDeploy();
  const { showToast } = useToast();

  const [open, setOpen] = React.useState(false);
  const [messages, setMessages] = React.useState<SupportMessage[]>([]);
  const [input, setInput] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [reporting, setReporting] = React.useState(false);
  const [reportedId, setReportedId] = React.useState<string | null>(null);

  const listRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);
  const abortRef = React.useRef<AbortController | null>(null);

  React.useEffect(() => () => abortRef.current?.abort(), []);

  React.useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, sending, error, open]);

  React.useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const request = React.useCallback(
    async (history: SupportMessage[]) => {
      setSending(true);
      setError(null);
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      try {
        const res = await fetch("/api/support/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history.map(({ role, content }) => ({ role, content })), view }),
          signal: ctrl.signal,
        });
        const body = await res.json().catch(() => null);
        notifySessionExpired(body);
        if (!res.ok || !body?.ok) {
          setError(body?.error ?? "Asisten sedang tidak bisa menjawab. Coba lagi nanti.");
          return;
        }
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            content: String(body.data.reply),
            diagnostics: Array.isArray(body.data.diagnostics) ? (body.data.diagnostics as DiagCheckView[]) : null,
            reportId: typeof body.data.reportId === "string" ? body.data.reportId : null,
          },
        ]);
        if (typeof body.data.reportId === "string") setReportedId(body.data.reportId);
      } catch (e) {
        if ((e as { name?: string })?.name === "AbortError") return;
        setError("Koneksi bermasalah. Cek internet kamu lalu coba lagi.");
      } finally {
        setSending(false);
      }
    },
    [view]
  );

  function send(text: string) {
    const content = text.trim();
    if (!content || sending) return;
    const next = [...messages, { role: "user" as const, content }];
    setMessages(next);
    setInput("");
    void request(next);
  }

  function retry() {
    if (sending) return;
    void request(messages);
  }

  function reset() {
    abortRef.current?.abort();
    setMessages([]);
    setError(null);
    setSending(false);
    setReportedId(null);
    inputRef.current?.focus();
  }

  async function copyTranscript() {
    const header = [
      "Laporan chat CS Depup",
      user ? `Akun: ${user.email}` : null,
      `Halaman: ${view}`,
      `Waktu: ${new Date().toLocaleString("id-ID")}`,
      "",
    ]
      .filter((l) => l !== null)
      .join("\n");
    const body = messages.map((m) => `${m.role === "user" ? "Saya" : "Asisten"}: ${m.content}`).join("\n\n");
    try {
      await navigator.clipboard.writeText(`${header}\n${body}`);
      showToast("Percakapan disalin. Kirim ke developer kalau masih butuh bantuan.");
    } catch {
      showToast("Tidak bisa menyalin otomatis. Salin teks percakapan secara manual.");
    }
  }

  const hasReply = messages.some((m) => m.role === "assistant");

  async function reportToDeveloper() {
    if (reporting || reportedId) return;
    setReporting(true);
    try {
      const res = await fetch("/api/support/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: messages.map(({ role, content }) => ({ role, content })), view }),
      });
      const body = await res.json().catch(() => null);
      notifySessionExpired(body);
      if (!res.ok || !body?.ok) {
        showToast(body?.error ?? "Laporan belum bisa dikirim. Coba lagi.");
        return;
      }
      setReportedId(String(body.data.id));
      showToast(`Laporan terkirim ke developer (${body.data.id}).`);
    } catch {
      showToast("Koneksi bermasalah. Laporan belum terkirim.");
    } finally {
      setReporting(false);
    }
  }

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Buka chat bantuan"
          className="btn-primary fixed bottom-5 right-5 z-40 flex h-12 items-center gap-2 px-5 text-[13.5px] shadow-lg"
        >
          <MessageCircle size={18} />
          <span className="hidden sm:inline">Bantuan</span>
        </button>
      )}

      {open && (
        <section
          role="dialog"
          aria-label="Chat bantuan Depup"
          className="surface-solid fixed inset-0 z-[60] flex flex-col overflow-hidden !rounded-none shadow-2xl sm:inset-auto sm:bottom-5 sm:right-5 sm:h-[600px] sm:max-h-[calc(100vh-40px)] sm:w-[400px] sm:!rounded-[24px]"
        >
          {/* Header */}
          <header className="flex items-center gap-3 border-b border-[var(--line)] px-4 py-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
              <Bot size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-[14px] font-semibold leading-tight">Asisten Depup</h2>
              <p className="text-[11.5px] text-text-muted">Dijawab AI, bisa saja keliru</p>
            </div>
            {messages.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={copyTranscript}
                  aria-label="Salin percakapan"
                  title="Salin percakapan"
                  className="grid h-8 w-8 place-items-center rounded-full text-text-muted hover:bg-[var(--card-hover)] hover:text-text"
                >
                  <Copy size={15} />
                </button>
                <button
                  type="button"
                  onClick={reset}
                  aria-label="Mulai percakapan baru"
                  title="Percakapan baru"
                  className="grid h-8 w-8 place-items-center rounded-full text-text-muted hover:bg-[var(--card-hover)] hover:text-text"
                >
                  <RotateCcw size={15} />
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Tutup chat"
              className="grid h-8 w-8 place-items-center rounded-full text-text-muted hover:bg-[var(--card-hover)] hover:text-text"
            >
              <X size={17} />
            </button>
          </header>

          {/* Pesan */}
          <div ref={listRef} role="log" aria-live="polite" className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.length === 0 && (
              <div className="space-y-4">
                <div className="rounded-2xl rounded-tl-md bg-[var(--pill-bg)] px-3.5 py-3 text-[13.5px] leading-relaxed">
                  Halo{user?.name ? `, ${user.name.split(" ")[0]}` : ""}! Aku asisten Depup. Tanya soal deploy, token, domain, atau
                  error yang kamu temui.
                </div>
                <div className="flex flex-col items-start gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => send(s)}
                      className="pill px-3.5 py-2 text-left text-[12.5px] text-text-muted transition hover:text-text"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-tr-md bg-violet-600 px-3.5 py-2.5 text-[13.5px] leading-relaxed text-white">
                    {m.content}
                  </div>
                </div>
              ) : (
                <div key={i} className="flex flex-col items-start gap-2">
                  {m.diagnostics && m.diagnostics.length > 0 && <DiagnosticsCard checks={m.diagnostics} />}
                  <div className="max-w-[92%] break-words rounded-2xl rounded-tl-md bg-[var(--pill-bg)] px-3.5 py-2.5 text-[13.5px] leading-relaxed">
                    <RichText text={m.content} />
                  </div>
                  {m.reportId && (
                    <p className="px-1 text-[11.5px] text-text-muted">
                      Laporan otomatis diteruskan ke developer · <span className="font-mono">{m.reportId}</span>
                    </p>
                  )}
                </div>
              )
            )}

            {sending && (
              <div className="flex" aria-label="Asisten sedang mengetik">
                <div className="flex items-center gap-1 rounded-2xl rounded-tl-md bg-[var(--pill-bg)] px-4 py-3.5">
                  {[0, 1, 2].map((d) => (
                    <span
                      key={d}
                      className="lp-motion h-1.5 w-1.5 rounded-full bg-text-muted"
                      style={{ animation: `landing-blink 1.2s ${d * 0.2}s infinite` }}
                    />
                  ))}
                </div>
              </div>
            )}

            {error && !sending && (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-3.5 py-3 text-[13px] text-red-500">
                <p>{error}</p>
                {messages.length > 0 && messages[messages.length - 1].role === "user" && (
                  <button type="button" onClick={retry} className="mt-2 font-semibold underline underline-offset-2">
                    Coba lagi
                  </button>
                )}
              </div>
            )}

            {hasReply && !sending && (
              reportedId ? (
                <p className="rounded-2xl bg-emerald-500/10 px-3.5 py-2.5 text-center text-[12.5px] text-emerald-500">
                  Laporan sudah diterima developer · <span className="font-mono">{reportedId}</span>
                </p>
              ) : (
                <button
                  type="button"
                  onClick={() => void reportToDeveloper()}
                  disabled={reporting}
                  className="pill inline-flex w-full items-center justify-center gap-2 px-3.5 py-2 text-[12.5px] font-medium hover:text-text disabled:opacity-60"
                >
                  {reporting && <Loader2 size={13} className="animate-spin" />}
                  Masalah belum selesai? Laporkan ke developer
                </button>
              )
            )}
          </div>

          {/* Input */}
          <form
            className="border-t border-[var(--line)] p-3"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value.slice(0, MAX_INPUT))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                rows={1}
                placeholder="Tulis pertanyaanmu…"
                aria-label="Pesan"
                className="input-solid max-h-28 min-h-[44px] flex-1 resize-none px-3.5 py-3 text-[13.5px]"
              />
              <button
                type="submit"
                disabled={!input.trim() || sending}
                aria-label="Kirim"
                className="btn-primary grid h-11 w-11 shrink-0 place-items-center disabled:opacity-40"
              >
                <SendHorizonal size={17} />
              </button>
            </div>
            <p className="mt-2 px-1 text-[11px] text-text-muted">
              Jangan tempel token atau password di sini.
            </p>
          </form>
        </section>
      )}
    </>
  );
}
