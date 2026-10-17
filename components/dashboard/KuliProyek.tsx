"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * "Kuli Proyek": ilustrasi kuli & mandor kartun yang membangun gedung kecil.
 * Komponen murni: hanya membaca prop `stage`, tidak memanggil API apa pun.
 * Semua visual = SVG inline + CSS keyframes berprefix "kuli-" (lihat app/globals.css).
 *
 * Menyambungkan ke deploy asli nanti cukup mengisi `stage` dari status deploy.
 */

export type KuliStage = "idle" | "cek" | "upload" | "build" | "live" | "gagal";

export const KULI_STAGE_LABEL: Record<KuliStage, string> = {
  idle: "Istirahat dulu",
  cek: "Menggali pondasi",
  upload: "Estafet bata",
  build: "Mengecor tembok",
  live: "Gedung diresmikan",
  gagal: "Proyek mangkrak",
};

const STAGE_DESC: Record<KuliStage, string> = {
  idle: "kuli duduk istirahat sambil minum kopi, menunggu deploy dimulai",
  cek: "kuli menggali pondasi dengan cangkul sementara mandor mengawasi",
  upload: "para kuli mengoper bata secara estafet ke atas",
  build: "kuli mengaduk dan mengecor semen, tembok gedung naik bertahap",
  live: "gedung selesai dengan atap dan bendera, kuli menggunting pita, konfeti berjatuhan",
  gagal: "gedung miring lalu roboh, kuli menggaruk kepala. Proyek mangkrak, cek lognya Bos",
};

type Line = { who: "mandor" | "kuli"; text: string };

const LINES: Record<KuliStage, Line[]> = {
  idle: [
    { who: "kuli", text: "Ngopi dulu, Bos. Proyek belum dimulai." },
    { who: "mandor", text: "Boleh istirahat, tapi jangan kelamaan ya." },
    { who: "kuli", text: "Siap, Bos! Kopinya lagi enak nih." },
  ],
  cek: [
    { who: "mandor", text: "Cek pondasinya dulu, jangan asal gali!" },
    { who: "kuli", text: "Siap, Bos! Cangkulnya sudah diasah." },
    { who: "kuli", text: "Ada batu gede nih, repo-nya padat juga." },
    { who: "mandor", text: "Cepetan, gaji belum cair." },
  ],
  upload: [
    { who: "mandor", text: "Estafet bata! Jangan sampai ada yang jatuh." },
    { who: "kuli", text: "Satu, dua, oper! Siap, Bos!" },
    { who: "kuli", text: "Berat banget, kayak node_modules." },
    { who: "mandor", text: "Yang kenceng, orang di atas sudah nunggu." },
  ],
  build: [
    { who: "mandor", text: "Semennya jangan encer, nanti temboknya ngambek." },
    { who: "kuli", text: "Siap, Bos! Diaduk sampai kalis." },
    { who: "kuli", text: "Temboknya naik pelan-pelan, sabar ya." },
    { who: "mandor", text: "Bagus! Tinggal sedikit lagi, lalu atap." },
  ],
  live: [
    { who: "mandor", text: "Gedung berdiri! Gunting pitanya, Bos!" },
    { who: "kuli", text: "Resmi live! Bendera sudah berkibar." },
    { who: "mandor", text: "Kerja bagus semuanya. Gaji cair besok, janji!" },
    { who: "kuli", text: "Alhamdulillah, tinggal nunggu tamu datang." },
  ],
  gagal: [
    { who: "kuli", text: "Waduh, temboknya miring, Bos..." },
    { who: "mandor", text: "Lho, kok roboh? Takaran semennya salah!" },
    { who: "kuli", text: "Mohon maaf, Bos. Kami garuk kepala dulu." },
    { who: "mandor", text: "Proyek mangkrak, cek lognya Bos." },
  ],
};

/**
 * Pemetaan status deploy asli (DeployModal) ke tahap Kuli Proyek.
 * stepIndex 0-1 (hubungkan GitHub, unduh source) = cek, 2 (install) = upload, 3+ = build.
 */
export function kuliStageFromDeploy(status: "idle" | "deploying" | "success" | "error", stepIndex: number): KuliStage {
  if (status === "success") return "live";
  if (status === "error") return "gagal";
  if (status === "idle") return "idle";
  return stepIndex <= 1 ? "cek" : stepIndex === 2 ? "upload" : "build";
}

