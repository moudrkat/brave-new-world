import { SYSTEM_SPEC, EXAMPLE_MODE, systemSpec, WORLD_SCHEMA, WORLD_GRAMMAR, normalizeSpec, renderWorld, fingerprint, variety, originality, sense, applyAction, parseAction, actionText, forkGrammar, ghostsFrom, cueHints, certaintyFrom, surprise, sprout, turnWeather, turnFont } from "./world.js";
export { SYSTEM_SPEC, EXAMPLE_MODE, systemSpec, WORLD_SCHEMA, WORLD_GRAMMAR, normalizeSpec, renderWorld, fingerprint, variety, originality, sense, applyAction, parseAction, actionText, forkGrammar, ghostsFrom, cueHints, certaintyFrom, surprise, sprout, turnWeather, turnFont };

// The user turn: the wish, and (for the tools path) what the words plainly say.
export function userMessage(wish, strategy, { hints = true } = {}) {
  if (strategy !== "spec" || !hints) return wish;
  const h = cueHints(wish);
  return h ? wish + "\n" + h : wish;
}

// Two ways to ask. "spec": the model fills a grammar-enforced world spec and the
// engine paints it (the tools). "html": the model writes the page itself (the baseline).
export const STRATEGIES = [
  { id: "spec", label: "with tools" },
  { id: "html", label: "raw html" },
];
export const systemFor = (strategy, opts) => (strategy === "html" ? SYSTEM : systemSpec(opts));

// The model contract, in one place: the prompt that ships, the models on offer,
// how a model's output becomes a page, the wishes the eval asks, and the scorer.
// eval.html imports this file, so the eval measures the real prompt.

export const SYSTEM = [
  "You are the dreaming engine of Brave New World.",
  "The user describes a world they want to live in. Answer with ONE complete HTML document and nothing else:",
  "start with <!DOCTYPE html> and end with </html>.",
  "Put all styling in a single <style> element in the head. Make it beautiful:",
  "a full-page background of colors or gradients that fit the world, a large title,",
  "one or two short poetic paragraphs, and a few decorative shapes made with CSS.",
  "No images, no links, no JavaScript, no markdown, no comments, no explanation.",
  "If a previous document is in the conversation, rewrite it completely with the requested changes.",
].join(" ");

