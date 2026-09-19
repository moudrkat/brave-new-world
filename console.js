// The console: the one thing on the page the model does not write. It lives
// inside whatever world was dreamed, in a shadow root so the world's CSS cannot
// break it, and takes its colors from the world through four CSS variables
// (--bnw-bg, --bnw-fg, --bnw-accent, --bnw-font) that the model may set on
// :root, or that app.js derives from the page when the model did not.
//
// There is deliberately almost nothing in it: one button that wakes the mind,
// one line to wish into, and whatever buttons the model invented for the world
// you are in. Where the panel sits, how it is shaped and toned, what the button
// says and what the levers do: all of that is the model's, per world.

import { detemper } from "./mind.js";

const CSS = `
:host {
  --bg: var(--bnw-bg, rgba(7, 6, 11, 0.82));
  --fg: var(--bnw-fg, #efe6d6);
  --accent: var(--bnw-accent, #e0a458);
  --font: var(--bnw-font, "Cormorant Garamond", Georgia, serif);
  --mono: "JetBrains Mono", ui-monospace, Menlo, monospace;
  --line: color-mix(in srgb, var(--fg) 14%, transparent);
  --dim: color-mix(in srgb, var(--fg) 55%, transparent);
  --violet: #9b6bff;
  --rose: #ff5c8a;
  --radius: 10px;
  --pad-x: 22px;
  position: fixed;
  left: 0; right: 0; bottom: 0;
  z-index: 2147483000;
  font-family: var(--font);
  color: var(--fg);
  font-weight: 300;
  line-height: 1.3;
  pointer-events: none;
}
* { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }

/* ---- where the model put the panel ---- */
:host([data-side="top"]) { top: 0; bottom: auto; }
:host([data-side="top"]) .panel { border-radius: 0 0 var(--radius) var(--radius); border-top: 0; border-bottom: 1px solid var(--line); box-shadow: 0 30px 80px -40px rgba(0, 0, 0, 0.7); padding-top: calc(10px + env(safe-area-inset-top)); }
:host([data-side="top"]) .panel { display: flex; flex-direction: column; }
:host([data-side="top"]) .acts { order: 9; margin: 10px 0 2px; }
:host([data-side="left"]), :host([data-side="right"]) { top: 0; bottom: 0; left: 0; right: auto; width: min(400px, 92vw); display: flex; align-items: flex-end; }
:host([data-side="right"]) { left: auto; right: 0; }
:host([data-side="left"]) .panel, :host([data-side="right"]) .panel { width: 100%; max-width: none; margin: 0; border-radius: 0 var(--radius) 0 0; border-left: 0; }
:host([data-side="right"]) .panel { border-radius: var(--radius) 0 0 0; border-left: 1px solid var(--line); border-right: 0; }
:host([data-side="left"]) .top, :host([data-side="right"]) .top { flex-wrap: wrap; }
:host([data-side="left"]) .acts, :host([data-side="right"]) .acts { flex-direction: column; align-items: flex-start; }
:host([data-side="right"]) .acts { align-items: flex-end; }
:host([data-width="narrow"]) .panel { max-width: 680px; }
:host([data-width="full"]) .panel { max-width: none; border-radius: 0; border-left: 0; border-right: 0; }
:host([data-shape="sharp"]) { --radius: 0px; }
:host([data-shape="pill"]) { --radius: 26px; }
:host([data-shape="pill"]) .act, :host([data-shape="pill"]) .chip, :host([data-shape="pill"]) .wake { border-radius: 999px; }
:host([data-shape="sharp"]) .act, :host([data-shape="sharp"]) .chip, :host([data-shape="sharp"]) .wake { border-radius: 0; }
:host([data-shape="soft"]) .act, :host([data-shape="soft"]) .chip { border-radius: 8px; }
:host([data-tone="neon"]) .panel { border-color: var(--accent); box-shadow: 0 0 24px color-mix(in srgb, var(--accent) 45%, transparent), inset 0 0 40px color-mix(in srgb, var(--accent) 8%, transparent); }
:host([data-tone="neon"]) .act { box-shadow: 0 0 12px color-mix(in srgb, var(--accent) 35%, transparent); }
:host([data-tone="paper"]) .panel { backdrop-filter: none; -webkit-backdrop-filter: none; }
:host([data-tone="paper"]) .act { border-style: dashed; }
:host([data-tone="light"]) .act:hover, :host([data-tone="paper"]) .act:hover { background: color-mix(in srgb, var(--accent) 18%, transparent); }
:host-context(html.low-power) .panel { backdrop-filter: none; -webkit-backdrop-filter: none; }

.sky { position: fixed; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 0; }
.panel {
  position: relative;
  z-index: 1;
  pointer-events: auto;
  margin: 0 auto;
  max-width: 1180px;
  background: var(--bg);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border: 1px solid var(--line);
  border-bottom: 0;
  border-radius: var(--radius) var(--radius) 0 0;
  padding: 10px var(--pad-x) calc(14px + env(safe-area-inset-bottom));
  box-shadow: 0 -30px 80px -40px rgba(0, 0, 0, 0.7);
}
.top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  font-family: var(--mono);
  font-size: 10.5px;
  letter-spacing: 0.14em;
  color: var(--dim);
  text-transform: lowercase;
}
.top .brand { color: var(--accent); white-space: nowrap; }
.top .stats { cursor: pointer; text-align: right; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.top .stats:empty { display: none; }
.top .right { display: flex; gap: 12px; align-items: baseline; min-width: 0; }
.link { background: transparent; border: 0; border-bottom: 1px solid var(--line); color: var(--dim); font: inherit; letter-spacing: inherit; text-transform: inherit; padding: 0 0 1px; cursor: pointer; }
.link:hover { color: var(--accent); border-color: var(--accent); }
:host(:not([data-world])) .link { display: none; }

/* ---- the insides: only while it thinks, and a moment after ---- */
.inside { max-height: 110px; overflow: hidden; transition: max-height 0.5s ease, opacity 0.5s ease; margin-top: 6px; border-top: 1px solid var(--line); padding-top: 4px; }
.inside.closed { max-height: 0; opacity: 0; border-color: transparent; margin-top: 0; padding-top: 0; }
.spark { display: block; width: 100%; height: 26px; }
.ribbon {
  margin-top: 2px; height: 46px; overflow: hidden;
  font-family: var(--mono); font-size: 11px; line-height: 22px;
  white-space: pre-wrap; word-break: break-all;
  display: flex; flex-direction: column; justify-content: flex-end;
  mask-image: linear-gradient(to bottom, transparent 0, #000 16px);
  -webkit-mask-image: linear-gradient(to bottom, transparent 0, #000 16px);
}
.tok { --p: 1; color: var(--tok, var(--fg)); opacity: calc(0.3 + 0.7 * var(--p)); text-shadow: 0 0 calc(10px * (1 - var(--p))) var(--tok, transparent); cursor: default; }
.tok:hover, .tok.held { outline: 1px solid var(--line); outline-offset: 1px; }
.harness { font-family: var(--mono); font-size: 10px; letter-spacing: 0.1em; color: var(--dim); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.harness.bad { color: var(--rose); }
.harness:empty { display: none; }

/* ---- the buttons the model invented ---- */
.acts { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; align-items: center; }
/* doors: the model's wishes for the next world; pressing one wishes it */
.doors { display: flex; flex-wrap: wrap; gap: 6px 14px; margin-top: 8px; align-items: baseline; }
.doors:empty { display: none; }
.doors .lead { font-family: var(--mono); font-size: 10px; letter-spacing: 0.14em; color: var(--dim); text-transform: lowercase; }
.door { background: transparent; border: 0; border-bottom: 1px solid color-mix(in srgb, var(--accent) 40%, transparent); color: var(--fg); font-family: var(--font); font-style: italic; font-size: 15.5px; padding: 3px 0; cursor: pointer; min-height: 30px; }
.door::before { content: "→ "; color: var(--accent); font-style: normal; }
.door:hover { color: var(--accent); border-color: var(--accent); }
:host([data-side="right"]) .doors { justify-content: flex-end; }
:host([data-side="left"]) .doors, :host([data-side="right"]) .doors { flex-direction: column; align-items: flex-start; gap: 4px; }
:host([data-side="right"]) .doors { align-items: flex-end; }
:host([data-side="top"]) .doors { order: 10; }
.acts:empty { display: none; }
.act { background: transparent; border: 1px solid color-mix(in srgb, var(--accent) 50%, transparent); border-radius: 999px; color: var(--accent); font-family: var(--font); font-style: italic; font-size: 16px; padding: 6px 15px; cursor: pointer; min-height: 36px; }
.act:hover { background: color-mix(in srgb, var(--accent) 12%, transparent); }
.act:active { transform: translateY(1px); }

/* ---- waking, and the dreams it already had ---- */
.wakebox { margin-top: 12px; }
.wakebox[hidden] { display: none; }
.wake {
  display: block; width: 100%; position: relative; overflow: hidden;
  background: color-mix(in srgb, var(--accent) 16%, transparent);
  border: 1px solid var(--accent); border-radius: var(--radius);
  color: var(--fg); font-family: var(--font); font-size: 20px; font-weight: 300;
  padding: 14px 18px; cursor: pointer; text-align: left; min-height: 56px;
  box-shadow: 0 0 0 0 color-mix(in srgb, var(--accent) 40%, transparent);
  animation: beckon 2.6s ease-in-out infinite;
}
.wake b { font-weight: 400; color: var(--accent); }
.wake small { display: block; font-family: var(--mono); font-size: 10.5px; letter-spacing: 0.12em; color: var(--dim); margin-top: 4px; text-transform: lowercase; }
.wake:hover { background: color-mix(in srgb, var(--accent) 26%, transparent); }
.wake:disabled { cursor: progress; animation: none; }
.wake .fill { position: absolute; left: 0; top: 0; bottom: 0; width: 0; background: color-mix(in srgb, var(--accent) 28%, transparent); transition: width 0.4s; pointer-events: none; }
.wake > span { position: relative; }
@keyframes beckon { 0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--accent) 45%, transparent); } 50% { box-shadow: 0 0 0 8px transparent; } }
.demos { margin-top: 12px; }
.demos[hidden] { display: none; }
.demos .lead { font-style: italic; font-size: 14px; color: var(--dim); margin: 0 0 6px; }
.chips { display: flex; flex-wrap: wrap; gap: 8px; }
.chip { background: transparent; border: 1px solid var(--line); border-radius: 999px; color: var(--fg); font-family: var(--font); font-style: italic; font-size: 15px; padding: 6px 14px; cursor: pointer; min-height: 36px; }
.chip:hover { border-color: color-mix(in srgb, var(--accent) 60%, transparent); color: var(--accent); }

.history { list-style: none; margin: 8px 0 0; padding: 0; display: flex; gap: 14px; overflow-x: auto; scrollbar-width: none; font-style: italic; font-size: 13.5px; color: var(--dim); white-space: nowrap; }
.history::-webkit-scrollbar { display: none; }
.history:empty { display: none; }
.history li { cursor: pointer; }
.history li::before { content: "· "; color: var(--accent); }
.history li.current, .history li:hover { color: var(--fg); }

form { display: flex; align-items: center; gap: 14px; border-bottom: 1px solid var(--line); margin-top: 4px; }
form:focus-within { border-color: color-mix(in srgb, var(--accent) 55%, transparent); }
input {
  flex: 1; min-width: 0; background: transparent; border: 0; outline: none; color: var(--fg);
  font-family: var(--font); font-size: clamp(18px, 2.2vw, 26px); font-weight: 300; padding: 10px 0; caret-color: var(--accent);
}
input::placeholder { color: var(--dim); font-style: italic; }
input:disabled { opacity: 0.5; }
button.go { background: transparent; border: 0; color: var(--accent); font-family: var(--font); font-style: italic; font-size: 19px; cursor: pointer; padding: 8px 2px; min-height: 40px; white-space: nowrap; }
button.go:hover { text-shadow: 0 0 18px color-mix(in srgb, var(--accent) 70%, transparent); }
.status { margin: 6px 0 0; min-height: 14px; font-family: var(--mono); font-size: 10.5px; letter-spacing: 0.12em; color: var(--dim); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.status.warn { color: var(--rose); white-space: normal; }

.tip {
  position: fixed; z-index: 2147483001; pointer-events: none;
  background: rgba(14, 12, 22, 0.94); color: #efe6d6; border: 1px solid rgba(239,230,214,.14); border-radius: 6px;
  padding: 10px 12px; font-family: var(--mono); font-size: 11px; min-width: 200px; max-width: min(320px, 90vw);
}
.tip-head { font-family: var(--font); font-style: italic; font-size: 13px; color: rgba(239,230,214,.6); margin-bottom: 8px; }
.tip-head b { color: #e0a458; font-weight: 400; }
.tip-row { display: grid; grid-template-columns: 1fr 48px; gap: 8px; align-items: center; padding: 2px 0; color: rgba(239,230,214,.6); }
.tip-row.chosen { color: #e0a458; }
.tip-word { white-space: pre; overflow: hidden; text-overflow: ellipsis; }
.tip-bar { height: 3px; background: rgba(239,230,214,.14); border-radius: 2px; overflow: hidden; }
.tip-bar i { display: block; height: 100%; width: calc(100% * var(--p)); background: currentColor; }

/* ---- a phone ---- */
@media (max-width: 720px) {
  :host { --pad-x: 14px; }
  .panel { border-radius: 0; border-left: 0; border-right: 0; padding-top: 8px; }
  .top { font-size: 10px; letter-spacing: 0.1em; }
  /* a side panel would cover the world on a phone: it keeps its side as an alignment instead */
  :host([data-side="left"]), :host([data-side="right"]) { top: auto; bottom: 0; left: 0; right: 0; width: auto; display: block; }
  :host([data-side="left"]) .panel, :host([data-side="right"]) .panel { border-radius: 0; border-left: 0; border-right: 0; }
  :host([data-side="left"]) .panel { border-left: 3px solid var(--accent); }
  :host([data-side="right"]) .panel { border-right: 3px solid var(--accent); }
  :host([data-side="left"]) .acts, :host([data-side="right"]) .acts { flex-direction: row; }
  :host([data-side="left"]) .doors, :host([data-side="right"]) .doors { flex-direction: row; align-items: baseline; }
  .door { font-size: 14.5px; }
  :host([data-side="right"]) .acts { justify-content: flex-end; }
  :host([data-side="right"]) form { flex-direction: row-reverse; }
  :host([data-side="right"]) input { text-align: right; }
  .ribbon { height: 40px; font-size: 10px; line-height: 20px; }
  .spark { height: 20px; }
  .inside { max-height: 90px; }
  .act { font-size: 15px; padding: 6px 13px; }
  .wake { font-size: 18px; padding: 12px 14px; }
  input { font-size: 17px; padding: 9px 0; }
  button.go { font-size: 17px; }
  .history { font-size: 13px; }
}
@media (prefers-reduced-motion: reduce) { .wake { animation: none; } }
`;

