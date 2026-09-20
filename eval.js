import { CreateWebWorkerMLCEngine } from "https://esm.run/@mlc-ai/web-llm@0.2.85";
import { exampleFor, MODELS, WISHES, SETS, PRIOR, FOLLOWUPS, STRATEGIES, systemFor, userMessage, requestFor, chatOptsFor, dreamToPage, retryMessage, score, measureFrame, escapeHtml, fingerprint, variety, originality, sense, proseScore, keptScore, buttonSense, doorSense, EXAMPLE_MODE } from "./mind.js";

const $ = (id) => document.getElementById(id);
const PARAMS = new URLSearchParams(location.search);
// ?set=wishes (default) | ambiguous | followups. Follow-ups put PRIOR in the conversation first.
const SET = SETS[PARAMS.get("set")] ? PARAMS.get("set") : "wishes";
// ?ex=full | bare | 0 picks the worked example; without it, the eval runs what the app ships
const EXAMPLE = PARAMS.get("ex") == null ? EXAMPLE_MODE : PARAMS.get("ex") === "0" ? false : ["bare", "prose"].includes(PARAMS.get("ex")) ? PARAMS.get("ex") : true;
const LIST = SETS[SET];
const results = []; // { model, label, vram, loadSec, runs: [{ wish, raw, html, tokens, tps, finish, score }] }
let engine = null;
let loadedModel = null;
let stop = false;

window.__eval = { results, done: false, running: false };

/* ---------- ui ---------- */

const wanted = (PARAMS.get("models") || "").split(",").filter(Boolean);
for (const m of MODELS) {
  const l = document.createElement("label");
  const checked = wanted.length ? wanted.includes(m.id) : m.vram <= 1700;
  l.innerHTML = `<input type="checkbox" value="${m.id}" ${checked ? "checked" : ""}/> ${escapeHtml(m.label)} <span style="opacity:.5">${m.vram} MB</span>`;
  $("models").appendChild(l);
}
const strategies = (PARAMS.get("strategy") || "spec").split(",").filter((x) => STRATEGIES.some((s) => s.id === x));
for (const st of STRATEGIES) {
  const l = document.createElement("label");
  l.innerHTML = `<input type="checkbox" name="strategy" value="${st.id}" ${strategies.includes(st.id) ? "checked" : ""}/> ${escapeHtml(st.label)}`;
  $("strategies").appendChild(l);
}
if (PARAMS.get("wishes")) $("nwishes").value = PARAMS.get("wishes");
if (PARAMS.get("maxtok")) $("maxtok").value = PARAMS.get("maxtok");
if (PARAMS.get("temp")) $("temp").value = PARAMS.get("temp");

function say(text, warn = false) {
  $("status").textContent = text;
  $("status").classList.toggle("warn", warn);
  document.title = "eval · " + text;
}

$("run").addEventListener("click", () => run().catch((e) => say("broke: " + e.message, true)));
$("stop").addEventListener("click", () => { stop = true; engine?.interruptGenerate(); });
$("json").addEventListener("click", () => download("brave-new-world-eval.json", JSON.stringify(exportable(), null, 2)));
$("md").addEventListener("click", () => navigator.clipboard.writeText(markdown()));

/* ---------- run ---------- */

