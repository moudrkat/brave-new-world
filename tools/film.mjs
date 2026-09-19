// Films the real page in a real Chrome, for a post. Not a slideshow: a
// screencast of the actual app while the actual model dreams, typed at human
// speed. The only cut is time: the moments where nothing but a progress bar or
// a token stream moves run faster (RATE), and it says so in the take file.
//
// Chrome must be started with --remote-debugging-port=9333 and WebGPU on
// (see drive.mjs); the model should already be in its cache, because 300 MB
// of progress bar is not the film.
//
//   node tools/film.mjs http://localhost:8765 out/brave-new-world          # desktop, 4:5
//   node tools/film.mjs http://localhost:8765 out/brave-new-world-phone --phone
//   node tools/film.mjs --recompose out/brave-new-world                    # re-cut the last take
import { mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";

const PORT = process.env.CDP_PORT || 9333;
const argv = process.argv.slice(2);
const PHONE = argv.includes("--phone");
const RECOMPOSE = argv.includes("--recompose");
const positional = argv.filter((a) => !a.startsWith("--"));
const [base, out] = RECOMPOSE ? [null, positional[0]] : positional;
const OW = 1080, OH = 1350, FPS = 30, PAPER = "0x07060b";
const VIEW = PHONE ? { width: 390, height: 780, dsf: 3, mobile: true } : { width: 800, height: 1000, dsf: 2, mobile: false };

// two typed wishes as far from each other as the vocabulary allows; the third
// world comes through a door the model offers, and between them a lever and a
// ghost get pressed, so the film shows every way of moving through a world
const WISHES = [
  "a neon city in the rain, everything reflects",
  "a forest of white birches under snow, one red bird",
];
const TYPE_MS = 38, HOLD_ZERO = 1800, HOLD_WORLD = 3000, HOLD_LEVER = 2000, HOLD_END = 2600;
// the waiting runs faster than it happened; the typing and the worlds stay at 1x.
// FILM_RATE=6 node tools/film.mjs --recompose out/brave-new-world re-cuts a take faster without re-recording
const RATE_WAKE = 6, RATE_DREAM = +(process.env.FILM_RATE || 4.5);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const targets = async () => (await fetch(`http://localhost:${PORT}/json`)).json();
async function connect(id) {
  const t = (await targets()).find((x) => x.id === id);
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  let seq = 0; const pending = new Map(); const handlers = {};
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } else if (d.method && handlers[d.method]) handlers[d.method](d.params); };
  const send = (method, params = {}) => new Promise((r) => { const id = ++seq; pending.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
  return { send, on: (m, f) => (handlers[m] = f), close: () => ws.close() };
}

async function film() {
  const dir = out + "-frames";
  rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
  mkdirSync(out.split("/").slice(0, -1).join("/") || ".", { recursive: true });
  const id = (await (await fetch(`http://localhost:${PORT}/json/new?${encodeURIComponent(base.includes("?") ? base : base + "/")}`, { method: "PUT" })).json()).id;
  const s = await connect(id);
  const ev = async (expression) => { const r = await s.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 400)); return r.result?.result?.value; };
  await s.send("Page.enable");
  await s.send("Emulation.setDeviceMetricsOverride", { width: VIEW.width, height: VIEW.height, deviceScaleFactor: VIEW.dsf, mobile: VIEW.mobile });
  if (VIEW.mobile) await s.send("Emulation.setTouchEmulationEnabled", { enabled: true });
  await s.send("Page.bringToFront");
  await sleep(2500);
  const CON = `document.querySelector("bnw-console")`;

  // the camera
  const frames = []; let n = 0;
  s.on("Page.screencastFrame", (p) => {
    const name = `${dir}/f${String(n++).padStart(6, "0")}.jpg`;
    writeFileSync(name, Buffer.from(p.data, "base64"));
    frames.push({ name, t: p.metadata.timestamp });
    s.send("Page.screencastFrameAck", { sessionId: p.sessionId });
  });
  await s.send("Page.startScreencast", { format: "jpeg", quality: 88, maxWidth: VIEW.width * VIEW.dsf, maxHeight: VIEW.height * VIEW.dsf, everyNthFrame: 1 });
  const now = () => Date.now() / 1000;
  const beats = [];
  const beat = (kind, extra = {}) => beats.push({ kind, t: now(), ...extra });
  await sleep(HOLD_ZERO);

  // wake: a click on the page's own button
  beat("wake");
  await ev(`${CON}.shadowRoot.getElementById("wake").click()`);
  for (let i = 0; i < 900; i++) { if (await ev("!!window.__bnw.engine")) break; await sleep(500); }
  if (!(await ev("!!window.__bnw.engine"))) throw new Error("the mind did not wake");
  beat("awake");
  await sleep(1200);

  // typed one character at a time into the page's own input; through CDP's
  // input layer when the window has focus, through the DOM when it does not
  const type = async (text) => {
    const INPUT = `${CON}.shadowRoot.getElementById("wish")`;
    await ev(`${INPUT}.focus()`);
    let dom = false;
    for (const ch of text) {
      if (!dom) { await s.send("Input.insertText", { text: ch }); if ((await ev(`${INPUT}.value`)) === "") dom = true; }
      if (dom) await ev(`(() => { const i = ${INPUT}; i.value += ${JSON.stringify(ch)}; i.dispatchEvent(new Event("input", { bubbles: true })); })()`);
      await sleep(TYPE_MS + (ch === " " ? 40 : 0) + Math.random() * 30);
    }
    await sleep(500);
    await s.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
    await s.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
    await sleep(300);
    if ((await ev(`${INPUT}.value`)) !== "") await ev(`${CON}.submit()`);
  };
  const waitDream = async () => {
    const before = await ev("window.__bnw.worlds.length");
    for (let i = 0; i < 1000; i++) { await sleep(300); if ((await ev("window.__bnw.worlds.length")) > before && !(await ev("window.__bnw.dreaming"))) return; }
    throw new Error("the dream never ended");
  };

  const describe = async () => { const w = await ev(`JSON.stringify((w => ({ wish: w.wish, title: w.spec?.title, side: w.spec?.console.side, tone: w.spec?.console.tone, shape: w.spec?.console.shape, buttons: w.spec?.console.buttons, next: w.spec?.next, ghosts: (w.ghosts || []).map(g => g.kind), retries: w.retries, seconds: w.seconds, tokens: w.tokens?.length }))(window.__bnw.worlds.at(-1)))`); beat("world", { world: JSON.parse(w) }); console.log("  → " + w); };
  // a solid lever, i.e. one that changes this world rather than asking for another
  const pressLever = async () => {
    const label = await ev(`(() => { const b = [...${CON}.shadowRoot.querySelectorAll(".act")].find(b => /set |add |remove |more |fewer /.test(b.title)); return b ? b.textContent : ""; })()`);
    if (!label) return false;
    beat("lever", { label });
    await ev(`[...${CON}.shadowRoot.querySelectorAll(".act")].find(b => b.textContent === ${JSON.stringify(label)}).click()`);
    await sleep(HOLD_LEVER);
    console.log(`  pressed "${label}"`);
    return true;
  };
  const walkIntoGhost = async () => {
    const kind = await ev(`document.querySelector(".el.ghost")?.dataset.kind || ""`);
    if (!kind) return false;
    beat("ghost", { kind });
    await ev(`(() => { const g = document.querySelector(".el.ghost"); const r = g.getBoundingClientRect(); g.dispatchEvent(new MouseEvent("click", { bubbles: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 })); })()`);
    beat("dream", { wish: "ghost: " + kind });
    await waitDream();
    await describe();
    await sleep(HOLD_WORLD);
    return true;
  };
  // a solid thing in the scene, tapped: the camera leans in while the next world is dreamt
  const walkToThing = async () => {
    const kind = await ev(`(() => { const els = [...document.querySelectorAll(".el:not(.ghost)")].filter(e => { const r = e.getBoundingClientRect(); return r.width > 30 && r.top > 40 && r.bottom < innerHeight * 0.7; }); return els.length ? els[Math.floor(els.length / 2)].dataset.kind : ""; })()`);
    if (!kind) return false;
    beat("walk", { kind });
    await ev(`(() => { const g = [...document.querySelectorAll(".el:not(.ghost)")].find(e => e.dataset.kind === ${JSON.stringify(kind)}); const r = g.getBoundingClientRect(); g.dispatchEvent(new MouseEvent("click", { bubbles: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 })); })()`);
    beat("dream", { wish: "walk to the " + kind });
    await waitDream();
    await describe();
    await sleep(HOLD_WORLD);
    return true;
  };
  const takeDoor = async () => {
    if (!(await ev(`!!${CON}.shadowRoot.querySelector(".door")`))) return false;
    // the door it was surest of is being dreamt ahead: wait for it, so the film shows a world that was there before it was chosen
    beat("ahead");
    for (let i = 0; i < 120; i++) { if (await ev(`!!${CON}.shadowRoot.querySelector(".door.ready")`)) break; await sleep(400); }
    const ready = await ev(`!!${CON}.shadowRoot.querySelector(".door.ready")`);
    const door = await ev(`(${CON}.shadowRoot.querySelector(".door.ready") || ${CON}.shadowRoot.querySelector(".door")).textContent`);
    beat("door", { door, ready });
    await sleep(900);
    await ev(`(${CON}.shadowRoot.querySelector(".door.ready") || ${CON}.shadowRoot.querySelector(".door")).click()`);
    beat("dream", { wish: "door: " + door });
    await waitDream();
    await describe();
    await sleep(HOLD_WORLD);
    return true;
  };

  for (let k = 0; k < WISHES.length; k++) {
    beat("type", { wish: WISHES[k] });
    await type(WISHES[k]);
    beat("dream", { wish: WISHES[k] });
    await waitDream();
    await describe();
    await sleep(HOLD_WORLD);
    if (k === 0) { await pressLever(); await walkToThing(); }
    if (k === 1) { if (!(await walkIntoGhost())) await pressLever(); }
  }
  if (!(await takeDoor())) { beat("type", { wish: "a desert at noon, three black pyramids" }); await type("a desert at noon, three black pyramids"); beat("dream", {}); await waitDream(); await describe(); await sleep(HOLD_WORLD); }
  await sleep(HOLD_END);
  beat("end");
  await s.send("Page.stopScreencast");
  await sleep(300);
  s.close();
  await fetch(`http://localhost:${PORT}/json/close/${id}`);
  const take = { frames: frames.length, t0: frames[0]?.t, beats, view: VIEW };
  writeFileSync(out + ".take.json", JSON.stringify(take, null, 1));
  writeFileSync(out + ".frames.json", JSON.stringify(frames));
  console.log(`${frames.length} frames over ${(frames.at(-1).t - frames[0].t).toFixed(1)} s`);
  compose();
}

