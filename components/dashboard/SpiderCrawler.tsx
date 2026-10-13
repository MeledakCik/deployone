"use client";

import * as React from "react";

/**
 * Animasi loading "Spider Crawler AI".
 *
 * Seekor laba-laba prosedural (8 kaki dengan IK + gait bergantian) merayap di jaring
 * saraf. Tiap node di jaring = satu tahap deploy. Laba-laba berjalan ke node tahap
 * yang sedang aktif, node yang selesai menyala hijau, dan jalur yang sudah dilalui
 * ditandai. Paket data kecil mengalir di sepanjang jaring sebagai "sinyal AI".
 *
 * Murni canvas 2D, tanpa dependensi. Menghormati prefers-reduced-motion
 * (digambar statis) dan berhenti saat unmount.
 */

const NODE_COUNT = 5;
const SPOKES = 10;
const RINGS = 3;
const H = 200;

type Vec = { x: number; y: number };
type Leg = {
  foot: Vec;
  start: Vec;
  target: Vec;
  t: number;
  stepping: boolean;
  side: 1 | -1; // 1 = kanan badan, -1 = kiri badan
  rest: Vec; // posisi kaki ideal di frame badan (x = maju, y = ke kanan)
  anchor: Vec; // titik tempel kaki di badan (frame badan)
  group: 0 | 1;
};

const L1 = 11;
const L2 = 14;

function makeLegs(): Leg[] {
  const fwd = [13, 8, -6, -15];
  const reach = [15, 20, 20, 15];
  const anchorF = [6, 2.5, -1.5, -5];
  const legs: Leg[] = [];
  for (const side of [-1, 1] as const) {
    for (let i = 0; i < 4; i++) {
      legs.push({
        foot: { x: 0, y: 0 },
        start: { x: 0, y: 0 },
        target: { x: 0, y: 0 },
        t: 1,
        stepping: false,
        side,
        rest: { x: fwd[i], y: side * reach[i] },
        anchor: { x: anchorF[i], y: side * 2.5 },
        group: (((i + (side === 1 ? 1 : 0)) % 2) as 0 | 1),
      });
    }
  }
  return legs;
}

