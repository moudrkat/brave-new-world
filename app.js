import { MODELS, systemFor, userMessage, requestFor, chatOptsFor, extractHtml, dreamToPage, retryMessage, renderWorld, applyAction } from "./mind.js";
import { DEMOS } from "./demos.js";
import "./console.js";

const PARAMS = new URLSearchParams(location.search);
const MOCK = PARAMS.has("mock");
const MAX_RETRIES = 2;
// The mind is not a choice on the page: it is the one that measured best for
// its size (evals/). ?model= still picks another for the eval and the curious.
const MODEL = PARAMS.get("model") && MODELS.some((m) => m.id === PARAMS.get("model")) ? PARAMS.get("model") : MODELS[0].id;
const STRATEGY = PARAMS.get("strategy") === "html" ? "html" : "spec";
const WEBLLM = "https://esm.run/@mlc-ai/web-llm@0.2.85";

const con = document.querySelector("bnw-console");
const worldStyle = document.getElementById("world-style");
const worldZero = { html: "<!DOCTYPE html>" + document.documentElement.outerHTML, wish: null };

const state = {
  engine: null,
  modelId: null,
  waking: null, // the promise, so a second press joins the first download
  dreaming: false,
  worlds: [], // { wish, html, spec, issues, retries, tokens, raw }
  current: -1,
  lastRaw: "",
};
window.__bnw = state;

// No WebGPU adapter means software rendering too: no animations, no filters.
(async () => {
  let ok = false;
  try { ok = !!(navigator.gpu && (await navigator.gpu.requestAdapter())); } catch {}
  if (!ok) document.documentElement.classList.add("low-power");
})();

/* ------------------------------------------------------------------ */
/* engine: fetched only when asked, once, into the browser's cache     */
/* ------------------------------------------------------------------ */

// What this browser can run. The prebuilt q4f16 weights need the shader-f16
// feature; a GPU without it gets the q4f32 build of the same model, which is
// larger and slower but the same mind.
async function pickModel() {
  if (!navigator.gpu) throw new Error("this browser has no WebGPU. Chrome, Edge, Safari 26 or a recent Firefox can run the mind; the worlds it already dreamt work anywhere");
  const adapter = await navigator.gpu.requestAdapter().catch(() => null);
  if (!adapter) throw new Error("WebGPU is here but gave no adapter. On Linux Chrome, enable chrome://flags/#enable-unsafe-webgpu and #enable-vulkan");
  let id = MODEL;
  if (!adapter.features.has("shader-f16") && /q4f16_1/.test(id)) id = id.replace("q4f16_1", "q4f32_1");
  return id;
}

const MB = { "Qwen2.5-Coder-0.5B-Instruct-q4f16_1-MLC": 300, "Qwen2.5-Coder-0.5B-Instruct-q4f32_1-MLC": 340 };

function wake() {
  if (state.engine) return Promise.resolve(state.engine);
  if (state.waking) return state.waking;
  state.waking = (async () => {
    try {
      if (MOCK) {
        state.engine = mockEngine();
        state.modelId = MODEL;
        con.setAwake(true);
        con.setStatus("awake · dry run, no model");
        return state.engine;
      }
      const modelId = await pickModel();
      const size = MB[modelId] ? `${MB[modelId]} MB` : "its weights";
      con.setWaking(`fetching ${size} once, into this browser's cache…`);
      con.setStatus("waking · the first time fetches its weights, later visits use the cache");
      const onProgress = (r) => {
        const pct = Math.round((r.progress || 0) * 100);
        con.setProgress(r.progress || 0);
        con.setWaking(`${pct}% · ${(r.text || "").replace(/\[.*?\]/g, "").trim().slice(0, 70) || "fetching"}`);
      };
      const { CreateWebWorkerMLCEngine } = await import(WEBLLM);
      const worker = new Worker(new URL("./worker.js", import.meta.url), { type: "module" });
      state.engine = await CreateWebWorkerMLCEngine(worker, modelId, { initProgressCallback: onProgress }, chatOptsFor(modelId));
      state.modelId = modelId;
      con.setAwake(true);
      con.setStatus("awake · " + modelId.replace(/-MLC$/, "") + " · say what world you want, or just a word");
      con.focus();
      return state.engine;
    } catch (err) {
      con.setAwake(false, "could not wake · " + (err?.message || err));
      con.setStatus(String(err?.message || err), true);
      throw err;
    } finally {
      state.waking = null;
    }
  })();
  return state.waking;
}