const HTML = `
<canvas class="sky" aria-hidden="true"></canvas>
<div class="panel">
  <div class="top">
    <span class="brand">brave new world</span>
    <span class="right"><span id="stats" class="stats" title="what it was thinking"></span><button id="share" class="link" type="button" title="the address bar holds this exact world: send it">link</button></span>
  </div>
  <div id="inside" class="inside closed">
    <canvas id="spark" class="spark" height="26"></canvas>
    <div id="ribbon" class="ribbon"><span id="ribbon-inner"></span></div>
    <div id="harness" class="harness"></div>
  </div>
  <div id="acts" class="acts"></div>
  <div id="doors" class="doors"></div>
  <div id="wakebox" class="wakebox">
    <button id="wake" class="wake" type="button"><i class="fill"></i><span><b>wake the mind</b> · it dreams inside this tab<small id="wakenote">300 MB once, then nothing leaves your device</small></span></button>
  </div>
  <div id="demos" class="demos" hidden>
    <p class="lead">or step into a world it dreamt before, no download:</p>
    <div id="chips" class="chips"></div>
  </div>
  <ol id="history" class="history"></ol>
  <form id="ask" autocomplete="off">
    <input id="wish" type="text" placeholder="a place, a mood, one word, or a change to this world…" spellcheck="false" enterkeyhint="go" autocapitalize="off" maxlength="400" />
    <button id="go" class="go" type="submit">dream</button>
  </form>
  <p id="status" class="status"></p>
</div>
<div id="tip" class="tip" hidden></div>
`;

