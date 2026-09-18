// Drives a Chrome started with --remote-debugging-port=9333 over the DevTools
// protocol, with nothing but Node's built-in WebSocket. Used to run the app and
// the eval on a machine where Chrome needs flags for WebGPU:
//
//   google-chrome --user-data-dir=/tmp/bnw-prof --enable-unsafe-webgpu \
//     --enable-features=Vulkan --remote-debugging-port=9333 about:blank &
//
//   node tools/drive.mjs open  http://localhost:8765/?wish=a+quiet+island
//   node tools/drive.mjs wait  <targetId> "dreamt in" 600
//   node tools/drive.mjs eval  <targetId> "document.title"
//   node tools/drive.mjs shot  <targetId> out.jpg
//   node tools/drive.mjs close <targetId>

const PORT = process.env.CDP_PORT || 9333;
const [cmd, a, b, c] = process.argv.slice(2);

async function targets() {
  return (await fetch(`http://localhost:${PORT}/json`)).json();
}

async function connect(id) {
  const t = (await targets()).find((x) => x.id === id);
  if (!t) throw new Error("no target " + id);
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  let seq = 0;
  const pending = new Map();
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); }
  };
  const send = (method, params = {}) => new Promise((r) => { const id = ++seq; pending.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
  return { send, close: () => ws.close() };
}

async function evaluate(id, expression) {
  const s = await connect(id);
  const r = await s.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  s.close();
  if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || "eval failed");
  return r.result?.result?.value;
}

if (cmd === "open") {
  const r = await fetch(`http://localhost:${PORT}/json/new?${encodeURIComponent(a)}`, { method: "PUT" });
  console.log((await r.json()).id);
} else if (cmd === "list") {
  for (const t of await targets()) if (t.type === "page") console.log(t.id, t.title, t.url);
} else if (cmd === "eval") {
  const v = await evaluate(a, b);
  console.log(typeof v === "string" ? v : JSON.stringify(v));
} else if (cmd === "wait") {
  const re = new RegExp(b);
  const until = Date.now() + (+c || 300) * 1000;
  let last = "";
  while (Date.now() < until) {
    const t = (await targets()).find((x) => x.id === a);
    if (!t) throw new Error("target gone");
    if (t.title !== last) { last = t.title; console.log(new Date().toISOString().slice(11, 19), t.title); }
    if (re.test(t.title)) process.exit(0);
    await new Promise((r) => setTimeout(r, 2000));
  }
  console.log("timeout");
  process.exit(1);
} else if (cmd === "shot") {
  const s = await connect(a);
  await s.send("Page.bringToFront");
  const r = await s.send("Page.captureScreenshot", { format: "jpeg", quality: 75 });
  s.close();
  const { writeFileSync } = await import("node:fs");
  writeFileSync(b, Buffer.from(r.result.data, "base64"));
  console.log("wrote", b);
} else if (cmd === "reload") {
  const s = await connect(a);
  await s.send("Page.reload", { ignoreCache: true });
  s.close();
  console.log("reloaded");
} else if (cmd === "close") {
  await fetch(`http://localhost:${PORT}/json/close/${a}`);
  console.log("closed");
} else {
  console.log("commands: open url | reload id | list | eval id js | wait id regex secs | shot id file | close id");
}
