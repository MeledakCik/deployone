"use client";

import * as React from "react";

/**
 * Animasi loading "Spider Crawler AI" (versi gugus partikel, responsif).
 *
 * Tiap tahap deploy = satu gugus partikel berbentuk awan yang diberi label, status
 * dan cincin progres. Gugus dihubungkan jalur pipeline yang menyala saat spider
 * melewatinya. Spider bulat (inti berwarna, cincin putus-putus, satelit orbit)
 * berpindah mengikuti kurva dari gugus ke gugus; saat tiba muncul gelombang kejut
 * dan kamera "menghentak". Kakinya berupa benang putus-putus melengkung yang
 * menjulur ke partikel/kata target, dialiri paket cahaya kembali ke badan.
 *
 * Responsif: tinggi kanvas dan semua ukuran (font, badan, kaki, partikel) mengikuti
 * lebar kontainer. Layar sempit (< 500px) memakai tata letak ular vertikal.
 *
 * Murni canvas 2D, tanpa dependensi. Menghormati prefers-reduced-motion
 * (digambar statis) dan berhenti saat unmount.
 */

const NODE_COUNT = 5;
const LEG_COUNT = 20;
const SPIKE_COUNT = 36;
const NARROW_BP = 500;
const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

type Vec = { x: number; y: number };
type Rgb = [number, number, number];

type ClusterDef = {
  name: string;
  total: number;
  rgb: Rgb;
  wide: [number, number];
  narrow: [number, number];
  asp: number;
  words: string[];
};

const CLUSTERS: ClusterDef[] = [
  {
    name: "github",
    total: 12,
    rgb: [56, 189, 248],
    wide: [0.15, 0.36],
    narrow: [0.3, 0.22],
    asp: 1.15,
    words: ["oauth", "repo", "branch", "token", "commit", "webhook"],
  },
  {
    name: "source",
    total: 18,
    rgb: [251, 113, 133],
    wide: [0.31, 0.7],
    narrow: [0.7, 0.37],
    asp: 1.0,
    words: ["zip", "tarball", "src", "package.json", "lockfile", "public"],
  },
  {
    name: "deps",
    total: 24,
    rgb: [251, 191, 36],
    wide: [0.5, 0.34],
    narrow: [0.3, 0.53],
    asp: 1.2,
    words: ["next", "react", "tailwind", "npm ci", "types", "eslint"],
  },
  {
    name: "build",
    total: 16,
    rgb: [45, 212, 191],
    wide: [0.69, 0.7],
    narrow: [0.7, 0.69],
    asp: 1.05,
    words: ["compile", "lint", "optimize", "bundle", "static", "chunks"],
  },
  {
    name: "deploy",
    total: 10,
    rgb: [167, 139, 250],
    wide: [0.85, 0.36],
    narrow: [0.42, 0.84],
    asp: 1.1,
    words: ["edge", "cdn", "dns", "ssl", "region", "live"],
  },
];