function tokColor(p) {
  if (p >= 0.7) return "var(--fg)";
  if (p >= 0.35) return "var(--accent)";
  if (p >= 0.12) return "var(--violet)";
  return "var(--rose)";
}
const visible = (s) => s.replace(/\n/g, "⏎").replace(/ /g, "␣").replace(/\t/g, "⇥") || "∅";
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const DEFAULT_PROMPT = "a place, a mood, one word, or a change to this world…";

export class BnwConsole extends HTMLElement {
  constructor() {
    super();
    const root = this.attachShadow({ mode: "open" });
    root.innerHTML = `<style>${CSS}</style>${HTML}`;
    this.$ = (id) => root.getElementById(id);
    this.probs = [];
    this.doubt = 0;
    this.dreaming = false;
    this._worldActive = false;
    this.awake = false;
    this.temperature = 0.7;
    this.baseButton = "dream";
    this._fold = null;

    this.$("ask").addEventListener("submit", (e) => {
      e.preventDefault();
      if (this.dreaming) return this.dispatchEvent(new CustomEvent("stop"));
      const wish = this.$("wish").value.trim();
      if (!wish) return;
      this.$("wish").value = "";
      this.$("wish").blur(); // a phone keyboard should get out of the way of the world
      this.dispatchEvent(new CustomEvent("wish", { detail: wish }));
    });
    this.$("wake").addEventListener("click", () => this.dispatchEvent(new CustomEvent("wake")));
    this.$("stats").addEventListener("click", () => this.toggleInside());
    this.$("share").addEventListener("click", () => this.dispatchEvent(new CustomEvent("share")));

    const ribbon = this.$("ribbon");
    ribbon.addEventListener("mouseover", (e) => this.showTip(e));
    ribbon.addEventListener("mousemove", (e) => this.placeTip(e));
    ribbon.addEventListener("mouseout", (e) => { if (!e.relatedTarget || !e.relatedTarget.closest?.(".tok")) this.hideTip(); });
    // on a touch screen there is no hover: a tap holds the tooltip until the next tap
    ribbon.addEventListener("click", (e) => { const t = e.target.closest?.(".tok"); if (!t) return this.hideTip(); if (this._held === t) return this.hideTip(); this.showTip(e, t); });
    root.addEventListener("click", (e) => { if (!e.target.closest?.(".ribbon")) this.hideTip(); });

    this.sky = makeSky(root.querySelector(".sky"), this);
    // the world needs to know how much of the edge the panel takes, so its
    // words can keep clear of it: --bnw-panel on the root, in pixels
    const panel = root.querySelector(".panel");
    const tell = () => document.documentElement.style.setProperty("--bnw-panel", Math.round(panel.getBoundingClientRect().height) + "px");
    if (typeof ResizeObserver !== "undefined") new ResizeObserver(tell).observe(panel);
    addEventListener("resize", tell);
    tell();
  }

