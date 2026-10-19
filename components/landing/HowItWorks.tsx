import { GlyphText } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/primitives";

const STEPS = [
  {
    n: "1",
    tone: "bg-tone-peri",
    badge: "Tempel",
    title: "Tempel link repo",
    body: "Masukkan link GitHub. Repo private pun bisa, cukup lengkapi dengan GitHub Token. Depup langsung membaca isinya.",
    label: "Repo",
    lines: [
      ["font-semibold text-text", "github.com/dimas/api-toko"],
      ["text-ok-fg", "✓ repo terbaca"],
    ],
  },
  {
    n: "2",
    tone: "bg-tone-lilac",
    badge: "Periksa",
    title: "Lihat hasil pemeriksaan",
    body: "Kamu langsung tahu jenis repo-nya, platform yang cocok, dan env var yang kemungkinan dibutuhkan, sebelum deploy dimulai.",
    label: "Hasil",
    lines: [
      ["font-semibold text-text", "Express (server Node.js)"],
      ["text-lav-text", "✓ Cocok: Railway"],
    ],
  },
  {
    n: "3",
    tone: "bg-tone-mint",
    badge: "Deploy",
    title: "Deploy dan pantau",
    body: "Progres tampil langsung. Kalau gagal, pesan error menjelaskan penyebabnya dan langkah yang perlu kamu ambil.",
    label: "Progres",
    lines: [
      ["font-semibold text-text", "Build → Deploy → Live"],
      ["text-ok-fg", "● Online"],
    ],
  },
];

export function HowItWorks() {
  return (
    <section id="cara-kerja" className="mx-auto w-full max-w-6xl scroll-mt-24 px-4 pb-16 pt-4 sm:px-8 sm:pb-20">
      <div className="mx-auto mb-12 max-w-3xl text-center">
        <h2 className="lp-h2">Tiga langkah, dari repo ke link.</h2>
        <p className="lp-lead">Tanpa YAML yang rumit. Tempel link, lalu biarkan Depup menangani sisanya.</p>
      </div>

      <ol className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {STEPS.map((s) => (
          <li key={s.n} className={`flex flex-col justify-between rounded-card p-6 sm:p-7 ${s.tone}`}>
            <div>
              <div className="mb-8 flex items-center justify-between">
                {/* Langkah terpilih di dashboard = ungu solid; angka di sini memakai pola yang sama */}
                <span
                  className="grid h-11 w-11 place-items-center rounded-[14px] text-[18px] font-bold tabular-nums"
                  style={{ background: "var(--ink-fill)", color: "var(--ink-fill-text)" }}
                  aria-hidden="true"
                >
                  {s.n}
                </span>
                <Badge>{s.badge}</Badge>
              </div>
              <h3 className="mb-3 text-[22px] font-bold tracking-[-0.03em] sm:text-[24px]">{s.title}</h3>
              <p className="mb-6 text-[14.5px] leading-relaxed text-text-muted">{s.body}</p>
            </div>
            <div className="rounded-2xl bg-[var(--surface-solid)] p-3.5 font-mono text-[12px] leading-[18px] break-words">
              <div className="mb-1 text-[11px] font-bold text-text-faint">{s.label}</div>
              {s.lines.map(([cls, t]) => (
                <div key={t} className={cls}>
                  <GlyphText>{t}</GlyphText>
                </div>
              ))}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