/* ---------- hook kecil (dipakai juga oleh KuliProyekDemo) ---------- */

export function usePageVisible(): boolean {
  const [visible, setVisible] = React.useState(true);
  React.useEffect(() => {
    const sync = () => setVisible(!document.hidden);
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);
  return visible;
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/* ---------- gambar ---------- */

const C = {
  skin: "#f2c29b",
  kuliHelm: "#facc15",
  bossHelm: "#f8fafc",
  violet: "#8b5cf6",
  cyan: "#22d3ee",
  pink: "#ec4899",
  pants: "#334155",
  boot: "#1e293b",
  brick: "#d9663a",
  brickLine: "#9a3412",
  wood: "#a16207",
  steel: "#94a3b8",
};

const GY = 189; // garis tanah
const BX = 250; // tepi kiri gedung
const BW = 100; // lebar gedung
const ROW_H = 18;

const sv = (o: Record<string, string | number>) => o as React.CSSProperties;
const dly = (s: number) => sv({ animationDelay: `calc(${s}s * var(--kuli-d, 1))` });

type Mood = "smile" | "worry" | "shout";

function Arm({ cls, boss, children }: { cls: string; boss?: boolean; children?: React.ReactNode }) {
  return (
    <g transform="translate(0 -27)">
      <g className={cn("kuli-arm", cls)}>
        <rect x="-2.2" y="-1" width="4.4" height="12" rx="2.2" fill={boss ? C.cyan : C.violet} />
        <circle cx="0" cy="12" r="2.6" fill={C.skin} />
        {children}
      </g>
    </g>
  );
}

function Person({
  x,
  y,
  boss = false,
  sit = false,
  bob = false,
  mood = "smile",
  children,
}: {
  x: number;
  y: number;
  boss?: boolean;
  sit?: boolean;
  bob?: boolean;
  mood?: Mood;
  children?: React.ReactNode;
}) {
  const helm = boss ? C.bossHelm : C.kuliHelm;
  const helmLine = boss ? "#94a3b8" : "#ca8a04";
  return (
    <g transform={`translate(${x} ${y})`}>
      {!sit && <ellipse cx="0" cy="0.5" rx="10" ry="2.5" fill="#000" opacity="0.18" />}
      <g className={bob ? "kuli-bob" : undefined}>
        {sit ? (
          <>
            <rect x="-6" y="-5" width="15" height="5" rx="2" fill={C.pants} />
            <rect x="4.5" y="0" width="4.5" height="10" rx="1.5" fill={C.pants} />
            <rect x="3.5" y="9" width="7" height="3.5" rx="1.5" fill={C.boot} />
          </>
        ) : (
          <>
            <rect x="-5.5" y="-14" width="4.5" height="11" rx="1.5" fill={C.pants} />
            <rect x="1" y="-14" width="4.5" height="11" rx="1.5" fill={C.pants} />
            <rect x="-6.5" y="-3.5" width="6.5" height="3.5" rx="1.5" fill={C.boot} />
            <rect x="0.5" y="-3.5" width="6.5" height="3.5" rx="1.5" fill={C.boot} />
          </>
        )}
        <g transform={sit ? "translate(0 9)" : undefined}>
          <rect x="-7.5" y="-30" width="15" height="17" rx="4" fill={boss ? C.cyan : C.violet} />
          {boss ? (
            <rect x="-7.5" y="-23" width="15" height="2.6" fill="#f8fafc" opacity="0.85" />
          ) : (
            <rect x="-7.5" y="-16" width="15" height="2.5" fill="#1e293b" opacity="0.35" />
          )}
          <circle cx="0.5" cy="-36" r="6.5" fill={C.skin} />
          <circle cx="2.6" cy="-35" r="0.9" fill="#1e293b" />
          <circle cx="5.2" cy="-35" r="0.9" fill="#1e293b" />
          {mood === "smile" && <path d="M2.4 -32 Q3.9 -30.4 5.4 -32" fill="none" stroke="#7c2d12" strokeWidth="0.9" strokeLinecap="round" />}
          {mood === "worry" && <path d="M2.4 -30.8 Q3.9 -32.4 5.4 -30.8" fill="none" stroke="#7c2d12" strokeWidth="0.9" strokeLinecap="round" />}
          {mood === "shout" && <ellipse cx="3.9" cy="-31.4" rx="1.7" ry="1.9" fill="#7f1d1d" />}
          <path d="M-7.5 -37 A7.5 7.5 0 0 1 7.5 -37 Z" fill={helm} stroke={helmLine} strokeWidth="0.8" />
          <rect x="-1" y="-44.5" width="2" height="7" fill={boss ? C.cyan : "#f59e0b"} />
          <rect x="-8" y="-38.6" width="17" height="2.6" rx="1.2" fill={helm} stroke={helmLine} strokeWidth="0.8" />
          {children}
        </g>
      </g>
    </g>
  );
}

function Walls({ rows, animFrom, pat, windows = false }: { rows: number; animFrom: number; pat: string; windows?: boolean }) {
  return (
    <g>
      {Array.from({ length: rows }, (_, i) => (
        <rect
          key={i}
          className={i >= animFrom ? "kuli-row" : undefined}
          style={i >= animFrom ? dly((i - animFrom) * 0.9) : undefined}
          x={BX}
          y={GY - ROW_H * (i + 1)}
          width={BW}
          height={ROW_H}
          fill={`url(#${pat})`}
        />
      ))}
      {windows &&
        [1, 2, 3].flatMap((r) =>
          [262, 322].map((wx) => (
            <rect key={`${r}-${wx}`} x={wx} y={GY - ROW_H * r - 13} width="14" height="9" rx="1.5" fill="#fde68a" stroke="#92400e" strokeWidth="0.8" />
          )),
        )}
      {windows && <rect x="292" y={GY - 17} width="16" height="17" rx="2" fill="#4c1d95" />}
    </g>
  );
}

const CONFETTI = Array.from({ length: 18 }, (_, i) => ({
  x: 110 + ((i * 53) % 280),
  y: 14 + ((i * 37) % 100),
  c: [C.violet, C.cyan, C.pink, "#facc15"][i % 4],
  d: (i * 0.23) % 2.2,
  dx: ((i % 5) - 2) * 10,
}));

const RUBBLE: [number, number, number][] = [
  [262, 183, 12],
  [281, 185, -20],
  [300, 182, 30],
  [318, 185, -8],
  [337, 183, 24],
  [350, 186, -30],
];

function Scene({ stage, uid }: { stage: KuliStage; uid: string }) {
  const pat = `${uid}-brick`;
  return (
    <g key={stage}>
      {stage === "idle" && (
        <>
          <rect x={BX} y={GY - 72} width={BW} height="72" rx="3" fill="none" stroke={C.cyan} strokeWidth="1.5" strokeDasharray="5 4" opacity="0.55" />
          <rect x="231" y="150" width="4" height="39" fill={C.wood} />
          <rect x="213" y="140" width="40" height="18" rx="3" fill={C.violet} />
          <path d="M221 149 h24 M221 153 h14" stroke="#ede9fe" strokeWidth="1.6" strokeLinecap="round" />
          <rect x="150" y="177" width="30" height="12" rx="2" fill={C.wood} />
          <path d="M150 183 h30" stroke="#713f12" strokeWidth="1" />
          <Person x={165} y={177} sit>
            <Arm cls="kuli-sip">
              <rect x="-3" y="11" width="6" height="7" rx="1.2" fill="#f8fafc" />
              <path className="kuli-steam" d="M0 8 q-2 -3 0 -5 q2 -2 0 -4" fill="none" stroke="#e2e8f0" strokeWidth="1" strokeLinecap="round" />
            </Arm>
          </Person>
          <Person x={70} y={GY} boss>
            <Arm cls="kuli-hold" boss>
              <rect x="-4" y="12" width="9" height="11" rx="1.5" fill="#e2e8f0" stroke="#64748b" strokeWidth="0.8" />
            </Arm>
          </Person>
        </>
      )}

      {stage === "cek" && (
        <>
          <path d="M196 189 q10 -17 28 0 z" fill="#5b4636" />
          <rect className="kuli-pit" x={BX} y={GY} width={BW} height="10" fill="#3b2a20" />
          {[0, 1, 2, 3].map((i) => (
            <circle key={i} className="kuli-dust" cx={252 + i * 9} cy="186" r="5" fill="#cbd5e1" style={dly(i * 0.35)} />
          ))}
          <Person x={242} y={GY} bob>
            <Arm cls="kuli-dig">
              <path d="M0 12 V28 M-8 29 Q0 22 8 29" fill="none" stroke={C.steel} strokeWidth="2.2" strokeLinecap="round" />
            </Arm>
          </Person>
          <Person x={70} y={GY} boss mood="shout">
            <Arm cls="kuli-shout" boss>
              <path d="M-2 13 L2 13 L6 23 L-6 23 Z" fill="#f43f5e" />
            </Arm>
          </Person>
        </>
      )}

      {stage === "upload" && (
        <>
          <rect x="246" y="185" width="108" height="4" fill={C.steel} />
          <Walls rows={1} animFrom={9} pat={pat} />
          <g fill={C.brick} stroke={C.brickLine} strokeWidth="0.6">
            <rect x="80" y="184" width="10" height="5" />
            <rect x="91" y="184" width="10" height="5" />
            <rect x="102" y="184" width="10" height="5" />
            <rect x="85" y="179" width="10" height="5" />
            <rect x="96" y="179" width="10" height="5" />
            <rect x="90" y="174" width="10" height="5" />
          </g>
          <rect x="150" y="177" width="30" height="12" rx="2" fill={C.wood} />
          <g stroke={C.wood} strokeWidth="2.4" strokeLinecap="round">
            <path d="M200 153 V189 M230 153 V189 M200 189 L230 153" />
          </g>
          <rect x="196" y="150" width="38" height="4" rx="1" fill="#ca8a04" />
          <Person x={125} y={GY} bob>
            <Arm cls="kuli-pass" />
          </Person>
          <Person x={165} y={177} bob>
            <Arm cls="kuli-pass" />
          </Person>
          <Person x={215} y={150} bob>
            <Arm cls="kuli-pass" />
          </Person>
          {[
            { x: 134, y: 165, kx: 40, ky: -12, d: 0 },
            { x: 174, y: 153, kx: 41, ky: -24, d: 0.6 },
          ].map((b, i) => (
            <g key={i} transform={`translate(${b.x} ${b.y})`}>
              <rect className="kuli-hop" x="-4" y="-2.5" width="8" height="5" fill={C.brick} stroke={C.brickLine} strokeWidth="0.6" style={sv({ "--kx": b.kx, "--ky": b.ky, animationDelay: `calc(${b.d}s * var(--kuli-d, 1))` })} />
            </g>
          ))}
          <Person x={45} y={GY} boss mood="shout">
            <Arm cls="kuli-shout" boss>
              <path d="M-2 13 L2 13 L6 23 L-6 23 Z" fill="#f43f5e" />
            </Arm>
          </Person>
        </>
      )}

      {stage === "build" && (
        <>
          <Walls rows={4} animFrom={1} pat={pat} />
          <path d="M176 189 L185 168 L194 189" fill="none" stroke="#64748b" strokeWidth="2.4" strokeLinejoin="round" />
          <g transform="translate(185 160)">
            <g className="kuli-spin">
              <circle r="13" fill="#f59e0b" />
              <path d="M-13 0 H13 M0 -13 V13" stroke="#b45309" strokeWidth="2" />
            </g>
            <circle r="3.2" fill="#475569" />
          </g>
          <rect x="150" y="180" width="22" height="9" rx="2" fill="#64748b" />
          <rect x="152" y="180" width="18" height="3" rx="1" fill="#cbd5e1" />
          <Person x={134} y={GY} bob>
            <Arm cls="kuli-stir">
              <path d="M0 12 V30" fill="none" stroke={C.wood} strokeWidth="2.6" strokeLinecap="round" />
            </Arm>
          </Person>
          <Person x={232} y={GY} bob>
            <Arm cls="kuli-pour">
              <path d="M-4 12 H4 L2.6 21 H-2.6 Z" fill={C.steel} stroke="#475569" strokeWidth="0.7" />
              <circle className="kuli-dust" cx="0" cy="25" r="1.8" fill="#cbd5e1" />
            </Arm>
          </Person>
          <Person x={60} y={GY} boss mood="shout">
            <Arm cls="kuli-shout" boss>
              <path d="M-2 13 L2 13 L6 23 L-6 23 Z" fill="#f43f5e" />
            </Arm>
          </Person>
        </>
      )}

      {stage === "live" && (
        <>
          <Walls rows={4} animFrom={9} pat={pat} windows />
          <g className="kuli-roof">
            <polygon points="242,117 300,80 358,117" fill="#7c3aed" />
            <polygon points="250,117 300,87 350,117" fill={C.violet} opacity="0.6" />
          </g>
          <path d="M300 82 V56" stroke="#64748b" strokeWidth="1.6" strokeLinecap="round" />
          <path className="kuli-flag" d="M301 56 h22 l-5 6 5 6 h-22 Z" fill={C.cyan} />
          <path d="M210 160 V189 M248 160 V189" stroke={C.wood} strokeWidth="2.4" strokeLinecap="round" />
          <rect className="kuli-rib-l" x="210" y="166" width="19" height="4" fill={C.pink} />
          <rect className="kuli-rib-r" x="229" y="166" width="19" height="4" fill={C.pink} />
          <Person x={196} y={GY}>
            <Arm cls="kuli-hold">
              <g transform="translate(0 14)">
                <line className="kuli-blade-a" x1="0" y1="0" x2="-3" y2="10" stroke={C.steel} strokeWidth="1.8" strokeLinecap="round" />
                <line className="kuli-blade-b" x1="0" y1="0" x2="3" y2="10" stroke={C.steel} strokeWidth="1.8" strokeLinecap="round" />
              </g>
            </Arm>
          </Person>
          <Person x={150} y={GY} boss>
            <Arm cls="kuli-cheer" boss />
          </Person>
          {CONFETTI.map((p, i) => (
            <g key={i} transform={`translate(${p.x} ${p.y})`}>
              <rect className="kuli-confetti" width="5" height="8" rx="1" fill={p.c} style={sv({ "--kx": p.dx, animationDelay: `calc(${p.d}s * var(--kuli-d, 1))` })} />
            </g>
          ))}
        </>
      )}

      {stage === "gagal" && (
        <>
          <g className="kuli-collapse">
            <Walls rows={4} animFrom={9} pat={pat} windows />
          </g>
          {RUBBLE.map(([rx, ry, rot], i) => (
            <rect key={i} className="kuli-rubble" x={rx} y={ry} width="11" height="5" fill={C.brick} stroke={C.brickLine} strokeWidth="0.6" transform={`rotate(${rot} ${rx} ${ry})`} />
          ))}
          {[0, 1, 2].map((i) => (
            <circle key={i} className="kuli-dust kuli-dust-late" cx={282 + i * 22} cy="178" r="12" fill="#cbd5e1" style={dly(1.4 + i * 0.25)} />
          ))}
          <Person x={205} y={GY} mood="worry">
            <Arm cls="kuli-scratch" />
          </Person>
          <Person x={160} y={GY} boss mood="worry">
            <Arm cls="kuli-scratch" boss />
          </Person>
        </>
      )}
    </g>
  );
}

/* ---------- komponen utama ---------- */

export type KuliProyekProps = {
  stage: KuliStage;
  /** Mode ringkas untuk ruang sempit (tanpa label tahap, dialog lebih kecil). */
  compact?: boolean;
  /** Pengali kecepatan animasi (1 = normal). Opsional, dipakai panel demo. */
  speed?: number;
  className?: string;
};

export function KuliProyek({ stage, compact = false, speed = 1, className }: KuliProyekProps) {
  const uid = React.useId().replace(/:/g, "");
  const reduced = usePrefersReducedMotion();
  const visible = usePageVisible();
  const [tick, setTick] = React.useState(0);

  const lines = LINES[stage];
  const safeSpeed = speed > 0 ? speed : 1;

  React.useEffect(() => {
    setTick(0);
  }, [stage]);

  React.useEffect(() => {
    if (reduced || !visible) return;
    const id = window.setInterval(() => setTick((n) => n + 1), Math.max(900, 2600 / safeSpeed));
    return () => window.clearInterval(id);
  }, [stage, safeSpeed, reduced, visible]);

  const line = lines[tick % lines.length];
  const label = `Ilustrasi kuli proyek, tahap ${KULI_STAGE_LABEL[stage]}: ${STAGE_DESC[stage]}.`;

  return (
    <div className={cn("kuli-root w-full", compact && "mx-auto max-w-[320px]", !visible && "kuli-paused", className)} style={sv({ "--kuli-d": 1 / safeSpeed })}>
      <div className="relative overflow-hidden rounded-2xl border border-[var(--line-strong)]">
        <div role="img" aria-label={label}>
          <svg viewBox="0 0 400 230" className="block h-auto w-full" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMax meet">
            <defs>
              <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" style={{ stopColor: "var(--kuli-sky-a)" }} />
                <stop offset="1" style={{ stopColor: "var(--kuli-sky-b)" }} />
              </linearGradient>
              <linearGradient id={`${uid}-acc`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor={C.violet} />
                <stop offset="1" stopColor={C.cyan} />
              </linearGradient>
              <pattern id={`${uid}-brick`} width="20" height="9" patternUnits="userSpaceOnUse">
                <rect width="20" height="9" fill={C.brick} />
                <path d="M0 0H20M0 4.5H20M10 0V4.5M0 4.5V9" stroke={C.brickLine} strokeWidth="0.8" fill="none" />
              </pattern>
            </defs>
            <rect width="400" height="230" fill={`url(#${uid}-sky)`} />
            <circle cx="52" cy="40" r="15" fill={`url(#${uid}-acc)`} opacity="0.85" />
            {!compact && (
              <g style={{ fill: "var(--kuli-cloud)", opacity: "var(--kuli-cloud-o)" }}>
                <g className="kuli-cloud">
                  <ellipse cx="150" cy="44" rx="26" ry="8" />
                  <ellipse cx="168" cy="38" rx="16" ry="8" />
                </g>
                <g className="kuli-cloud kuli-cloud-b">
                  <ellipse cx="300" cy="62" rx="22" ry="7" />
                  <ellipse cx="314" cy="56" rx="13" ry="7" />
                </g>
              </g>
            )}
            <g style={{ fill: "var(--kuli-far)" }}>
              <rect x="6" y="140" width="22" height="49" />
              <rect x="30" y="118" width="26" height="71" />
              <rect x="362" y="130" width="24" height="59" />
              <rect x="382" y="152" width="18" height="37" />
            </g>
            <rect x="0" y={GY} width="400" height={230 - GY} style={{ fill: "var(--kuli-ground)" }} />
            <rect x="0" y={GY} width="400" height="3" fill={`url(#${uid}-acc)`} />
            <Scene stage={stage} uid={uid} />
          </svg>
        </div>

        {!compact && (
          <span aria-hidden="true" className="pointer-events-none absolute left-2.5 top-2.5 rounded-full border border-[var(--line-strong)] bg-black/35 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
            {KULI_STAGE_LABEL[stage]}
          </span>
        )}
        {stage === "gagal" && (
          <span aria-hidden="true" style={dly(1.8)} className="kuli-pop pointer-events-none absolute inset-x-3 bottom-3 mx-auto w-fit max-w-full rounded-xl border border-red-500/40 bg-red-950/80 px-3 py-1.5 text-center text-[12px] font-semibold text-red-100">
            Proyek mangkrak, cek lognya Bos
          </span>
        )}
        {stage === "live" && (
          <span aria-hidden="true" className="kuli-pop pointer-events-none absolute right-2.5 top-2.5 rounded-full border border-emerald-500/40 bg-emerald-950/70 px-2.5 py-1 text-[11px] font-semibold text-emerald-200">
            Resmi live!
          </span>
        )}
      </div>

      <div aria-live="polite" className={cn("mt-2.5", compact ? "text-[11.5px]" : "text-[13px]")}>
        <p key={`${stage}-${tick % lines.length}`} className="kuli-pop flex items-start gap-2 rounded-2xl border border-[var(--line-strong)] bg-[var(--card-hover)] px-3 py-2 leading-snug text-[var(--text)]">
          <span
            aria-hidden="true"
            className={cn("mt-[3px] h-3 w-3 shrink-0 rounded-full border", line.who === "mandor" ? "border-slate-400 bg-white" : "border-yellow-600 bg-yellow-400")}
          />
          <span>
            <b className="font-semibold">{line.who === "mandor" ? "Mandor" : "Kuli"}:</b> {line.text}
          </span>
        </p>
      </div>
    </div>
  );
}
