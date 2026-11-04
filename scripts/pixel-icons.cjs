// Buat varian piksel (gaya ikon "piksel") dari ikon garis 24×24.
// Rasterisasi di Chromium (Playwright) ke grid N×N dengan garis selebar 1 sel dan geser setengah sel, supaya garis
// di koordinat bulat/setengah jatuh tepat di satu sel; titik kecil diselamatkan; lalu jadi satu <path> per ikon.
//
// Butuh Playwright (npm i -D playwright && npx playwright install chromium).
// Pemakaian: node scripts/pixel-icons.cjs in.json out.json [N=16] [stroke=1.5] [ambang=0.45]
//   in.json : { "nama-ikon": "<path d=.../>...", ... }   (isi SVG tanpa tag <svg>)
//   out.json: { "nama-ikon": "<path transform=... d=.../>" }  → isi paket ikon { "type": "icons", "variant": "piksel" }
const { chromium } = require("playwright");
const fs = require("fs");
const [, , inF, outF, Ns = "16", sw = "1.5", th = "0.45"] = process.argv;
const N = +Ns;
(async () => {
  const icons = JSON.parse(fs.readFileSync(inF, "utf8"));
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.setContent("<canvas id=c></canvas>");
  const res = await p.evaluate(async ({ icons, N, sw, th }) => {
    const SS = 8; // supersampling: render N*SS lalu rata-rata per sel
    const c = document.getElementById("c");
    c.width = c.height = N * SS;
    const g = c.getContext("2d", { willReadFrequently: true });
    const out = {};
    for (const [name, inner] of Object.entries(icons)) {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${N * SS}" height="${N * SS}" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><g transform="translate(-.75 -.75)">${inner.replace(/currentColor/g, "#000")}</g></svg>`;
      const img = new Image();
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
      await img.decode();
      g.clearRect(0, 0, c.width, c.height);
      g.drawImage(img, 0, 0);
      const d = g.getImageData(0, 0, c.width, c.height).data;
      const grid = [];
      for (let y = 0; y < N; y++) {
        const row = [];
        for (let x = 0; x < N; x++) {
          let s = 0;
          for (let yy = 0; yy < SS; yy++) for (let xx = 0; xx < SS; xx++) s += d[((y * SS + yy) * c.width + x * SS + xx) * 4 + 3];
          row.push(s / (SS * SS * 255));
        }
        grid.push(row);
      }
      out[name] = grid;
    }
    return out;
  }, { icons, N, sw: +sw, th: +th });
  await b.close();
  const T = +th;
  const paths = {};
  const grids = {};
  for (const [name, grid] of Object.entries(res)) {
    const on = grid.map((r) => r.map((v) => v >= T));
    // Selamatkan titik kecil (mis. mata ikon senyum): sel puncak lokal >= 0.2 tanpa sel menyala di sekitarnya.
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        const v = grid[y][x];
        if (on[y][x] || v < 0.2) continue;
        let peak = true, near = false;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            if (!dy && !dx) continue;
            const yy = y + dy, xx = x + dx;
            if (yy < 0 || xx < 0 || yy >= N || xx >= N) continue;
            if (grid[yy][xx] > v) peak = false;
            if (on[yy][xx]) near = true;
          }
        if (peak && !near) on[y][x] = true;
      }
    // Titik kecil (ikon titik Lucide) yang jatuh di bawah ambang: ambil sel paling penuh di sekitarnya.
    grids[name] = on.map((r) => r.map((v) => (v ? 1 : 0)).join("")).join("\n");
    // Run-length per baris, gabungkan baris berurutan yang run-nya identik jadi persegi tinggi.
    const runs = [];
    for (let y = 0; y < N; y++) {
      let x = 0;
      while (x < N) {
        if (!on[y][x]) { x++; continue; }
        let e = x;
        while (e < N && on[y][e]) e++;
        runs.push({ x, y, w: e - x, h: 1 });
        x = e;
      }
    }
    const merged = [];
    for (const r of runs) {
      const up = merged.find((m) => m.x === r.x && m.w === r.w && m.y + m.h === r.y);
      if (up) up.h++;
      else merged.push({ ...r });
    }
    const d = merged.map((m) => `M${m.x} ${m.y}h${m.w}v${m.h}h-${m.w}z`).join("");
    const k = 24 / N;
    paths[name] = `<path transform="translate(.75 .75) scale(${+k.toFixed(4)})" fill="currentColor" stroke="none" d="${d}"/>`;
  }
  fs.writeFileSync(outF, JSON.stringify(paths));
  fs.writeFileSync(outF.replace(/\.json$/, ".grid.json"), JSON.stringify(grids));
  console.log("ok", Object.keys(paths).length, "avg len", Math.round(Object.values(paths).reduce((s, x) => s + x.length, 0) / Object.keys(paths).length));
})();