  get worldActive() { return this._worldActive; }
  set worldActive(v) { this._worldActive = v; if (v) this.dataset.world = "1"; else delete this.dataset.world; }

  /* ---- the design the model chose ---- */

  applyDesign(d) {
    for (const a of ["side", "tone", "shape", "width"]) { if (d && d[a] && !(a === "side" && d.side === "bottom")) this.dataset[a] = d[a]; else delete this.dataset[a]; }
    this.$("wish").placeholder = d?.prompt || DEFAULT_PROMPT;
    this.baseButton = d?.button || "dream";
    if (!this.dreaming) this.$("go").textContent = this.baseButton;
    const acts = this.$("acts");
    acts.innerHTML = "";
    for (const b of d?.buttons || []) {
      const el = document.createElement("button");
      el.type = "button"; el.className = "act"; el.textContent = b.label; el.title = "a lever on this world: " + b.action;
      el.addEventListener("click", () => this.dispatchEvent(new CustomEvent("action", { detail: b.action })));
      acts.appendChild(el);
    }
    const doors = this.$("doors");
    doors.innerHTML = "";
    if (d?.next?.length) {
      const lead = document.createElement("span"); lead.className = "lead"; lead.textContent = "doors"; doors.appendChild(lead);
      for (const w of d.next) {
        const el = document.createElement("button");
        el.type = "button"; el.className = "door"; el.textContent = w; el.title = "a world it thinks you might want next: wish it";
        el.addEventListener("click", () => { if (this.dreaming) return; this.wish = w; this.submit(); });
        doors.appendChild(el);
      }
    }
  }

