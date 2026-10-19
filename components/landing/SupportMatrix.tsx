import { Check, Minus, TriangleAlert } from "@/components/ui/icons";
import { Badge, type BadgeTone } from "@/components/ui/primitives";

type Level = "ok" | "warn" | "no";

const ROWS: { type: string; examples: string; v: Level; c: Level; r: Level }[] = [
  { type: "HTML, CSS, JavaScript biasa", examples: "Cukup ada index.html, tanpa package.json", v: "ok", c: "ok", r: "ok" },
  { type: "Framework JavaScript", examples: "React, Vue, Svelte, Angular, Astro, Next.js, termasuk TypeScript", v: "ok", c: "ok", r: "ok" },
  { type: "Server Node.js", examples: "Express, NestJS, Fastify", v: "warn", c: "no", r: "ok" },
  { type: "Docker dan bahasa lain", examples: "Dockerfile, Python, Go, PHP, Ruby, Java, Rust, .NET", v: "no", c: "no", r: "ok" },
];

const META: Record<Level, { text: string; tone: BadgeTone; Icon: typeof Check }> = {
  ok: { text: "Otomatis", tone: "good", Icon: Check },
  warn: { text: "Dengan catatan", tone: "warn", Icon: TriangleAlert },
  no: { text: "Tidak cocok", tone: "neutral", Icon: Minus },
};

export function SupportMatrix() {
  return (
    <section id="support" className="mx-auto w-full max-w-6xl scroll-mt-24 px-4 pb-16 pt-4 sm:px-8 sm:pb-20">
      <div className="mx-auto mb-12 max-w-3xl text-center">
        <h2 className="lp-h2">Repo kamu cocok di mana?</h2>
        <p className="lp-lead">
          Tiap platform ada batasnya. Depup hanya mengizinkan deploy yang memang bisa berhasil. Kalau tidak cocok, kamu mendapat
          alasan beserta langkah deploy manual.
        </p>
      </div>

      {/* Mobile: kartu bertumpuk (tanpa scroll samping). Tablet ke atas: tabel. */}
      <ul className="flex flex-col gap-3 md:hidden">
        {ROWS.map((r) => (
          <li key={r.type} className="surface-solid p-5">
            <h3 className="text-[15px] font-semibold">{r.type}</h3>
            <p className="mt-1 text-[12.5px] leading-relaxed text-text-muted">{r.examples}</p>
            <dl className="mt-4 flex flex-col gap-2.5">
              {(
                [
                  ["Vercel", r.v],
                  ["Cloudflare Pages", r.c],
                  ["Railway", r.r],
                ] as [string, Level][]
              ).map(([name, l]) => {
                const { text, tone, Icon } = META[l];
                return (
                  <div key={name} className="flex items-center justify-between gap-3">
                    <dt className="text-[13px] font-medium text-text-muted">{name}</dt>
                    <dd>
                      <Badge tone={tone}>
                        <Icon size={13} strokeWidth={l === "ok" ? 3 : 2} aria-hidden="true" />
                        {text}
                      </Badge>
                    </dd>
                  </div>
                );
              })}
            </dl>
          </li>
        ))}
      </ul>

      <div className="surface-solid hidden overflow-x-auto bg-[var(--frame)] md:block">
        <table className="w-full min-w-[640px] text-left text-[14px]">
          <thead>
            <tr className="text-[13px] text-text-muted">
              <th scope="col" className="px-6 py-4 font-medium">Isi repo</th>
              <th scope="col" className="px-6 py-4 font-semibold text-text">Vercel</th>
              <th scope="col" className="px-6 py-4 font-semibold text-text">Cloudflare Pages</th>
              <th scope="col" className="px-6 py-4 font-semibold text-text">Railway</th>
            </tr>
          </thead>
          <tbody className="bg-[var(--surface-solid)]">
            {ROWS.map((r) => (
              <tr key={r.type} className="surface-solid-row border-t border-[var(--surface-line)]">
                <th scope="row" className="px-6 py-5 align-top font-semibold">
                  {r.type}
                  <div className="mt-1 max-w-[320px] text-[12.5px] font-normal text-text-muted">{r.examples}</div>
                </th>
                {[r.v, r.c, r.r].map((l, idx) => {
                  const { text, tone, Icon } = META[l];
                  return (
                    <td key={idx} className="px-6 py-5 align-top">
                      <Badge tone={tone}>
                        <Icon size={13} strokeWidth={l === "ok" ? 3 : 2} aria-hidden="true" />
                        {text}
                      </Badge>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-[13px] text-text-muted">
        Project di dalam subfolder (misalnya frontend/) perlu deploy manual dengan Root Directory. Depup akan memberi tahu
        langkahnya.
      </p>
    </section>
  );
}