async function run() {
  const ids = [...document.querySelectorAll("#models input:checked")].map((i) => i.value);
  const n = Math.min(LIST.length, +$("nwishes").value || 6);
  const maxTokens = +$("maxtok").value || 1200;
  const seed = +$("seed").value || 7;
  const temperature = +$("temp").value || 0.7;
  if (!ids.length) return say("pick at least one mind", true);
  if (!navigator.gpu || !(await navigator.gpu.requestAdapter())) return say("no webgpu adapter in this browser", true);

  stop = false;
  results.length = 0;
  window.__eval.done = false;
  window.__eval.running = true;
  $("run").disabled = true; $("stop").disabled = false;
  $("table").hidden = false;
  $("table").querySelector("tbody").innerHTML = "";
  $("cards").innerHTML = "";

  const strats = [...document.querySelectorAll("#strategies input:checked")].map((i) => i.value);
  if (!strats.length) return say("pick at least one tongue", true);
  for (const id of ids) for (const strategy of strats) {
    if (stop) break;
    const meta = MODELS.find((m) => m.id === id);
    const entry = { model: id, strategy, label: meta.label + " · " + STRATEGIES.find((x) => x.id === strategy).label, vram: meta.vram, loadSec: null, runs: [] };
    results.push(entry);
    const row = addRow(entry);
    const section = addSection(entry);

    say(`waking ${meta.label}`);
    const t0 = performance.now();
    try {
      const progress = (r) => say(`waking ${meta.label} · ${Math.round((r.progress || 0) * 100)}%`);
      if (!engine) {
        const worker = new Worker(new URL("./worker.js", import.meta.url), { type: "module" });
        engine = await CreateWebWorkerMLCEngine(worker, id, { initProgressCallback: progress }, chatOptsFor(id));
        loadedModel = id;
      } else if (loadedModel !== id) {
        engine.setInitProgressCallback(progress);
        await engine.reload(id, chatOptsFor(id));
        loadedModel = id;
      }
    } catch (e) {
      entry.error = String(e?.message || e);
      updateRow(row, entry);
      continue;
    }
    entry.loadSec = (performance.now() - t0) / 1000;

    for (let i = 0; i < n && !stop; i++) {
      const wish = LIST[i];
      say(`${meta.label} · ${i + 1}/${n} · ${wish}`);
      const r = await dream(id, wish, maxTokens, seed + i, temperature, strategy);
      // the harness, exactly as the app runs it, but with one retry so the eval stays bounded
      let report = dreamToPage(r.raw, wish, r.finish, strategy, undefined, strategy === "spec" ? exampleFor(wish, 0)[1].title : null);
      r.copied = !!report.copied;
      r.issues = report.issues.map((x) => x.kind);
      r.fatal = report.fatal;
      r.retried = false;
      if ((report.fatal || report.copied) && !stop) {
        say(`${meta.label} · ${i + 1}/${n} · ${report.fatal ? "broken (" + r.issues.join(", ") + ")" : "the example's own world"}, asking again`);
        // a fresh start, as in the app: new shuffle, cooler, the broken attempt out of sight (spec); the html path keeps the old exchange
        const again = strategy === "spec"
          ? await dream(id, wish, maxTokens, seed + i + 1000, 0.7, strategy, [], true)
          : await dream(id, wish, maxTokens, seed + i + 1000, temperature, strategy, [{ role: "assistant", content: r.raw.slice(0, 4000) }, { role: "user", content: retryMessage(report.issues, strategy) }]);
        r.retried = true;
        r.retryRaw = again.raw;
        r.tokens += again.tokens;
        r.seconds += again.seconds;
        report = dreamToPage(again.raw, wish, again.finish, strategy, undefined, strategy === "spec" ? exampleFor(wish, 1)[1].title : null);
        r.copiedAfterRetry = !!report.copied;
        r.fatalAfterRetry = report.fatal;
        r.issuesAfterRetry = report.issues.map((x) => x.kind);
      }
      r.html = report.html;
      r.spec = report.spec;
      r.fp = fingerprint(report.spec, report.html);
      const card = addCard(section, r, wish);
      const measured = await paint(card, r.html);
      r.score = score(strategy === "spec" ? r.html : r.raw, wish, measured);
      r.score.original = strategy === "spec" ? originality(r.spec, wish, r.fatalAfterRetry != null ? 1 : 0) : null;
      r.score.sense = strategy === "spec" ? sense(r.spec, wish) : null;
      r.score.prose = strategy === "spec" ? proseScore(r.spec) : null;
      r.score.buttons = strategy === "spec" ? buttonSense(r.spec) : null;
      r.score.doors = strategy === "spec" ? doorSense(r.spec, wish) : null;
      if (SET === "followups" && strategy === "spec") {
        r.score.edit = r.spec && FOLLOWUPS[i].expect(r.spec) ? 1 : 0;
        r.score.kept = r.spec ? keptScore(PRIOR.spec, r.spec) : 0;
      }
      r.measured = measured;
      fillCard(card, r);
      entry.runs.push(r);
      updateRow(row, entry);
    }
  }

  markBest();
  $("run").disabled = false; $("stop").disabled = true; $("json").disabled = false; $("md").disabled = false;
  window.__eval.done = true;
  window.__eval.running = false;
  say(stop ? "stopped" : "done");
  try { await engine?.unload(); engine = null; } catch {}
}

