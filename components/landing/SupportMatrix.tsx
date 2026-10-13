import { Check, Minus, TriangleAlert } from "lucide-react";

type Level = "ok" | "warn" | "no";

const ROWS: { type: string; examples: string; v: Level; c: Level; r: Level }[] = [
  { type: "HTML, CSS, JavaScript biasa", examples: "Cukup ada index.html, tanpa package.json", v: "ok", c: "ok", r: "ok" },
  { type: "Framework JavaScript", examples: "React, Vue, Svelte, Angular, Astro, Next.js, termasuk TypeScript", v: "ok", c: "ok", r: "ok" },
  { type: "Server Node.js", examples: "Express, NestJS, Fastify", v: "warn", c: "no", r: "ok" },
  { type: "Docker dan bahasa lain", examples: "Dockerfile, Python, Go, PHP, Ruby, Java, Rust, .NET", v: "no", c: "no", r: "ok" },
];

const META = {
  ok: { text: "Otomatis", tone: "text-obs-ok font-medium", Icon: Check },
  warn: { text: "Dengan catatan", tone: "text-obs-warn font-medium", Icon: TriangleAlert },
  no: { text: "Tidak cocok", tone: "text-obs-mute", Icon: Minus },
} as const;

export function SupportMatrix() {
  return (
    <section id="support" className="mx-auto w-full max-w-7xl scroll-mt-20 px-4 py-16 sm:px-8">
      <div className="mx-auto mb-12 max-w-3xl text-center">
        <h2 className="f-display text-[28px] font-bold leading-tight tracking-[-0.03em] text-white sm:text-[40px] sm:leading-[48px]">
          Repo kamu cocok di mana?
        </h2>
        <p className="mt-4 text-[17px] leading-relaxed text-obs-sec">
          Tiap platform punya batasnya. Depup hanya mengizinkan deploy yang memang bisa berhasil. Kalau tidak cocok, kamu dapat
          alasan dan langkah deploy manual.
        </p>
      </div>

      <div className="obs-card overflow-x-auto rounded-2xl">
        <table className="w-full min-w-[720px] text-left text-[14px]">
          <thead>
            <tr className="border-b border-white/[0.08] bg-white/[0.03]">
              <th scope="col" className="px-6 py-4 font-medium text-obs-sec">Isi repo</th>
              <th scope="col" className="px-6 py-4 font-medium text-white">Vercel</th>
              <th scope="col" className="px-6 py-4 font-medium text-white">Cloudflare Pages</th>
              <th scope="col" className="px-6 py-4 font-medium text-white">Railway</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.type} className="border-b border-white/[0.06] last:border-b-0">
                <th scope="row" className="px-6 py-5 align-top font-medium text-white">
                  {r.type}
                  <div className="mt-1 max-w-[320px] text-[12.5px] font-normal text-obs-sec">{r.examples}</div>
                </th>
                {[r.v, r.c, r.r].map((l, idx) => {
                  const { text, tone, Icon } = META[l];
                  return (
                    <td key={idx} className={`px-6 py-5 align-top ${tone}`}>
                      <span className="inline-flex items-center gap-1.5">
                        <Icon size={14} strokeWidth={l === "ok" ? 3 : 2} aria-hidden="true" />
                        {text}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-[13px] text-obs-mute">
        Project di dalam subfolder (misalnya frontend/) perlu deploy manual dengan Root Directory. Depup akan memberi tahu
        langkahnya.
      </p>
    </section>
  );
}
