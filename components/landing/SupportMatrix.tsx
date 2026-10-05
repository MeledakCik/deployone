type Level = "ok" | "warn" | "no";

const ROWS: { type: string; examples: string; v: Level; c: Level; r: Level }[] = [
  { type: "HTML, CSS, JavaScript biasa", examples: "Cukup ada index.html, tanpa package.json", v: "ok", c: "ok", r: "ok" },
  { type: "Framework JavaScript", examples: "React, Vue, Svelte, Angular, Astro, Next.js, termasuk TypeScript", v: "ok", c: "ok", r: "ok" },
  { type: "Server Node.js", examples: "Express, NestJS, Fastify", v: "warn", c: "no", r: "ok" },
  { type: "Docker dan bahasa lain", examples: "Dockerfile, Python, Go, PHP, Ruby, Java, Rust, .NET", v: "no", c: "no", r: "ok" },
];

const TEXT: Record<Level, string> = { ok: "Otomatis", warn: "Dengan catatan", no: "Tidak cocok" };
const TONE: Record<Level, string> = {
  ok: "text-emerald-700 dark:text-emerald-400 font-medium",
  warn: "text-amber-700 dark:text-amber-400 font-medium",
  no: "text-[var(--text-faint)]",
};

export function SupportMatrix() {
  return (
    <section id="support" className="mx-auto max-w-[1200px] px-6 py-20 scroll-mt-20">
      <div className="max-w-[620px]">
        <h2 className="font-display text-[34px] md:text-[46px] leading-[1.05] tracking-[-0.03em] font-bold">
          Repo kamu cocok di mana?
        </h2>
        <p className="mt-4 text-[16px] leading-relaxed text-[var(--text-muted)]">
          Tiap platform punya batasnya. Depup membaca isi repo dan hanya mengizinkan deploy yang memang
          bisa berhasil. Kalau tidak cocok, kamu dapat alasan dan langkah deploy manual.
        </p>
      </div>

      <div className="mt-10 overflow-x-auto rounded-[20px]" style={{ border: "1px solid var(--line-strong)" }}>
        <table className="w-full min-w-[720px] text-left text-[14px]">
          <thead>
            <tr style={{ background: "var(--row-hover)", borderBottom: "1px solid var(--line)" }}>
              <th scope="col" className="px-6 py-4 font-medium text-[var(--text-muted)]">Isi repo</th>
              <th scope="col" className="px-6 py-4 font-medium">Vercel</th>
              <th scope="col" className="px-6 py-4 font-medium">Cloudflare Pages</th>
              <th scope="col" className="px-6 py-4 font-medium">Railway</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.type} style={{ borderBottom: "1px solid var(--line)" }} className="last:border-b-0">
                <th scope="row" className="px-6 py-5 align-top font-medium">
                  {r.type}
                  <div className="mt-1 text-[12.5px] font-normal text-[var(--text-muted)] max-w-[320px]">{r.examples}</div>
                </th>
                {[r.v, r.c, r.r].map((l, idx) => (
                  <td key={idx} className={`px-6 py-5 align-top ${TONE[l]}`}>{TEXT[l]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-[12.5px] text-[var(--text-faint)]">
        Project di dalam subfolder (misalnya frontend/) perlu deploy manual dengan Root Directory. Depup
        akan memberi tahu langkahnya.
      </p>
    </section>
  );
}