const ease = (t: number) => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
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
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    let w = 300;
    let raf = 0;
    let last = 0;
    let time = 0;
    let packetClock = 0;

    const legs = makeLegs();
    const spider = { p: { x: 0, y: 0 } as Vec, v: { x: 0, y: 0 } as Vec, theta: 0, init: false };
    const packets: { spoke: number; t: number; speed: number; dir: 1 | -1 }[] = [];

    const geom = () => {
      const cx = w / 2;
      const cy = H / 2;
      const rx = Math.min(w * 0.4, 150);
      const ry = H * 0.4;
      return { cx, cy, rx, ry };
    };
    const spokePt = (k: number, scale: number): Vec => {
      const { cx, cy, rx, ry } = geom();
      const a = -Math.PI / 2 + (k / SPOKES) * Math.PI * 2;
      return { x: cx + Math.cos(a) * rx * scale, y: cy + Math.sin(a) * ry * scale };
    };
    const nodePt = (i: number): Vec => spokePt(i * 2, 1);

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = Math.max(wrap.clientWidth, 200);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!spider.init) {
        const { cx, cy } = geom();
        spider.p = { x: cx, y: cy };
        spider.init = true;
      }
      if (reduced) {
        // tempatkan langsung di node aktif untuk frame statis
        const n = nodePt(Math.min(stepRef.current, NODE_COUNT - 1));
        spider.p = { x: n.x, y: n.y };
        settleLegs();
        draw();
      }
    };

    const bodyToWorld = (b: Vec): Vec => {
      const c = Math.cos(spider.theta);
      const s = Math.sin(spider.theta);
      // x = maju, y = kanan badan
      return {
        x: spider.p.x + c * b.x - s * b.y,
        y: spider.p.y + s * b.x + c * b.y,
      };
    };

    function settleLegs() {
      for (const leg of legs) {
        const f = bodyToWorld(leg.rest);
        leg.foot = f;
        leg.start = f;
        leg.target = f;
        leg.stepping = false;
        leg.t = 1;
      }
    }

    let firstFrame = true;

    const update = (dt: number) => {
      time += dt;
      const step = Math.min(stepRef.current, NODE_COUNT - 1);
      const node = nodePt(step);

      // titik tujuan: node aktif + goyangan kecil supaya kaki terus melangkah
      const dxn = node.x - spider.p.x;
      const dyn = node.y - spider.p.y;
      const dist = Math.hypot(dxn, dyn);
      const wobble: Vec = {
        x: Math.cos(time * 1.3) * 9,
        y: Math.sin(time * 1.7) * 6,
      };
      const goal: Vec =
        dist < 14 ? { x: node.x + wobble.x, y: node.y + wobble.y } : node;
      const gx = goal.x - spider.p.x;
      const gy = goal.y - spider.p.y;
      const gd = Math.hypot(gx, gy) || 1;
      const speed = dist > 14 ? 78 : 26;
      const desired = Math.min(speed, gd * 3);
      const dvx = (gx / gd) * desired;
      const dvy = (gy / gd) * desired;
      const k = Math.min(1, dt * 5);
      spider.v.x += (dvx - spider.v.x) * k;
      spider.v.y += (dvy - spider.v.y) * k;
      spider.p.x += spider.v.x * dt;
      spider.p.y += spider.v.y * dt;

      const sp = Math.hypot(spider.v.x, spider.v.y);
      if (sp > 8) {
        spider.theta = angleLerp(spider.theta, Math.atan2(spider.v.y, spider.v.x), Math.min(1, dt * 7));
      } else {
        // diam: menghadap keluar dari pusat jaring, pelan-pelan
        const { cx, cy } = geom();
        const out = Math.atan2(spider.p.y - cy, spider.p.x - cx);
        spider.theta = angleLerp(spider.theta, out, Math.min(1, dt * 1.5));
      }

      if (firstFrame) {
        settleLegs();
        firstFrame = false;
      }

      // gait: dua kelompok kaki bergantian
      const anyStepping = [false, false];
      for (const l of legs) if (l.stepping) anyStepping[l.group] = true;
      for (const leg of legs) {
        if (leg.stepping) {
          leg.t += dt / 0.13;
          if (leg.t >= 1) {
            leg.t = 1;
            leg.stepping = false;
            leg.foot = { ...leg.target };
          } else {
            const e = ease(leg.t);
            leg.foot = {
              x: lerp(leg.start.x, leg.target.x, e),
              y: lerp(leg.start.y, leg.target.y, e),
            };
          }
          continue;
        }
        const lead = bodyToWorld({ x: leg.rest.x, y: leg.rest.y });
        const ideal = { x: lead.x + spider.v.x * 0.14, y: lead.y + spider.v.y * 0.14 };
        const off = Math.hypot(leg.foot.x - lead.x, leg.foot.y - lead.y);
        if (off > 10 && !anyStepping[leg.group === 0 ? 1 : 0]) {
          leg.stepping = true;
          leg.t = 0;
          leg.start = { ...leg.foot };
          leg.target = ideal;
          anyStepping[leg.group] = true;
        }
      }

      // paket data
      packetClock += dt;
      if (packetClock > 0.28) {
        packetClock = 0;
        if (packets.length < 14) {
          packets.push({
            spoke: Math.floor(Math.random() * SPOKES),
            t: 0,
            speed: 0.45 + Math.random() * 0.5,
            dir: Math.random() > 0.5 ? 1 : -1,
          });
        }
      }
      for (let i = packets.length - 1; i >= 0; i--) {
        packets[i].t += dt * packets[i].speed;
        if (packets[i].t >= 1) packets.splice(i, 1);
      }
    };

    const drawWeb = () => {
      const { cx, cy } = geom();
      const step = stepRef.current;

      // jari-jari
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(255,255,255,0.09)";
      for (let k = 0; k < SPOKES; k++) {
        const p = spokePt(k, 1);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      }

      // cincin melengkung (agak "kendur" ke arah pusat)
      for (let r = 1; r <= RINGS; r++) {
        const sc = r / RINGS;
        ctx.strokeStyle = `rgba(255,255,255,${r === RINGS ? 0.14 : 0.08})`;
        ctx.beginPath();
        const first = spokePt(0, sc);
        ctx.moveTo(first.x, first.y);
        for (let k = 1; k <= SPOKES; k++) {
          const p = spokePt(k % SPOKES, sc);
          const prev = spokePt(k - 1, sc);
          const mx = (p.x + prev.x) / 2;
          const my = (p.y + prev.y) / 2;
          ctx.quadraticCurveTo(lerp(mx, cx, 0.14), lerp(my, cy, 0.14), p.x, p.y);
        }
        ctx.stroke();
      }

      // jejak progres di cincin luar: antar node
      for (let i = 0; i < NODE_COUNT - 1; i++) {
        if (step <= i) break;
        const a = nodePt(i);
        const b = nodePt(i + 1);
        const mid = spokePt(i * 2 + 1, 1);
        ctx.strokeStyle = "rgba(52,211,153,0.75)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.quadraticCurveTo(lerp(mid.x, cx, 0.28), lerp(mid.y, cy, 0.28), b.x, b.y);
        ctx.stroke();
      }
      ctx.lineWidth = 1;

      // paket data
      for (const pk of packets) {
        const p = spokePt(pk.spoke, 1);
        const f = pk.dir === 1 ? pk.t : 1 - pk.t;
        const x = lerp(p.x, cx, 1 - f);
        const y = lerp(p.y, cy, 1 - f);
        const a = Math.sin(pk.t * Math.PI);
        ctx.fillStyle = `rgba(34,211,238,${0.75 * a})`;
        ctx.beginPath();
        ctx.arc(x, y, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const drawNodes = () => {
      const step = stepRef.current;
      for (let i = 0; i < NODE_COUNT; i++) {
        const p = nodePt(i);
        const done = step > i;
        const active = step === i;
        const pulse = active ? 0.5 + 0.5 * Math.sin(time * 4) : 0;

        if (done || active) {
          const glow = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, 20 + pulse * 6);
          glow.addColorStop(0, done ? "rgba(52,211,153,0.35)" : "rgba(139,92,246,0.45)");
          glow.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 26, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, 8.5, 0, Math.PI * 2);
        ctx.fillStyle = done ? "#34d399" : active ? "#8b5cf6" : "#1e1e2f";
        ctx.fill();
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = done ? "#6ee7b7" : active ? "#c4b5fd" : "rgba(255,255,255,0.22)";
        ctx.stroke();

        ctx.font = "600 9px ui-monospace, SFMono-Regular, Menlo, monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = done ? "#06281d" : active ? "#fff" : "rgba(255,255,255,0.45)";
        ctx.fillText(done ? "✓" : String(i + 1), p.x, p.y + 0.5);
      }
    };

    const drawSpider = () => {
      const { x, y } = spider.p;

      // cincin "scan" AI di sekitar laba-laba
      const sr = 22 + ((time * 26) % 22);
      ctx.strokeStyle = `rgba(139,92,246,${0.28 * (1 - (sr - 22) / 22)})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, sr, 0, Math.PI * 2);
      ctx.stroke();

      // kaki
      const c = Math.cos(spider.theta);
      const s = Math.sin(spider.theta);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (const leg of legs) {
        const a = bodyToWorld(leg.anchor);
        const f = leg.foot;
        const dx = f.x - a.x;
        const dy = f.y - a.y;
        const d = Math.min(Math.max(Math.hypot(dx, dy), 4), L1 + L2 - 0.5);
        const ux = dx / (Math.hypot(dx, dy) || 1);
        const uy = dy / (Math.hypot(dx, dy) || 1);
        const al = (L1 * L1 - L2 * L2 + d * d) / (2 * d);
        const hh = Math.sqrt(Math.max(L1 * L1 - al * al, 0));
        // dorong lutut ke arah luar badan
        const rightX = -s;
        const rightY = c;
        const outX = rightX * leg.side;
        const outY = rightY * leg.side;
        let px = -uy;
        let py = ux;
        if (px * outX + py * outY < 0) {
          px = -px;
          py = -py;
        }
        const lift = leg.stepping ? 1 + Math.sin(leg.t * Math.PI) * 0.5 : 1;
        const kx = a.x + ux * al + px * hh * lift;
        const ky = a.y + uy * al + py * hh * lift;
        ctx.strokeStyle = "rgba(226,232,240,0.9)";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(kx, ky);
        ctx.lineTo(f.x, f.y);
        ctx.stroke();
      }

      // badan: perut + kepala
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(spider.theta);
      const body = ctx.createRadialGradient(-6, -2, 1, -6, 0, 14);
      body.addColorStop(0, "#a78bfa");
      body.addColorStop(1, "#4c1d95");
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.ellipse(-7, 0, 10, 7.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#cbd5e1";
      ctx.beginPath();
      ctx.ellipse(5, 0, 6.5, 5.2, 0, 0, Math.PI * 2);
      ctx.fill();
      // pola sirkuit di perut
      ctx.strokeStyle = "rgba(34,211,238,0.85)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-14, 0);
      ctx.lineTo(-8, 0);
      ctx.lineTo(-5, -3);
      ctx.moveTo(-8, 0);
      ctx.lineTo(-5, 3);
      ctx.stroke();
      // mata menyala
      ctx.fillStyle = "#22d3ee";
      ctx.shadowColor = "#22d3ee";
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(9, -2.2, 1.3, 0, Math.PI * 2);
      ctx.arc(9, 2.2, 1.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();
    };

    function draw() {
      ctx!.clearRect(0, 0, w, H);
      drawWeb();
      drawNodes();
      drawSpider();
    }

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
      redrawRef.current = () => {
        const n = nodePt(Math.min(stepRef.current, NODE_COUNT - 1));
        spider.p = { x: n.x, y: n.y };
        settleLegs();
        draw();
      };
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