/* ------------------------------------------------------------------ */
/* the world takes the page                                            */
/* ------------------------------------------------------------------ */

let applied = "";
let designOf = null;
// One world dissolves into the next. The browser's view transition crossfades
// the page and moves the console from wherever it was to wherever the model
// put it now; a browser without the API just swaps.
function applyWorld(html, opts = {}) {
  if (!html || html === applied) return;
  if (opts.partial || !document.startViewTransition || document.documentElement.classList.contains("low-power")) return swapWorld(html, opts);
  document.startViewTransition(() => swapWorld(html, opts));
}
function swapWorld(html, { partial = false } = {}) {
  applied = html;
  const doc = new DOMParser().parseFromString(html, "text/html");
  const isZero = doc.body?.classList.contains("world-zero");

  // the world's CSS, in our head; its body, as our body; the console follows
  worldStyle.textContent = [...doc.querySelectorAll("style")].filter((s) => s.id !== "world-style" || isZero).map((s) => s.textContent).join("\n");
  for (const a of [...document.body.attributes]) document.body.removeAttribute(a.name);
  for (const a of [...(doc.body?.attributes || [])]) document.body.setAttribute(a.name, a.value);
  for (const a of [...(doc.documentElement.attributes || [])]) if (a.name !== "lang") document.documentElement.setAttribute(a.name, a.value);
  document.body.replaceChildren(...[...(doc.body?.childNodes || [])].filter((n) => !(n.nodeName === "BNW-CONSOLE" || n.nodeName === "SCRIPT")));
  document.body.appendChild(con);
  con.worldActive = !isZero;
  if (!partial) deriveConsoleColors(isZero);
  const side = getComputedStyle(document.documentElement).getPropertyValue("--bnw-side").trim();
  const words = getComputedStyle(document.documentElement).getPropertyValue("--bnw-words").trim();
  if (words) con.dataset.words = words; else delete con.dataset.words;
  if (!partial) con.applyDesign(designOf ? designOf : side === "top" ? { side: "top" } : null);
  window.scrollTo(0, 0);
}

