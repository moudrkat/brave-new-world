// Saves a finished eval page's results: the markdown table and the JSON
// (without the rendered pages, which renderWorld() rebuilds from the specs).
//   node tools/save-eval.mjs <targetId> evals/2026-09-19-spec
const PORT = process.env.CDP_PORT || 9333;
const [id, stem] = process.argv.slice(2);
const t = ((await (await fetch(`http://localhost:${PORT}/json`)).json())).find((x) => x.id === id);
if (!t) throw new Error("no target " + id);
const ws = new WebSocket(t.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let seq = 0; const pending = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } };
const send = (method, params = {}) => new Promise((r) => { const id = ++seq; pending.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
const ev = async (expression) => { const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 300)); return r.result?.result?.value; };
const done = await ev("window.__eval.done");
const md = await ev("window.__evalMarkdown()");
const json = await ev(`JSON.stringify({ date: new Date().toISOString(), set: new URLSearchParams(location.search).get("set") || "wishes", example: new URLSearchParams(location.search).get("ex") || "default", ua: navigator.userAgent, done: window.__eval.done, results: window.__eval.results.map((e) => ({ ...e, runs: e.runs.map((r) => ({ ...r, html: undefined, fp: undefined })) })) })`);
ws.close();
const { writeFileSync } = await import("node:fs");
writeFileSync(stem + ".json", json);
writeFileSync(stem + ".md", `# ${stem.split("/").pop()}\n\n${done ? "" : "(run not finished)\n\n"}${md}\n`);
console.log((done ? "done" : "NOT DONE") + " · wrote " + stem + ".{json,md} · " + (json.length / 1e6).toFixed(1) + " MB");
console.log(md);
