// The world as one picture. The page cannot photograph itself, so the
// picture is painted again from the spec, on a canvas, with the same
// positions, sizes and shapes the painter uses: the sky, the ground, every
// thing the model placed, its reflection where the ground gives things back,
// the weather, the words in the world's own font, and the wish that made it.
// Portrait by default, the shape of a phone screen and a feed post.
import { PAINT } from "./world.js";
const { X, Y_BY_SIDE, SIZE, SHAPES, GLOW, AT_LEAST, FONT, MIRRORS, mix, lum, rgba } = PAINT;

const svgImage = (inner) => new Promise((res, rej) => {
  const img = new Image();
  img.onload = () => res(img); img.onerror = () => rej(new Error("a shape would not draw"));
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${inner}</svg>`);
});

function wrap(g, text, maxW) {
  const words = String(text).split(/\s+/), lines = []; let line = "";
  for (const w of words) { const t = line ? line + " " + w : w; if (g.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; }
  if (line) lines.push(line);
  return lines;
}

// a deterministic scatter, so the same world gives the same picture
function scatter(seed, n) { let s = seed >>> 0 || 1; const out = []; for (let i = 0; i < n; i++) { s = (s * 1664525 + 1013904223) >>> 0; const a = s / 4294967296; s = (s * 1664525 + 1013904223) >>> 0; out.push([a, s / 4294967296]); } return out; }

export async function pictureOf(spec, { width = 1080, height = 1350, wish = "", site = "unt1l1f1nd-brave-new-world.static.hf.space" } = {}) {
  const s = spec, W = width, H = height, vmin = Math.min(W, H) / 100;
  const Y = Y_BY_SIDE[s.console?.side] || Y_BY_SIDE.bottom;
  const horizon = s.ground === "void" ? 100 : Y.horizon + 4;
  const hz = (horizon / 100) * H;
  const isDark = lum(s.sky[s.sky.length - 1]) < 0.5;
  const skyMid = mix(s.sky[0], s.sky[s.sky.length - 1], 0.4);
  let ink = s.ink;
  for (let i = 0; i < 6 && Math.abs(lum(ink) - lum(skyMid)) < 0.45; i++) ink = mix(ink, lum(skyMid) > 0.5 ? "#000000" : "#ffffff", 0.3);
  const font = FONT[s.font] || FONT.serif;
  try { await Promise.all([document.fonts.load(`300 40px ${font}`), document.fonts.load(`italic 300 40px ${font}`)]); } catch {}

  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const g = c.getContext("2d");

  // the sky
  const sky = g.createLinearGradient(0, 0, 0, H);
  s.sky.forEach((col, i) => sky.addColorStop(i / Math.max(1, s.sky.length - 1), col));
  g.fillStyle = sky; g.fillRect(0, 0, W, H);

  // the ground
  if (horizon < 100) {
    const gc = s.ground_color, dark = mix(gc, "#000000", 0.35), light = mix(gc, "#ffffff", 0.25);
    const gr = g.createLinearGradient(0, hz, 0, H);
    if (s.ground === "snow" || s.ground === "ice") { gr.addColorStop(0, mix(gc, "#ffffff", 0.6)); gr.addColorStop(0.6, gc); gr.addColorStop(1, dark); }
    else if (s.ground === "clouds") { gr.addColorStop(0, mix(gc, "#ffffff", 0.7)); gr.addColorStop(1, gc); }
    else if (s.ground === "lava") { gr.addColorStop(0, dark); gr.addColorStop(1, gc); }
    else { gr.addColorStop(0, light); gr.addColorStop(0.35, gc); gr.addColorStop(1, dark); }
    g.fillStyle = gr; g.fillRect(0, hz, W, H - hz);
    if (MIRRORS.has(s.ground) && s.ground !== "snow") { g.fillStyle = rgba(light, 0.16); for (let y = hz + 6; y < H; y += 14 * (vmin / 6)) g.fillRect(0, y, W, 2); }
    if (s.ground === "lava") { for (const [a, b] of scatter(7, 9)) { const r = g.createRadialGradient(a * W, hz + b * (H - hz), 0, a * W, hz + b * (H - hz), 6 * vmin); r.addColorStop(0, "#ffb347"); r.addColorStop(1, "rgba(255,106,61,0)"); g.fillStyle = r; g.fillRect(0, hz, W, H - hz); } }
    // haze at the horizon
    const hzg = g.createLinearGradient(0, hz - 0.14 * H, 0, hz + 0.14 * H);
    hzg.addColorStop(0, rgba(s.sky[s.sky.length - 1], 0)); hzg.addColorStop(0.5, rgba(s.sky[s.sky.length - 1], 0.7)); hzg.addColorStop(1, rgba(s.sky[s.sky.length - 1], 0));
    g.fillStyle = hzg; g.fillRect(0, hz - 0.14 * H, W, 0.28 * H);
  }

  // the things, in the painter's own places
  const placed = [];
  s.elements.forEach((e, i) => {
    if (!SHAPES[e.kind]) return;
    const base = Math.max(SIZE[e.size] || 14, AT_LEAST[e.kind] || 0), n = e.count || 1;
    const haze = { sky: 0.55, high: 0.35, horizon: 0.15, ground: 0, low: 0 }[e.y] || 0;
    const big = ["mountain", "hill", "volcano", "skyline", "iceberg", "dune", "pyramid"].includes(e.kind);
    const spread = n > 1 ? Math.min(36, 6 + n * 4) : 0;
    for (let k = 0; k < n; k++) {
      const t = n > 1 ? k / (n - 1) - 0.5 : 0, jitter = n > 1 ? ((k * 7919) % 11) / 11 - 0.5 : 0;
      const x = X[e.x] + t * spread * 2 + jitter * 6, y = Y[e.y] + jitter * (e.y === "sky" ? 12 : 5) - (n > 1 ? Math.abs(t) * 4 : 0);
      const sz = base * (n > 1 ? 0.7 + ((k * 31) % 7) / 14 : 1);
      placed.push({ e, x, y, sz, alpha: 1 - (big ? haze * 0.5 : haze) * 0.6, order: Y[e.y] });
    }
  });
  placed.sort((a, b) => a.order - b.order); // far things first, near things over them
  const images = new Map();
  for (const p of placed) { const key = p.e.kind + p.e.color; if (!images.has(key)) images.set(key, await svgImage(SHAPES[p.e.kind](p.e.color))); }
  for (const p of placed) {
    const img = images.get(p.e.kind + p.e.color), px = (p.x / 100) * W, py = (p.y / 100) * H, w = p.sz * vmin;
    if (GLOW.has(p.e.kind)) { const r = g.createRadialGradient(px, py, 0, px, py, w); r.addColorStop(0, rgba(p.e.color, 0.5)); r.addColorStop(1, rgba(p.e.color, 0)); g.fillStyle = r; g.fillRect(px - w, py - w, 2 * w, 2 * w); }
    g.globalAlpha = p.alpha; g.drawImage(img, px - w / 2, py - w / 2, w, w); g.globalAlpha = 1;
    if (MIRRORS.has(s.ground) && p.e.y !== "low" && p.e.y !== "ground" && horizon < 100) {
      const my = horizon + (horizon - p.y) * 0.6; if (my < 100) { g.save(); g.globalAlpha = 0.22; g.translate(px, (my / 100) * H); g.scale(1, -1); g.drawImage(img, -w / 2, -w / 2, w, w); g.restore(); }
    }
  }

  // the weather
  const pts = scatter(s.title.length * 31 + s.elements.length, 140);
  const skyH = (horizon / 100) * H;
  g.save();
  if (s.weather === "stars") { g.fillStyle = "#ffffff"; for (const [a, b] of pts) { g.globalAlpha = 0.25 + b * 0.6; g.beginPath(); g.arc(a * W, b * skyH * 0.9, 0.9 + a * 1.6, 0, 7); g.fill(); } }
  else if (s.weather === "rain") { g.strokeStyle = rgba(ink, 0.22); g.lineWidth = 1.2; for (const [a, b] of pts) { g.beginPath(); g.moveTo(a * W, b * H); g.lineTo(a * W - 6, b * H + 26); g.stroke(); } }
  else if (s.weather === "snow") { g.fillStyle = "#ffffff"; for (const [a, b] of pts.slice(0, 100)) { g.globalAlpha = 0.5 + b * 0.4; g.beginPath(); g.arc(a * W, b * H, 2 + a * 3, 0, 7); g.fill(); } }
  else if (s.weather === "fog") { const f = g.createLinearGradient(0, hz - 0.2 * H, 0, hz + 0.25 * H); f.addColorStop(0, "rgba(255,255,255,0)"); f.addColorStop(0.5, "rgba(255,255,255,0.38)"); f.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = f; g.fillRect(0, 0, W, H); }
  else if (s.weather === "embers") { for (const [a, b] of pts.slice(0, 70)) { g.fillStyle = b > 0.5 ? "#ffb347" : "#ff6a3d"; g.globalAlpha = 0.4 + a * 0.5; g.beginPath(); g.arc(a * W, b * H, 1.5 + a * 2.5, 0, 7); g.fill(); } }
  else if (s.weather === "petals") { g.fillStyle = s.accent; for (const [a, b] of pts.slice(0, 70)) { g.globalAlpha = 0.5 + b * 0.4; g.beginPath(); g.ellipse(a * W, b * H, 5, 3, a * 3, 0, 7); g.fill(); } }
  else if (s.weather === "fireflies") { for (const [a, b] of pts.slice(0, 45)) { const r = g.createRadialGradient(a * W, b * H, 0, a * W, b * H, 9); r.addColorStop(0, "rgba(230,255,138,0.9)"); r.addColorStop(1, "rgba(230,255,138,0)"); g.fillStyle = r; g.fillRect(a * W - 9, b * H - 9, 18, 18); } }
  else if (s.weather === "bubbles") { g.strokeStyle = "rgba(255,255,255,0.5)"; g.lineWidth = 1.2; for (const [a, b] of pts.slice(0, 50)) { g.beginPath(); g.arc(a * W, hz * 0.3 + b * (H - hz * 0.3), 3 + a * 9, 0, 7); g.stroke(); } }
  g.restore();

  // the vignette the page has
  const v = g.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.45, W / 2, H * 0.45, Math.max(W, H) * 0.8);
  v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,0.26)"); g.fillStyle = v; g.fillRect(0, 0, W, H);

  // the words, where the model put them
  const place = s.text_place || "top", side = s.console?.side || "bottom";
  const midY = { bottom: 0.34, top: 0.56 }[side] || 0.42;
  const titlePx = vmin * (s.title.length > 26 ? 5 : s.title.length > 16 ? 6.2 : 7.4) * (W > H ? 0.8 : 1);
  const linePx = vmin * 2.9 * (W > H ? 0.8 : 1);
  const maxW = W * (place === "left" || place === "right" ? 0.5 : 0.82);
  g.textBaseline = "alphabetic";
  g.shadowColor = isDark ? "rgba(0,0,0,0.45)" : "rgba(255,255,255,0.5)"; g.shadowBlur = 26;
  g.fillStyle = ink;
  g.font = `300 ${titlePx}px ${font}`;
  const titleLines = wrap(g, s.title, maxW);
  g.font = `italic 300 ${linePx}px ${font}`;
  const poem = (s.lines || []).flatMap((l) => wrap(g, l, maxW));
  const blockH = titleLines.length * titlePx * 1.1 + (poem.length ? poem.length * linePx * 1.55 + linePx : 0);
  const align = place === "left" ? "left" : place === "right" ? "right" : "center";
  const tx = place === "left" ? W * 0.08 : place === "right" ? W * 0.92 : W / 2;
  let ty = place === "top" ? H * 0.085 + titlePx : place === "bottom" ? H * 0.9 - blockH + titlePx : H * midY - blockH / 2 + titlePx;
  g.textAlign = align;
  g.font = `300 ${titlePx}px ${font}`;
  for (const l of titleLines) { g.fillText(l, tx, ty); ty += titlePx * 1.1; }
  if (poem.length) { g.globalAlpha = 0.86; g.font = `italic 300 ${linePx}px ${font}`; ty += linePx * 0.4; for (const l of poem) { g.fillText(l, tx, ty); ty += linePx * 1.55; } g.globalAlpha = 1; }
  g.shadowBlur = 0;

  // the wish that made it, and where such worlds come from, on a quiet band so the ground does not fight it
  const capPx = vmin * 2, monoPx = vmin * 1.5;
  const band = g.createLinearGradient(0, H - W * 0.05 - monoPx * 6, 0, H);
  band.addColorStop(0, lum(ink) > 0.5 ? "rgba(0,0,0,0)" : "rgba(255,255,255,0)"); band.addColorStop(1, lum(ink) > 0.5 ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.5)");
  g.fillStyle = band; g.fillRect(0, H - W * 0.05 - monoPx * 6, W, W * 0.05 + monoPx * 6);
  g.globalAlpha = 0.72; g.fillStyle = ink; g.textAlign = "left"; g.font = `italic 300 ${capPx}px ${font}`;
  const cap = wish ? `“${wish.replace(/ · .*$/, "")}”` : "";
  g.fillText(cap, W * 0.05, H - W * 0.05 - monoPx * 1.9);
  g.font = `300 ${monoPx}px ${FONT.mono}`; g.fillText("brave new world · dreamt by a 0.5B model in a browser tab · " + site, W * 0.05, H - W * 0.05);
  g.globalAlpha = 1;

  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("the picture would not save"))), "image/jpeg", 0.92));
}

export async function pictureDataURL(spec, opts) {
  const blob = await pictureOf(spec, opts);
  return new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(blob); });
}