  /* ---- what app.js calls ---- */

  set wish(v) { this.$("wish").value = v; }
  get wish() { return this.$("wish").value; }
  submit() { this.$("ask").requestSubmit(); }
  focus() { if (matchMedia("(pointer: fine)").matches) this.$("wish").focus(); }

  setAwake(on, note) {
    this.awake = on;
    this.$("wakebox").hidden = on;
    this.$("demos").hidden = on || !this.$("chips").childElementCount;
    if (note) this.$("wakenote").textContent = note;
    this.$("wake").disabled = false;
    this.setProgress(null);
  }
  setWaking(text) {
    this.$("wake").disabled = true;
    this.$("wakenote").textContent = text;
  }
  setDemos(list, onPick) {
    const chips = this.$("chips");
    chips.innerHTML = "";
    list.forEach((d, i) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "chip"; b.textContent = d.wish;
      b.addEventListener("click", () => onPick(i));
      chips.appendChild(b);
    });
    this.$("demos").hidden = this.awake || !list.length;
  }

  setStatus(text, warn = false) {
    this.$("status").textContent = text;
    this.$("status").classList.toggle("warn", warn);
    document.title = "Brave New World · " + text;
  }
  setProgress(frac) {
    this.$("wake").querySelector(".fill").style.width = frac == null ? "0" : Math.round(frac * 100) + "%";
  }
  setDreaming(on) {
    this.dreaming = on;
    this.$("wish").disabled = on;
    this.$("go").textContent = on ? "wake me" : this.baseButton;
    clearTimeout(this._fold);
    if (on) { this.probs = []; this.$("ribbon-inner").textContent = ""; this.$("harness").textContent = ""; this.$("stats").textContent = ""; this.openInside(true); }
    else this._fold = setTimeout(() => this.openInside(false), 6000);
  }
  openInside(open) {
    this.$("inside").classList.toggle("closed", !open);
  }
  toggleInside() { this.openInside(this.$("inside").classList.contains("closed")); }
  setHarness(text, bad = false) {
    this.$("harness").textContent = text;
    this.$("harness").classList.toggle("bad", bad);
  }
  get harnessText() { return this.$("harness").textContent; }

  addToken(lp) {
    const { p, alts } = detemper(lp, this.temperature);
    this.paintToken(lp.token, p, alts);
    return { p, alts };
  }
  // a token already weighed: live from addToken, or replayed from a recorded dream
  paintToken(token, p, alts) {
    const span = document.createElement("span");
    span.className = "tok";
    span.textContent = token;
    span.style.setProperty("--p", p.toFixed(3));
    span.style.setProperty("--tok", tokColor(p));
    span.dataset.p = p.toFixed(3);
    span._alts = alts;
    const inner = this.$("ribbon-inner");
    inner.appendChild(span);
    while (inner.childNodes.length > 600) inner.removeChild(inner.firstChild);
    this.probs.push(p);
    this.doubt = this.doubt * 0.92 + (1 - p) * 0.08;
    this.sky.spark(p);
    this.sky.feed(p, alts.length);
  }

  updateStats(t0, n, note) {
    const secs = (performance.now() - t0) / 1000;
    const mean = this.probs.reduce((a, b) => a + b, 0) / Math.max(1, this.probs.length);
    const hes = this.probs.filter((p) => p < 0.35).length;
    this.$("stats").textContent = `${n} tokens · ${(n / Math.max(0.1, secs)).toFixed(1)} tok/s · ${(mean * 100).toFixed(0)}% sure · ${hes} hesitations` + (note ? " · " + note : "");
    this.drawSpark();
  }

  drawSpark() {
    const c = this.$("spark");
    const dpr = devicePixelRatio || 1;
    const W = c.clientWidth || 600, H = c.clientHeight || 26;
    if (c.width !== W * dpr) { c.width = W * dpr; c.height = H * dpr; }
    const g = c.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    const n = this.probs.length;
    if (n < 2) return;
    const fg = getComputedStyle(this).getPropertyValue("--fg") || "#efe6d6";
    const grad = g.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, fg); grad.addColorStop(0.6, "#e0a458"); grad.addColorStop(1, "#ff5c8a");
    g.strokeStyle = grad; g.lineWidth = 1; g.beginPath();
    for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * W, y = H - this.probs[i] * (H - 2) - 1; i ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.stroke();
    g.lineTo(W, H); g.lineTo(0, H); g.closePath(); g.fillStyle = "rgba(155,107,255,0.10)"; g.fill();
  }

  renderHistory(worlds, current, onPick) {
    const ol = this.$("history");
    ol.innerHTML = "";
    if (worlds.length < 2) return;
    worlds.forEach((w, i) => {
      const li = document.createElement("li");
      li.textContent = w.wish;
      li.className = i === current ? "current" : "";
      li.title = "a world you were in: return to it";
      li.addEventListener("click", () => onPick(i));
      ol.appendChild(li);
    });
    ol.scrollLeft = ol.scrollWidth;
  }

  /* ---- tooltip ---- */

  showTip(e, held = null) {
    const t = held || e.target.closest?.(".tok");
    if (!t || !t._alts) return;
    if (this._held) this._held.classList.remove("held");
    this._held = held; if (held) held.classList.add("held");
    const p = Number(t.dataset.p);
    const rows = t._alts.map((a) => `<div class="tip-row${a.token === t.textContent ? " chosen" : ""}" style="--p:${a.p.toFixed(3)}"><span class="tip-word">${esc(visible(a.token))}</span><span class="tip-bar"><i></i></span></div>`).join("");
    const tip = this.$("tip");
    tip.innerHTML = `<div class="tip-head">it said <b>${esc(visible(t.textContent))}</b> with ${(p * 100).toFixed(0)}% certainty. roads not taken:</div>${rows}`;
    tip.hidden = false;
    this.placeTip(e);
  }
  hideTip() { this.$("tip").hidden = true; if (this._held) { this._held.classList.remove("held"); this._held = null; } }
  placeTip(e) {
    const tip = this.$("tip");
    if (tip.hidden) return;
    const w = tip.offsetWidth, h = tip.offsetHeight;
    let x = e.clientX + 14, y = e.clientY - h - 14;
    if (x + w > innerWidth - 12) x = Math.max(8, e.clientX - w - 14);
    if (x + w > innerWidth - 8) x = Math.max(8, innerWidth - w - 8);
    if (y < 12) y = Math.min(innerHeight - h - 8, e.clientY + 18);
    tip.style.left = x + "px"; tip.style.top = y + "px";
  }
}

