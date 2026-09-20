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
// captured at the output size, not above it: while the model computes on the GPU, a screencast
// of 1600x2000 stalls for good; 1080x1350 keeps 60 frames a second through a whole dream
const VIEW = PHONE ? { width: 390, height: 780, dsf: 1.75, mobile: true } : { width: 800, height: 1000, dsf: 1.35, mobile: false };

// two typed wishes as far from each other as the vocabulary allows; the third
// world comes through a door the model offers, and between them a lever and a
// ghost get pressed, so the film shows every way of moving through a world
const WISHES = [
  "a neon city in the rain, everything reflects",
  "a forest of white birches under snow, bright morning, one red bird",
];
// the page opens on one of its remembered dreams; the film must not then type the same wish, so
// each typed wish has an understudy for when the opening already showed it, and so has the door's fallback
const UNDERSTUDY = { "a neon city in the rain, everything reflects": "a black and gold ballroom, empty, one candle", "a desert at noon, three black pyramids": "a hospital for tired stars" };
let shown = ""; // the wish of the dream the page opened on
const fresh = (wish) => (shown && wish.split(",")[0] && shown.includes(wish.split(",")[0]) ? UNDERSTUDY[wish] || wish : wish);
const TYPE_MS = 38, HOLD_ZERO = 1800, HOLD_WORLD = 3000, HOLD_LEVER = 2000, HOLD_END = 1200, HOLD_HEAD = 4200;
const LAST = "the brave new world"; // the film ends on whatever the model makes of its own title
// the waiting runs faster than it happened; the typing and the worlds stay at 1x.
// FILM_RATE=6 node tools/film.mjs --recompose out/brave-new-world re-cuts a take faster without re-recording
// the world forms while the model writes it, so a dream is no longer a wait: it runs only a little faster than it happened
const RATE_WAKE = 6, RATE_DREAM = +(process.env.FILM_RATE || 2.5), RATE_HOLD = +(process.env.FILM_HOLD || 1.3);
const RATE_FIRST = +(process.env.FILM_FIRST || Math.min(RATE_DREAM, 3)); // the first typed world forming is the moment; it is hurried least
const RATE_TAPS = +(process.env.FILM_TAPS || 1), RATE_HEAD = +(process.env.FILM_HEAD || 1); // FILM_TAPS=1.5 tightens the pauses between taps; FILM_HEAD=2 shortens the look inside // FILM_HOLD=1.6 tightens the pauses on a world too

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
  const send = (method, params = {}) => new Promise((res, rej) => { const id = ++seq; const timer = setTimeout(() => { if (pending.has(id)) { pending.delete(id); rej(new Error(`devtools did not answer ${method} in 90 s`)); } }, 90000); pending.set(id, { res: (v) => { clearTimeout(timer); res(v); }, rej: (e) => { clearTimeout(timer); rej(e); } }); try { ws.send(JSON.stringify({ id, method, params })); } catch (e) { pending.delete(id); rej(e); } });
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
  let lastFrameAt = Date.now(), perSec = 0;
  s.on("Page.screencastFrame", (p) => {
    try {
      const name = `${dir}/f${String(n++).padStart(6, "0")}.jpg`;
      writeFileSync(name, Buffer.from(p.data, "base64"));
      frames.push({ name, t: p.metadata.timestamp });
      lastFrameAt = Date.now(); perSec++;
    } catch (e) { console.error("frame not kept:", e?.message || e); }
    s.send("Page.screencastFrameAck", { sessionId: p.sessionId }).catch((e) => console.error("ack failed:", e?.message || e));
  });
  // The camera must not stop quietly. On this machine the screencast can stall for good once the
  // model is on the GPU; screenshots keep working at six or seven a second. So when frames stop,
  // the take says so, polls screenshots instead, and keeps asking for the screencast back.
  // FILM_POLL=1 films by screenshots from the start (to check that path); FILM_TRACE=1 logs frames/s.
  let polling = false, rolling = true, screencastOn = true;
  const restartScreencast = async () => { try { if (screencastOn) await s.send("Page.stopScreencast"); screencastOn = false; await s.send("Page.startScreencast", { format: "jpeg", quality: 88, maxWidth: VIEW.width * VIEW.dsf, maxHeight: VIEW.height * VIEW.dsf, everyNthFrame: 1 }); screencastOn = true; } catch (e) { console.error("screencast restart failed:", e?.message || e); } };
  const poll = async () => {
    if (polling) return; polling = true; let shots = 0;
    console.error("camera: polling screenshots");
    while (rolling && polling) {
      try { const r = await s.send("Page.captureScreenshot", { format: "jpeg", quality: 88 }); if (r.result?.data) { const name = `${dir}/f${String(n++).padStart(6, "0")}.jpg`; writeFileSync(name, Buffer.from(r.result.data, "base64")); frames.push({ name, t: Date.now() / 1000 }); shots++; perSec++; } }
      catch (e) { console.error("screenshot failed:", e?.message || e); await sleep(300); }
      if (screencastOn && Date.now() - lastFrameAt < 500) { polling = false; console.error(`camera: screencast is back after ${shots} screenshots`); }
    }
  };
  const camera = setInterval(async () => {
    if (process.env.FILM_TRACE) console.error(`camera ${perSec} frames/s${polling ? " (polling)" : ""}`);
    perSec = 0;
    if (!polling && Date.now() - lastFrameAt > 1500) { console.error(`no frames for ${((Date.now() - lastFrameAt) / 1000).toFixed(1)} s`); poll(); }
    if (polling && (n % 60) < 8) restartScreencast(); // every few seconds, ask for the screencast again
  }, 1000);
  if (process.env.FILM_POLL) { await s.send("Page.stopScreencast"); screencastOn = false; poll(); }
  await s.send("Page.startScreencast", { format: "jpeg", quality: 88, maxWidth: VIEW.width * VIEW.dsf, maxHeight: VIEW.height * VIEW.dsf, everyNthFrame: 1 });
  const now = () => Date.now() / 1000;
  const beats = [];
  const beat = (kind, extra = {}) => beats.push({ kind, t: now(), ...extra });
  const describe = async () => { const w = await ev(`JSON.stringify((w => ({ wish: w.wish, title: w.spec?.title, side: w.spec?.console.side, tone: w.spec?.console.tone, shape: w.spec?.console.shape, buttons: w.spec?.console.buttons, next: w.spec?.next, ghosts: (w.ghosts || []).map(g => g.kind), retries: w.retries, seconds: w.seconds, tokens: w.tokens?.length }))(window.__bnw.worlds.at(-1)))`); beat("world", { world: JSON.parse(w) }); console.log("  → " + w); };
  const deadline = setTimeout(() => { console.error("the take ran past nine minutes; keeping what was filmed"); process.emitWarning("deadline"); rolling = false; }, 9 * 60 * 1000);
  try {
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
    // never type over a dream (a walk, a fork) or into a line that still holds the last wish
    for (let i = 0; i < 200; i++) { if (!(await ev("window.__bnw.dreaming"))) break; await sleep(300); }
    await ev(`(() => { const i = ${INPUT}; i.value = ""; i.dispatchEvent(new Event("input", { bubbles: true })); })()`);
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
  const waitDream = async (before, limit = 500) => {
    for (let i = 0; i < limit; i++) { await sleep(300); if ((await count()) > before && !(await ev("window.__bnw.dreaming"))) return true; }
    return false; // the dream never ended, or never began: the take goes on without it
  };

  // a solid lever, i.e. one that changes this world rather than asking for another
  // a lever hangs in the world now: press one that changes this world, visibly
  const pressLever = async () => {
    const label = await ev(`(() => { const l = [...document.querySelectorAll(".lever")].find(l => /^set |^add |^remove |^more |^fewer /.test(l.dataset.action)); return l ? l.querySelector(".tag").textContent : ""; })()`);
    if (!label) return false;
    beat("lever", { label });
    // press that lever, not the first one on screen (which may be the model's undo)
    const p = JSON.parse(await ev(`JSON.stringify((() => { const l = [...document.querySelectorAll(".lever")].find(l => l.querySelector(".tag").textContent === ${JSON.stringify(label)}); if (!l) return null; const b = l.querySelector(".tag").getBoundingClientRect(); const x = b.left + b.width / 2, y = b.top + b.height / 2; return document.elementFromPoint(x, y)?.closest(".lever") === l ? { x, y } : null; })())`));
    if (p) await press(p.x, p.y); else await ev(`[...document.querySelectorAll(".lever")].find(l => l.querySelector(".tag").textContent === ${JSON.stringify(label)})?.click()`);
    await sleep(HOLD_LEVER);
    console.log(`  pressed "${label}"`);
    return true;
  };
  // a thing tapped: a surprise; the ground tapped: something grows
  const tapThing = async () => { const p = await spot(".el:not(.ghost):not(.mirror)"); if (!p) return false; const kind = await ev(`document.elementFromPoint(${p.x}, ${p.y})?.closest(".el")?.dataset.kind || ""`); beat("surprise", { kind }); await press(p.x, p.y); await sleep(HOLD_LEVER); return { kind }; };
  const tapGround = async () => {
    const g = JSON.parse(await ev(`JSON.stringify(document.querySelector(".ground")?.getBoundingClientRect() || null)`)); if (!g) return false;
    const y = Math.min(g.top + 40, VIEW.height * 0.62);
    // a spot on the ground with nothing standing on it, so the tap sprouts instead of walking to a thing
    const x = JSON.parse(await ev(`JSON.stringify((() => { const boxes = [...document.querySelectorAll(".el, .lever, .sign, .words")].map((e) => e.getBoundingClientRect()); for (const fx of [0.3, 0.7, 0.15, 0.85, 0.5, 0.4, 0.6]) { const x = ${VIEW.width} * fx; if (!boxes.some((b) => x > b.left - 8 && x < b.right + 8 && ${y} > b.top - 8 && ${y} < b.bottom + 8)) return x; } return null; })())`));
    if (x == null) return false;
    beat("sprout"); await press(x, y); await sleep(HOLD_LEVER); return true;
  };
  // a tap on empty sky: a shooting star (every third one turns the weather)
  const tapSky = async () => {
    const y = VIEW.height * 0.2;
    const x = JSON.parse(await ev(`JSON.stringify((() => { const boxes = [...document.querySelectorAll(".el, .lever, .sign, .words")].map((e) => e.getBoundingClientRect()); for (const fx of [0.5, 0.35, 0.65, 0.25, 0.75, 0.15, 0.85]) { const x = ${VIEW.width} * fx; if (!boxes.some((b) => x > b.left - 8 && x < b.right + 8 && ${y} > b.top - 8 && ${y} < b.bottom + 8)) return x; } return null; })())`));
    if (x == null) return false;
    beat("sky"); await press(x, y); await sleep(HOLD_LEVER * 0.6); return true;
  };
  // a tap on the title: the world changes its hand
  const tapTitle = async () => { const p = await spot(".words h1"); if (!p) return false; beat("font"); await press(p.x, p.y); await sleep(HOLD_LEVER); return true; };
  // a second thing, a different one from the first
  const tapAnotherThing = async (skipKind) => { const p = JSON.parse(await ev(`JSON.stringify((() => { for (const el of document.querySelectorAll(".el:not(.ghost):not(.mirror)")) { if (el.dataset.kind === ${JSON.stringify(skipKind)}) continue; const b = el.getBoundingClientRect(); if (b.width < 8 || b.top < 40 || b.bottom > ${VIEW.height} - 60) continue; const x = b.left + b.width / 2, y = b.top + b.height / 2; if (document.elementFromPoint(x, y)?.closest(".el") === el) return { x, y, kind: el.dataset.kind }; } return null; })())`)); if (!p) return false; beat("surprise", { kind: p.kind }); await press(p.x, p.y); await sleep(HOLD_LEVER); return true; };
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
  // walking: a thing tapped twice within a moment is walked to; the camera leans into it while the next world is dreamt
  const walkToThing = async () => {
    const p = JSON.parse(await ev(`JSON.stringify((() => { for (const el of document.querySelectorAll(".el:not(.ghost):not(.mirror)")) { const b = el.getBoundingClientRect(); if (b.width < 30 || b.top < 40 || b.bottom > ${VIEW.height} - 60) continue; const x = b.left + b.width / 2, y = b.top + b.height / 2; if (document.elementFromPoint(x, y)?.closest(".el") === el) return { x, y, kind: el.dataset.kind }; } return null; })())`));
    if (!p) return false;
    beat("walk", { thing: p.kind });
    const before = await count();
    await press(p.x, p.y); await sleep(900); await press(p.x, p.y);
    beat("dream", { wish: "walk to the " + p.kind });
    if (!(await waitDream(before, 400))) { console.error("the walk led nowhere in time"); return false; }
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
    // a press that did not take (the sign moved, or was mid-transition) is wished by hand instead
    await sleep(2500);
    if ((await count()) === before && !(await ev("window.__bnw.dreaming")) && door) { console.error("the door press did not take, wishing it by hand"); await ev(`(() => { const c = ${CON}; c.wish = ${JSON.stringify(door)}; c.submit(); })()`); }
    if (!(await waitDream(before, 400))) { console.error("the door led nowhere in time"); return false; }
    await describe();
    await sleep(HOLD_WORLD);
    return true;
  };

  shown = (await ev(`window.__bnw.worlds[1]?.wish || ""`)) || "";
  for (let k = 0; k < WISHES.length; k++) {
    const wish = fresh(WISHES[k]);
    beat("type", { wish });
    const before = await count();
    await type(wish);
    beat("dream", { wish });
    await waitDream(before);
    await describe();
    await sleep(HOLD_WORLD);
    if (k === 0) { await pressLever(); const first = await tapThing(); await tapSky(); await tapGround(); await tapTitle(); await tapAnotherThing(first?.kind || ""); await walkToThing(); }
    if (k === 1) { if (!(await walkIntoGhost())) await pressLever(); }
  }
  if (!(await takeDoor())) { const w2 = fresh("a desert at noon, three black pyramids"); beat("type", { wish: w2 }); const before = await count(); await type(w2); beat("dream", {}); await waitDream(before); await describe(); await sleep(HOLD_WORLD); }
  // where it all leads: the model's own answer to the title, whatever it is
  { beat("type", { wish: LAST }); const before = await count(); await type(LAST); beat("dream", { wish: LAST }); await waitDream(before); await describe(); await sleep(HOLD_WORLD + 800); }
  // and a look inside its head, on where it doubted
  { const at = JSON.parse(await ev(`JSON.stringify(${CON}.sky.shogAt())`)); beat("head", { at }); await press(at.x, at.y); await sleep(300); if (!(await ev(`!${CON}.shadowRoot.getElementById("head").hidden`))) await ev(`${CON}.openHead(true)`); await sleep(HOLD_HEAD); }
  await sleep(HOLD_END);
  } catch (e) { console.error("the take broke, keeping what was filmed:", e?.message || e); }
  clearTimeout(deadline);
  beat("end");
  clearInterval(camera); rolling = false; polling = false;
  if (screencastOn) await s.send("Page.stopScreencast");
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
  const firstType = b.findIndex((x) => x.kind === "type");
  const firstDream = b.findIndex((x, i) => i > firstType && x.kind === "dream");
  for (let i = 0; i < b.length; i++) {
    if (b[i].kind === "wake") fast.push([b[i].t + 0.6, b[i + 1].t - 0.3, RATE_WAKE]);
    if (b[i].kind === "dream") fast.push([b[i].t + 1.5, b[i + 1].t - 1.2, firstDream === i ? RATE_FIRST : RATE_DREAM]);
    if (b[i].kind === "ahead") fast.push([b[i].t + 1.0, b[i + 1].t - 0.6, RATE_DREAM]);
    if (b[i].kind === "world" && b[i + 1] && RATE_HOLD !== 1) fast.push([b[i].t + 1.4, b[i + 1].t - 0.2, RATE_HOLD]);
    if (["lever", "surprise", "sky", "sprout", "font"].includes(b[i].kind) && b[i + 1] && RATE_TAPS !== 1) fast.push([b[i].t + 0.7, b[i + 1].t - 0.1, RATE_TAPS]);
    if (b[i].kind === "head" && b[i + 1] && RATE_HEAD !== 1) fast.push([b[i].t + 1.5, b[i + 1].t - 0.3, RATE_HEAD]);
  }
  // FILM_DROP=walk,ghost cuts whole beats out: from the tap to the end of the world it led to
  for (const spec of (process.env.FILM_DROP || "").split(",").filter(Boolean)) {
    const [kind, nth] = spec.split("#"); let seen = 0;
    const i = b.findIndex((x) => x.kind === kind && ++seen === +(nth || 1));
    if (i < 0) continue;
    let j = i + 1; while (j < b.length && !["type", "door", "ahead", "lever", "walk", "ghost", "head", "end"].includes(b[j].kind)) j++;
    fast.push([b[i].t - 0.2, b[j].t - 0.2, 0]);
  }
  // FILM_WINDOWS="14-17@1.5,17-44@3" keeps only these stretches of the take (seconds from the first
  // frame, each at its own rate) and nothing else: a clip, not the whole film
  const windows = (process.env.FILM_WINDOWS || "").split(",").filter(Boolean).map((w) => { const [span, r] = w.split("@"); const [a, z] = span.split("-").map(Number); return [frames[0].t + a, frames[0].t + z, +(r || 1)]; });
  const rateAt = (t) => { if (windows.length) { for (const [a, z, r] of windows) if (t >= a && t < z) return r; return 0; } for (const [a, z, r] of fast) if (t >= a && t < z) return r; return 1; };
  // the camera pauses for a moment after a keystroke or a press; a frame held that long is a freeze, so no frame holds past MAX_HOLD
  const MAX_HOLD = +(process.env.FILM_MAXHOLD || 0.3);
  let list = "ffconcat version 1.0\n", total = 0;
  for (let i = 0; i < frames.length; i++) {
    const rate = rateAt(frames[i].t);
    if (rate === 0) continue; // dropped
    const dur = Math.min(MAX_HOLD, (i + 1 < frames.length ? frames[i + 1].t - frames[i].t : 1 / FPS) / rate);
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