// WebLLM prebuilt ids that fit a laptop GPU. vram is what WebLLM reports it needs, in MB.
export const MODELS = [
  { id: "Qwen2.5-Coder-0.5B-Instruct-q4f16_1-MLC", label: "Qwen2.5 Coder · 0.5B", vram: 945 },
  { id: "Qwen2.5-0.5B-Instruct-q4f16_1-MLC", label: "Qwen2.5 · 0.5B", vram: 945 },
  { id: "Qwen3-0.6B-q4f16_1-MLC", label: "Qwen3 · 0.6B", vram: 1403 },
  { id: "Qwen3.5-0.8B-q4f16_1-MLC", label: "Qwen3.5 · 0.8B", vram: 1629 },
  { id: "gemma3-1b-it-q4f16_1-MLC", label: "Gemma 3 · 1B", vram: 711 },
  { id: "Llama-3.2-1B-Instruct-q4f16_1-MLC", label: "Llama 3.2 · 1B", vram: 879 },
  { id: "Qwen2.5-Coder-1.5B-Instruct-q4f16_1-MLC", label: "Qwen2.5 Coder · 1.5B", vram: 1630 },
  { id: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC", label: "Qwen2.5 · 1.5B", vram: 1630 },
  { id: "Qwen3-1.7B-q4f16_1-MLC", label: "Qwen3 · 1.7B", vram: 2037 },
  { id: "SmolLM2-1.7B-Instruct-q4f16_1-MLC", label: "SmolLM2 · 1.7B", vram: 1774 },
  { id: "Qwen3.5-2B-q4f16_1-MLC", label: "Qwen3.5 · 2B", vram: 2245 },
  { id: "gemma-2-2b-it-q4f16_1-MLC", label: "Gemma 2 · 2B", vram: 1895 },
  { id: "Qwen2.5-Coder-3B-Instruct-q4f16_1-MLC", label: "Qwen2.5 Coder · 3B", vram: 2505 },
];

// Per-model engine options: Gemma 3 ships with both a sliding window and a
// context window set, which WebLLM refuses; keep the context window.
export const chatOptsFor = (modelId) => (/gemma3/i.test(modelId) ? { sliding_window_size: -1, context_window_size: 4096 } : undefined);

// Generation settings shared by the app and the eval, so the eval scores what ships.
export function requestFor(modelId, messages, extra = {}, strategy = "spec") {
  const req = {
    messages,
    stream: true,
    stream_options: { include_usage: true },
    temperature: 0.7,
    top_p: 0.9,
    frequency_penalty: 0.15,
    max_tokens: 1400,
    logprobs: true,
    top_logprobs: 5,
    ...extra,
  };
  if (strategy === "spec") {
    // structure is enforced by the grammar, so the sampling can run hot for the choices
    req.response_format = { type: "grammar", grammar: WORLD_GRAMMAR };
    if (extra.temperature == null) req.temperature = 0.9;
    if (extra.max_tokens == null) req.max_tokens = 700;
  }
  // Qwen3 family thinks by default; an empty think block is injected only there,
  // because WebLLM would inject it into any model given the flag.
  if (/Qwen3/.test(modelId)) req.extra_body = { enable_thinking: false };
  return req;
}

// Tolerant of fences and chatter; the grammar should make this trivial, but a
// truncated answer still has to be caught.
export function parseSpec(raw) {
  let t = raw.replace(/```(?:json)?/gi, "").trim();
  const a = t.indexOf("{"), b = t.lastIndexOf("}");
  if (a < 0 || b <= a) return { ok: false, error: "no json object" };
  try { return { ok: true, spec: JSON.parse(t.slice(a, b + 1)) }; }
  catch (e) { return { ok: false, error: "json: " + String(e.message).slice(0, 60) }; }
}

// From what the model wrote to a page, whichever way it was asked.
export function dreamToPage(raw, wish, finish, strategy, tokens) {
  if (strategy === "spec") {
    const parsed = parseSpec(raw);
    if (!parsed.ok) {
      const issues = [{ kind: "no-spec", detail: parsed.error + (finish === "length" ? ", ran out of tokens" : ""), fatal: true }];
      return { html: renderWorld(normalizeSpec({ title: wish })), issues, fatal: true, spec: null };
    }
    const spec = normalizeSpec(parsed.spec);
    // prose that fell apart is as fatal as a page with no CSS
    const bad = [spec.title, ...spec.lines, spec.console.prompt, spec.console.button, ...spec.console.buttons.map((b) => b.label), ...spec.next].filter(gibberish);
    if (bad.length) {
      return { html: renderWorld(spec), issues: [{ kind: "gibberish", detail: `words fell apart: ${bad.map((b) => JSON.stringify(b.slice(0, 30))).join(", ")}`, fatal: true }], fatal: true, spec, ghosts: [], certainty: null };
    }
    const ghosts = ghostsFrom(spec, raw, tokens);
    const certainty = certaintyFrom(spec, raw, tokens);
    const report = inspect(renderWorld(spec, { ghosts, certainty }), wish, finish);
    return { html: report.html, issues: report.issues, fatal: report.fatal, spec, ghosts, certainty, counts: report.counts };
  }
  const report = inspect(raw, wish, finish);
  return { html: report.html, issues: report.issues, fatal: report.fatal, spec: null, counts: report.counts };
}

export function fallbackDocument(text, wish) {
  const safe = escapeHtml(text);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;height:100%;background:radial-gradient(ellipse at 50% 30%,#2a1f4a,#07060b 70%);color:#efe6d6;font-family:Georgia,serif}
  main{max-width:640px;margin:0 auto;padding:14vh 24px;font-size:20px;line-height:1.6;white-space:pre-wrap}
  h1{font-weight:300;font-style:italic;font-size:34px;color:#e0a458;margin:0 0 24px}
  </style></head><body><main><h1>${escapeHtml(wish)}</h1>${safe}</main></body></html>`;
}

// What the model wrote, cut down to the document. While streaming (final=false)
// a fragment without a document yet yields "" so nothing is shown.
export function extractHtml(raw, wish, final = false) {
  let text = raw.replace(/```(?:html)?/gi, "");
  const start = text.search(/<!doctype html/i);
  const startHtml = text.search(/<html/i);
  const from = start >= 0 ? start : startHtml;
  if (from >= 0) {
    text = text.slice(from);
    const end = text.search(/<\/html>/i);
    if (end >= 0) text = text.slice(0, end + 7);
    return text;
  }
  if (text.includes("<style") || text.includes("<body") || text.includes("<div")) {
    return "<!DOCTYPE html><html><head><meta charset=\"utf-8\"></head><body>" + text + "</body></html>";
  }
  return final ? fallbackDocument(text.trim(), wish) : "";
}

export function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

/* ------------------------------------------------------------------ */
/* eval: the wishes, and how a page is scored                          */
/* ------------------------------------------------------------------ */

// 32 wishes, none of which appear in the prompt, so every one is held out.
// Mixed on purpose: places, moods, impossible things, and a few that name colors outright.
export const WISHES = [
  "a quiet island at dusk, lavender sea, one lighthouse",
  "a neon city in the rain, everything reflects",
  "a forest of white birches under snow, one red bird",
  "a library inside a whale",
  "a desert at noon, three black pyramids",
  "a childhood kitchen on a sunday morning, sunlight and flour",
  "a space station garden, tomatoes floating",
  "a deep ocean trench, bioluminescent creatures",
  "a medieval market at dawn, bread and rain",
  "a world made of paper, everything folds",
  "a cathedral of ice on a green moon",
  "a warm attic full of clocks, all showing different times",
  "a volcano island where the lava is pink and gentle",
  "the inside of a violin during a slow song",
  "a rooftop in lisbon, laundry lines and swallows",
  "a black and gold ballroom, empty, one candle",
  "a mountain village where it snows upwards",
  "a greenhouse on mars, fog and copper pipes",
  "a beach at midnight, the sand glows blue where you step",
  "a bookshop that only sells unwritten books",
  "a coral reef made of stained glass",
  "a train that never stops, red velvet seats, endless wheat outside",
  "a hospital for tired stars",
  "a moss covered temple, water dripping, one orange koi",
  "a bakery at 4am, everything amber and warm",
  "a city built in the branches of one enormous oak",
  "a frozen lake with a piano in the middle",
  "a tiny planet with a single house and two suns",
  "a lighthouse keeper's room, storm outside, tea inside",
  "a garden where the flowers are small lanterns",
  "an abandoned swimming pool full of wildflowers",
  "a monastery on a cliff, bells, mist, and goats",
];

// What people actually type is vaguer than the wishes above: one word, a
// feeling, a greeting, another language, or a change to the world on screen.
// None of these appear in the prompt either. Measured with the same scorer,
// plus variety (does every vague wish become the same world?) and prose.
export const AMBIGUOUS = [
  "hi", "sad", "home", "blue", "make it pretty", "somewhere warm", "cat", "???", "i can't sleep",
  "the opposite of this", "what are you", "ahoj, chci les a ticho", "🌧️", "monday", "anything", "my grandmother's garden",
];

// Follow-ups: a change to a world already in the conversation. Each names the
// field that should move and how; everything else should stay. The prior
// world is fixed, so every model edits the same page.
export const PRIOR = {
  wish: "a quiet island at dusk, lavender sea, one lighthouse",
  spec: { title: "A Quiet Island", time: "dusk", weather: "clear", sky: ["#2b1b4e", "#7a4f8c", "#c98a9a"], ground: "sea", ground_color: "#5e4b8b", ink: "#f6e9dc", accent: "#ffd9a0", font: "serif", text_place: "top", motion: "slow",
    elements: [{ kind: "sun", x: "center", y: "horizon", size: "large", color: "#ffb37a", count: 1 }, { kind: "lighthouse", x: "right", y: "horizon", size: "medium", color: "#f6e9dc", count: 1 }, { kind: "bird", x: "left", y: "high", size: "tiny", color: "#2b1b4e", count: 3 }, { kind: "boat", x: "far-left", y: "ground", size: "small", color: "#3a2a5e", count: 1 }],
    lines: ["The sea keeps its lavender secret.", "One lighthouse counts the evening slowly, and nobody asks it to hurry."],
    console: { side: "bottom", tone: "glass", shape: "soft", width: "wide", prompt: "what should the evening bring?", button: "wish", buttons: [{ label: "let night fall", action: "set time night" }, { label: "some rain", action: "set weather rain" }] },
    next: ["the same island at night"] },
};
export const FOLLOWUPS = [
  { wish: "make it night", expect: (s) => s.time === "night" },
  { wish: "let it rain", expect: (s) => s.weather === "rain" },
  { wish: "more birds", expect: (s) => (s.elements.find((e) => e.kind === "bird")?.count || 0) > 3 || s.elements.filter((e) => e.kind === "bird").length > 1 },
  { wish: "take the boat away", expect: (s) => !s.elements.some((e) => e.kind === "boat") },
  { wish: "the same at noon", expect: (s) => s.time === "noon" },
  { wish: "snow instead", expect: (s) => s.weather === "snow" || s.ground === "snow" },
  { wish: "put the panel on the left", expect: (s) => s.console.side === "left" },
  { wish: "add a whale", expect: (s) => s.elements.some((e) => e.kind === "whale") },
  { wish: "make everything still", expect: (s) => s.motion === "still" },
  { wish: "typewriter letters", expect: (s) => s.font === "mono" },
  { wish: "fog", expect: (s) => s.weather === "fog" },
  { wish: "a bigger lighthouse", expect: (s) => ["large", "huge"].includes(s.elements.find((e) => e.kind === "lighthouse")?.size) },
];
export const SETS = { wishes: WISHES, ambiguous: AMBIGUOUS, followups: FOLLOWUPS.map((f) => f.wish) };

// How much of the prior world survived an edit: the share of top-level fields
// (elements compared as a set of kinds) left as they were. An edit that keeps
// nothing is a new world, not an edit.
export function keptScore(prior, spec) {
  if (!spec) return 0;
  const keys = ["title", "time", "weather", "ground", "font", "text_place", "motion"];
  let kept = 0, n = 0;
  for (const k of keys) { n++; if (JSON.stringify(prior[k]) === JSON.stringify(spec[k])) kept++; }
  n++; if (prior.sky.join() === spec.sky.join()) kept++;
  const a = new Set(prior.elements.map((e) => e.kind)), b = new Set(spec.elements.map((e) => e.kind));
  n++; kept += [...a].filter((k) => b.has(k)).length / Math.max(a.size, b.size, 1);
  n++; if (prior.console.side === spec.console.side) kept++;
  return kept / n;
}

// The doors: do they lead somewhere? One point for each of: none repeats the
// wish, none repeats another door, none repeats the title.
export function doorSense(spec, wish) {
  if (!spec?.next?.length) return 0;
  const norm = (t) => String(t).toLowerCase().replace(/[^a-z ]/g, "").trim();
  const w = norm(wish), title = norm(spec.title), doors = spec.next.map(norm);
  const away = doors.filter((d) => d && d !== w && d !== title && !w.includes(d) && !d.includes(w)).length / doors.length;
  const distinct = new Set(doors).size / doors.length;
  return (away + distinct) / 2;
}

// Do the levers say what they do? For each button the model composed, does
// its label contain a word that plainly belongs to the value it acts on: the
// kind it adds or multiplies, the time, weather, ground, motion or font it
// sets, or the verb itself. A lower bound: "sleep" for night does not count
// unless listed, and a poetic label can be right without a keyword.
const VALUE_WORDS = {
  again: /again|once more|redo|repeat|another go|re-?dream|encore|replay/i, elsewhere: /surprise|elsewhere|somewhere|random|another|new|wander|drift|else|away|leave|go/i, undo: /undo|back|before|return|previous|unfold|rewind|last/i, inside: /inside|within|mind|thought|see|look|show|open|reveal/i,
  night: /night|dark|moon|sleep|stars|midnight|late|black/i, dawn: /dawn|morning|sunrise|wake|early|first light/i, noon: /noon|midday|sun|day|bright|high|light/i, dusk: /dusk|evening|sunset|twilight|dim|gold/i,
  rain: /rain|storm|pour|wet|drizzle|shower|weep/i, snow: /snow|winter|frost|white|cold|flake/i, stars: /star|night|sky|constellation|glitter|sparkle/i, clear: /clear|calm|sun|still|quiet|clean|sky|open/i, fog: /fog|mist|haze|blur|veil|smoke/i, embers: /ember|fire|spark|burn|ash|glow/i, petals: /petal|flower|blossom|bloom|spring|fall/i, fireflies: /firefl|light|glow|lantern|spark/i, bubbles: /bubble|breath|float|water|sea/i,
  still: /still|calm|quiet|rest|hush|freeze|pause|stop|sleep/i, slow: /slow|gentle|ease|drift|soft/i, restless: /wild|storm|fast|restless|dance|shake|wind|alive|wake|rush/i,
  serif: /serif|book|letter|print|old/i, mono: /mono|type|machine|code|terminal|typewriter/i, display: /display|grand|big|bold|title/i, hand: /hand|write|ink|scribble|note/i,
  more: /more|another|add|again|fill|crowd|multiply|grow|double/i, fewer: /less|fewer|remove|take|quiet|empty|thin|clear|one|alone/i, add: /add|bring|invite|summon|let|give|another/i, remove: /remove|take|away|banish|no more|without|gone|lose/i,
};
// Does each lever do something to its own world? (The app makes a no-op lever
// go one step further anyway; this measures the model's design, not the net.)
export function leverEffect(spec) {
  if (!spec?.console?.buttons?.length) return null;
  const engine = spec.console.buttons.filter((b) => { const a = parseAction(b.action); return a && !["undo", "again", "elsewhere", "inside"].includes(a.verb); });
  if (!engine.length) return 1; // levers that ask the model always lead somewhere
  return engine.filter((b) => JSON.stringify(applyAction(spec, b.action)) !== JSON.stringify(spec)).length / engine.length;
}

export function buttonSense(spec) {
  if (!spec?.console?.buttons?.length) return null;
  const ok = spec.console.buttons.filter((b) => {
    const a = parseAction(b.action);
    if (!a) return false;
    const label = b.label.toLowerCase();
    if (a.kind && (label.includes(a.kind) || label.includes(a.kind.replace(/y$/, "ie")) || (a.kind === "person" && /people|someone|soul/.test(label)))) return true;
    const key = a.verb === "set" ? a.value : a.kind ? a.verb : a.verb;
    return !!VALUE_WORDS[key]?.test(label) || (a.verb === "set" && VALUE_WORDS[a.field === "ground" ? null : ""]?.test(label)) || (a.field === "ground" && label.includes(a.value));
  });
  return ok.length / spec.console.buttons.length;
}

const STOP = new Set("a an the of in on at and or with one all under inside made full everything".split(" "));
const NAMED = "red blue green yellow orange purple pink black white gray grey brown gold silver navy teal violet indigo lavender crimson coral salmon ivory beige tan olive lime cyan magenta maroon turquoise azure amber".split(" ");
const COLOR_RE = new RegExp(`#[0-9a-f]{3,8}\\b|rgba?\\([^)]*\\)|hsla?\\([^)]*\\)|\\b(?:${NAMED.join("|")})\\b`, "gi");
const DECOR_RE = /border-radius|gradient|transform|animation|@keyframes|box-shadow|clip-path|filter:|::before|::after|opacity|rotate|blur\(/gi;

// Every part is 0..1. `measured` comes from a live iframe when the eval has one.
export function score(raw, wish, measured) {
  const s = {};
  const t = raw.trim();
  const docStart = t.search(/<!doctype html/i);
  const docEnd = t.search(/<\/html>/i);
  s.complete = docStart >= 0 && docEnd > docStart ? 1 : docEnd >= 0 || /<html/i.test(t) ? 0.5 : 0;
  const before = docStart >= 0 ? docStart : 0;
  const after = docEnd >= 0 ? t.length - (docEnd + 7) : 0;
  s.clean = 1 - Math.min(1, (before + after) / 200);

  const html = extractHtml(raw, wish, true);
  const doc = new DOMParser().parseFromString(html, "text/html");
  const css = [...doc.querySelectorAll("style")].map((e) => e.textContent).join("\n");
  const rules = (css.match(/\{/g) || []).length;
  s.style = Math.min(1, rules / 8);
  s.colors = Math.min(1, new Set((css.match(COLOR_RE) || []).map((c) => c.toLowerCase())).size / 5);
  s.decor = Math.min(1, (css.match(DECOR_RE) || []).length / 6);

  const h1 = doc.querySelector("h1, h2");
  const paras = [...doc.querySelectorAll("p")].map((p) => p.textContent.trim().split(/\s+/).length);
  const words = (doc.body?.textContent || "").trim().split(/\s+/).filter(Boolean).length;
  s.text = (h1 && h1.textContent.trim() ? 0.4 : 0) + (paras.some((n) => n >= 8) ? 0.4 : 0) + (words >= 20 && words <= 250 ? 0.2 : 0);

  const content = wish.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 3 && !STOP.has(w));
  const hay = html.toLowerCase();
  s.wish = content.length ? content.filter((w) => hay.includes(w.replace(/s$/, ""))).length / content.length : 1;

  const lines = t.split("\n").map((l) => l.trim()).filter((l) => l.length > 12);
  const dup = lines.length ? 1 - new Set(lines).size / lines.length : 0;
  s.loop = 1 - Math.min(1, dup * 2);
  s.scripts = doc.querySelector("script, img, link, iframe") ? 0 : 1;

  s.visual = measured ? Math.min(1, measured.painted / 5) * (measured.bodyDefault ? 0.5 : 1) : 0.5;

  // weighted toward what makes a page a world (colors, decoration, what was painted)
  // rather than what makes it merely valid, which the harness repairs anyway
  const W = { complete: 0.12, clean: 0.05, style: 0.08, colors: 0.15, decor: 0.17, text: 0.1, wish: 0.1, loop: 0.05, scripts: 0.02, visual: 0.16 };
  s.total = Object.entries(W).reduce((a, [k, w]) => a + w * s[k], 0) / Object.values(W).reduce((a, b) => a + b, 0);
  return s;
}

// Counts what a browser actually painted: elements with size and their own color.
export function measureFrame(iframe) {
  try {
    const d = iframe.contentDocument;
    if (!d || !d.body) return null;
    const body = d.defaultView.getComputedStyle(d.body);
    const bodyDefault = /^rgba\(0, 0, 0, 0\)$|^rgb\(255, 255, 255\)$/.test(body.backgroundColor) && body.backgroundImage === "none";
    let painted = 0;
    for (const e of d.body.querySelectorAll("*")) {
      const r = e.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) continue;
      const c = d.defaultView.getComputedStyle(e);
      if (c.backgroundImage !== "none" || !/^rgba\(0, 0, 0, 0\)$/.test(c.backgroundColor) || c.borderTopWidth !== "0px" || c.boxShadow !== "none") painted++;
    }
    return { painted, bodyDefault };
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* harness: what the model wrote, inspected, repaired, or sent back    */
/* ------------------------------------------------------------------ */

// Elements the dreamed page may not contain: anything that runs, loads, or asks.
export const FORBIDDEN = "script, img, picture, source, link, iframe, frame, object, embed, video, audio, base, form, input, button, textarea, select, canvas, template, meta[http-equiv], bnw-console";
const VOID = new Set("area base br col embed hr img input link meta param source track wbr".split(" "));

// Returns { html, issues, fatal, counts }. `html` is always a usable document;
// `fatal` says the model should be asked again, because what came back was not
// a page: no CSS rules, an empty body, or mostly repetition. Everything else is
// repaired in place and reported, never silently.
export function inspect(raw, wish, finish) {
  const issues = [];
  const counts = { removedElements: 0, removedAttrs: 0, droppedRules: 0, closedTags: 0, strayClosers: 0, chatter: 0, rulesKept: 0 };
  const t = raw.trim();

  const docStart = t.search(/<!doctype html/i);
  const docEnd = t.search(/<\/html>/i);
  const before = docStart > 0 ? docStart : 0;
  const after = docEnd >= 0 ? t.length - (docEnd + 7) : 0;
  counts.chatter = before + after;
  if (before + after > 20) issues.push({ kind: "chatter", detail: `${before + after} characters outside the document`, fatal: false });
  if (docStart < 0 && !/<html/i.test(t)) issues.push({ kind: "no-document", detail: "no <!DOCTYPE html> or <html>", fatal: !/<style|<body|<div/i.test(t) });
  if (finish === "length") issues.push({ kind: "truncated", detail: "ran out of tokens before </html>", fatal: false });

  // tags the parser will have to close for the model
  const opens = (t.match(/<([a-z][a-z0-9-]*)\b[^>]*?(?<!\/)>/gi) || []).map((m) => m.slice(1).match(/^[a-z0-9-]+/i)[0].toLowerCase()).filter((n) => !VOID.has(n));
  const closes = (t.match(/<\/([a-z][a-z0-9-]*)\s*>/gi) || []).length;
  if (opens.length > closes) { counts.closedTags = opens.length - closes; issues.push({ kind: "unclosed", detail: `${counts.closedTags} tags left open`, fatal: false }); }
  if (closes > opens.length) { counts.strayClosers = closes - opens.length; issues.push({ kind: "stray-closers", detail: `${counts.strayClosers} closing tags with nothing to close`, fatal: false }); }

  // repetition: a small model that loops writes the same line again and again
  const lines = t.split("\n").map((l) => l.trim()).filter((l) => l.length > 12);
  const dup = lines.length > 8 ? 1 - new Set(lines).size / lines.length : 0;
  if (dup > 0.35) issues.push({ kind: "repetition", detail: `${Math.round(dup * 100)}% of lines are repeats`, fatal: dup > 0.6 });

  const doc = new DOMParser().parseFromString(extractHtml(raw, wish, true), "text/html");

  // things that run, load or ask
  for (const e of doc.querySelectorAll(FORBIDDEN)) { e.remove(); counts.removedElements++; }
  for (const e of doc.querySelectorAll("*")) {
    for (const a of [...e.attributes]) {
      if (/^on/i.test(a.name) || /^(href|src|xlink:href|action|formaction|srcdoc|style)$/i.test(a.name) && /javascript:|url\(|expression\(|@import/i.test(a.value)) { e.removeAttribute(a.name); counts.removedAttrs++; }
    }
  }
  if (counts.removedElements) issues.push({ kind: "forbidden", detail: `${counts.removedElements} elements removed (scripts, images, links, forms)`, fatal: false });

  // css: parse every sheet with the browser and keep only what it accepted
  let declared = 0, kept = 0;
  const styles = [...doc.querySelectorAll("style")];
  for (const st of styles) {
    const css = st.textContent.replace(/@import[^;]*;/gi, "").replace(/url\([^)]*\)/gi, "none");
    declared += countRules(css);
    try {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(css);
      kept += sheet.cssRules.length;
      st.textContent = [...sheet.cssRules].map((r) => r.cssText).join("\n");
    } catch (e) {
      issues.push({ kind: "css-unparsable", detail: String(e.message || e).slice(0, 80), fatal: false });
      st.textContent = "";
    }
  }
  counts.rulesKept = kept;
  counts.droppedRules = Math.max(0, declared - kept);
  if (counts.droppedRules) issues.push({ kind: "css-dropped", detail: `${counts.droppedRules} of ${declared} rules were invalid and dropped`, fatal: false });
  if (kept === 0) issues.push({ kind: "no-css", detail: "no usable CSS rules", fatal: true });

  const bodyEls = doc.body ? doc.body.querySelectorAll("*").length : 0;
  const words = (doc.body?.textContent || "").trim().split(/\s+/).filter(Boolean).length;
  if (bodyEls === 0) issues.push({ kind: "empty-body", detail: "nothing in the body", fatal: true });
  else if (words < 3) issues.push({ kind: "no-words", detail: "no text on the page", fatal: false });

  // keep the document's own attributes, they often carry the background
  const html = "<!DOCTYPE html>\n" + doc.documentElement.outerHTML;
  return { html, issues, fatal: issues.some((i) => i.fatal), counts, doc };
}

function countRules(css) {
  let depth = 0, n = 0;
  for (const ch of css) {
    if (ch === "{") { if (depth === 0) n++; depth++; }
    else if (ch === "}") depth = Math.max(0, depth - 1);
  }
  return n;
}

// The message sent back with the broken attempt, so the model can try again.
export function retryMessage(issues, strategy = "html") {
  const list = issues.map((i) => i.detail).join("; ");
  if (strategy === "spec" && issues.some((i) => i.kind === "gibberish")) return `Some of that was not language: ${list}. Answer again with the whole JSON object; every title, line, prompt and label must be plain readable English words.`;
  if (strategy === "spec") return `That answer could not be read: ${list}. Answer again with the complete JSON object only, every field filled.`;
  return `That document had problems: ${list}. Write the whole document again: complete, valid HTML, starting with <!DOCTYPE html>, a <style> in the head with real CSS rules, and content in the body. Nothing else.`;
}

// WebLLM reports probabilities after the sampling temperature, which sharpens
// them. Given the top alternatives this recovers the temperature-1 distribution
// over those tokens: p1 ∝ pT^T. An approximation that ignores the tail, so it
// is an upper bound on certainty, and stated as such in the README.
export function detemper(lp, T) {
  const items = [{ token: lp.token, logprob: lp.logprob }, ...(lp.top_logprobs || []).filter((a) => a.token !== lp.token)];
  const w = items.map((a) => Math.exp(a.logprob * T));
  const z = w.reduce((a, b) => a + b, 0) || 1;
  return { p: w[0] / z, alts: items.map((a, i) => ({ token: a.token, p: w[i] / z })).sort((a, b) => b.p - a.p) };
}

// Is this a sentence a person could have written? Small models at heat drift
// into symbols, keys and glued-together words.
export function gibberish(text) {
  const t = String(text || "").trim();
  if (t.length < 2) return true;
  if (/[{}\[\]<>*_=\\|]|:\s*\S|\d\.\d{2}/.test(t)) return true;
  const words = t.split(/\s+/);
  if (words.some((w) => w.replace(/[^a-z]/gi, "").length > 16)) return true;
  const letters = t.replace(/[^a-z]/gi, "").length;
  if (letters / t.length < 0.55) return true;
  const vowels = (t.match(/[aeiouy]/gi) || []).length;
  if (letters > 8 && vowels / letters < 0.25) return true;
  return false;
}

export function proseScore(spec) {
  if (!spec) return null;
  const parts = [spec.title, ...spec.lines, spec.console.prompt, spec.console.button, ...spec.console.buttons.map((b) => b.label), ...(spec.next || [])];
  return parts.length ? parts.filter((x) => !gibberish(x)).length / parts.length : null;
}
