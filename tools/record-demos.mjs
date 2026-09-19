// Records the demos: opens the real app in a Chrome started with
// --remote-debugging-port=9333 (see drive.mjs), wishes each wish, waits for
// the dream, and writes what the model actually produced into demos.js: the
// spec, every token with the certainty it gave it and the roads not taken,
// the ghosts, the certainty of its words. Nothing in demos.js is hand-made.
//
//   node tools/record-demos.mjs http://localhost:8765 "a quiet island at dusk" "a neon city in the rain" ...
//
// TAKES=3 dreams each wish that many times and keeps the one that best matches
// the wish (sense, then originality, from mind.js); the header says how many
// were dreamt. Nothing is edited; one of the real dreams is chosen.
import { writeFileSync } from "node:fs";
const TAKES = Math.max(1, +(process.env.TAKES || 1));
const ALL_TAKES = process.env.ALL_TAKES || ""; // a path: every take is kept there too, scores included, for a human eye
const everyTake = [];

const PORT = process.env.CDP_PORT || 9333;
const [base, ...wishes] = process.argv.slice(2);
if (!base || !wishes.length) { console.log("usage: node tools/record-demos.mjs <app url> <wish>..."); process.exit(1); }

const targets = async () => (await fetch(`http://localhost:${PORT}/json`)).json();
async function connect(id) {
  const t = (await targets()).find((x) => x.id === id);
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  let seq = 0; const pending = new Map();
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } };
  const send = (method, params = {}) => new Promise((r) => { const id = ++seq; pending.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
  return { send, close: () => ws.close() };
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const id = (await (await fetch(`http://localhost:${PORT}/json/new?${encodeURIComponent(base + "/?nosky")}`, { method: "PUT" })).json()).id;
await sleep(2500);
const s = await connect(id);
const evaluate = async (expression) => { const r = await s.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || "eval failed"); return r.result?.result?.value; };

// wake, once
await evaluate(`document.querySelector("bnw-console").dispatchEvent(new CustomEvent("wake"))`);
for (let i = 0; i < 600; i++) { if (await evaluate(`!!window.__bnw.engine`)) break; await sleep(2000); if (i % 10 === 0) console.log("waking…", await evaluate(`document.title`)); }
if (!(await evaluate(`!!window.__bnw.engine`))) throw new Error("the mind did not wake");
console.log("awake");

const demos = [];
let dreamt = 0;
for (const wish of wishes) {
  const takes = [];
  for (let k = 0; k < TAKES; k++) {
   try {
    // each demo starts from world zero, so none is an edit of the one before
    const before = await evaluate(`window.__bnw.worlds.length`);
    await evaluate(`window.__bnw.current = 0; (() => { const c = document.querySelector("bnw-console"); c.wish = ${JSON.stringify(wish)}; c.submit(); })()`);
    for (let i = 0; i < 300; i++) { await sleep(1000); if ((await evaluate(`window.__bnw.worlds.length`)) > before && !(await evaluate(`window.__bnw.dreaming`))) break; }
    const w = await evaluate(`JSON.stringify((() => { const w = window.__bnw.worlds.at(-1); return { wish: w.wish, spec: w.spec, ghosts: w.ghosts, certainty: w.certainty, raw: w.raw, retries: w.retries, issues: w.issues.map(i => i.kind), seconds: w.seconds, model: w.model, date: w.date, tokens: w.tokens.map(t => ({ token: t.token, p: +t.p.toFixed(3), alts: t.alts.slice(0, 5).map(a => ({ token: a.token, p: +a.p.toFixed(3) })) })) }; })())`);
    const d = JSON.parse(w);
    dreamt++;
    const score = await evaluate(`(async () => { const m = await import("./mind.js"); const s = window.__bnw.worlds.at(-1).spec; return s ? { sense: m.sense(s, ${JSON.stringify(wish)}), original: m.originality(s, ${JSON.stringify(wish)}) } : null; })()`);
    console.log(`${wish} · take ${k + 1} → "${d.spec?.title}" · ${d.tokens.length} tokens · ${d.seconds?.toFixed(1)} s · retries ${d.retries} · sense ${score?.sense?.toFixed(2)} original ${score?.original?.toFixed(2)} · console ${d.spec?.console.side}/${d.spec?.console.tone}/${d.spec?.console.shape} · levers ${d.spec?.console.buttons.map((b) => b.label + "→" + b.action).join(", ")}`);
    if (d.spec && score) takes.push({ d, key: score.sense * 2 + score.original });
    if (d.spec) everyTake.push({ wish, take: k + 1, score, d });
    if (ALL_TAKES) writeFileSync(ALL_TAKES, JSON.stringify(everyTake)); // after every take, so a crash loses nothing
   } catch (e) { console.log(`${wish} · take ${k + 1} failed: ${e?.message || e}`); await evaluate(`window.__bnw.dreaming = false`).catch(() => {}); }
  }
  if (!takes.length) { console.log("  nothing usable, skipped"); continue; }
  takes.sort((a, b) => b.key - a.key);
  console.log(`  kept "${takes[0].d.spec.title}"`);
  demos.push(takes[0].d);
}
s.close();
await fetch(`http://localhost:${PORT}/json/close/${id}`);

const header = `// Dreams the shipped model actually had, recorded by tools/record-demos.mjs
// from the real app: the spec it wrote, every token with the certainty it
// gave it, the ghosts, and the per-character certainty of its words. They are
// replayed on the page without a model, so a phone with no WebGPU still
// sees what this is. Nothing in here was written by hand or edited; of the
// ${dreamt} dreams recorded on ${new Date().toISOString().slice(0, 10)}, the ${demos.length} that best matched their wish were kept.
`;
writeFileSync(new URL("../demos.js", import.meta.url), header + "export const DEMOS = " + JSON.stringify(demos) + ";\n");
console.log(`wrote demos.js with ${demos.length} dreams`);
if (ALL_TAKES) { writeFileSync(ALL_TAKES, JSON.stringify(everyTake)); console.log(`all ${everyTake.length} takes in ${ALL_TAKES}`); }