type Pt = { ox: number; oy: number; s: number; tw: number; bright: boolean };
type Cluster = ClusterDef & {
  pts: Pt[];
  act: number; // 0..1 seberapa aktif (dilerp)
  dn: number; // 0..1 seberapa selesai (dilerp)
  co: number; // cos/sin rotasi orbit gugus (diperbarui tiap frame)
  si: number;
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
type Ring = { x: number; y: number; t: number; dur: number; max: number; rgb: Rgb };

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
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const clamp01 = (v: number) => clamp(v, 0, 1);
const rgba = (c: Rgb, a: number) =>
  `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${a})`;

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

    // ---------- ukuran responsif (diperbarui di resize) ----------
    let w = 320;
    let H = 340;
    let k = 1; // faktor skala semua ukuran
    let narrow = false;
    let ptLimit = 190;

    let raf = 0;
    let last = 0;
    let time = 0;
    let activeTime = 0;
    let lastStep = stepRef.current;

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
      return { ...def, pts, act: 0, dn: 0, co: 1, si: 0 };
    });
    const dust: Dust[] = [];
    for (let i = 0; i < 150; i++) {
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

    const sp = {
      p: { x: 0, y: 0 } as Vec,
      theta: 0,
      core: [...CLUSTERS[0].rgb] as Rgb,
    };
    const mv = { fx: 0, fy: 0, to: 0, u: 1, init: false };
    const cam = { x: 0, y: 0, z: 1.03, kick: 0 };
    const trail: Vec[] = [];
    const rings: Ring[] = [];
    const tmp: Vec = { x: 0, y: 0 };

    // ---------- geometri ----------
    const radius = () =>
      narrow ? Math.min(w * 0.2, H * 0.12) : Math.min(w * 0.12, H * 0.27);
    const center = (ci: number): Vec => {
      const pos = narrow ? CLUSTERS[ci].narrow : CLUSTERS[ci].wide;
      return { x: pos[0] * w, y: pos[1] * H };
    };
    const activeIdx = () => Math.min(Math.max(stepRef.current, 0), NODE_COUNT - 1);

    // posisi partikel: orbit pelan + tertarik ke spider pada gugus aktif
    const calcPt = (ci: number, p: Pt, out: Vec) => {
      const c = clusters[ci];
      const R = radius();
      const cc = center(ci);
      const rx = p.ox * c.co - p.oy * c.si;
      const ry = p.ox * c.si + p.oy * c.co;
      let x = cc.x + rx * R * c.asp + Math.sin(time * 0.4 + p.tw) * 1.4 * k;
      let y = cc.y + ry * R + Math.cos(time * 0.35 + p.tw) * 1.4 * k;
      if (c.act > 0.02) {
        const dx = sp.p.x - x;
        const dy = sp.p.y - y;
        const d = Math.hypot(dx, dy);
        const rr = R * 1.1;
        if (d < rr && d > 0.001) {
          const f = 0.12 * c.act * (1 - d / rr);
          x += dx * f;
          y += dy * f;
        }
      }
      out.x = x;
      out.y = y;
    };
    const ptPos = (ci: number, pi: number): Vec => {
      const o: Vec = { x: 0, y: 0 };
      calcPt(ci, clusters[ci].pts[pi], o);
      return o;
    };

    const spiderTarget = (ci: number): Vec => {
      const cc = center(ci);
      const R = radius();
      return {
        x: cc.x + Math.cos(time * 0.7) * R * 0.22,
        y: cc.y + Math.sin(time * 0.9) * R * 0.22,
      };
    };

    // kontrol kurva perpindahan A -> B (dipakai spider dan jalur pipeline)
    const ctrl = (A: Vec, B: Vec, side: number): Vec => {
      const dx = B.x - A.x;
      const dy = B.y - A.y;
      const dist = Math.hypot(dx, dy) || 1;
      return {
        x: (A.x + B.x) / 2 + (-dy / dist) * dist * 0.28 * side,
        y: (A.y + B.y) / 2 + (dx / dist) * dist * 0.28 * side,
      };
    };

    const spiderPos = (): Vec => {
      const B = spiderTarget(mv.to);
      if (mv.u >= 1) return B;
      const A = { x: mv.fx, y: mv.fy };
      const C = ctrl(A, B, mv.to % 2 === 0 ? 1 : -1);
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
      for (let n = 0; n < 5; n++) {
        const cand = Math.floor(Math.random() * ptLimit);
        const q = ptPos(ci, cand);
        const d =
          Math.hypot(q.x - sp.p.x, q.y - sp.p.y) + (c.pts[cand].bright ? 18 * k : 0);
        if (d > best) {
          best = d;
          pi = cand;
        }
      }
      L.ci = ci;
      L.pi = pi;
      // tag hanya pada sebagian kaki agar tidak saling tumpuk
      const showTag = legs.indexOf(L) % 3 === 0 && Math.random() < 0.8;
      L.tag = showTag ? c.words[Math.floor(Math.random() * c.words.length)] : "";
      L.hi = L.tag !== "" && Math.random() < 0.25;
    };

    const progOf = (i: number) => {
      const step = stepRef.current;
      if (step > i) return 1;
      if (step === i) return 0.94 * (1 - Math.exp(-activeTime / 5));
      return 0;
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = Math.max(wrap.clientWidth, 220);
      narrow = w < NARROW_BP;
      k = clamp(w / 560, 0.78, 1.5);
      H = Math.round(
        narrow ? clamp(w * 1.35, 370, 500) : clamp(w * 0.56, 280, 420),
      );
      ptLimit = narrow ? 130 : 190;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!mv.init) {
        const a = activeIdx();
        sp.p = spiderTarget(a);
        mv.to = a;
        mv.u = 1;
        mv.init = true;
      } else if (mv.u >= 1) {
        sp.p = spiderTarget(mv.to);
      }
      trail.length = 0;
      if (reduced) snap();
    };

    // ---------- update ----------
    const update = (dt: number) => {
      time += dt;
      activeTime += dt;
      const step = stepRef.current;
      const R = radius();

      // tahap berganti: gelombang hijau di gugus yang baru selesai + hentakan kamera
      if (step !== lastStep) {
        if (step > lastStep && lastStep >= 0 && lastStep < NODE_COUNT) {
          const cc = center(lastStep);
          rings.push({ x: cc.x, y: cc.y, t: 0, dur: 1.1, max: R * 1.7, rgb: [52, 211, 153] });
        }
        lastStep = step;
        cam.kick = 1;
      }

      const a = activeIdx();
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
      const prevU = mv.u;
      if (mv.u < 1) mv.u = Math.min(1, mv.u + dt / 1.5);
      if (prevU < 1 && mv.u >= 1) {
        rings.push({ x: sp.p.x, y: sp.p.y, t: 0, dur: 0.9, max: R * 1.4, rgb: CLUSTERS[a].rgb });
        cam.kick = Math.max(cam.kick, 0.7);
      }

      // state + orbit tiap gugus
      const kk = Math.min(1, dt * 4);
      clusters.forEach((c, i) => {
        c.act += ((i === a && step < NODE_COUNT ? 1 : 0) - c.act) * kk;
        c.dn += ((step > i ? 1 : 0) - c.dn) * kk;
        const ang = time * 0.06 * (i % 2 ? 1 : -1);
        c.co = Math.cos(ang);
        c.si = Math.sin(ang);
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
        if (trail.length > 80) trail.shift();
      } else if (trail.length) {
        trail.shift();
      }

      // warna inti mengikuti gugus aktif
      const tr = CLUSTERS[a].rgb;
      for (let i = 0; i < 3; i++) sp.core[i] = lerp(sp.core[i], tr[i], Math.min(1, dt * 3));

      // kamera: mengikuti spider sedikit + hentakan zoom
      const kc = Math.min(1, dt * 2.5);
      cam.x += ((w / 2 - sp.p.x) * 0.07 - cam.x) * kc;
      cam.y += ((H / 2 - sp.p.y) * 0.07 - cam.y) * kc;
      cam.kick = Math.max(0, cam.kick - dt * 1.4);
      const travel = mv.u < 1 ? Math.sin(mv.u * Math.PI) : 0;
      cam.z = 1.03 + 0.05 * ease(cam.kick) - 0.025 * travel;

      // gelombang kejut
      for (let i = rings.length - 1; i >= 0; i--) {
        rings[i].t += dt / rings[i].dur;
        if (rings[i].t >= 1) rings.splice(i, 1);
      }

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
    const drawDust = () => {
      ctx.fillStyle = "rgba(200,205,225,0.18)";
      const sz = Math.max(1, k);
      for (const d of dust) {
        ctx.globalAlpha = 0.6 + 0.4 * Math.sin(time * 0.8 + d.tw);
        ctx.fillRect(d.nx * w, d.ny * H, sz, sz);
      }
      ctx.globalAlpha = 1;
    };

    const quadTo = (A: Vec, C: Vec, B: Vec, tmax: number, steps: number) => {
      ctx.moveTo(A.x, A.y);
      for (let i = 1; i <= steps; i++) {
        const t = (tmax * i) / steps;
        const mt = 1 - t;
        ctx.lineTo(
          mt * mt * A.x + 2 * mt * t * C.x + t * t * B.x,
          mt * mt * A.y + 2 * mt * t * C.y + t * t * B.y,
        );
      }
    };

    // jalur pipeline antar gugus; menyala sesuai progres spider
    const drawRoutes = () => {
      const step = stepRef.current;
      ctx.lineCap = "round";
      for (let i = 0; i < NODE_COUNT - 1; i++) {
        const A = center(i);
        const B = center(i + 1);
        const C = ctrl(A, B, (i + 1) % 2 === 0 ? 1 : -1);

        ctx.setLineDash([2 * k, 7 * k]);
        ctx.lineWidth = 1;
        ctx.strokeStyle = "rgba(255,255,255,0.08)";
        ctx.beginPath();
        quadTo(A, C, B, 1, 24);
        ctx.stroke();

        const prog = step > i + 1 ? 1 : step === i + 1 ? ease(mv.u) : 0;
        if (prog > 0.001) {
          const g = ctx.createLinearGradient(A.x, A.y, B.x, B.y);
          g.addColorStop(0, rgba(CLUSTERS[i].rgb, 0.7));
          g.addColorStop(1, rgba(CLUSTERS[i + 1].rgb, 0.7));
          ctx.globalCompositeOperation = "lighter";
          ctx.strokeStyle = g;
          ctx.lineWidth = 1.7 * k;
          ctx.setLineDash([0.1, 5 * k]);
          ctx.lineDashOffset = -time * 22;
          ctx.beginPath();
          quadTo(A, C, B, prog, 28);
          ctx.stroke();
          ctx.globalCompositeOperation = "source-over";
        }
      }
      ctx.setLineDash([]);
      ctx.lineDashOffset = 0;
    };

    const drawClusters = () => {
      const R = radius();
      const a = activeIdx();
      const step = stepRef.current;
      clusters.forEach((c, i) => {
        const cc = center(i);
        const tint = Math.max(c.act, c.dn * 0.55);
        const base: Rgb = [200, 205, 220];
        const col: Rgb = [
          lerp(base[0], c.rgb[0], tint),
          lerp(base[1], c.rgb[1], tint),
          lerp(base[2], c.rgb[2], tint),
        ];

        // kabut lembut (aditif supaya terasa berpendar)
        const glow = 0.08 + 0.22 * c.act + 0.07 * c.dn;
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.translate(cc.x, cc.y);
        ctx.scale(c.asp, 1);
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 1.5);
        g.addColorStop(0, rgba(col, glow));
        g.addColorStop(1, rgba(col, 0));
        ctx.fillStyle = g;
        ctx.fillRect(-R * 1.6, -R * 1.6, R * 3.2, R * 3.2);
        ctx.restore();

        // cincin progres + cincin pindai pada gugus aktif
        const pr = progOf(i);
        if (c.act > 0.03 || c.dn > 0.03) {
          const vis = Math.max(c.act, c.dn * 0.45);
          ctx.lineWidth = 1.4 * k;
          ctx.strokeStyle = rgba(c.rgb, 0.1 * vis);
          ctx.beginPath();
          ctx.ellipse(cc.x, cc.y, R * c.asp * 1.02, R * 1.02, -Math.PI / 2, 0, Math.PI * 2);
          ctx.stroke();
          ctx.strokeStyle = rgba(c.rgb, 0.75 * vis);
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.ellipse(cc.x, cc.y, R * c.asp * 1.02, R * 1.02, -Math.PI / 2, 0, Math.PI * 2 * pr);
          ctx.stroke();
        }
        if (c.act > 0.05 && i === a) {
          const ph = (time * 0.5) % 1;
          ctx.strokeStyle = rgba(c.rgb, 0.22 * c.act * (1 - ph));
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.ellipse(cc.x, cc.y, R * c.asp * (0.6 + ph * 0.8), R * (0.6 + ph * 0.8), 0, 0, Math.PI * 2);
          ctx.stroke();
        }

        // partikel
        const alpha = 0.32 + 0.5 * c.act + 0.2 * c.dn;
        const ps = Math.min(k, 1.35);
        ctx.fillStyle = rgba(col, alpha);
        for (let n = 0; n < ptLimit; n++) {
          const p = c.pts[n];
          if (p.bright) continue;
          calcPt(i, p, tmp);
          ctx.fillRect(tmp.x, tmp.y, p.s * ps, p.s * ps);
        }
        ctx.fillStyle = "#ffffff";
        for (let n = 0; n < ptLimit; n++) {
          const p = c.pts[n];
          if (!p.bright) continue;
          calcPt(i, p, tmp);
          ctx.globalAlpha = clamp01(
            (alpha + 0.25) * (0.75 + 0.25 * Math.sin(time * 1.6 + p.tw * 6)),
          );
          const s2 = 1.9 * ps;
          ctx.fillRect(tmp.x - s2 / 2, tmp.y - s2 / 2, s2, s2);
        }
        ctx.globalAlpha = 1;

        // label + status
        const done = step > i;
        const running = step === i;
        const n = Math.floor(c.total * pr + (done ? 0.0001 : 0));
        const status = done ? "selesai" : running ? "berjalan" : "antre";
        const nameFont = Math.max(10, 12 * k);
        const subFont = Math.max(8, 8.8 * k);
        const lx = clamp(cc.x - R * c.asp * 0.85, 8, w - 108 * k);
        const ly = cc.y - R * 1.25;
        ctx.textAlign = "left";
        ctx.textBaseline = "alphabetic";
        ctx.font = `600 ${nameFont}px ${MONO}`;
        ctx.fillStyle = `rgba(255,255,255,${0.5 + 0.45 * c.act})`;
        ctx.fillText(c.name + (done ? " ✓" : ""), lx, ly);
        ctx.font = `400 ${subFont}px ${MONO}`;
        ctx.fillStyle = `rgba(200,205,220,${0.38 + 0.3 * c.act})`;
        ctx.fillText(`${n}/${c.total} node · ${status}`, lx, ly + subFont + 2 * k);
      });
    };

    const drawRings = () => {
      ctx.globalCompositeOperation = "lighter";
      for (const r of rings) {
        const e = 1 - Math.pow(1 - r.t, 3);
        ctx.strokeStyle = rgba(r.rgb, 0.7 * (1 - r.t));
        ctx.lineWidth = (2.2 - 1.4 * r.t) * k;
        ctx.beginPath();
        ctx.arc(r.x, r.y, 4 * k + r.max * e, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalCompositeOperation = "source-over";
    };

    const drawTrail = () => {
      if (trail.length < 2) return;
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < trail.length; i++) {
        const t = i / trail.length;
        ctx.fillStyle = rgba([235, 240, 255], t * 0.85);
        ctx.beginPath();
        ctx.arc(trail[i].x, trail[i].y, (0.6 + t * 1.1) * k, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
    };

    const drawLegs = () => {
      const br = 12 * k;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      const tagFont = Math.max(8.5, 9.5 * k);
      legs.forEach((L, idx) => {
        if (L.reach < 0.02) return;
        const T = ptPos(L.ci, L.pi);
        const dx = T.x - sp.p.x;
        const dy = T.y - sp.p.y;
        const dist = Math.hypot(dx, dy) || 1;
        const cx = (sp.p.x + T.x) / 2 + (-dy / dist) * dist * L.curv;
        const cy = (sp.p.y + T.y) / 2 + (dx / dist) * dist * L.curv;
        const sdx = cx - sp.p.x;
        const sdy = cy - sp.p.y;
        const sl = Math.hypot(sdx, sdy) || 1;
        const sx = sp.p.x + (sdx / sl) * br;
        const sy = sp.p.y + (sdy / sl) * br;
        const e = ease(clamp01(L.reach));
        const steps = Math.max(6, Math.round(dist / 6));

        ctx.globalAlpha = 0.35 + 0.6 * L.reach;
        ctx.strokeStyle = "rgba(235,240,255,0.95)";
        ctx.lineWidth = 1.7 * k;
        ctx.setLineDash([0.1, 4.4 * k]);
        ctx.lineDashOffset = time * 18;
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
          ctx.arc(ex, ey, 2 * k, 0, Math.PI * 2);
          ctx.fill();
        }

        // paket cahaya mengalir dari ujung kaki kembali ke badan
        if (L.reach > 0.9) {
          ctx.globalCompositeOperation = "lighter";
          for (let q = 0; q < 3; q++) {
            const t = 1 - ((time * 0.8 + idx * 0.37) % 1) + q * 0.035;
            if (t > 1) continue;
            const mt = 1 - t;
            const px = mt * mt * sx + 2 * mt * t * cx + t * t * T.x;
            const py = mt * mt * sy + 2 * mt * t * cy + t * t * T.y;
            ctx.fillStyle = rgba(sp.core, q === 0 ? 0.9 : 0.4);
            ctx.beginPath();
            ctx.arc(px, py, (q === 0 ? 2.6 : 1.6) * k, 0, Math.PI * 2);
            ctx.fill();
            if (q === 0) {
              ctx.fillStyle = rgba(sp.core, 0.18);
              ctx.beginPath();
              ctx.arc(px, py, 6 * k, 0, Math.PI * 2);
              ctx.fill();
            }
          }
          ctx.globalCompositeOperation = "source-over";
        }
        ctx.globalAlpha = 1;

        // tag kata target
        if (L.tag && L.reach > 0.92) {
          ctx.font = `500 ${tagFont}px ${MONO}`;
          const tw = ctx.measureText(L.tag).width;
          const ph = tagFont + 4 * k;
          const bx = clamp(ex + 6 * k, 2, w - tw - 12 * k);
          const by = ey - ph - 2 * k;
          if (L.hi) {
            ctx.fillStyle = rgba(sp.core, 0.92);
            ctx.fillRect(bx, by, tw + 10 * k, ph);
            ctx.fillStyle = "#1a0b10";
          } else {
            ctx.fillStyle = "rgba(10,12,20,0.75)";
            ctx.fillRect(bx, by, tw + 10 * k, ph);
            ctx.strokeStyle = "rgba(255,255,255,0.32)";
            ctx.lineWidth = 0.8;
            ctx.strokeRect(bx + 0.4, by + 0.4, tw + 10 * k - 0.8, ph - 0.8);
            ctx.fillStyle = "rgba(235,240,255,0.92)";
          }
          ctx.textAlign = "left";
          ctx.textBaseline = "middle";
          ctx.fillText(L.tag, bx + 5 * k, by + ph / 2 + 0.5);
          ctx.textBaseline = "alphabetic";
        }
      });
      ctx.globalAlpha = 1;
    };

    const drawSpider = () => {
      const { x, y } = sp.p;
      const br = 12 * k;

      // glow aditif
      ctx.globalCompositeOperation = "lighter";
      const gl = ctx.createRadialGradient(x, y, 2, x, y, br * 3.4);
      gl.addColorStop(0, rgba(sp.core, 0.38));
      gl.addColorStop(1, rgba(sp.core, 0));
      ctx.fillStyle = gl;
      ctx.beginPath();
      ctx.arc(x, y, br * 3.4, 0, Math.PI * 2);
      ctx.fill();

      // cincin orbit putus-putus + satelit
      ctx.lineCap = "round";
      ctx.lineWidth = 1 * k;
      ctx.strokeStyle = "rgba(94,234,212,0.38)";
      ctx.setLineDash([3 * k, 5 * k]);
      ctx.lineDashOffset = -time * 12;
      ctx.beginPath();
      ctx.arc(x, y, br * 1.85, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      for (let s = 0; s < 3; s++) {
        const ang = time * 1.4 + (s * Math.PI * 2) / 3;
        const sx = x + Math.cos(ang) * br * 1.85;
        const sy = y + Math.sin(ang) * br * 1.85;
        ctx.fillStyle = "rgba(167,243,232,0.9)";
        ctx.beginPath();
        ctx.arc(sx, sy, 1.7 * k, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(94,234,212,0.2)";
        ctx.beginPath();
        ctx.arc(sx, sy, 4.5 * k, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";

      // duri radial pendek
      ctx.lineWidth = 0.9 * k;
      ctx.strokeStyle = "rgba(94,234,212,0.6)";
      for (let n = 0; n < SPIKE_COUNT; n++) {
        const ang = (n / SPIKE_COUNT) * Math.PI * 2 + 0.08 * Math.sin(time * 1.3 + n);
        const len = br * (0.8 + 0.7 * (0.5 + 0.5 * Math.sin(time * 2.1 + n * 1.7)));
        const c = Math.cos(ang);
        const s = Math.sin(ang);
        ctx.beginPath();
        ctx.moveTo(x + c * (br + 0.5), y + s * (br + 0.5));
        ctx.lineTo(x + c * (br + len), y + s * (br + len));
        ctx.stroke();
      }

      // badan
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(sp.theta);
      ctx.fillStyle = "#0b1620";
      ctx.strokeStyle = "rgba(94,234,212,0.92)";
      ctx.lineWidth = 1.6 * k;
      ctx.beginPath();
      ctx.ellipse(0, 0, br + 0.9 * k, br - 0.9 * k, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,0.16)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, br * 0.64, 0, Math.PI * 2);
      ctx.stroke();

      // inti berdenyut (belah ketupat)
      const pulse = 0.5 + 0.5 * Math.sin(time * 3.2);
      ctx.rotate(-sp.theta + Math.PI / 4);
      ctx.shadowColor = rgba(sp.core, 1);
      ctx.shadowBlur = (9 + pulse * 5) * k;
      ctx.fillStyle = rgba(sp.core, 1);
      const r = (2.6 + pulse * 0.6) * k;
      ctx.fillRect(-r, -r, r * 2, r * 2);
      ctx.shadowBlur = 0;
      ctx.restore();
    };

    // HUD: braket sudut, teks status, garis pindai (di luar transformasi kamera)
    const drawHud = () => {
      const m = 8 * k;
      const bl = 11 * k;
      ctx.setLineDash([]);
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(255,255,255,0.2)";
      for (const sx of [0, 1]) {
        for (const sy of [0, 1]) {
          const x = sx ? w - m : m;
          const y = sy ? H - m : m;
          const dx = sx ? -1 : 1;
          const dy = sy ? -1 : 1;
          ctx.beginPath();
          ctx.moveTo(x + dx * bl, y);
          ctx.lineTo(x, y);
          ctx.lineTo(x, y + dy * bl);
          ctx.stroke();
        }
      }

      const step = stepRef.current;
      let nDone = 0;
      let nAll = 0;
      clusters.forEach((c, i) => {
        nAll += c.total;
        nDone += Math.floor(c.total * progOf(i));
      });
      const font = Math.max(8.5, 9.5 * k);
      ctx.font = `500 ${font}px ${MONO}`;
      ctx.fillStyle = "rgba(255,255,255,0.32)";
      ctx.textBaseline = "alphabetic";
      ctx.textAlign = "left";
      ctx.fillText("SPIDER · CRAWL", m + bl + 6 * k, m + font * 0.8);
      ctx.fillText(`NODE ${nDone}/${nAll}`, m + bl + 6 * k, H - m - 2 * k);
      ctx.textAlign = "right";
      ctx.fillText(
        `TAHAP ${Math.min(step + 1, NODE_COUNT)}/${NODE_COUNT}`,
        w - m - bl - 6 * k,
        m + font * 0.8,
      );
      ctx.fillText(`${Math.round((nDone / nAll) * 100)}%`, w - m - bl - 6 * k, H - m - 2 * k);
      ctx.textAlign = "left";

      // garis pindai halus
      const band = 60 * k;
      const by = ((time * 38 * k) % (H + band * 2)) - band;
      const sg = ctx.createLinearGradient(0, by - band, 0, by + band);
      sg.addColorStop(0, "rgba(255,255,255,0)");
      sg.addColorStop(0.5, "rgba(255,255,255,0.035)");
      sg.addColorStop(1, "rgba(255,255,255,0)");
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = sg;
      ctx.fillRect(0, by - band, w, band * 2);
      ctx.globalCompositeOperation = "source-over";
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, H);
      ctx.save();
      ctx.translate(w / 2, H / 2);
      ctx.scale(cam.z, cam.z);
      ctx.translate(-w / 2 + cam.x, -H / 2 + cam.y);
      drawDust();
      drawRoutes();
      drawClusters();
      drawRings();
      drawTrail();
      drawLegs();
      drawSpider();
      ctx.restore();
      drawHud();
    };

    // posisi statis (prefers-reduced-motion)
    const snap = () => {
      const a = activeIdx();
      const step = stepRef.current;
      lastStep = step;
      mv.to = a;
      mv.u = 1;
      sp.p = spiderTarget(a);
      sp.core = [...CLUSTERS[a].rgb] as Rgb;
      trail.length = 0;
      rings.length = 0;
      cam.x = 0;
      cam.y = 0;
      cam.kick = 0;
      cam.z = 1.03;
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