import { MODELS, WORLD_SCHEMA, systemFor, userMessage, requestFor, chatOptsFor, extractHtml, dreamToPage, retryMessage, renderWorld, applyAction, parseAction, forkGrammar, normalizeSpec, detemper, surprise, sprout, turnWeather, turnFont, completeJson } from "./mind.js";
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
// A hidden door. ?mind=http://host:8010/v1 makes the mind a server instead of
// the tab: any OpenAI-compatible endpoint that streams. With a schema-aware
// server (vLLM, llama.cpp) the world is constrained by WORLD_SCHEMA; with
// brainscope the schema goes in the prompt and the harness keeps the rest.
// ?mindmodel= names the model; ?guided=0 stops sending the schema.
const MIND_URL = PARAMS.get("mind") ? PARAMS.get("mind").replace(/\/+$/, "") : null;
const MIND_MODEL = PARAMS.get("mindmodel") || "default";
const MIND_GUIDED = PARAMS.get("guided") !== "0";

const con = document.querySelector("bnw-console");
const worldStyle = document.getElementById("world-style");
const worldZero = { html: "<!DOCTYPE html>" + document.documentElement.outerHTML, wish: null };

const state = {
  engine: null,
  modelId: null,
  waking: null, // the promise, so a second press joins the first download
  dreaming: false,
  worlds: [], // { wish, html, spec, issues, retries, tokens, raw, messages, ghosts, certainty }
  current: -1,
  lastRaw: "",
};
window.__bnw = state;