async function dream(modelId, wish, maxTokens, seed, temperature, strategy, extraMessages = [], forceTemp = false) {
  const prior = SET === "followups" && strategy === "spec" ? [{ role: "user", content: PRIOR.wish }, { role: "assistant", content: JSON.stringify(PRIOR.spec) }] : [];
  const messages = [{ role: "system", content: systemFor(strategy, { example: EXAMPLE, wish, salt: forceTemp ? 1 : 0 }) }, ...prior, { role: "user", content: userMessage(wish, strategy, { hints: PARAMS.get("hints") !== "0" }) }, ...extraMessages]; // what ships: the wish carries its plain cues; &hints=0 measures the bare wish
  const extra = { seed, logprobs: false, top_logprobs: undefined };
  if (strategy === "html") extra.max_tokens = maxTokens;
  if (strategy === "html" || PARAMS.has("temp") || forceTemp) extra.temperature = temperature;
  const req = requestFor(modelId, messages, extra, strategy);
  delete req.top_logprobs;
  let raw = "", tokens = 0, finish = null, usage = null;
  const t0 = performance.now();
  let tFirst = null;
  try {
    const stream = await engine.chat.completions.create(req);
    for await (const chunk of stream) {
      const c = chunk.choices?.[0];
      if (c?.delta?.content) { raw += c.delta.content; tokens++; if (tFirst === null) tFirst = performance.now(); }
      if (c?.finish_reason) finish = c.finish_reason;
      if (chunk.usage) usage = chunk.usage;
    }
  } catch (e) {
    return { wish, raw, tokens, tps: 0, finish: "error: " + (e?.message || e), seconds: 0 };
  }
  const seconds = (performance.now() - t0) / 1000;
  const completion = usage?.completion_tokens || tokens;
  const decodeSec = usage?.extra?.decode_tokens_per_s ? completion / usage.extra.decode_tokens_per_s : seconds - (tFirst ? (tFirst - t0) / 1000 : 0);
  return { wish, raw, tokens: completion, tps: completion / Math.max(0.05, decodeSec), finish, seconds };
}

/* ---------- render ---------- */

function addRow(entry) {
  const tr = document.createElement("tr");
  $("table").querySelector("tbody").appendChild(tr);
  updateRow(tr, entry);
  return tr;
}

function mean(entry, key) {
  const v = entry.runs.map((r) => r.score?.[key]).filter((x) => x != null);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}
const f2 = (x) => (x == null ? "·" : x.toFixed(2));

function updateRow(tr, entry) {
  const tps = entry.runs.length ? entry.runs.reduce((a, r) => a + r.tps, 0) / entry.runs.length : null;
  const tok = entry.runs.length ? entry.runs.reduce((a, r) => a + r.tokens, 0) / entry.runs.length : null;
  const keys = ["complete", "clean", "style", "colors", "decor", "text", "wish", "loop", "visual", "sense", "original", "prose", "buttons", "doors", "edit", "kept", "total"];
  const errs = entry.runs.length ? entry.runs.reduce((a, r) => a + (r.issues?.length || 0), 0) / entry.runs.length : null;
  const fatal = entry.runs.length ? entry.runs.filter((r) => r.fatal).length / entry.runs.length : null;
  const dead = entry.runs.length ? entry.runs.filter((r) => r.fatal && r.fatalAfterRetry).length / entry.runs.length : null;
  const vary = variety(entry.runs.map((r) => r.fp));
  tr.innerHTML = `<td>${escapeHtml(entry.label)}${entry.error ? ` <span style="color:#ff5c8a">${escapeHtml(entry.error.slice(0, 60))}</span>` : ""}</td>
    <td>${entry.vram}</td><td>${entry.loadSec == null ? "·" : entry.loadSec.toFixed(0)}</td>
    <td>${tps == null ? "·" : tps.toFixed(1)}</td><td>${tok == null ? "·" : tok.toFixed(0)}</td>
    <td>${errs == null ? "·" : errs.toFixed(1)}</td><td>${fatal == null ? "·" : (fatal * 100).toFixed(0) + "%"}</td><td>${dead == null ? "·" : (dead * 100).toFixed(0) + "%"}</td><td>${f2(vary)}</td>` +
    keys.map((k) => `<td>${f2(mean(entry, k))}${k === "total" && mean(entry, k) != null ? `<span class="bar" style="width:${(mean(entry, k) * 60).toFixed(0)}px"></span>` : ""}</td>`).join("");
}

function markBest() {
  let best = null, bestV = -1;
  const rows = [...$("table").querySelectorAll("tbody tr")];
  results.forEach((e, i) => { const v = mean(e, "total"); if (v != null && v > bestV) { bestV = v; best = rows[i]; } });
  if (best) best.classList.add("best");
}

function addSection(entry) {
  const h = document.createElement("h2");
  h.textContent = entry.label;
  $("cards").appendChild(h);
  const g = document.createElement("div");
  g.className = "grid";
  $("cards").appendChild(g);
  return g;
}

