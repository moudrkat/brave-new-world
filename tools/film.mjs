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
const TYPE_MS = 38, HOLD_ZERO = 1800, HOLD_WORLD = 3000, HOLD_LEVER = 2000, HOLD_END = 1200, HOLD_HEAD = 4200;
const LAST = "the brave new world"; // the film ends on whatever the model makes of its own title
// the waiting runs faster than it happened; the typing and the worlds stay at 1x.
// FILM_RATE=6 node tools/film.mjs --recompose out/brave-new-world re-cuts a take faster without re-recording
const RATE_WAKE = 6, RATE_DREAM = +(process.env.FILM_RATE || 4.5), RATE_HOLD = +(process.env.FILM_HOLD || 1); // FILM_HOLD=1.6 tightens the pauses on a world too

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const targets = async () => (await fetch(`http://localhost:${PORT}/json`)).json();
async function connect(id) {
  const t = (await targets()).find((x) => x.id === id);
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  let seq = 0; const pending = new Map(); const handlers = {}; let closed = false;
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id).res(d); pending.delete(d.id); } else if (d.method && handlers[d.method]) handlers[d.method](d.params); };
  // a dropped connection must fail loudly, not leave the take awaiting a reply that never comes
  ws.onclose = () => { if (closed) return; console.error("devtools connection closed mid-take"); for (const p of pending.values()) p.rej(new Error("devtools closed")); pending.clear(); process.exitCode = 3; };
  ws.onerror = (e) => console.error("devtools error", e?.message || e);
  const send = (method, params = {}) => new Promise((res, rej) => { const id = ++seq; pending.set(id, { res, rej }); try { ws.send(JSON.stringify({ id, method, params })); } catch (e) { pending.delete(id); rej(e); } });
  return { send, on: (m, f) => (handlers[m] = f), close: () => { closed = true; ws.close(); } };
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
  // a screencast shows no pointer, so every press draws its own: a ring that expands where the finger landed
  await ev(`(() => { const st = document.createElement("style"); st.textContent = ".film-ring{position:fixed;width:18px;height:18px;margin:-9px 0 0 -9px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 2px rgba(0,0,0,.35),0 0 18px rgba(255,255,255,.8);pointer-events:none;z-index:2147483646;animation:film-ring .8s ease-out forwards}@keyframes film-ring{from{transform:scale(.4);opacity:1}to{transform:scale(3.2);opacity:0}}"; document.head.appendChild(st); window.__ring = (x, y) => { const r = document.createElement("i"); r.className = "film-ring"; r.style.left = x + "px"; r.style.top = y + "px"; document.body.appendChild(r); setTimeout(() => r.remove(), 900); }; })()`);
  const press = async (x, y) => {
    await ev(`window.__ring && window.__ring(${x}, ${y})`);
    await sleep(350);
    if (VIEW.mobile) { await s.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] }); await s.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); }
    else { await s.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y }); await s.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 }); await s.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 }); }
  };
  // the centre of the first element matching a selector that is really under the cursor there
  const spot = async (sel, root = "document") => JSON.parse(await ev(`JSON.stringify((() => { for (const el of ${root}.querySelectorAll(${JSON.stringify(sel)})) { const b = el.getBoundingClientRect(); if (b.width < 4) continue; for (let gy = 0.25; gy <= 0.75; gy += 0.25) for (let gx = 0.25; gx <= 0.75; gx += 0.25) { const x = b.x + b.width * gx, y = b.y + b.height * gy; const h = document.elementFromPoint(x, y); if (h && (h === el || el.contains(h))) return { x, y }; } } return null; })())`));
  const pressSel = async (sel, root = "document") => { const p = await spot(sel, root); if (!p) return false; await press(p.x, p.y); return true; };

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
  const describe = async () => { const w = await ev(`JSON.stringify((w => ({ wish: w.wish, title: w.spec?.title, side: w.spec?.console.side, tone: w.spec?.console.tone, shape: w.spec?.console.shape, buttons: w.spec?.console.buttons, next: w.spec?.next, ghosts: (w.ghosts || []).map(g => g.kind), retries: w.retries, seconds: w.seconds, tokens: w.tokens?.length }))(window.__bnw.worlds.at(-1)))`); beat("world", { world: JSON.parse(w) }); console.log("  → " + w); };
  await sleep(HOLD_ZERO);
  // the page begins moving by itself: one of its remembered dreams. The film waits for it, then wakes the mind.
  beat("uninvited");
  for (let i = 0; i < 80; i++) { await sleep(250); if (await ev("window.__bnw.worlds.length > 1 && !window.__bnw.dreaming")) break; }
  await describe();
  await sleep(HOLD_WORLD);

  // wake: a click on the page's own button
  beat("wake");
  if (!(await pressSel("#wake", `${CON}.shadowRoot`))) await ev(`${CON}.shadowRoot.getElementById("wake").click()`);
  for (let i = 0; i < 900; i++) { if (await ev("!!window.__bnw.engine")) break; await sleep(500); }
  if (!(await ev("!!window.__bnw.engine"))) throw new Error("the mind did not wake");
  beat("awake");
  await sleep(1200);

  // typed one character at a time into the page's own input; through CDP's
  // input layer when the window has focus, through the DOM when it does not
  const type = async (text) => {
    const INPUT = `${CON}.shadowRoot.getElementById("wish")`;
    await pressSel("#wish", `${CON}.shadowRoot`);
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
  // counted before the action that starts the dream: a door dreamt ahead
  // lands its world synchronously, and counting afterwards would wait forever
  const count = () => ev("window.__bnw.worlds.length");
  const waitDream = async (before) => {
    for (let i = 0; i < 1000; i++) { await sleep(300); if ((await count()) > before && !(await ev("window.__bnw.dreaming"))) return; }
    throw new Error("the dream never ended");
  };

  // a solid lever, i.e. one that changes this world rather than asking for another
  // a lever hangs in the world now: press one that changes this world, visibly
  const pressLever = async () => {
    const label = await ev(`(() => { const l = [...document.querySelectorAll(".lever")].find(l => /^set |^add |^remove |^more |^fewer /.test(l.dataset.action)); return l ? l.querySelector(".tag").textContent : ""; })()`);
    if (!label) return false;
    beat("lever", { label });
    const p = await spot(".lever .tag");
    if (p) await press(p.x, p.y); else await ev(`[...document.querySelectorAll(".lever")].find(l => l.querySelector(".tag").textContent === ${JSON.stringify(label)}).click()`);
    await sleep(HOLD_LEVER);
    console.log(`  pressed "${label}"`);
    return true;
  };
  // a thing tapped: a surprise; the ground tapped: something grows
  const tapThing = async () => { const p = await spot(".el:not(.ghost):not(.mirror)"); if (!p) return false; beat("surprise"); await press(p.x, p.y); await sleep(HOLD_LEVER); return true; };
  const tapGround = async () => { const g = JSON.parse(await ev(`JSON.stringify(document.querySelector(".ground")?.getBoundingClientRect() || null)`)); if (!g) return false; beat("sprout"); await press(VIEW.width * 0.3, Math.min(g.top + 40, VIEW.height * 0.62)); await sleep(HOLD_LEVER); return true; };
  const walkIntoGhost = async () => {
    const kind = await ev(`document.querySelector(".el.ghost")?.dataset.kind || ""`);
    if (!kind) return false;
    beat("ghost", { ghostKind: kind });
    const before = await count();
    if (!(await pressSel(".el.ghost"))) await ev(`(() => { const g = document.querySelector(".el.ghost"); const r = g.getBoundingClientRect(); g.dispatchEvent(new MouseEvent("click", { bubbles: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 })); })()`);
    beat("dream", { wish: "ghost: " + kind });
    await waitDream(before);
    await describe();
    await sleep(HOLD_WORLD);
    return true;
  };
  // a solid thing in the scene, tapped: the camera leans in while the next world is dreamt
  const walkToThing = async () => {
    const kind = await ev(`(() => { const els = [...document.querySelectorAll(".el:not(.ghost)")].filter(e => { const r = e.getBoundingClientRect(); return r.width > 30 && r.top > 40 && r.bottom < innerHeight * 0.7; }); return els.length ? els[Math.floor(els.length / 2)].dataset.kind : ""; })()`);
    if (!kind) return false;
    beat("walk", { thing: kind });
    const before = await count();
    await ev(`(() => { const g = [...document.querySelectorAll(".el:not(.ghost)")].find(e => e.dataset.kind === ${JSON.stringify(kind)}); const r = g.getBoundingClientRect(); g.dispatchEvent(new MouseEvent("click", { bubbles: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 })); })()`);
    beat("dream", { wish: "walk to the " + kind });
    await waitDream(before);
    await describe();
    await sleep(HOLD_WORLD);
    return true;
  };
  const takeDoor = async () => {
    if (!(await ev(`!!document.querySelector(".sign")`))) return false;
    // the door is being dreamt ahead: wait for it, so the film shows a world that was there before it was chosen
    beat("ahead");
    for (let i = 0; i < 120; i++) { if (await ev(`!!document.querySelector(".sign.ready")`)) break; await sleep(400); }
    const ready = await ev(`!!document.querySelector(".sign.ready")`);
    const door = await ev(`document.querySelector(".sign")?.dataset.wish || ""`);
    beat("door", { door, ready });
    await sleep(900);
    const before = await count();
    if (!(await pressSel(".sign .board"))) await ev(`document.querySelector(".sign")?.click()`);
    beat("dream", { wish: "door: " + door });
    await waitDream(before);
    await describe();
    await sleep(HOLD_WORLD);
    return true;
  };

  for (let k = 0; k < WISHES.length; k++) {
    beat("type", { wish: WISHES[k] });
    const before = await count();
    await type(WISHES[k]);
    beat("dream", { wish: WISHES[k] });
    await waitDream(before);
    await describe();
    await sleep(HOLD_WORLD);
    if (k === 0) { await pressLever(); await tapThing(); await tapGround(); }
    if (k === 1) { if (!(await walkIntoGhost())) await pressLever(); }
  }
  if (!(await takeDoor())) { beat("type", { wish: "a desert at noon, three black pyramids" }); const before = await count(); await type("a desert at noon, three black pyramids"); beat("dream", {}); await waitDream(before); await describe(); await sleep(HOLD_WORLD); }
  // where it all leads: the model's own answer to the title, whatever it is
  { beat("type", { wish: LAST }); const before = await count(); await type(LAST); beat("dream", { wish: LAST }); await waitDream(before); await describe(); await sleep(HOLD_WORLD + 800); }
  // and a look inside its head, on where it doubted
  { const at = JSON.parse(await ev(`JSON.stringify(${CON}.sky.shogAt())`)); beat("head", { at }); await press(at.x, at.y); await sleep(300); if (!(await ev(`!${CON}.shadowRoot.getElementById("head").hidden`))) await ev(`${CON}.openHead(true)`); await sleep(HOLD_HEAD); }
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
    if (b[i].kind === "world" && b[i + 1] && RATE_HOLD !== 1) fast.push([b[i].t + 1.4, b[i + 1].t - 0.2, RATE_HOLD]);
  }
  // FILM_DROP=walk,ghost cuts whole beats out: from the tap to the end of the world it led to
  for (const kind of (process.env.FILM_DROP || "").split(",").filter(Boolean)) {
    const i = b.findIndex((x) => x.kind === kind);
    if (i < 0) continue;
    let j = i + 1; while (j < b.length && !["type", "door", "ahead", "lever", "walk", "ghost", "head", "end"].includes(b[j].kind)) j++;
    fast.push([b[i].t - 0.2, b[j].t - 0.2, 0]);
  }
  const rateAt = (t) => { for (const [a, z, r] of fast) if (t >= a && t < z) return r; return 1; };
  let list = "ffconcat version 1.0\n", total = 0;
  for (let i = 0; i < frames.length; i++) {
    const rate = rateAt(frames[i].t);
    if (rate === 0) continue; // dropped
    const dur = (i + 1 < frames.length ? frames[i + 1].t - frames[i].t : 1 / FPS) / rate;
    if (dur <= 0) continue;
    list += `file '${frames[i].name.split("/").pop()}'\nduration ${dur.toFixed(4)}\n`;
    total += dur;
  }
  list += `file '${frames.at(-1).name.split("/").pop()}'\n`;
  writeFileSync(out + "-frames/list.ffconcat", list);
  const vf = `fps=${FPS},scale=${OW}:${OH}:force_original_aspect_ratio=decrease:flags=lanczos,pad=${OW}:${OH}:(ow-iw)/2:(oh-ih)/2:color=${PAPER},format=yuv420p`;
  const target = (process.env.FILM_OUT || out) + ".mp4";
  execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", out + "-frames/list.ffconcat", "-vf", vf, "-c:v", "libx264", "-profile:v", "high", "-level", "4.0", "-preset", "slow", "-crf", "19", "-movflags", "+faststart", "-an", target], { stdio: "inherit" });
  console.log(`${target} · ${total.toFixed(1)} s (was ${(frames.at(-1).t - frames[0].t).toFixed(1)} s) · ` + execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration,size", "-of", "csv=p=0", target]).toString().trim());
}

if (RECOMPOSE) compose(); else await film();