// a view transition that gets skipped by the next one reports itself as an error; it is not one
addEventListener("unhandledrejection", (e) => { if (e.reason?.name === "AbortError" && /transition/i.test(e.reason?.message || "")) e.preventDefault(); });

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
      if (MIND_URL) {
        con.setWaking("reaching " + MIND_URL + "…");
        const engine = remoteEngine(MIND_URL, MIND_MODEL);
        const models = await engine.hello();
        state.engine = engine;
        state.modelId = models.includes(MIND_MODEL) || MIND_MODEL !== "default" ? MIND_MODEL : (models[0] || "default");
        engine.model = state.modelId;
        con.setAwake(true);
        con.setStatus(`awake · a mind on ${new URL(MIND_URL).host} · ${state.modelId} · nothing here is in your browser except the page`);
        con.focus();
        scheduleAhead();
        return state.engine;
      }
      const modelId = await pickModel();
      const size = MB[modelId] ? `${MB[modelId]} MB` : "its weights";
      con.setWaking(`fetching ${size} once, into this browser's cache…`);
      con.setStatus("waking · the first time fetches its weights, later visits use the cache");
      const onProgress = (r) => {
        const frac = r.progress || 0, pct = Math.round(frac * 100);
        con.setProgress(frac);
        // WebLLM says things like "Fetching param cache[24/61]: 118MB fetched. 39% completed, 12 secs elapsed."
        const shard = (r.text || "").match(/\[(\d+)\/(\d+)\]/);
        const mb = (r.text || "").match(/(\d+)MB/);
        const fromCache = /from cache/i.test(r.text || "");
        const line = frac >= 1 ? "swallowed whole · warming up" : shard ? `${fromCache ? "remembering" : "swallowing"} shard ${shard[1]} of ${shard[2]}${mb ? ` · ${mb[1]} MB down` : ""} · ${pct}%` : `${pct}% · ${(r.text || "").replace(/\[.*?\]/g, "").trim().slice(0, 60) || "reaching for its weights"}`;
        con.setWaking(line);
        con.swallow(frac, shard ? +shard[1] : 0);
      };
      const { CreateWebWorkerMLCEngine } = await import(WEBLLM);
      const worker = new Worker(new URL("./worker.js", import.meta.url), { type: "module" });
      state.engine = await CreateWebWorkerMLCEngine(worker, modelId, { initProgressCallback: onProgress }, chatOptsFor(modelId));
      state.modelId = modelId;
      con.setAwake(true);
      con.setStatus("awake · " + modelId.replace(/-MLC$/, "") + " · say what world you want, or just a word");
      con.focus();
      scheduleAhead();
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
const designFor = (spec, certainty) => (spec ? { ...spec.console, next: spec.next, doorP: certainty?.doors || null, inWorld: true } : null);
// One world dissolves into the next. The browser's view transition crossfades
// the page and moves the console from wherever it was to wherever the model
// put it now; a browser without the API just swaps.
function applyWorld(html, opts = {}) {
  if (!html || html === applied) return;
  if (opts.partial || opts.quick || !document.startViewTransition || document.documentElement.classList.contains("low-power")) { swapWorld(html, opts); if (opts.quick) document.querySelector(".scene")?.classList.add("micro"); return; }
  const wasWorld = con.worldActive;
  const vt = document.startViewTransition(() => swapWorld(html, opts));
  // a browser that never gets round to capturing the old page would hold the
  // old page forever; after a moment the world is swapped without the fade
  const guard = setTimeout(() => vt.skipTransition(), 1800);
  vt.updateCallbackDone.finally(() => clearTimeout(guard)).catch(() => {});
  vt.finished.catch(() => {}); // a skipped transition is not an error
  // the brave new world is the moment one dissolves into the next; the status says so while it lasts
  if (wasWorld) vt.ready.then(() => { const back = con.statusText; if (back.startsWith("between two worlds")) return; con.setStatus("between two worlds · this part nobody designed", false, true); setTimeout(() => { if (con.statusText.startsWith("between two worlds")) con.setStatus(back, false, true); }, 1700); }).catch(() => {});
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
  paintSigns();
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

async function generate(engine, messages, wish, strategy, grammar = null, quiet = false, extra = {}) {
  const request = requestFor(state.modelId || MODEL, messages, extra, strategy);
  if (grammar) request.response_format = { type: "grammar", grammar };
  // WebLLM reports probabilities after the sampling temperature and the ribbon undoes that; a server reporting raw ones needs no undoing
  if (!quiet) con.temperature = engine.rawLogprobs ? 1 : request.temperature;
  let raw = "", n = 0, finish = null, lastPaint = 0;
  const tokens = []; // every token with its offsets and de-tempered alternatives, for the ghosts
  const t0 = performance.now();
  const stream = await engine.chat.completions.create(request);
  for await (const chunk of stream) {
    const choice = chunk.choices?.[0];
    if (choice?.delta?.content) raw += choice.delta.content;
    if (choice?.finish_reason) finish = choice.finish_reason;
    const lps = choice?.logprobs?.content;
    if (lps) for (const lp of lps) { const d = quiet ? detemper(lp, engine.rawLogprobs ? 1 : request.temperature) : con.addToken(lp, raw.slice(0, raw.length - lp.token.length)); tokens.push({ start: raw.length - lp.token.length, end: raw.length, token: lp.token, p: d.p, alts: d.alts, at: performance.now() - t0 }); n++; }
    const now = performance.now();
    if (!quiet && now - lastPaint > 450) {
      lastPaint = now;
      con.updateStats(t0, n);
      if (strategy === "html" && /<body/i.test(raw)) applyWorld(extractHtml(raw, wish), { partial: true });
      // the world forms as it is written: whatever the spec says so far, painted
      if (strategy === "spec") { const so = completeJson(raw); if (so && (so.sky || so.title)) { const sp = normalizeSpec(so); sp.next = Array.isArray(so.next) ? so.next.slice(0, 1) : []; applyWorld(renderWorld(sp), { partial: true, quick: true }); con.forming(true); } }
    }
  }
  if (!quiet) con.updateStats(t0, n);
  return { raw, finish, n, tokens, seconds: (performance.now() - t0) / 1000 };
}

/* ------------------------------------------------------------------ */
/* the next probable world: dreamt ahead while you look at this one    */
/* ------------------------------------------------------------------ */

// The door the model was surest of is dreamt quietly on the idle GPU. Take
// it and the world is already there; take any other road and the head start
// is thrown away. The world after this one exists before you choose it, at
// the probability the model gave it.
let aheads = []; // for the world on screen: { wish, base, promise, done, result, cancelled, p, started }
let ahead = null; // the one being dreamt right now
let dreamSecs = 30; // what a dream has been taking here, for the price on the signs
function dreamAhead() {
  const cur = state.worlds[state.current];
  if (!state.engine || state.dreaming || ahead || STRATEGY !== "spec" || !cur?.spec?.next?.length || cur.zero) return;
  aheads = aheads.filter((a) => a.base === state.current && !a.cancelled);
  const ps = cur.certainty?.doors || [];
  // the doors in the order it believed in them; the first not yet dreamt is next
  const order = cur.spec.next.map((w, i) => [w, ps[i] ?? 0]).sort((x, y) => y[1] - x[1]);
  const next = order.find(([w]) => !aheads.some((a) => a.wish === w));
  if (!next) return;
  const [wish, p] = next;
  const messages = messagesFor(wish, STRATEGY);
  const a = { wish, base: state.current, done: false, result: null, cancelled: false, p, started: performance.now() };
  aheads.push(a); ahead = a;
  paintSigns();
  a.promise = generate(state.engine, messages, wish, STRATEGY, null, true).then((out) => {
    if (a.cancelled) return;
    a.result = { out, report: dreamToPage(out.raw, wish, out.finish, STRATEGY, out.tokens), messages };
    a.done = true;
    if (state.current === a.base && !state.dreaming && aheads.filter((x) => x.done).length === 1) con.setStatus(`the door it thought you would take is already dreamt · "${wish}"` + (p ? ` · it was ${Math.round(p * 100)}% sure` : ""));
  }).catch(() => { a.cancelled = true; }).finally(() => {
    if (ahead === a) ahead = null;
    paintSigns();
    if (!a.cancelled && state.current === a.base && !state.dreaming) scheduleAhead(); // and the next door
  });
}
function cancelAhead() {
  const a = ahead;
  ahead = null;
  aheads = aheads.filter((x) => x.done && !x.cancelled);
  paintSigns();
  if (!a || a.done) return Promise.resolve();
  a.cancelled = true;
  state.engine?.interruptGenerate();
  return a.promise.catch(() => {});
}
const aheadFor = (wish) => aheads.find((a) => a.done && !a.cancelled && a.wish === wish && a.base === state.current) || null;
let aheadTimer = null;
const scheduleAhead = () => { clearTimeout(aheadTimer); aheadTimer = setTimeout(dreamAhead, 1200); };
// the signs in the scene: which door is being dreamt, which is ready, and what each will cost
let signTimer = null;
function paintSigns() {
  clearTimeout(signTimer);
  const signs = document.querySelectorAll(".sign");
  if (!signs.length) return;
  let ticking = false;
  for (const el of signs) {
    const w = el.dataset.wish;
    const a = aheads.find((x) => x.wish === w && x.base === state.current && !x.cancelled);
    el.classList.toggle("ready", !!a?.done);
    el.classList.toggle("ahead", !!a && !a.done);
    const eta = el.querySelector(".eta");
    if (!eta) continue;
    if (a?.done) eta.textContent = "0 s · already dreamt";
    else if (a) { const left = Math.max(1, Math.round(dreamSecs - (performance.now() - a.started) / 1000)); eta.textContent = `dreaming ahead · ~${left} s`; ticking = true; }
    else eta.textContent = state.engine ? `~${Math.round(dreamSecs)} s` : `~${Math.round(dreamSecs)} s once awake`;
  }
  if (ticking) signTimer = setTimeout(paintSigns, 1000);
}
con.markDoor = () => {}; // the doors live in the world now

// fork: { messages, raw, ghost } walks the model down its own road to the
// ghost and makes it take the other turning; the rest is dreamt again.
async function dream(wish, fork = null) {
  const engine = await wake();
  clearTimeout(aheadTimer);
  const ready = !fork && aheadFor(wish);
  if (ready) return takeAhead(ready);
  // the page answers at once; a head start still running is let go while the veil rises
  state.dreaming = true;
  con.setDreaming(true);
  con.setStatus(fork ? `walking into the ghost of a ${fork.ghost.kind} · the same road up to the fork, then the other way` : "dreaming · " + wish);
  await cancelAhead();

  const strategy = STRATEGY;
  let messages = fork ? fork.messages : messagesFor(wish, strategy);
  const asked = messages; // what the accepted attempt was asked with, kept for a later fork; retries add to a copy
  const grammar = fork ? forkGrammar(fork.raw, fork.ghost) : null;
  let report = null, retries = 0, raw = "", t0 = performance.now(), out = null, interrupted = 0;
  const attempts = [];
  try {
    for (;;) {
      out = await generate(engine, messages, wish, strategy, grammar, false, retries ? { temperature: 0.7 } : {});
      // a stream cut off by a leftover interrupt (a head start aborted a moment ago) is not the model's failure: ask again, quietly
      if (out.finish === "abort" && state.dreaming && interrupted < 3) { interrupted++; con.setStatus("dreaming · " + wish); continue; }
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
      if (!report.fatal || retries >= MAX_RETRIES || !state.dreaming || fork) break;
      retries++;
      con.setStatus(`the page came back broken (${bad.join(", ")}), asking again · ${retries}/${MAX_RETRIES}`);
      // not shown its broken attempt: shown it, a small model copies it back at near-total certainty
      messages = strategy === "spec" ? messagesFor(wish, strategy) : [...messages, { role: "assistant", content: raw.slice(0, 4000) }, { role: "user", content: retryMessage(report.issues, strategy) }];
      con.setDreaming(true);
    }
  } catch (err) {
    console.error(err);
    con.setStatus("the dream broke: " + (err?.message || err), true);
    document.querySelector(".scene")?.classList.remove("walking");
  }

  let html = report ? report.html : extractHtml(raw, wish, true);
  let ghosts = report?.ghosts || [];
  if (fork && report?.spec) {
    // in the forked world, the thing it chose the first time is the ghost
    const g = fork.ghost;
    ghosts = [...ghosts.filter((x) => x.index !== g.index), { index: g.index, kind: g.chosen, p: g.chosenP, chosen: g.kind, chosenP: g.p, at: g.at }];
    html = renderWorld(report.spec, { ghosts, certainty: report.certainty });
  }
  state.lastRaw = raw;
  designOf = designFor(report?.spec, report?.certainty);
  con.forming(false);
  applyWorld(html);
  // the world is as restless as the model was unsure
  if (report?.spec) document.documentElement.style.setProperty("--speed", (({ still: 0.001, slow: 1, restless: 2.4 })[report.spec.motion] * (1 + con.doubt * 2.5)).toFixed(2));
  if (ghosts.length) con.setHarness(con.harnessText + ` · ${ghosts.length} ghost${ghosts.length > 1 ? "s" : ""} of what it almost placed · tap one to walk into it`);
  state.worlds.push({ wish: fork ? `${wish} · a ${fork.ghost.kind} instead` : wish, html, issues: report?.issues || [], retries, attempts, strategy, spec: report?.spec || null, ghosts, certainty: report?.certainty || null,
    raw, tokens: out?.tokens || [], messages: retries ? messages : asked, seconds: out?.seconds || 0, model: state.modelId, date: new Date().toISOString() });
  state.current = state.worlds.length - 1;
  con.renderHistory(state.worlds, state.current, pick);
  if (out?.seconds) dreamSecs = dreamSecs * 0.5 + out.seconds * 0.5;
  state.dreaming = false;
  con.setDreaming(false);
  con.setStatus(`dreamt in ${((performance.now() - t0) / 1000).toFixed(1)} s` + (retries ? ` after ${retries} ${retries === 1 ? "retry" : "retries"}` : "") + (fork ? " · the road not taken" : " · the levers and the doors are its idea · tap a thing to walk to it"));
  if (ghosts.length) hintLater(`the faint ${ghosts.length > 1 ? "things are ghosts" : "thing is a ghost"} of what it almost placed · tap one to walk into that world instead`);
  remember(state.worlds[state.current]);
  con.focus();
  scheduleAhead();
}
let hintTimer = null;
function hintLater(text, ms = 7000) { clearTimeout(hintTimer); hintTimer = setTimeout(() => { if (!state.dreaming && performance.now() - con.statusAt > 4000) con.setStatus(text); }, ms); }

// the door you took was the one it expected: the world was dreamt while you looked
function takeAhead(a) {
  aheads = aheads.filter((x) => x !== a);
  const { out, report, messages } = a.result;
  const t0 = performance.now();
  con.setDreaming(true);
  for (const t of out.tokens) con.paintToken(t.token, t.p, t.alts, out.raw.slice(0, t.start));
  con.updateStats(t0 - out.seconds * 1000, out.tokens.length, "dreamt ahead");
  con.setHarness((report.fatal ? "harness: unusable" : report.issues.length ? "harness: repaired " + report.issues.map((i) => i.kind).join(", ") : "harness: clean") + (report.ghosts?.length ? ` · ${report.ghosts.length} ghost${report.ghosts.length > 1 ? "s" : ""} · tap one to walk into it` : ""), report.fatal);
  designOf = designFor(report.spec, report.certainty);
  applyWorld(report.html);
  if (report.spec) document.documentElement.style.setProperty("--speed", (({ still: 0.001, slow: 1, restless: 2.4 })[report.spec.motion] * (1 + con.doubt * 2.5)).toFixed(2));
  state.worlds.push({ wish: a.wish, html: report.html, issues: report.issues, retries: 0, attempts: [], strategy: STRATEGY, spec: report.spec, ghosts: report.ghosts || [], certainty: report.certainty || null,
    raw: out.raw, tokens: out.tokens, messages, seconds: out.seconds, model: state.modelId, date: new Date().toISOString(), ahead: true });
  state.current = state.worlds.length - 1;
  con.renderHistory(state.worlds, state.current, pick);
  con.setDreaming(false);
  con.setStatus(`you took the door it expected · this world was dreamt in ${out.seconds.toFixed(1)} s while you were looking at the last one`);
  remember(state.worlds[state.current]);
  scheduleAhead();
}

function pick(i) {
  state.current = i;
  designOf = designFor(state.worlds[i].spec, state.worlds[i].certainty);
  applyWorld(state.worlds[i].html);
  con.renderHistory(state.worlds, state.current, pick);
  remember(state.worlds[i]);
  cancelAhead(); scheduleAhead();
}

/* ------------------------------------------------------------------ */
/* remembered dreams: real runs, recorded, replayed without a model    */
/* ------------------------------------------------------------------ */

let replaying = 0;
let replayCtl = null; // { skip } while a replay runs; a tap sets skip and the replay lands at once
const sleepMs = (ms) => new Promise((r) => setTimeout(r, ms));
async function settleReplay() { if (!replayCtl) return; replayCtl.skip = true; while (replayCtl) await sleepMs(15); }
async function replay(d, { label, status }) {
  if (state.dreaming) { if (replayCtl) await settleReplay(); else return; }
  const token = ++replaying;
  const ctl = replayCtl = { skip: false };
  const spec = normalizeSpec(d.spec);
  const html = renderWorld(spec, { ghosts: d.ghosts || [], certainty: d.certainty || null });
  designOf = designFor(spec, d.certainty);
  state.dreaming = true; // a replay holds the page like a dream does
  con.setDreaming(true);
  con.setStatus("remembering · " + d.wish);
  // the tokens it wrote that day, at their real certainties, faster than it wrote them
  const t0 = performance.now();
  const toks = d.tokens || [];
  let prefix = "";
  const pace = Math.max(6, Math.min(24, 7000 / Math.max(1, toks.length))); // about seven seconds, whatever it wrote
  for (let k = 0; k < toks.length; k++) {
    if (token !== replaying) { state.dreaming = false; if (replayCtl === ctl) replayCtl = null; return; }
    const t = toks[k];
    con.paintToken(t.token, t.p, t.alts || [{ token: t.token, p: t.p }], prefix);
    prefix += t.token;
    if (k % 8 === 0) con.updateStats(t0, k + 1, "replayed", d.seconds || null);
    if (!ctl.skip) await new Promise((r) => setTimeout(r, pace));
  }
  con.updateStats(t0, toks.length, "replayed", d.seconds || null);
  setTimeout(() => con.openInside(false), 2500);
  applyWorld(html);
  document.documentElement.style.setProperty("--speed", (({ still: 0.001, slow: 1, restless: 2.4 })[spec.motion] * (1 + con.doubt * 2.5)).toFixed(2));
  con.setHarness(label + (d.ghosts?.length ? ` · ${d.ghosts.length} ghost${d.ghosts.length > 1 ? "s" : ""} · tap one to walk into it` : ""));
  state.worlds.push({ wish: d.wish, html, spec, issues: [], retries: 0, strategy: "spec", ghosts: d.ghosts || [], certainty: d.certainty || null, raw: d.raw || null, tokens: toks, messages: d.raw ? [{ role: "system", content: systemFor("spec") }, { role: "user", content: userMessage(d.wish, "spec") }] : null, demo: true, model: d.model, date: d.date, seconds: d.seconds });
  state.current = state.worlds.length - 1;
  con.renderHistory(state.worlds, state.current, pick);
  state.dreaming = false;
  con.setDreaming(false);
  if (replayCtl === ctl) replayCtl = null;
  con.setStatus(status);
  if (d.ghosts?.length) hintLater("the faint things are ghosts of what it almost placed · tap a thing to walk to it, a ghost to walk into it");
  remember(state.worlds[state.current]);
  scheduleAhead();
}
const playDemo = (i) => DEMOS[i] && replay(DEMOS[i], {
  label: `a dream it had on ${(DEMOS[i].date || "").slice(0, 10)} · ${DEMOS[i].model ? DEMOS[i].model.replace(/-MLC$/, "") : "the same mind"} · ${(DEMOS[i].tokens || []).length} tokens in ${(DEMOS[i].seconds || 0).toFixed(1)} s`,
  status: "a world it dreamt before · its levers work · wake it to walk on",
});
con.setDemos(DEMOS, playDemo);

/* ------------------------------------------------------------------ */
/* a world in the address bar: send someone the exact dream            */
/* ------------------------------------------------------------------ */

const b64 = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64 = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
async function squeeze(data, dir) {
  const S = dir === "in" ? CompressionStream : DecompressionStream;
  if (typeof S === "undefined") return null;
  const stream = new Blob([data]).stream().pipeThrough(new S("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
// what travels: the spec, the model's own text and each token's certainty
// (a byte each), the ghosts, the words' certainty; not the alternatives
async function encodeWorld(w) {
  const toks = w.tokens || [];
  const payload = { v: 1, w: w.wish, sp: w.spec, g: w.ghosts || [], c: w.certainty || null, m: w.model || null, d: w.date || null, s: w.seconds || 0,
    r: w.raw || null, ts: toks.map((t) => t.start ?? 0), tp: toks.map((t) => Math.round(t.p * 255)) };
  const bytes = await squeeze(JSON.stringify(payload), "in");
  return bytes ? b64(bytes) : null;
}
async function decodeWorld(hash) {
  try {
    const bytes = await squeeze(unb64(hash), "out");
    const p = JSON.parse(new TextDecoder().decode(bytes));
    if (p.v !== 1 || !p.sp) return null;
    let tokens = [];
    if (p.r && p.ts?.length) tokens = p.ts.map((s, i) => ({ token: p.r.slice(s, p.ts[i + 1] ?? p.r.length), p: (p.tp?.[i] ?? 255) / 255, start: s }));
    return { wish: p.w, spec: p.sp, ghosts: p.g, certainty: p.c, model: p.m, date: p.d, seconds: p.s, raw: p.r, tokens };
  } catch { return null; }
}
let rememberSeq = 0;
async function remember(w) {
  const seq = ++rememberSeq;
  if (!w || w.zero || !w.spec) { history.replaceState(null, "", location.pathname + location.search); return; }
  const h = await encodeWorld(w);
  if (seq === rememberSeq && h) history.replaceState(null, "", location.pathname + location.search + "#w=" + h);
}
con.addEventListener("share", async () => {
  const w = state.worlds[state.current];
  if (!w || w.zero) return con.setStatus("nothing to send yet: wish first");
  const url = location.href;
  try {
    if (navigator.share && matchMedia("(pointer: coarse)").matches) await navigator.share({ title: "Brave New World · " + w.wish, url });
    else { await navigator.clipboard.writeText(url); con.setStatus("the link is on your clipboard: this exact world, its ghosts and its doubts · whoever opens it walks in without a download"); }
  } catch { con.setStatus("copy the address bar: it is the world"); }
});

/* ------------------------------------------------------------------ */
/* the buttons the model invented, and walking                         */
/* ------------------------------------------------------------------ */

// It names the button and composes what it does; the engine does the thing.
// Some ask the model again, the rest are levers on the world's spec, so they
// work on a remembered dream too, without a model.
const SURPRISES = ["a greenhouse on the moon", "a bathhouse for dragons", "the last train before the flood", "a lighthouse in a wheat field", "a violin shop at closing time", "a city where it rains upward", "an orchard on a glacier", "the waiting room of the sea"];
async function act(action) {
  if (state.dreaming) { if (replayCtl) await settleReplay(); else return; }
  const cur = state.worlds[state.current];
  const a = parseAction(action);
  if (!a) return con.setStatus("this lever is not connected to anything: " + action);
  if (a.verb === "inside") return con.toggleInside();
  if (a.verb === "undo") return state.current > 0 ? pick(state.current - 1) : con.setStatus("nothing before this");
  if (a.verb === "again") { con.wish = cur?.zero ? SURPRISES[0] : cur.wish; return con.submit(); }
  if (a.verb === "elsewhere") { con.wish = SURPRISES[Math.floor(Math.random() * SURPRISES.length)]; return con.submit(); }
  if (!cur?.spec) return con.setStatus("this world has no such lever");
  let next = applyAction(cur.spec, a), note = action, why = " · the model named this lever and composed what it does; the engine pulled it";
  if (JSON.stringify(next) === JSON.stringify(cur.spec)) {
    // the lever asked for what is already so: the engine turns the same dial one notch further
    if (a.verb === "set" && a.field === "weather") { const s = turnWeather(cur.spec); next = s.spec; note = s.note; }
    else if (a.verb === "set" && a.field === "time") { const t = ["dawn", "noon", "dusk", "night"]; next = applyAction(cur.spec, "set time " + t[(t.indexOf(cur.spec.time) + 1) % 4]); note = "the hour moved on to " + next.time; }
    else if (a.verb === "set" && a.field === "font") { const s = turnFont(cur.spec); next = s.spec; note = s.note; }
    else if (a.verb === "set" && a.field === "motion") { next = applyAction(cur.spec, "set motion " + (cur.spec.motion === "still" ? "restless" : "still")); note = "the world " + (next.motion === "still" ? "held its breath" : "stirred"); }
    else if (a.kind) { const i = cur.spec.elements.findIndex((e) => e.kind === a.kind); const s = i >= 0 ? surprise(cur.spec, i) : sprout(cur.spec, 0.5); next = s.spec; note = s.note; }
    else { const s = turnWeather(cur.spec); next = s.spec; note = s.note; }
    why = " · that was already so, so the engine went one step further";
  }
  change(next, note, note + why);
}
// an engine-side change to the world on screen: instant, remembered, no model
function change(spec, note, status) {
  const cur = state.worlds[state.current];
  const html = renderWorld(spec, { ghosts: cur.ghosts || [], certainty: cur.certainty || null });
  // the history keeps the wish and the latest change, not the whole chain of them
  state.worlds.push({ ...cur, spec, html, wish: cur.wish.replace(/ · .*$/, "") + " · " + note.replace(/ · .*$/, "").slice(0, 40), zero: false, demo: false });
  state.current = state.worlds.length - 1;
  designOf = designFor(spec, cur.certainty);
  applyWorld(html, { quick: true });
  con.renderHistory(state.worlds, state.current, pick);
  con.setStatus(status || note);
  remember(state.worlds[state.current]);
  cancelAhead(); scheduleAhead();
}
con.addEventListener("action", (e) => act(e.detail));

// Walking: a tap on a thing in the scene is a wish to go there; a tap on a
// ghost regenerates the world from that very token with the other choice.
// the camera leans toward what was tapped while the next world is dreamt;
// the crossfade into the new world ends the lean
function lean(el) {
  const scene = document.querySelector(".scene");
  if (!scene || !el) return;
  const r = el.getBoundingClientRect();
  scene.style.setProperty("--wx", ((r.left + r.width / 2) / innerWidth * 100).toFixed(1) + "%");
  scene.style.setProperty("--wy", ((r.top + r.height / 2) / innerHeight * 100).toFixed(1) + "%");
  scene.classList.add("walking");
}
async function walkTo(kind, el) {
  if (state.dreaming) { if (replayCtl) await settleReplay(); else return; }
  lean(el);
  con.wish = `walk to the ${kind}`;
  con.submit();
}
async function walkInto(index, kind, el) {
  if (state.dreaming) { if (replayCtl) await settleReplay(); else return; }
  const cur = state.worlds[state.current];
  if (!cur) return;
  const ghost = (cur.ghosts || []).find((g) => g.index === index && g.kind === kind);
  if (!ghost || !cur.raw || ghost.at == null) return con.setStatus("this ghost has no road back to it");
  lean(el);
  const messages = cur.messages || [{ role: "system", content: systemFor("spec") }, { role: "user", content: userMessage(cur.wish, "spec") }];
  dream(cur.wish.replace(/ · .*$/, ""), { messages, raw: cur.raw, ghost }).catch((err) => { console.error(err); con.setStatus("the fork broke: " + (err?.message || err), true); state.dreaming = false; con.setDreaming(false); });
}
document.addEventListener("keydown", (e) => { if ((e.key === "Enter" || e.key === " ") && (e.target.classList?.contains("sign") || e.target.classList?.contains("lever"))) { e.preventDefault(); e.target.click(); } });
document.addEventListener("click", (e) => {
  if (e.composedPath().includes(con)) return;
  const lever = e.target.closest?.(".lever");
  if (lever) { lever.classList.add("pressed"); setTimeout(() => lever.classList.remove("pressed"), 700); return act(lever.dataset.action); }
  const sign = e.target.closest?.(".sign");
  if (sign) { if (state.dreaming && !replayCtl) return; sign.classList.add("swing"); setTimeout(() => sign.classList.remove("swing"), 800); con.wish = sign.dataset.wish; return con.submit(); }
  const scene = document.querySelector(".scene");
  if (scene && !e.target.closest?.(".el, .words, .sign") && e.clientY < innerHeight * 0.7) {
    // empty sky: a shooting star, for no reason but that it was tapped
    const star = document.createElement("i"); star.className = "star-shot"; star.style.left = e.clientX + "px"; star.style.top = e.clientY + "px";
    scene.appendChild(star); setTimeout(() => star.remove(), 1000);
    con.sky.feed?.(0.6, 2);
  }
  const g = e.target.closest?.(".el.ghost");
  if (g) return walkInto(+g.dataset.ghost, g.dataset.kind, g);
  const el = e.target.closest?.(".el");
  const cur = state.worlds[state.current];
  if (el?.dataset.kind && cur?.spec && !state.dreaming) {
    // first tap: a surprise on the thing; a second tap on the same kind within a few seconds: walk there
    if (lastTap.kind === el.dataset.kind && performance.now() - lastTap.at < 3500) { lastTap = {}; return walkTo(el.dataset.kind, el); }
    lastTap = { kind: el.dataset.kind, at: performance.now() };
    const s = surprise(cur.spec, +el.dataset.index);
    if (s) change(s.spec, s.note, s.note + " · tap it again to walk there");
    return;
  }
  const title = e.target.closest?.(".words h1");
  if (title && cur?.spec && !state.dreaming) { const s = turnFont(cur.spec); return change(s.spec, s.note); }
  if (e.target.closest?.(".words")) return;
  const ground = document.querySelector(".ground");
  if (cur?.spec && !state.dreaming && ground && e.clientY >= ground.getBoundingClientRect().top) { const s = sprout(cur.spec, e.clientX / innerWidth); return change(s.spec, s.note); }
  skyTaps++;
  if (cur?.spec && !state.dreaming && skyTaps % 3 === 0) { const s = turnWeather(cur.spec); change(s.spec, s.note); }
});
let lastTap = {}, skyTaps = 0;

// Depth: the scene shifts a little with the pointer or the phone's tilt, far
// things less than near ones (--dz per element, set by the painter).
let px = 0, py = 0, tx = 0, ty = 0, parallaxOn = false;
function parallax() {
  px += (tx - px) * 0.08; py += (ty - py) * 0.08;
  document.documentElement.style.setProperty("--px", px.toFixed(3));
  document.documentElement.style.setProperty("--py", py.toFixed(3));
  if (Math.abs(tx - px) > 0.002 || Math.abs(ty - py) > 0.002) requestAnimationFrame(parallax); else parallaxOn = false;
}
function aim(x, y) { tx = Math.max(-1, Math.min(1, x)); ty = Math.max(-1, Math.min(1, y)); if (!parallaxOn) { parallaxOn = true; requestAnimationFrame(parallax); } }
if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
  addEventListener("pointermove", (e) => { if (e.pointerType === "mouse") aim((e.clientX / innerWidth) * 2 - 1, (e.clientY / innerHeight) * 2 - 1); }, { passive: true });
  addEventListener("touchmove", (e) => { const t = e.touches[0]; if (t && !e.composedPath().includes(con)) aim((t.clientX / innerWidth) * 2 - 1, (t.clientY / innerHeight) * 2 - 1); }, { passive: true });
  addEventListener("deviceorientation", (e) => { if (e.gamma != null && matchMedia("(pointer: coarse)").matches) aim(e.gamma / 30, (e.beta - 45) / 40); }, { passive: true });
}

con.addEventListener("wake", () => wake().catch(() => {}));
con.addEventListener("wish", async (e) => {
  if (state.dreaming) { if (replayCtl) await settleReplay(); else return; }
  dream(e.detail).catch((err) => {
    console.error(err);
    if (!con.awake) con.setStatus("wake the mind first, or step into a world it already dreamt", true);
    else con.setStatus("the dream broke: " + (err?.message || err), true);
    state.dreaming = false;
    con.setDreaming(false);
  });
});
con.addEventListener("stop", async () => {
  if (replayCtl) { await settleReplay(); if (con.wish.trim()) con.submit(); return; }
  state.dreaming = false; replaying++; cancelAhead(); state.engine?.interruptGenerate(); document.querySelector(".scene")?.classList.remove("walking");
});

/* ------------------------------------------------------------------ */
/* a mind on a server: OpenAI-compatible, streamed, logprobs if it has them */
/* ------------------------------------------------------------------ */

function remoteEngine(base, model) {
  let ctl = null;
  const eng = {
    model,
    rawLogprobs: true,
    async hello() {
      try { const r = await fetch(base + "/models"); const j = await r.json(); return (j.data || []).map((m) => m.id); } catch { return []; }
    },
    interruptGenerate() { ctl?.abort(); },
    setInitProgressCallback() {},
    async reload() {},
    chat: { completions: { async *create(req) {
      const body = { model: eng.model, messages: req.messages, stream: true, temperature: req.temperature, top_p: req.top_p, max_tokens: req.max_tokens, logprobs: true, top_logprobs: 5 };
      // the grammar is WebLLM's; a server gets the same contract as a JSON schema, when asked to keep it
      if (req.response_format?.type === "grammar" && MIND_GUIDED) body.response_format = { type: "json_schema", json_schema: { name: "world", schema: WORLD_SCHEMA, strict: false } };
      ctl = new AbortController();
      const r = await fetch(base + "/chat/completions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal: ctl.signal });
      if (!r.ok) throw new Error(`the mind at ${new URL(base).host} said ${r.status}: ${(await r.text()).slice(0, 200)}`);
      // a server that does not stream (brainscope) answers whole: one chunk, its logprobs if it sent any
      if (!/text\/event-stream/.test(r.headers.get("content-type") || "")) {
        const j = await r.json(); const c = j.choices?.[0] || {};
        yield { choices: [{ delta: { content: c.message?.content || "" }, logprobs: c.logprobs || null, finish_reason: c.finish_reason || "stop" }] };
        return;
      }
      const reader = r.body.getReader(); const dec = new TextDecoder(); let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let nl;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl).trim(); buf = buf.slice(nl + 1);
          if (!line.startsWith("data:")) continue;
          const data = line.slice(5).trim();
          if (data === "[DONE]") return;
          try { yield JSON.parse(data); } catch {}
        }
      }
    } } },
  };
  return eng;
}

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
    console: { side: ["bottom", "top", "left", "right"][Math.floor(Math.random() * 4)], tone: "glass", shape: "pill", width: "wide", prompt: "what should the evening bring?", button: "wish", buttons: [{ label: "let night fall", action: "set time night" }, { label: "some rain", action: "set weather rain" }, { label: "more birds", action: "more bird" }] }, next: ["the same island at night"] });
  const doc = `<!DOCTYPE html><html><head><title>A Quiet Island</title><style>html,body{margin:0;height:100%}body{background:linear-gradient(180deg,#2b1b4e,#c98a9a);color:#f6e9dc;font-family:Georgia,serif}h1{position:absolute;top:12vh;width:100%;text-align:center;font-weight:300}</style></head><body><h1>A Quiet Island</h1><p>The sea keeps its lavender secret.</p></body></html>`;
  const words = ["the", "a", "sea", "light", "dusk", "quiet", "#", "div", "px", "color"];
  const kinds = ["moon", "star", "boat", "whale"];
  let stop = false;
  return {
    interruptGenerate() { stop = true; },
    setInitProgressCallback() {},
    async reload() {},
    chat: { completions: { async *create(req) {
      stop = false;
      let text = req?.response_format?.type === "grammar" ? specDoc : doc;
      // a forked grammar begins with the road already walked: honour its literal prefix
      const g = req?.response_format?.grammar || "";
      const m = g.match(/^root ::= "((?:[^"\\]|\\.)*)" "\\\\"" elrest/);
      if (m) { const forced = JSON.parse('"' + m[1] + '"'); const k = forced.lastIndexOf('"kind":"'); const cut = specDoc.indexOf('"', specDoc.split('"kind":"').slice(0, forced.slice(0, k).split('"kind":"').length + 1).join('"kind":"').length); text = forced + specDoc.slice(cut); }
      const pieces = text.match(/\s+|[A-Za-z]+|[^\sA-Za-z]/g);
      for (const piece of pieces) {
        if (stop) break;
        await pause(18);
        const p = Math.min(0.999, Math.max(0.02, 0.85 - Math.random() * Math.random() * 0.9));
        const lp = Math.log(p);
        const alts = [{ token: piece, logprob: lp }];
        let rest = 1 - p;
        for (let i = 0; i < 4; i++) { const q = rest * Math.random() * 0.7; rest -= q; alts.push({ token: piece === "sun" || piece === "lighthouse" ? kinds[i] : words[(Math.random() * words.length) | 0], logprob: Math.log(Math.max(q, 1e-6)) }); }
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
con.setAwake(false, MOCK ? "dry run · no download" : MIND_URL ? "a mind on " + (() => { try { return new URL(MIND_URL).host; } catch { return MIND_URL; } })() + " · your wishes go there" : navigator.gpu ? "300 MB once, then nothing leaves your device" : "needs WebGPU: Chrome, Edge or Safari 26 · the dreams below work here");
con.setStatus(MOCK ? "asleep · dry run" : "asleep · nothing downloaded yet");
(async () => {
  const sent = location.hash.startsWith("#w=") ? await decodeWorld(location.hash.slice(3)) : null;
  if (sent) return replay(sent, { label: `a world someone sent you · dreamt on ${(sent.date || "").slice(0, 10)} · ${sent.tokens.length} tokens in ${(sent.seconds || 0).toFixed(1)} s`, status: "someone sent you their world, doubts and all · its levers work · wake the mind to walk on" });
  if (PARAMS.get("demo") != null && DEMOS[+PARAMS.get("demo")]) playDemo(+PARAMS.get("demo"));
  else if (PARAMS.get("wish")) { con.wish = PARAMS.get("wish"); con.submit(); }
  else {
    con.focus();
    // uninvited: a breath of world zero, then one of its dreams begins on its own,
    // so the page is moving before anyone has read a word. Typing first cancels it.
    if (DEMOS.length && !PARAMS.has("still")) {
      const pick = Math.floor(Math.random() * DEMOS.length);
      const t = setTimeout(() => { if (state.worlds.length === 1 && !state.dreaming && !state.waking && !con.wish) { con._demo = pick; playDemo(pick); } }, 2600);
      con.addEventListener("wish", () => clearTimeout(t), { once: true });
      con.addEventListener("wake", () => clearTimeout(t), { once: true });
    }
  }
})();