/* The sky: stars and an iris on world zero, and sparks for every token while
   dreaming, over whatever world is on the page. */
function makeSky(c, host) {
  const g = c.getContext("2d");
  let W = 0, H = 0;
  const stars = [], sparks = [];
  const rnd = (a, b) => a + Math.random() * (b - a);
  const small = matchMedia("(max-width: 720px)").matches;
  function resize() {
    const dpr = Math.min(small ? 1.25 : 1.5, devicePixelRatio || 1);
    W = innerWidth; H = innerHeight;
    c.width = W * dpr; c.height = H * dpr;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  addEventListener("resize", resize); resize();
  for (let i = 0; i < (small ? 110 : 220); i++) stars.push({ a: rnd(0, Math.PI * 2), r: rnd(0.05, 0.75), s: rnd(0.00025, 0.0012), z: rnd(0.4, 1.6), tw: rnd(0, Math.PI * 2) });
  function spark(p) {
    sparks.push({ a: rnd(0, Math.PI * 2), r: rnd(0.02, 0.18), life: 1, p, size: rnd(1, 2.4) + (1 - p) * 3 });
    if (sparks.length > (small ? 90 : 160)) sparks.shift();
  }
  // The shoggoth: the model, as a creature. Its outline is a sum of waves that
  // every token disturbs; a hesitation opens an eye; while dreaming it writhes.
  const shog = { x: 0.16, y: 0.3, tx: 0.16, ty: 0.3, r: 34, t: 0, jolt: 0, eyes: [], mouth: 0, hue: "#9b6bff", ink: "#efe6d6" };
  function feed(p, nAlts) {
    shog.jolt = Math.min(1, shog.jolt + 0.15 + (1 - p) * 0.5);
    if (p < 0.5 && shog.eyes.length < 9) shog.eyes.push({ a: rnd(0, Math.PI * 2), d: rnd(0.25, 0.7), life: 1, size: rnd(2, 4) + (1 - p) * 4, blink: rnd(0, 6) });
    shog.mouth = Math.min(1, shog.mouth + 0.05);
  }
  function drawShoggoth(dt) {
    const cs = getComputedStyle(host);
    shog.hue = cs.getPropertyValue("--accent").trim() || "#9b6bff";
    shog.ink = cs.getPropertyValue("--fg").trim() || "#efe6d6";
    shog.t += dt * 0.001 * (1 + shog.jolt * 6 + (host.dreaming ? 1.5 : 0));
    shog.jolt *= Math.pow(0.5, dt / 400);
    shog.mouth *= Math.pow(0.5, dt / 3000);
    // it drifts about the page, away from the console's side
    if (Math.random() < 0.002 || (Math.abs(shog.x - shog.tx) < 0.01 && Math.abs(shog.y - shog.ty) < 0.01)) {
      const side = small && (host.dataset.side === "left" || host.dataset.side === "right") ? "bottom" : host.dataset.side || "bottom";
      const words = host.dataset.words || "center";
      for (let tries = 0; tries < 12; tries++) {
        shog.tx = side === "left" ? rnd(0.55, 0.92) : side === "right" ? rnd(0.08, 0.45) : rnd(0.08, 0.92);
        shog.ty = side === "top" ? rnd(0.45, 0.9) : side === "bottom" ? rnd(0.12, 0.5) : rnd(0.12, 0.85);
        // stay out of the words
        const inWords = words === "center" ? Math.abs(shog.tx - 0.5) < 0.25 && shog.ty > 0.15 && shog.ty < 0.6
          : words === "left" ? shog.tx < 0.45 : words === "right" ? shog.tx > 0.55
          : words === "top" ? shog.ty < 0.4 && Math.abs(shog.tx - 0.5) < 0.25 : shog.ty > 0.4 && Math.abs(shog.tx - 0.5) < 0.25;
        if (!inWords) break;
      }
    }
    const ease = 1 - Math.pow(0.5, dt / 6000);
    shog.x += (shog.tx - shog.x) * ease; shog.y += (shog.ty - shog.y) * ease;
    const cx = shog.x * W, cy = shog.y * H;
    const R = shog.r * (1 + shog.jolt * 0.5 + host.doubt * 0.8) * Math.min(1.4, Math.max(0.7, W / 1000));
    const pts = lowPower ? 20 : 40;
    g.save();
    g.globalAlpha = host.worldActive ? 0.85 : 0.55;
    g.beginPath();
    for (let i = 0; i <= pts; i++) {
      const a = (i / pts) * Math.PI * 2;
      const wob = 1 + 0.18 * Math.sin(a * 2 + shog.t * 1.3) + 0.12 * Math.sin(a * 3 - shog.t * 2.1) + 0.06 * Math.sin(a * 5 + shog.t * 3.7) + shog.jolt * 0.22 * Math.sin(a * 7 + shog.t * 9);
      const r = R * wob;
      const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * 0.9;
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.closePath();
    const grad = g.createRadialGradient(cx - R * 0.3, cy - R * 0.3, R * 0.1, cx, cy, R * 1.4);
    grad.addColorStop(0, shog.hue);
    grad.addColorStop(0.6, "rgba(155,107,255,0.75)");
    grad.addColorStop(1, "rgba(7,6,11,0.9)");
    g.fillStyle = grad;
    g.fill();
    // a halo instead of a shadow blur: blur on a full-screen canvas is too costly without a GPU
    const halo = g.createRadialGradient(cx, cy, R * 0.8, cx, cy, R * (1.8 + shog.jolt));
    halo.addColorStop(0, shog.hue.length === 7 ? shog.hue + "55" : "rgba(155,107,255,0.33)");
    halo.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = halo; g.beginPath(); g.arc(cx, cy, R * (1.8 + shog.jolt), 0, Math.PI * 2); g.fill();
    // pseudopods: one per recent hesitation, reaching outward
    g.strokeStyle = shog.hue; g.lineWidth = 2; g.lineCap = "round";
    for (let k = 0; k < 5; k++) {
      const a = shog.t * 0.7 + k * 1.26;
      const len = R * (0.9 + 0.5 * Math.sin(shog.t * 2 + k * 2) + shog.jolt);
      g.beginPath(); g.moveTo(cx + Math.cos(a) * R * 0.7, cy + Math.sin(a) * R * 0.63);
      g.quadraticCurveTo(cx + Math.cos(a + 0.4) * len, cy + Math.sin(a + 0.4) * len * 0.9, cx + Math.cos(a + 0.1) * len * 1.3, cy + Math.sin(a + 0.1) * len * 1.2);
      g.globalAlpha = 0.35 * (host.worldActive ? 1 : 0.6); g.stroke();
    }
    g.globalAlpha = host.worldActive ? 0.95 : 0.7;
    // eyes: open on doubt, close with time, blink
    for (let i = shog.eyes.length - 1; i >= 0; i--) {
      const e = shog.eyes[i];
      e.life -= dt / 9000; e.blink += dt * 0.001;
      if (e.life <= 0) { shog.eyes.splice(i, 1); continue; }
      const ex = cx + Math.cos(e.a) * R * e.d, ey = cy + Math.sin(e.a) * R * e.d * 0.9;
      const open = Math.min(1, e.life * 3) * (Math.sin(e.blink * 3) > -0.92 ? 1 : 0.1);
      g.fillStyle = shog.ink; g.beginPath(); g.ellipse(ex, ey, e.size, e.size * open, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#07060b"; g.beginPath(); g.arc(ex + Math.cos(shog.t) * e.size * 0.3, ey, e.size * 0.45 * open, 0, Math.PI * 2); g.fill();
    }
    // a mouth that opens when it has just spoken
    if (shog.mouth > 0.05) { g.strokeStyle = shog.ink; g.lineWidth = 1.5; g.beginPath(); g.arc(cx, cy + R * 0.25, R * 0.3, 0.15 * Math.PI, 0.85 * Math.PI); g.globalAlpha = shog.mouth; g.stroke(); }
    g.restore();
  }
  // Machines without a GPU paint this canvas in software. Measure the first
  // frames; when they are slow, draw less and less often.
  let last = performance.now(), frames = 0, slowSum = 0, lowPower = false, lastDraw = 0;
  const noSky = new URLSearchParams(location.search).has("nosky");
  function frame(now) {
    const dt = Math.min(50, now - last); last = now;
    if (noSky) return;
    if (!lowPower && document.documentElement.classList.contains("low-power")) { lowPower = true; c.style.opacity = "0.7"; }
    if (frames < 40) { frames++; slowSum += dt; if (frames === 40 && slowSum / 40 > 34) { lowPower = true; c.style.opacity = "0.7"; document.documentElement.classList.add("low-power"); } }
    if (lowPower && now - lastDraw < 500) { requestAnimationFrame(frame); return; }
    if (document.hidden) { requestAnimationFrame(frame); return; }
    lastDraw = now;
    g.clearRect(0, 0, W, H);
    const cx = W * 0.5, cy = H * 0.42, R = Math.max(W, H) * 0.62;
    const drift = 1 + host.doubt * 3 + (host.dreaming ? 0.6 : 0);
    if (!host.worldActive && !lowPower) {
      const iris = g.createRadialGradient(cx, cy, 0, cx, cy, R * 0.55);
      iris.addColorStop(0, `rgba(155,107,255,${0.05 + host.doubt * 0.12})`);
      iris.addColorStop(0.5, `rgba(224,164,88,${0.025 + (host.dreaming ? 0.03 : 0)})`);
      iris.addColorStop(1, "rgba(7,6,11,0)");
      g.fillStyle = iris; g.fillRect(0, 0, W, H);
      for (const s of stars) {
        s.a += s.s * dt * drift; s.tw += 0.002 * dt;
        const x = cx + Math.cos(s.a) * s.r * R, y = cy + Math.sin(s.a) * s.r * R * 0.72;
        g.fillStyle = `rgba(239,230,214,${0.18 + 0.22 * (0.5 + 0.5 * Math.sin(s.tw)) * s.z})`;
        g.beginPath(); g.arc(x, y, 0.6 * s.z, 0, Math.PI * 2); g.fill();
      }
    }
    for (let i = sparks.length - 1; i >= 0; i--) {
      const k = sparks[i];
      k.life -= dt / 2600;
      if (lowPower) { if (k.life <= 0) sparks.splice(i, 1); continue; }
      if (k.life <= 0) { sparks.splice(i, 1); continue; }
      k.r += dt * 0.00006 * (1.5 - k.p); k.a += dt * 0.0004 * drift;
      const x = cx + Math.cos(k.a) * k.r * R, y = cy + Math.sin(k.a) * k.r * R * 0.72;
      const col = k.p >= 0.7 ? "239,230,214" : k.p >= 0.35 ? "224,164,88" : k.p >= 0.12 ? "155,107,255" : "255,92,138";
      const al = k.life * k.life * 0.85;
      g.fillStyle = `rgba(${col},${al * 0.35})`; g.beginPath(); g.arc(x, y, k.size * 2.2, 0, Math.PI * 2); g.fill();
      g.fillStyle = `rgba(${col},${al})`; g.beginPath(); g.arc(x, y, k.size, 0, Math.PI * 2); g.fill();
    }
    drawShoggoth(dt);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return { spark, feed };
}

customElements.define("bnw-console", BnwConsole);