// From frames with timestamps to a 30 fps 4:5 video. Segments where only the
// model works (waking, dreaming) run RATE times faster: each frame's duration
// is divided, nothing is dropped and nothing is drawn that was not on screen.
function compose() {
  const take = JSON.parse(readFileSync(out + ".take.json", "utf8"));
  const frames = JSON.parse(readFileSync(out + ".frames.json", "utf8"));
  const fast = [];
  const b = take.beats;
  for (let i = 0; i < b.length; i++) {
    if (b[i].kind === "wake") fast.push([b[i].t + 0.6, b[i + 1].t - 0.3, RATE_WAKE]);
    if (b[i].kind === "dream") fast.push([b[i].t + 1.5, b[i + 1].t - 1.2, RATE_DREAM]);
    if (b[i].kind === "ahead") fast.push([b[i].t + 1.0, b[i + 1].t - 0.6, RATE_DREAM]);
  }
  const rateAt = (t) => { for (const [a, z, r] of fast) if (t >= a && t < z) return r; return 1; };
  let list = "ffconcat version 1.0\n", total = 0;
  for (let i = 0; i < frames.length; i++) {
    const dur = (i + 1 < frames.length ? frames[i + 1].t - frames[i].t : 1 / FPS) / rateAt(frames[i].t);
    if (dur <= 0) continue;
    list += `file '${frames[i].name.split("/").pop()}'\nduration ${dur.toFixed(4)}\n`;
    total += dur;
  }
  list += `file '${frames.at(-1).name.split("/").pop()}'\n`;
  writeFileSync(out + "-frames/list.ffconcat", list);
  const vf = `fps=${FPS},scale=${OW}:${OH}:force_original_aspect_ratio=decrease:flags=lanczos,pad=${OW}:${OH}:(ow-iw)/2:(oh-ih)/2:color=${PAPER},format=yuv420p`;
  execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", out + "-frames/list.ffconcat", "-vf", vf, "-c:v", "libx264", "-profile:v", "high", "-level", "4.0", "-preset", "slow", "-crf", "19", "-movflags", "+faststart", "-an", out + ".mp4"], { stdio: "inherit" });
  console.log(`${out}.mp4 · ${total.toFixed(1)} s (was ${(frames.at(-1).t - frames[0].t).toFixed(1)} s) · ` + execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration,size", "-of", "csv=p=0", out + ".mp4"]).toString().trim());
}

if (RECOMPOSE) compose(); else await film();