// The model may set --bnw-* on :root. When it did not, the console takes the
// world's own background and text color, and its most saturated color as accent.
function deriveConsoleColors(isZero) {
  for (const v of ["bg", "fg", "accent", "font"]) con.style.removeProperty("--bnw-" + v);
  if (isZero) return;
  const rootVars = getComputedStyle(document.documentElement);
  const has = (v) => rootVars.getPropertyValue("--bnw-" + v).trim() !== "";
  const bodyCs = getComputedStyle(document.body);
  let bg = parseColor(bodyCs.backgroundColor);
  if (!bg || bg.a < 0.5) bg = parseColor(getComputedStyle(document.documentElement).backgroundColor);
  if (!bg || bg.a < 0.5) {
    const big = [...document.body.querySelectorAll("*")].find((e) => { const r = e.getBoundingClientRect(); const c = parseColor(getComputedStyle(e).backgroundColor); return r.width > innerWidth * 0.6 && r.height > innerHeight * 0.4 && c && c.a > 0.5; });
    bg = big ? parseColor(getComputedStyle(big).backgroundColor) : null;
  }
  if (!bg) bg = { r: 7, g: 6, b: 11, a: 1 };
  const lum = (c) => (0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b) / 255;
  const dark = lum(bg) < 0.5;
  let fg = parseColor(bodyCs.color);
  if (!fg || Math.abs(lum(fg) - lum(bg)) < 0.35) fg = dark ? { r: 239, g: 230, b: 214 } : { r: 20, g: 16, b: 24 };
  const colors = (worldStyle.textContent.match(/#[0-9a-f]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)/gi) || []).map(parseColor).filter(Boolean);
  let accent = null, best = 0.25;
  for (const c of colors) {
    const mx = Math.max(c.r, c.g, c.b), mn = Math.min(c.r, c.g, c.b);
    const sat = mx === 0 ? 0 : (mx - mn) / mx;
    const l = lum(c);
    const ok = dark ? l > 0.3 : l < 0.6;
    if (sat > best && ok) { best = sat; accent = c; }
  }
  if (!accent) accent = dark ? { r: 224, g: 164, b: 88 } : { r: 140, g: 80, b: 20 };
  if (!has("bg")) con.style.setProperty("--bnw-bg", `rgba(${bg.r},${bg.g},${bg.b},0.82)`);
  if (!has("fg")) con.style.setProperty("--bnw-fg", `rgb(${fg.r},${fg.g},${fg.b})`);
  if (!has("accent")) con.style.setProperty("--bnw-accent", `rgb(${accent.r},${accent.g},${accent.b})`);
  if (!has("font")) con.style.setProperty("--bnw-font", bodyCs.fontFamily);
}

const probe = document.createElement("span");
function parseColor(str) {
  if (!str) return null;
  probe.style.color = "";
  probe.style.color = str;
  if (!probe.style.color) return null;
  document.head.appendChild(probe);
  const m = getComputedStyle(probe).color.match(/[\d.]+/g);
  probe.remove();
  if (!m) return null;
  return { r: +m[0], g: +m[1], b: +m[2], a: m[3] == null ? 1 : +m[3] };
}

/* ------------------------------------------------------------------ */
/* dreaming                                                            */
/* ------------------------------------------------------------------ */

// The world on screen goes into the conversation, so "make it night" or
// "more birds" is a change to it rather than a new place. A remembered dream
// counts too: it has a spec like any other.
function messagesFor(wish, strategy) {
  const msgs = [{ role: "system", content: systemFor(strategy) }];
  const prev = state.worlds[state.current];
  if (prev && !prev.zero && (strategy === "spec" ? prev.spec : prev.html)) {
    msgs.push({ role: "user", content: prev.wish });
    msgs.push({ role: "assistant", content: strategy === "spec" ? JSON.stringify(prev.spec) : prev.html });
  }
  msgs.push({ role: "user", content: userMessage(wish, strategy) });
  return msgs;
}

async function generate(engine, messages, wish, strategy) {
  const request = requestFor(state.modelId || MODEL, messages, {}, strategy);
  con.temperature = request.temperature;
  let raw = "", n = 0, finish = null, lastPaint = 0;
  const tokens = []; // every token with its offsets and de-tempered alternatives, for the ghosts
  const t0 = performance.now();
  const stream = await engine.chat.completions.create(request);
  for await (const chunk of stream) {
    const choice = chunk.choices?.[0];
    if (choice?.delta?.content) raw += choice.delta.content;
    if (choice?.finish_reason) finish = choice.finish_reason;
    const lps = choice?.logprobs?.content;
    if (lps) for (const lp of lps) { const d = con.addToken(lp); tokens.push({ start: raw.length - lp.token.length, end: raw.length, token: lp.token, p: d.p, alts: d.alts, at: performance.now() - t0 }); n++; }
    const now = performance.now();
    if (now - lastPaint > 800) {
      lastPaint = now;
      con.updateStats(t0, n);
      if (strategy === "html" && /<body/i.test(raw)) applyWorld(extractHtml(raw, wish), { partial: true });
    }
  }
  con.updateStats(t0, n);
  return { raw, finish, n, tokens, seconds: (performance.now() - t0) / 1000 };
}

async function dream(wish) {
  const engine = await wake();
  state.dreaming = true;
  con.setDreaming(true);
  con.setStatus("dreaming · " + wish);

  const strategy = STRATEGY;
  let messages = messagesFor(wish, strategy);
  let report = null, retries = 0, raw = "", t0 = performance.now(), out = null;
  const attempts = [];
  try {
    for (;;) {
      out = await generate(engine, messages, wish, strategy);
      raw = out.raw;
      report = dreamToPage(raw, wish, out.finish, strategy, out.tokens);
      attempts.push({ raw, finish: out.finish, tokens: out.n, seconds: out.seconds, issues: report.issues });
      const bad = report.issues.filter((i) => i.fatal).map((i) => i.kind);
      const fixed = report.issues.filter((i) => !i.fatal).map((i) => i.kind);
      con.setHarness(
        (report.fatal ? "harness: unusable (" + bad.join(", ") + ")" : fixed.length ? "harness: repaired " + fixed.join(", ") : "harness: clean") +
        (retries ? ` · retry ${retries}` : ""),
        report.fatal
      );
      if (!report.fatal || retries >= MAX_RETRIES || !state.dreaming) break;
      retries++;
      con.setStatus(`the page came back broken (${bad.join(", ")}), asking again · ${retries}/${MAX_RETRIES}`);
      messages = [...messages, { role: "assistant", content: raw.slice(0, 4000) }, { role: "user", content: retryMessage(report.issues, strategy) }];
      con.setDreaming(true);
    }
  } catch (err) {
    console.error(err);
    con.setStatus("the dream broke: " + (err?.message || err), true);
  }

  const html = report ? report.html : extractHtml(raw, wish, true);
  state.lastRaw = raw;
  designOf = report?.spec ? { ...report.spec.console, next: report.spec.next } : null;
  applyWorld(html);
  // the world is as restless as the model was unsure
  if (report?.spec) document.documentElement.style.setProperty("--speed", (({ still: 0.001, slow: 1, restless: 2.4 })[report.spec.motion] * (1 + con.doubt * 2.5)).toFixed(2));
  if (report?.ghosts?.length) con.setHarness(con.harnessText + ` · ${report.ghosts.length} ghost${report.ghosts.length > 1 ? "s" : ""} of what it almost placed`);
  state.worlds.push({ wish, html, issues: report?.issues || [], retries, attempts, strategy, spec: report?.spec || null, ghosts: report?.ghosts || [], certainty: report?.certainty || null,
    raw, tokens: out?.tokens || [], seconds: out?.seconds || 0, model: state.modelId, date: new Date().toISOString() });
  state.current = state.worlds.length - 1;
  con.renderHistory(state.worlds, state.current, pick);
  state.dreaming = false;
  con.setDreaming(false);
  con.setStatus(`dreamt in ${((performance.now() - t0) / 1000).toFixed(1)} s` + (retries ? ` after ${retries} ${retries === 1 ? "retry" : "retries"}` : "") + " · the buttons are its idea");
  con.focus();
}

function pick(i) {
  state.current = i;
  designOf = state.worlds[i].spec ? { ...state.worlds[i].spec.console, next: state.worlds[i].spec.next } : null;
  applyWorld(state.worlds[i].html);
  con.renderHistory(state.worlds, state.current, pick);
}

/* ------------------------------------------------------------------ */
/* remembered dreams: real runs, recorded, replayed without a model    */
/* ------------------------------------------------------------------ */

let replaying = 0;
async function playDemo(i) {
  const d = DEMOS[i];
  if (!d || state.dreaming) return;
  const token = ++replaying;
  const spec = d.spec;
  const html = renderWorld(spec, { ghosts: d.ghosts || [], certainty: d.certainty || null });
  designOf = { ...spec.console, next: spec.next };
  con.setDreaming(true);
  con.setStatus("remembering · " + d.wish);
  // the tokens it wrote that day, at their real certainties, faster than it wrote them
  const t0 = performance.now();
  const toks = d.tokens || [];
  for (let k = 0; k < toks.length; k++) {
    if (token !== replaying) return;
    const t = toks[k];
    con.paintToken(t.token, t.p, t.alts || [{ token: t.token, p: t.p }]);
    if (k % 8 === 0) con.updateStats(t0, k + 1, "replayed");
    if (k % 3 === 0) await new Promise((r) => setTimeout(r, 12));
  }
  con.updateStats(t0, toks.length, "replayed");
  applyWorld(html);
  document.documentElement.style.setProperty("--speed", (({ still: 0.001, slow: 1, restless: 2.4 })[spec.motion] * (1 + con.doubt * 2.5)).toFixed(2));
  con.setHarness(`a dream it had on ${(d.date || "").slice(0, 10)} · ${d.model ? d.model.replace(/-MLC$/, "") : "the same mind"} · ${toks.length} tokens in ${(d.seconds || 0).toFixed(1)} s` + (d.ghosts?.length ? ` · ${d.ghosts.length} ghost${d.ghosts.length > 1 ? "s" : ""}` : ""));
  state.worlds.push({ wish: d.wish, html, spec, issues: [], retries: 0, strategy: "spec", ghosts: d.ghosts || [], certainty: d.certainty || null, demo: true });
  state.current = state.worlds.length - 1;
  con.renderHistory(state.worlds, state.current, pick);
  state.dreaming = false;
  con.setDreaming(false);
  con.setStatus("a world it dreamt before · its levers still work · wake it to dream your own");
}
con.setDemos(DEMOS, playDemo);

/* ------------------------------------------------------------------ */
/* the buttons the model invented                                      */
/* ------------------------------------------------------------------ */

// It names the button; the engine does the thing. Some ask the model again,
// the rest are levers on the world's spec, so they work on a remembered dream
// too, without a model.
const SURPRISES = ["a greenhouse on the moon", "a bathhouse for dragons", "the last train before the flood", "a lighthouse in a wheat field", "a violin shop at closing time", "a city where it rains upward", "an orchard on a glacier", "the waiting room of the sea"];
function act(action) {
  const cur = state.worlds[state.current];
  if (state.dreaming) return;
  if (action === "inside") return con.toggleInside();
  if (action === "undo") return state.current > 0 ? pick(state.current - 1) : con.setStatus("nothing before this");
  if (action === "again") { con.wish = cur?.zero ? SURPRISES[0] : cur.wish; return con.submit(); }
  if (action === "surprise") { con.wish = SURPRISES[Math.floor(Math.random() * SURPRISES.length)]; return con.submit(); }
  if (!cur?.spec) return con.setStatus("this world has no such lever");
  const spec = applyAction(cur.spec, action);
  const html = renderWorld(spec, { ghosts: cur.ghosts || [], certainty: cur.certainty || null });
  state.worlds.push({ ...cur, spec, html, wish: cur.wish + " · " + action, zero: false, demo: false });
  state.current = state.worlds.length - 1;
  designOf = { ...spec.console, next: spec.next };
  applyWorld(html);
  con.renderHistory(state.worlds, state.current, pick);
  con.setStatus(action + " · the model named this button, the engine pulled the lever");
}
con.addEventListener("action", (e) => act(e.detail));

con.addEventListener("wake", () => wake().catch(() => {}));
con.addEventListener("wish", (e) => {
  if (state.dreaming) return;
  dream(e.detail).catch((err) => {
    console.error(err);
    if (!con.awake) con.setStatus("wake the mind first, or step into a world it already dreamt", true);
    else con.setStatus("the dream broke: " + (err?.message || err), true);
    state.dreaming = false;
    con.setDreaming(false);
  });
});
con.addEventListener("stop", () => { state.dreaming = false; replaying++; state.engine?.interruptGenerate(); });

/* ------------------------------------------------------------------ */
/* a dry run for browsers without a GPU                                */
/* ------------------------------------------------------------------ */

function pause(ms) {
  if (document.visibilityState === "visible" && document.hasFocus()) return new Promise((r) => setTimeout(r, ms));
  return new Promise((r) => { const ch = new MessageChannel(); ch.port1.onmessage = () => r(); ch.port2.postMessage(0); });
}

function mockEngine() {
  const specDoc = JSON.stringify({ title: "A Quiet Island", time: "dusk", weather: "stars", sky: ["#2b1b4e", "#7a4f8c", "#c98a9a"], ground: "sea", ground_color: "#5e4b8b", ink: "#f6e9dc", accent: "#ffd9a0", font: "serif", text_place: "top", motion: "slow",
    elements: [{ kind: "sun", x: "center", y: "horizon", size: "large", color: "#ffb37a", count: 1 }, { kind: "lighthouse", x: "right", y: "horizon", size: "medium", color: "#f6e9dc", count: 1 }, { kind: "bird", x: "left", y: "high", size: "tiny", color: "#2b1b4e", count: 5 }, { kind: "boat", x: "far-left", y: "ground", size: "small", color: "#3a2a5e", count: 1 }],
    lines: ["The sea keeps its lavender secret.", "One lighthouse counts the evening slowly, and nobody asks it to hurry."],
    console: { side: ["bottom", "top", "left", "right"][Math.floor(Math.random() * 4)], tone: "glass", shape: "pill", width: "wide", prompt: "what should the evening bring?", button: "wish", buttons: [{ label: "let night fall", action: "night" }, { label: "some rain", action: "rain" }, { label: "elsewhere", action: "surprise" }] }, next: ["the lighthouse keeper's room", "the same island at night", "a boat going out"] });
  const doc = `<!DOCTYPE html><html><head><title>A Quiet Island</title><style>html,body{margin:0;height:100%}body{background:linear-gradient(180deg,#2b1b4e,#c98a9a);color:#f6e9dc;font-family:Georgia,serif}h1{position:absolute;top:12vh;width:100%;text-align:center;font-weight:300}</style></head><body><h1>A Quiet Island</h1><p>The sea keeps its lavender secret.</p></body></html>`;
  const words = ["the", "a", "sea", "light", "dusk", "quiet", "#", "div", "px", "color"];
  let stop = false;
  return {
    interruptGenerate() { stop = true; },
    setInitProgressCallback() {},
    async reload() {},
    chat: { completions: { async *create(req) {
      stop = false;
      const pieces = (req?.response_format?.type === "grammar" ? specDoc : doc).match(/\s+|[A-Za-z]+|[^\sA-Za-z]/g);
      for (const piece of pieces) {
        if (stop) break;
        await pause(18);
        const p = Math.min(0.999, Math.max(0.02, 0.85 - Math.random() * Math.random() * 0.9));
        const lp = Math.log(p);
        const alts = [{ token: piece, logprob: lp }];
        let rest = 1 - p;
        for (let i = 0; i < 4; i++) { const q = rest * Math.random() * 0.7; rest -= q; alts.push({ token: words[(Math.random() * words.length) | 0], logprob: Math.log(Math.max(q, 1e-6)) }); }
        yield { choices: [{ delta: { content: piece }, logprobs: { content: [{ token: piece, logprob: lp, top_logprobs: alts }] } }] };
      }
      yield { choices: [{ delta: {}, finish_reason: "stop" }] };
    } } },
  };
}

/* ------------------------------------------------------------------ */

state.worlds.push({ wish: "world zero", html: worldZero.html, issues: [], retries: 0, zero: true });
state.current = 0;
con.renderHistory(state.worlds, 0, pick);
con.setAwake(false, MOCK ? "dry run · no download" : navigator.gpu ? "300 MB once, then nothing leaves your device" : "needs WebGPU: Chrome, Edge or Safari 26 · the dreams below work here");
con.setStatus(MOCK ? "asleep · dry run" : "asleep · nothing downloaded yet");
if (PARAMS.get("demo") != null && DEMOS[+PARAMS.get("demo")]) playDemo(+PARAMS.get("demo"));
else if (PARAMS.get("wish")) { con.wish = PARAMS.get("wish"); con.submit(); }
else con.focus();
