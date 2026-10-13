"use client";

import * as React from "react";

/**
 * Animasi loading "Spider Crawler AI" (versi gugus partikel).
 *
 * Tiap tahap deploy = satu gugus partikel berbentuk awan yang diberi label dan status.
 * Spider bulat (inti berwarna + duri radial pendek) berpindah mengikuti kurva dari
 * gugus ke gugus. Saat tiba, kakinya yang berupa benang putus-putus melengkung
 * menjulur ke partikel/kata target di gugus aktif, menahan sebentar, lalu ditarik
 * dan berganti target. Gugus yang selesai tetap berwarna redup, yang antre abu-abu.
 *
 * Murni canvas 2D, tanpa dependensi. Menghormati prefers-reduced-motion
 * (digambar statis) dan berhenti saat unmount.
 */

const NODE_COUNT = 5;
const H = 280;
const LEG_COUNT = 18;
const SPIKE_COUNT = 28;
const BODY_R = 11;

type Vec = { x: number; y: number };
type Rgb = [number, number, number];

type ClusterDef = {
  name: string;
  total: number;
  rgb: Rgb;
  nx: number;
  ny: number;
  asp: number;
  words: string[];
};

const CLUSTERS: ClusterDef[] = [
  {
    name: "github",
    total: 12,
    rgb: [56, 189, 248],
    nx: 0.15,
    ny: 0.36,
    asp: 1.15,
    words: ["oauth", "repo", "branch", "token", "commit", "webhook"],
  },
  {
    name: "source",
    total: 18,
    rgb: [251, 113, 133],
    nx: 0.31,
    ny: 0.7,
    asp: 1.0,
    words: ["zip", "tarball", "src", "package.json", "lockfile", "public"],
  },
  {
    name: "deps",
    total: 24,
    rgb: [251, 191, 36],
    nx: 0.5,
    ny: 0.34,
    asp: 1.2,
    words: ["next", "react", "tailwind", "npm ci", "types", "eslint"],
  },
  {
    name: "build",
    total: 16,
    rgb: [45, 212, 191],
    nx: 0.69,
    ny: 0.7,
    asp: 1.05,
    words: ["compile", "lint", "optimize", "bundle", "static", "chunks"],
  },
  {
    name: "deploy",
    total: 10,
    rgb: [167, 139, 250],
    nx: 0.85,
    ny: 0.36,
    asp: 1.1,
    words: ["edge", "cdn", "dns", "ssl", "region", "live"],
  },
];

type Pt = { ox: number; oy: number; s: number; tw: number; bright: boolean };
type Cluster = ClusterDef & {
  pts: Pt[];
  act: number; // 0..1 seberapa aktif (dilerp)
  dn: number; // 0..1 seberapa selesai (dilerp)
};
type Dust = { nx: number; ny: number; tw: number };
type Leg = {
  reach: number;
  goal: 0 | 1;
  timer: number;
  ci: number;
  pi: number;
  curv: number;
  tag: string;
  hi: boolean;
};

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ease = (t: number) => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

