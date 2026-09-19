// The link preview: one of the recorded demos, painted by picture.js at
// 1200x630 through the running page (the fonts have to be loaded), saved
// as docs/preview.jpg for the og:image tag. Usage: node tools/preview.mjs [demo index] [base url]
import { writeFileSync } from "node:fs";
const K = +(process.argv[2] || 0), BASE = process.argv[3] || "http://localhost:8765", PORT = 9333;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const id = (await (await fetch(`http://localhost:${PORT}/json/new?${encodeURIComponent(BASE + "/?still&nosky")}`, { method: "PUT" })).json()).id;
const t = ((await (await fetch(`http://localhost:${PORT}/json`)).json())).find((x) => x.id === id);
const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
let seq = 0; const pending = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } };
const send = (method, params = {}) => new Promise((r) => { const k = ++seq; pending.set(k, r); ws.send(JSON.stringify({ id: k, method, params })); });
const ev = async (e) => { const r = await send("Runtime.evaluate", { expression: e, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || "evaluate failed"); return r.result?.result?.value; };
await sleep(1500);
await ev(`document.querySelector("bnw-console").shadowRoot.querySelectorAll(".chip")[${K}].click()`);
for (let i = 0; i < 80; i++) { await sleep(250); if (!(await ev("window.__bnw.dreaming"))) break; }
await sleep(800);
for (const [w, h, name] of [[1200, 630, "preview"], [1080, 1350, "preview-portrait"]]) {
  const url = await ev(`window.__bnw.picture(undefined, ${w}, ${h})`);
  const out = new URL(`../docs/${name}.jpg`, import.meta.url);
  writeFileSync(out, Buffer.from(url.split(",")[1], "base64"));
  console.log(`wrote docs/${name}.jpg · ${w}x${h}`);
}
ws.close(); await fetch(`http://localhost:${PORT}/json/close/${id}`);
