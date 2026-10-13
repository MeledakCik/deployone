import { Check, Minus, TriangleAlert } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";

type Level = "ok" | "warn" | "no";

const ROWS: { type: string; examples: string; v: Level; c: Level; r: Level }[] = [
  { type: "HTML, CSS, JavaScript biasa", examples: "Cukup ada index.html, tanpa package.json", v: "ok", c: "ok", r: "ok" },
  { type: "Framework JavaScript", examples: "React, Vue, Svelte, Angular, Astro, Next.js, termasuk TypeScript", v: "ok", c: "ok", r: "ok" },
  { type: "Server Node.js", examples: "Express, NestJS, Fastify", v: "warn", c: "no", r: "ok" },
  { type: "Docker dan bahasa lain", examples: "Dockerfile, Python, Go, PHP, Ruby, Java, Rust, .NET", v: "no", c: "no", r: "ok" },
];

const META = {
  ok: { text: "Otomatis", chip: "bg-ok/15 text-ok", Icon: Check },
  warn: { text: "Dengan catatan", chip: "bg-warn/15 text-warn", Icon: TriangleAlert },
  no: { text: "Tidak cocok", chip: "bg-fill/15 text-ink-3", Icon: Minus },
} as const;

export function SupportMatrix() {
  return (
    <section id="support" className="mx-auto w-full max-w-6xl scroll-mt-24 px-4 py-20 sm:px-8">
      <Reveal className="mx-auto mb-12 max-w-3xl text-center">
        <h2 className="display text-[32px] leading-[1.08] text-ink sm:text-[52px]">Repo kamu cocok di mana?</h2>
        <p className="mt-5 text-[17px] leading-relaxed text-ink-2 sm:text-[19px]">
          Tiap platform punya batasnya. Depup hanya mengizinkan deploy yang memang bisa berhasil. Kalau tidak cocok, kamu dapat
          alasan dan langkah deploy manual.
        </p>
      </Reveal>

      <Reveal>
        <div className="overflow-x-auto rounded-[32px] bg-card p-2 shadow-card">
          <table className="w-full min-w-[720px] border-separate border-spacing-y-1 text-left text-[14px]">
            <thead>
              <tr>
                <th scope="col" className="px-6 py-4 font-medium text-ink-3">Isi repo</th>
                <th scope="col" className="px-6 py-4 font-semibold text-ink">Vercel</th>
                <th scope="col" className="px-6 py-4 font-semibold text-ink">Cloudflare Pages</th>
                <th scope="col" className="px-6 py-4 font-semibold text-ink">Railway</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => (
                <tr key={r.type} className="group transition-colors duration-300 hover:bg-fill/10">
                  <th scope="row" className="rounded-l-[22px] px-6 py-5 align-top font-semibold text-ink">
                    {r.type}
                    <div className="mt-1 max-w-[320px] text-[13px] font-normal text-ink-2">{r.examples}</div>
                  </th>
                  {[r.v, r.c, r.r].map((l, idx) => {
                    const { text, chip, Icon } = META[l];
                    return (
                      <td key={idx} className={`px-6 py-5 align-top ${idx === 2 ? "rounded-r-[22px]" : ""}`}>
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12.5px] font-semibold transition-transform duration-500 ease-bounce group-hover:scale-105 ${chip}`}
                        >
                          <Icon size={13} strokeWidth={l === "ok" ? 3 : 2} aria-hidden="true" />
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
        <p className="mt-5 px-2 text-[13.5px] text-ink-3">
          Project di dalam subfolder (misalnya frontend/) perlu deploy manual dengan Root Directory. Depup akan memberi tahu
          langkahnya.
        </p>
      </Reveal>
    </section>
  );
}