function addCard(section, r, wish) {
  const card = document.createElement("div");
  card.className = "card";
  card.innerHTML = `<div class="shot"><iframe sandbox="allow-same-origin" title="${escapeHtml(wish)}"></iframe></div><div class="meta"><b>${escapeHtml(wish)}</b><br/>painting…</div>`;
  section.appendChild(card);
  return card;
}

function paint(card, html) {
  return new Promise((resolve) => {
    const f = card.querySelector("iframe");
    const done = () => setTimeout(() => resolve(measureFrame(f)), 150);
    f.addEventListener("load", done, { once: true });
    f.srcdoc = html;
    setTimeout(() => resolve(measureFrame(f)), 3000);
  });
}

function fillCard(card, r) {
  const s = r.score;
  card.querySelector(".meta").innerHTML =
    `<b>${escapeHtml(r.wish)}</b><br/>total ${f2(s.total)} · ${r.tokens} tok · ${r.tps.toFixed(1)} tok/s · ${escapeHtml(String(r.finish))}<br/>` +
    `harness: ${r.issues.length ? escapeHtml(r.issues.join(", ")) : "clean"}${r.retried ? (r.fatalAfterRetry ? " · retry failed" : " · fixed on retry") : ""}<br/>` +
    `complete ${f2(s.complete)} style ${f2(s.style)} colors ${f2(s.colors)} decor ${f2(s.decor)} text ${f2(s.text)} wish ${f2(s.wish)} loop ${f2(s.loop)} visual ${f2(s.visual)}` + (s.sense != null ? ` sense ${f2(s.sense)}` : "") + (s.original != null ? ` original ${f2(s.original)}` : "") + (s.prose != null ? ` prose ${f2(s.prose)}` : "") + (s.buttons != null ? ` buttons ${f2(s.buttons)} doors ${f2(s.doors)}` : "") + (s.edit != null ? ` edit ${s.edit} kept ${f2(s.kept)}` : "");
}

/* ---------- export ---------- */

function exportable() {
  return {
    date: new Date().toISOString(),
    set: SET,
    example: EXAMPLE,
    system: systemFor("spec", { example: EXAMPLE }),
    ua: navigator.userAgent,
    results: results.map((e) => ({ ...e, runs: e.runs.map((r) => ({ ...r, html: undefined, fp: undefined })) })),
    pages: results.map((e) => ({ model: e.model, strategy: e.strategy, pages: e.runs.map((r) => ({ wish: r.wish, html: r.html })) })),
  };
}

function markdown() {
  const head = "| mind | vram MB | load s | tok/s | tokens | errors | broken | dead | variety | complete | style | colors | decor | text | wish | loop | visual | sense | original | prose | buttons | doors | edit | kept | total |\n|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|";
  const rows = results.map((e) => {
    const tps = e.runs.length ? e.runs.reduce((a, r) => a + r.tps, 0) / e.runs.length : null;
    const tok = e.runs.length ? e.runs.reduce((a, r) => a + r.tokens, 0) / e.runs.length : null;
    const errs = e.runs.length ? e.runs.reduce((a, r) => a + (r.issues?.length || 0), 0) / e.runs.length : null;
    const fatal = e.runs.length ? e.runs.filter((r) => r.fatal).length / e.runs.length : null;
    const dead = e.runs.length ? e.runs.filter((r) => r.fatal && r.fatalAfterRetry).length / e.runs.length : null;
    const vary = variety(e.runs.map((r) => r.fp));
    return `| ${e.label} | ${e.vram} | ${e.loadSec == null ? "·" : e.loadSec.toFixed(0)} | ${tps == null ? "·" : tps.toFixed(1)} | ${tok == null ? "·" : tok.toFixed(0)} | ${errs == null ? "·" : errs.toFixed(1)} | ${fatal == null ? "·" : (fatal * 100).toFixed(0) + "%"} | ${dead == null ? "·" : (dead * 100).toFixed(0) + "%"} | ${f2(vary)} | ` +
      ["complete", "style", "colors", "decor", "text", "wish", "loop", "visual", "sense", "original", "prose", "buttons", "doors", "edit", "kept", "total"].map((k) => f2(mean(e, k))).join(" | ") + " |";
  });
  return head + "\n" + rows.join("\n");
}
window.__evalMarkdown = markdown;

function download(name, text) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  a.download = name;
  a.click();
}

if (PARAMS.has("auto")) run().catch((e) => say("broke: " + e.message, true));