function angleLerp(a: number, b: number, t: number) {
  let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

export function SpiderCrawler({
  stepIndex,
  className,
}: {
  stepIndex: number;
  className?: string;
}) {
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const stepRef = React.useRef(stepIndex);
  const redrawRef = React.useRef<(() => void) | null>(null);

  React.useEffect(() => {
    stepRef.current = stepIndex;
    redrawRef.current?.();
  }, [stepIndex]);

  React.useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    // Anotasi tipe eksplisit agar tipe non-null terbawa ke semua closure di bawah
    const ctx: CanvasRenderingContext2D = context;

    const reduced =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    let w = 300;
    let raf = 0;
    let last = 0;
    let time = 0;
    let activeTime = 0;

    // ---------- data (deterministik, tidak berubah tiap render) ----------
    const rnd = mulberry32(20260613);
    const clusters: Cluster[] = CLUSTERS.map((def) => {
      const pts: Pt[] = [];
      for (let i = 0; i < 190; i++) {
        pts.push({
          ox: (rnd() + rnd() + rnd() - 1.5) * 0.75,
          oy: (rnd() + rnd() + rnd() - 1.5) * 0.75,
          s: 0.8 + rnd() * 0.9,
          tw: rnd() * Math.PI * 2,
          bright: rnd() < 0.09,
        });
      }
      return { ...def, pts, act: 0, dn: 0 };
    });
    const dust: Dust[] = [];
    for (let i = 0; i < 130; i++) {
      dust.push({ nx: rnd(), ny: rnd(), tw: rnd() * Math.PI * 2 });
    }

    const legs: Leg[] = [];
    for (let i = 0; i < LEG_COUNT; i++) {
      legs.push({
        reach: 0,
        goal: 0,
        timer: rnd() * 0.9,
        ci: 0,
        pi: 0,
        curv: (rnd() < 0.5 ? -1 : 1) * (0.12 + rnd() * 0.25),
        tag: "",
        hi: false,
      });
    }

    const legIndex = (L: Leg) => legs.indexOf(L);

    const sp = {
      p: { x: 0, y: 0 } as Vec,
      theta: 0,
      core: [...CLUSTERS[0].rgb] as Rgb,
    };
    const mv = { fx: 0, fy: 0, to: 0, u: 1, init: false };
    const trail: Vec[] = [];

    // ---------- geometri ----------
    const radius = () => Math.min(w * 0.105, H * 0.23);
    const center = (ci: number): Vec => ({
      x: CLUSTERS[ci].nx * w,
      y: CLUSTERS[ci].ny * H,
    });
    const activeIdx = () => Math.min(Math.max(stepRef.current, 0), NODE_COUNT - 1);

    const ptPos = (ci: number, pi: number): Vec => {
      const c = clusters[ci];
      const p = c.pts[pi];
      const R = radius();
      const cc = center(ci);
      return {
        x: cc.x + p.ox * R * c.asp + Math.sin(time * 0.4 + p.tw) * 1.2,
        y: cc.y + p.oy * R + Math.cos(time * 0.35 + p.tw) * 1.2,
      };
    };

    const spiderTarget = (ci: number): Vec => {
      const cc = center(ci);
      const R = radius();
      return {
        x: cc.x + Math.cos(time * 0.7) * R * 0.22,
        y: cc.y + Math.sin(time * 0.9) * R * 0.22,
      };
    };

    const spiderPos = (): Vec => {
      const B = spiderTarget(mv.to);
      if (mv.u >= 1) return B;
      const A = { x: mv.fx, y: mv.fy };
      const dx = B.x - A.x;
      const dy = B.y - A.y;
      const dist = Math.hypot(dx, dy) || 1;
      const side = mv.to % 2 === 0 ? 1 : -1;
      const C = {
        x: (A.x + B.x) / 2 + (-dy / dist) * dist * 0.28 * side,
        y: (A.y + B.y) / 2 + (dx / dist) * dist * 0.28 * side,
      };
      const t = ease(mv.u);
      const mt = 1 - t;
      return {
        x: mt * mt * A.x + 2 * mt * t * C.x + t * t * B.x,
        y: mt * mt * A.y + 2 * mt * t * C.y + t * t * B.y,
      };
    };

    const pickTarget = (L: Leg) => {
      const ci = activeIdx();
      const c = clusters[ci];
      // ambil kandidat terjauh dari spider supaya kaki menjangkau panjang
      let pi = 0;
      let best = -1;
      for (let k = 0; k < 5; k++) {
        const cand = Math.floor(Math.random() * c.pts.length);
        const q = ptPos(ci, cand);
        const d = Math.hypot(q.x - sp.p.x, q.y - sp.p.y) + (c.pts[cand].bright ? 18 : 0);
        if (d > best) {
          best = d;
          pi = cand;
        }
      }
      L.ci = ci;
      L.pi = pi;
      // tag hanya pada sebagian kaki agar tidak saling tumpuk
      const showTag = legIndex(L) % 3 === 0 && Math.random() < 0.8;
      L.tag = showTag ? c.words[Math.floor(Math.random() * c.words.length)] : "";
      L.hi = L.tag !== "" && Math.random() < 0.25;
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = Math.max(wrap.clientWidth, 200);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!mv.init) {
        const a = activeIdx();
        const s = spiderTarget(a);
        sp.p = s;
        mv.to = a;
        mv.u = 1;
        mv.init = true;
      }
      if (reduced) snap();
    };

    // ---------- update ----------
    const update = (dt: number) => {
      time += dt;
      activeTime += dt;
      const a = activeIdx();
      const step = stepRef.current;

      // pindah gugus saat tahap berganti
      if (a !== mv.to) {
        mv.fx = sp.p.x;
        mv.fy = sp.p.y;
        mv.to = a;
        mv.u = 0;
        activeTime = 0;
        for (const L of legs) {
          L.goal = 0;
          L.timer = Math.random() * 0.3;
        }
      }
      if (mv.u < 1) mv.u = Math.min(1, mv.u + dt / 1.5);

      // state tiap gugus
      const k = Math.min(1, dt * 4);
      clusters.forEach((c, i) => {
        c.act += ((i === a && step < NODE_COUNT ? 1 : 0) - c.act) * k;
        c.dn += ((step > i ? 1 : 0) - c.dn) * k;
      });

      // posisi + arah spider
      const np = spiderPos();
      const vx = np.x - sp.p.x;
      const vy = np.y - sp.p.y;
      if (dt > 0 && Math.hypot(vx, vy) / dt > 8) {
        sp.theta = angleLerp(sp.theta, Math.atan2(vy, vx), 0.1);
      }
      sp.p = np;

      // jejak benang saat berpindah
      if (mv.u < 1) {
        trail.push({ x: np.x, y: np.y });
        if (trail.length > 70) trail.shift();
      } else if (trail.length) {
        trail.shift();
      }

      // warna inti mengikuti gugus aktif
      const tr = CLUSTERS[a].rgb;
      for (let i = 0; i < 3; i++) sp.core[i] = lerp(sp.core[i], tr[i], Math.min(1, dt * 3));

      // kaki
      for (const L of legs) {
        const speed = L.goal === 1 ? 2.2 : 3.5;
        const diff = L.goal - L.reach;
        L.reach += Math.max(-dt * speed, Math.min(dt * speed, diff));
        L.timer -= dt;
        if (L.goal === 1 && L.timer <= 0) {
          L.goal = 0;
          L.timer = 0.2 + Math.random() * 0.4;
        } else if (L.goal === 0 && L.timer <= 0 && L.reach <= 0.02) {
          pickTarget(L);
          L.goal = 1;
          L.timer = 1.0 + Math.random() * 1.6;
        }
      }
    };

    // ---------- gambar ----------
    const rgba = (c: Rgb, a: number) =>
      `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${a})`;

    const drawBackground = () => {
      // debu latar
      ctx.fillStyle = "rgba(200,205,225,0.16)";
      for (const d of dust) {
        const a = 0.6 + 0.4 * Math.sin(time * 0.8 + d.tw);
        ctx.globalAlpha = a;
        ctx.fillRect(d.nx * w, d.ny * H, 1, 1);
      }
      ctx.globalAlpha = 1;

      // HUD kecil
      ctx.font = `500 8px ${MONO}`;
      ctx.textBaseline = "alphabetic";
      ctx.textAlign = "left";
      ctx.fillStyle = "rgba(255,255,255,0.28)";
      ctx.fillText("SPIDER · CRAWL", 6, 12);
      ctx.textAlign = "right";
      ctx.fillText(`TAHAP ${Math.min(stepRef.current + 1, NODE_COUNT)}/${NODE_COUNT}`, w - 6, 12);
      ctx.textAlign = "left";
    };

    const drawClusters = () => {
      const R = radius();
      const a = activeIdx();
      clusters.forEach((c, i) => {
        const cc = center(i);
        const tint = Math.max(c.act, c.dn * 0.55);
        const base: Rgb = [200, 205, 220];
        const col: Rgb = [
          lerp(base[0], c.rgb[0], tint),
          lerp(base[1], c.rgb[1], tint),
          lerp(base[2], c.rgb[2], tint),
        ];

        // kabut lembut
        const glow = 0.07 + 0.2 * c.act + 0.06 * c.dn;
        ctx.save();
        ctx.translate(cc.x, cc.y);
        ctx.scale(c.asp, 1);
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 1.5);
        g.addColorStop(0, rgba(col, glow));
        g.addColorStop(1, rgba(col, 0));
        ctx.fillStyle = g;
        ctx.fillRect(-R * 1.6, -R * 1.6, R * 3.2, R * 3.2);
        ctx.restore();

        // cincin pindai pada gugus aktif
        if (c.act > 0.05 && i === a) {
          const ph = (time * 0.5) % 1;
          ctx.strokeStyle = rgba(c.rgb, 0.22 * c.act * (1 - ph));
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.ellipse(cc.x, cc.y, R * c.asp * (0.6 + ph * 0.8), R * (0.6 + ph * 0.8), 0, 0, Math.PI * 2);
          ctx.stroke();
        }

        // partikel
        const alpha = 0.3 + 0.5 * c.act + 0.2 * c.dn;
        ctx.fillStyle = rgba(col, alpha);
        for (const p of c.pts) {
          if (p.bright) continue;
          const x = cc.x + p.ox * R * c.asp + Math.sin(time * 0.4 + p.tw) * 1.2;
          const y = cc.y + p.oy * R + Math.cos(time * 0.35 + p.tw) * 1.2;
          ctx.fillRect(x, y, p.s, p.s);
        }
        ctx.fillStyle = rgba([255, 255, 255], 1);
        for (const p of c.pts) {
          if (!p.bright) continue;
          const x = cc.x + p.ox * R * c.asp + Math.sin(time * 0.4 + p.tw) * 1.2;
          const y = cc.y + p.oy * R + Math.cos(time * 0.35 + p.tw) * 1.2;
          ctx.globalAlpha = clamp01((alpha + 0.25) * (0.75 + 0.25 * Math.sin(time * 1.6 + p.tw * 6)));
          ctx.fillRect(x - 0.4, y - 0.4, 1.8, 1.8);
        }
        ctx.globalAlpha = 1;

        // label + status
        const step = stepRef.current;
        const done = step > i;
        const running = step === i;
        const prog = running ? 0.94 * (1 - Math.exp(-activeTime / 5)) : 0;
        const n = done ? c.total : Math.floor(c.total * prog);
        const status = done ? "selesai" : running ? "berjalan" : "antre";
        const lx = Math.max(6, Math.min(w - 96, cc.x - R * c.asp * 0.85));
        const ly = cc.y - R * 1.15;
        ctx.textAlign = "left";
        ctx.font = `600 10px ${MONO}`;
        ctx.fillStyle = `rgba(255,255,255,${0.5 + 0.45 * c.act})`;
        ctx.fillText(c.name + (done ? " ✓" : ""), lx, ly);
        ctx.font = `400 7.5px ${MONO}`;
        ctx.fillStyle = `rgba(200,205,220,${0.35 + 0.3 * c.act})`;
        ctx.fillText(`${n}/${c.total} node · ${status}`, lx, ly + 10);
      });
    };

    const drawTrail = () => {
      if (trail.length < 2) return;
      for (let i = 0; i < trail.length; i++) {
        const t = i / trail.length;
        ctx.fillStyle = rgba([235, 240, 255], t * 0.8);
        ctx.beginPath();
        ctx.arc(trail[i].x, trail[i].y, 0.9, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const drawLegs = () => {
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (const L of legs) {
        if (L.reach < 0.02) continue;
        const T = ptPos(L.ci, L.pi);
        const dx = T.x - sp.p.x;
        const dy = T.y - sp.p.y;
        const dist = Math.hypot(dx, dy) || 1;
        const cx = (sp.p.x + T.x) / 2 + (-dy / dist) * dist * L.curv;
        const cy = (sp.p.y + T.y) / 2 + (dx / dist) * dist * L.curv;
        const sdx = cx - sp.p.x;
        const sdy = cy - sp.p.y;
        const sl = Math.hypot(sdx, sdy) || 1;
        const sx = sp.p.x + (sdx / sl) * BODY_R;
        const sy = sp.p.y + (sdy / sl) * BODY_R;
        const e = ease(clamp01(L.reach));
        const steps = Math.max(6, Math.round(dist / 6));

        ctx.globalAlpha = 0.35 + 0.6 * L.reach;
        ctx.strokeStyle = "rgba(235,240,255,0.95)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([0.1, 4.2]);
        ctx.lineDashOffset = -time * 18;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        let ex = sx;
        let ey = sy;
        for (let i = 1; i <= steps; i++) {
          const t = (e * i) / steps;
          const mt = 1 - t;
          ex = mt * mt * sx + 2 * mt * t * cx + t * t * T.x;
          ey = mt * mt * sy + 2 * mt * t * cy + t * t * T.y;
          ctx.lineTo(ex, ey);
        }
        ctx.stroke();
        ctx.setLineDash([]);

        // ujung kaki
        if (L.reach > 0.5) {
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(ex, ey, 1.7, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;

        // tag kata target
        if (L.tag && L.reach > 0.92) {
          ctx.font = `500 8px ${MONO}`;
          const tw = ctx.measureText(L.tag).width;
          const bx = Math.min(w - tw - 10, Math.max(2, ex + 5));
          const by = ey - 11;
          if (L.hi) {
            ctx.fillStyle = rgba(sp.core, 0.92);
            ctx.fillRect(bx, by, tw + 8, 11);
            ctx.fillStyle = "#1a0b10";
          } else {
            ctx.fillStyle = "rgba(10,12,20,0.7)";
            ctx.fillRect(bx, by, tw + 8, 11);
            ctx.strokeStyle = "rgba(255,255,255,0.3)";
            ctx.lineWidth = 0.8;
            ctx.strokeRect(bx + 0.4, by + 0.4, tw + 7.2, 10.2);
            ctx.fillStyle = "rgba(235,240,255,0.9)";
          }
          ctx.textAlign = "left";
          ctx.fillText(L.tag, bx + 4, by + 8);
        }
      }
      ctx.globalAlpha = 1;
    };

    const drawSpider = () => {
      const { x, y } = sp.p;

      // glow
      const gl = ctx.createRadialGradient(x, y, 2, x, y, 30);
      gl.addColorStop(0, rgba(sp.core, 0.32));
      gl.addColorStop(1, rgba(sp.core, 0));
      ctx.fillStyle = gl;
      ctx.beginPath();
      ctx.arc(x, y, 30, 0, Math.PI * 2);
      ctx.fill();

      // duri radial pendek
      ctx.lineCap = "round";
      ctx.lineWidth = 0.8;
      ctx.strokeStyle = "rgba(94,234,212,0.55)";
      for (let k = 0; k < SPIKE_COUNT; k++) {
        const ang = (k / SPIKE_COUNT) * Math.PI * 2 + 0.08 * Math.sin(time * 1.3 + k);
        const len = 9 + 8 * (0.5 + 0.5 * Math.sin(time * 2.1 + k * 1.7));
        const c = Math.cos(ang);
        const s = Math.sin(ang);
        ctx.beginPath();
        ctx.moveTo(x + c * (BODY_R + 0.5), y + s * (BODY_R + 0.5));
        ctx.lineTo(x + c * (BODY_R + len), y + s * (BODY_R + len));
        ctx.stroke();
      }

      // badan
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(sp.theta);
      ctx.fillStyle = "#0b1620";
      ctx.strokeStyle = "rgba(94,234,212,0.9)";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(0, 0, BODY_R + 0.8, BODY_R - 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,0.14)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, 5.8, 0, Math.PI * 2);
      ctx.stroke();

      // inti berdenyut (belah ketupat)
      const pulse = 0.5 + 0.5 * Math.sin(time * 3.2);
      ctx.rotate(-sp.theta + Math.PI / 4);
      ctx.shadowColor = rgba(sp.core, 1);
      ctx.shadowBlur = 8 + pulse * 4;
      ctx.fillStyle = rgba(sp.core, 1);
      const r = 2.3 + pulse * 0.5;
      ctx.fillRect(-r, -r, r * 2, r * 2);
      ctx.shadowBlur = 0;
      ctx.restore();
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, H);
      drawBackground();
      drawClusters();
      drawTrail();
      drawLegs();
      drawSpider();
    };

    // posisi statis (prefers-reduced-motion)
    const snap = () => {
      const a = activeIdx();
      const step = stepRef.current;
      mv.to = a;
      mv.u = 1;
      sp.p = spiderTarget(a);
      sp.core = [...CLUSTERS[a].rgb] as Rgb;
      trail.length = 0;
      clusters.forEach((c, i) => {
        c.act = i === a && step < NODE_COUNT ? 1 : 0;
        c.dn = step > i ? 1 : 0;
      });
      activeTime = 8;
      for (const L of legs) {
        pickTarget(L);
        L.reach = 1;
        L.goal = 1;
      }
      draw();
    };

    const frame = (ts: number) => {
      const dt = Math.min((ts - (last || ts)) / 1000, 0.05);
      last = ts;
      update(dt);
      draw();
      raf = requestAnimationFrame(frame);
    };

    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    resize();

    if (reduced) {
      redrawRef.current = snap;
    } else {
      raf = requestAnimationFrame(frame);
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      redrawRef.current = null;
    };
  }, []);

  return (
    <div ref={wrapRef} className={className} aria-hidden="true">
      <canvas ref={canvasRef} className="mx-auto block" />
    </div>
  );
}