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

/* ---- what the model's choices do to the furniture: shape, tone and width decide
   the input's form, the levers' dress and the order things come in ---- */
.panel { display: flex; flex-direction: column; }
.top { order: 0; } .inside { order: 1; } form { order: 2; } .acts { order: 3; } .doors { order: 4; } .wakebox { order: 5; } .demos { order: 6; } .history { order: 7; } .status { order: 8; }
/* narrow: levers stacked above the line, like a menu */
:host([data-width="narrow"]) .acts { order: 1; flex-direction: column; align-items: flex-start; }
:host([data-width="narrow"]) form { order: 2; }
:host([data-width="narrow"]) .doors { order: 3; flex-direction: column; align-items: flex-start; gap: 4px; }
/* full: levers spread across the whole edge, the line sits last, at the rim */
:host([data-width="full"]) .acts { order: 1; justify-content: space-between; }
:host([data-width="full"]) .acts .act { flex: 1 1 0; text-align: center; }
:host([data-width="full"]) .doors { order: 2; justify-content: center; }
:host([data-width="full"]) form { order: 7; }
:host([data-width="full"]) .history { order: 6; }
/* shape: the line itself takes the model's shape */
:host([data-shape="pill"]) form { border-radius: 999px; padding-left: 22px; padding-right: 18px; }
:host([data-shape="sharp"]) form { border-radius: 0; border-width: 0 0 2px 0; background: transparent; padding-left: 0; padding-right: 0; }
:host([data-shape="sharp"]) .act { border-width: 2px; font-style: normal; letter-spacing: 0.04em; text-transform: lowercase; }
:host([data-shape="soft"]) form { border-radius: 14px; }
/* tone: how the levers are dressed */
:host([data-tone="light"]) .act, :host([data-tone="paper"]) .act { background: var(--accent); color: var(--bg); border-color: transparent; }
:host([data-tone="light"]) .act:hover, :host([data-tone="paper"]) .act:hover { filter: brightness(1.08); background: var(--accent); }
:host([data-tone="paper"]) .act { background: transparent; color: var(--accent); border: 1px dashed var(--accent); }
:host([data-tone="paper"]) form { border-style: dashed; background: transparent; }
:host([data-tone="dark"]) .act { background: color-mix(in srgb, var(--accent) 12%, transparent); }
:host([data-tone="glass"]) .act { background: color-mix(in srgb, var(--fg) 8%, transparent); backdrop-filter: blur(6px); }
:host([data-tone="neon"]) form { box-shadow: 0 0 18px color-mix(in srgb, var(--accent) 40%, transparent), inset 0 0 12px color-mix(in srgb, var(--accent) 12%, transparent); }
:host([data-tone="neon"]) button.go { text-shadow: 0 0 12px var(--accent); }
:host([data-tone="light"]) button.go { background: var(--accent); color: var(--bg); border-radius: 999px; padding: 6px 16px; font-style: normal; }

/* ---- where the model put the panel ---- */
:host([data-side="top"]) { top: 0; bottom: auto; }
:host([data-side="top"]) .panel { border-radius: 0 0 var(--radius) var(--radius); border-top: 0; border-bottom: 1px solid var(--line); box-shadow: 0 30px 80px -40px rgba(0, 0, 0, 0.7); padding-top: calc(10px + env(safe-area-inset-top)); }
:host([data-side="top"]) .acts { margin: 10px 0 2px; }
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

/* ---- the veil: while it dreams, the tokens are the show, across the whole page ---- */
.veil { position: fixed; inset: 0; z-index: 0; pointer-events: none; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 8vh 6vw; opacity: 0; transition: opacity 1.2s ease; background: radial-gradient(ellipse at 50% 45%, color-mix(in srgb, var(--bg) 78%, transparent), transparent 72%); }
.veil.on { opacity: 1; }
:host([data-side="top"]) .veil { justify-content: flex-end; padding-bottom: 12vh; }
:host([data-side="bottom"]) .veil, :host(:not([data-side])) .veil { justify-content: flex-start; padding-top: 12vh; }
.veil-inner { max-width: 62ch; font-family: var(--mono); font-size: clamp(15px, 2.1vw, 26px); line-height: 1.55; white-space: pre-wrap; word-break: break-word; text-align: left; mask-image: linear-gradient(to bottom, transparent 0, #000 18%, #000 100%); -webkit-mask-image: linear-gradient(to bottom, transparent 0, #000 18%, #000 100%); max-height: 46vh; overflow: hidden; display: flex; flex-wrap: wrap; align-content: flex-end; }
.veil .tok { animation: land 0.5s ease-out; text-shadow: 0 0 calc(18px * (1 - var(--p))) var(--tok, transparent); }
.veil-note { margin-top: 3vh; font-family: var(--font); font-style: italic; font-size: clamp(14px, 1.6vw, 19px); color: var(--dim); text-align: center; max-width: 60ch; }
@keyframes land { from { opacity: 0; filter: blur(4px); transform: translateY(4px); } to { filter: blur(0); transform: none; } }
@media (max-width: 720px) { .veil { padding: 6vh 16px; } .veil-inner { font-size: 14px; max-height: 40vh; } :host([data-side="bottom"]) .veil, :host(:not([data-side])) .veil { padding-top: 9vh; } }
@media (prefers-reduced-motion: reduce) { .veil .tok { animation: none; } }
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
.link { background: transparent; border: 0; border-bottom: 1px solid var(--line); color: var(--dim); font: inherit; letter-spacing: inherit; text-transform: inherit; padding: 0 0 1px; cursor: pointer; white-space: nowrap; }
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
.door { --p: 0.7; opacity: calc(0.55 + 0.45 * var(--p)); font-weight: 300; }
.door[style*="--p: 0.9"], .door[style*="--p: 1"] { font-weight: 400; }
.door::before { content: "→ "; color: var(--accent); font-style: normal; }
.door.ahead::before { content: "… "; animation: breathe 1.6s ease-in-out infinite; }
.door.ready { opacity: 1; border-color: var(--accent); }
.door.ready::before { content: "→ "; text-shadow: 0 0 10px var(--accent); }
.door.ready::after { content: " already dreamt"; font-family: var(--mono); font-size: 9.5px; letter-spacing: 0.12em; color: var(--dim); font-style: normal; }
@keyframes breathe { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
.door:hover { color: var(--accent); border-color: var(--accent); }
:host([data-side="right"]) .doors { justify-content: flex-end; }
:host([data-side="left"]) .doors, :host([data-side="right"]) .doors { flex-direction: column; align-items: flex-start; gap: 4px; }
:host([data-side="right"]) .doors { align-items: flex-end; }

.acts:empty { display: none; }
.act { background: transparent; border: 1px solid color-mix(in srgb, var(--accent) 50%, transparent); border-radius: 999px; color: var(--accent); font-family: var(--font); font-style: italic; font-size: 16px; padding: 6px 15px; cursor: pointer; min-height: 36px; }
.act:hover { background: color-mix(in srgb, var(--accent) 12%, transparent); }
.act:active { transform: translateY(1px); }
.act.pressed { background: var(--accent) !important; color: var(--bg) !important; border-color: var(--accent) !important; transition: background 0.15s, color 0.15s; }
.status.fresh { color: var(--accent); }
.status { transition: color 0.4s; }

/* ---- waking, and the dreams it already had ---- */
.wakebox { margin-top: 12px; }
.wakebox[hidden] { display: none; }
/* inside a world the world comes first: the wake box is one quiet line, the dreams fold into one button */
:host([data-world]) .wake { font-size: 15px; padding: 8px 14px; min-height: 0; animation: none; background: transparent; border-color: color-mix(in srgb, var(--accent) 45%, transparent); }
:host([data-world]) .wake small { display: inline; margin: 0 0 0 10px; }
:host([data-world]) .wakebox { margin-top: 10px; }
:host([data-world]) .demos .lead, :host([data-world]) .chips .chip:not(.next) { display: none; }
:host([data-world]) .demos { margin-top: 6px; }
:host([data-world]) .wakebox:not([hidden]) { display: inline-block; margin-right: 8px; vertical-align: middle; }
:host([data-world]) .demos:not([hidden]) { display: inline-block; vertical-align: middle; }
:host([data-world]) .wake { display: inline-block; width: auto; }
.chip.next { display: none; }
:host([data-world]) .chip.next { display: inline-block; font-size: 13.5px; padding: 4px 12px; min-height: 0; }
.wake {
  display: block; width: 100%; position: relative; overflow: hidden;
  background: color-mix(in srgb, var(--accent) 16%, transparent);
  border: 1px solid var(--accent); border-radius: var(--radius);
  color: var(--fg); font-family: var(--font); font-size: 20px; font-weight: 300;
  padding: 14px 18px; cursor: pointer; text-align: left; min-height: 56px;
  box-shadow: 0 0 0 0 color-mix(in srgb, var(--accent) 40%, transparent);
}
.wake b { font-weight: 400; color: var(--accent); }
.wake small { display: block; font-family: var(--mono); font-size: 10.5px; letter-spacing: 0.12em; color: var(--dim); margin-top: 4px; text-transform: lowercase; }
.wake:hover { background: color-mix(in srgb, var(--accent) 26%, transparent); }
.wake:disabled { cursor: progress; animation: none; }
.wake .fill { position: absolute; left: 0; top: 0; bottom: 0; width: 0; background: linear-gradient(90deg, color-mix(in srgb, var(--accent) 22%, transparent), color-mix(in srgb, var(--accent) 45%, transparent)); background-size: 200% 100%; transition: width 0.4s; pointer-events: none; animation: pour 1.6s linear infinite; box-shadow: 4px 0 18px color-mix(in srgb, var(--accent) 45%, transparent); }
@keyframes pour { from { background-position: 0 0; } to { background-position: -200% 0; } }
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

form { display: flex; align-items: center; gap: 14px; margin-top: 10px; padding: 2px 16px; border: 1px solid color-mix(in srgb, var(--accent) 55%, transparent); border-radius: var(--radius); background: color-mix(in srgb, var(--accent) 7%, transparent); box-shadow: 0 0 0 0 color-mix(in srgb, var(--accent) 35%, transparent); animation: beckon 3s ease-in-out infinite; }
form:focus-within { border-color: var(--accent); animation: none; background: color-mix(in srgb, var(--accent) 11%, transparent); }
:host([data-world]) form { animation: none; }
input {
  flex: 1; min-width: 0; background: transparent; border: 0; outline: none; color: var(--fg);
  font-family: var(--font); font-size: clamp(20px, 2.4vw, 28px); font-weight: 300; padding: 12px 0; caret-color: var(--accent);
}
input::placeholder { color: color-mix(in srgb, var(--fg) 70%, transparent); font-style: italic; }
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

/* ---- inside its head ---- */
.head { position: fixed; z-index: 2147483001; left: 50%; top: 50%; transform: translate(-50%, -50%); width: min(560px, 94vw); max-height: 78vh; overflow: auto; pointer-events: auto;
  background: color-mix(in srgb, var(--bg) 92%, #07060b); backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px); border: 1px solid var(--line); border-radius: var(--radius); padding: 14px 18px 18px; color: var(--fg); box-shadow: 0 30px 80px -30px rgba(0,0,0,.8); }
.head-top { display: flex; justify-content: space-between; align-items: baseline; font-family: var(--mono); font-size: 10.5px; letter-spacing: 0.14em; color: var(--accent); text-transform: lowercase; margin-bottom: 10px; }
.head-body { font-size: 15px; line-height: 1.45; }
.head h4 { margin: 14px 0 6px; font-weight: 400; font-style: italic; font-size: 15px; color: var(--dim); }
.head p { margin: 0 0 6px; }
.head .row { display: grid; grid-template-columns: 6.5em 1fr 6.5em; gap: 10px; align-items: center; font-size: 14px; padding: 2px 0; }
.head .row .bar { height: 4px; background: var(--line); border-radius: 2px; overflow: hidden; }
.head .row .bar i { display: block; height: 100%; width: calc(100% * var(--p)); background: linear-gradient(90deg, var(--rose), var(--accent) 45%, var(--fg)); }
.head .row .num { font-family: var(--mono); font-size: 10.5px; letter-spacing: 0.08em; color: var(--dim); text-align: right; }
.head .hes { font-family: var(--mono); font-size: 11px; line-height: 1.7; }
.head .hes b { font-weight: 400; color: var(--rose); }
.head .hes i { font-style: normal; color: var(--dim); }
.head .arch { font-family: var(--mono); font-size: 10.5px; letter-spacing: 0.06em; color: var(--dim); line-height: 1.7; }
.head .honest { font-style: italic; color: var(--dim); font-size: 13.5px; margin-top: 10px; }

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
  .top .stats { max-width: 46vw; }
  :host([data-side="right"]) .acts { justify-content: flex-end; }
  :host([data-side="right"]) form { flex-direction: row-reverse; }
  :host([data-side="right"]) input { text-align: right; }
  .ribbon { height: 40px; font-size: 10px; line-height: 20px; }
  .spark { height: 20px; }
  .inside { max-height: 90px; }
  .act { font-size: 15px; padding: 6px 13px; }
  .wake { font-size: 18px; padding: 12px 14px; }
  input { font-size: 18px; padding: 10px 0; }
  form { padding: 0 12px; }
  button.go { font-size: 17px; }
  .history { font-size: 13px; }
}
@media (prefers-reduced-motion: reduce) { .wake { animation: none; } }
`;

const HTML = `
<canvas class="sky" aria-hidden="true"></canvas>
<div id="veil" class="veil" aria-hidden="true"><div id="veil-inner" class="veil-inner"></div><div id="veil-note" class="veil-note"></div></div>
<div class="panel">
  <div class="top">
    <span class="brand">brave new world</span>
    <span class="right"><span id="stats" class="stats" title="what it was thinking"></span><button id="share" class="link" type="button" title="the address bar holds this exact world, ghosts and doubts included: send it">send this world</button></span>
  </div>
  <div id="inside" class="inside closed">
    <canvas id="spark" class="spark" height="26"></canvas>
    <div id="ribbon" class="ribbon"><span id="ribbon-inner"></span></div>
    <div id="harness" class="harness"></div>
  </div>
  <form id="ask" autocomplete="off">
    <input id="wish" type="text" placeholder="wish for a world… a place, a mood, one word" spellcheck="false" enterkeyhint="go" autocapitalize="off" maxlength="400" />
    <button id="go" class="go" type="submit">dream</button>
  </form>
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
  <p id="status" class="status"></p>
</div>
<div id="tip" class="tip" hidden></div>
<div id="head" class="head" hidden>
  <div class="head-top"><span>inside its head</span><button id="head-close" class="link" type="button">close</button></div>
  <div id="head-body" class="head-body"></div>
</div>
`;

// Which part of the world the model is writing, read off the text so far:
// the last key it opened, and whether it is inside the things, the console
// or the doors. Returns { group, thought } for the anatomy and the creature.
const ORD = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh"];
export function whereInSpec(raw) {
  const keys = [...raw.matchAll(/"([a-z_]+)":/g)].map((m) => m[1]);
  const last = keys.at(-1);
  if (!last) return { group: "title", thought: "beginning" };
  const inEls = raw.lastIndexOf('"elements":') > -1 && raw.lastIndexOf('"lines":') < raw.lastIndexOf('"elements":');
  const inCon = raw.lastIndexOf('"console":') > -1 && raw.lastIndexOf('"next":') < raw.lastIndexOf('"console":');
  const inNext = raw.lastIndexOf('"next":') > -1 && raw.lastIndexOf('"next":') > raw.lastIndexOf('"console":');
  if (inNext) return { group: "doors", thought: "opening the doors" };
  if (inCon) {
    if (last === "label") return { group: "console", thought: "wording a lever" };
    if (last === "action") return { group: "console", thought: "deciding what the lever does" };
    if (last === "prompt") return { group: "console", thought: "writing the invitation" };
    if (last === "button") return { group: "console", thought: "naming the button" };
    return { group: "console", thought: "designing the console" };
  }
  if (inEls) {
    const n = (raw.slice(raw.lastIndexOf('"elements":')).match(/"kind":/g) || []).length;
    const nth = ORD[Math.max(0, n - 1)] || `${n}th`;
    if (last === "kind") return { group: "things", thought: `naming the ${nth} thing` };
    if (last === "x" || last === "y") return { group: "things", thought: `placing the ${nth} thing` };
    if (last === "color") return { group: "things", thought: `coloring the ${nth} thing` };
    if (last === "size" || last === "count") return { group: "things", thought: `sizing the ${nth} thing` };
    return { group: "things", thought: "choosing the things" };
  }
  const map = { title: ["title", "finding a title"], time: ["time", "choosing the hour"], weather: ["weather", "choosing the weather"], sky: ["colors", "mixing the sky"], ground: ["ground", "laying the ground"], ground_color: ["colors", "coloring the ground"], ink: ["colors", "choosing the ink"], accent: ["colors", "choosing the accent"], font: ["type", "choosing the letters"], text_place: ["type", "placing the words"], motion: ["motion", "deciding how restless"], lines: ["poem", "writing the poem"] };
  const [group, thought] = map[last] || ["title", "thinking"];
  return { group, thought };
}
const ARCH = "Qwen2.5-Coder-0.5B · 24 layers · 14 attention heads, 2 for keys and values · 896 dimensions wide · a vocabulary of 151,936 tokens · 4-bit weights, about 300 MB · sampled at temperature 0.9, top-p 0.9 · certainties de-tempered from the top five alternatives";

const freshAnatomy = () => ({ n: 0, forced: 0, groups: {}, hesitations: [] });

function tokColor(p) {
  if (p >= 0.7) return "var(--fg)";
  if (p >= 0.35) return "var(--accent)";
  if (p >= 0.12) return "var(--violet)";
  return "var(--rose)";
}
const visible = (s) => s.replace(/\n/g, "⏎").replace(/ /g, "␣").replace(/\t/g, "⇥") || "∅";
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const DEFAULT_PROMPT = "wish for a world… a place, a mood, one word";

export class BnwConsole extends HTMLElement {
  constructor() {
    super();
    const root = this.attachShadow({ mode: "open" });
    root.innerHTML = `<style>${CSS}</style>${HTML}`;
    this.$ = (id) => root.getElementById(id);
    this.probs = [];
    this.doubt = 0;
    this.thought = "";
    this.anatomy = freshAnatomy();
    this.dreaming = false;
    this._worldActive = false;
    this.awake = false;
    this.temperature = 0.7;
    this.baseButton = "dream";
    this._fold = null;
    this.statusAt = 0;

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
    this.$("head-close").addEventListener("click", () => this.openHead(false));
    // a tap on the creature opens its head; a tap anywhere else closes it
    addEventListener("click", (e) => {
      if (e.composedPath().includes(this.$("head"))) return;
      if (!this.$("head").hidden) return this.openHead(false);
      if (e.composedPath().includes(root.querySelector(".panel"))) return;
      // a thing or a ghost under the finger wins over the creature drifting behind it
      if (e.composedPath().some((n) => n.classList?.contains?.("el"))) return;
      const at = this.sky.shogAt?.();
      if (at && at.x && at.y && Math.hypot(e.clientX - at.x, e.clientY - at.y) < at.r * 1.7) { e.stopPropagation(); this.openHead(true); }
    }, true);

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
      el.addEventListener("click", () => { el.classList.add("pressed"); setTimeout(() => el.classList.remove("pressed"), 700); this.dispatchEvent(new CustomEvent("action", { detail: b.action })); });
      acts.appendChild(el);
    }
    const doors = this.$("doors");
    doors.innerHTML = "";
    if (false && d?.next?.length) {
      const lead = document.createElement("span"); lead.className = "lead"; lead.textContent = "doors"; doors.appendChild(lead);
      d.next.forEach((w, i) => {
        const el = document.createElement("button");
        const p = d.doorP?.[i];
        el.type = "button"; el.className = "door"; el.textContent = w; el.dataset.wish = w;
        // the door's weight is the model's certainty of it: the one it believed in most is boldest
        if (p != null) { el.style.setProperty("--p", p.toFixed(2)); el.title = `it was ${Math.round(p * 100)}% sure you would want this next`; } else el.title = "a world it thinks you might want next: wish it";
        el.addEventListener("click", () => { this.wish = w; this.submit(); });
        doors.appendChild(el);
      });
    }
  }
  // the door being dreamt ahead, and the one that is ready
  markDoor(wish, stateName) {
    for (const el of this.shadowRoot.querySelectorAll(".door")) { el.classList.toggle("ahead", el.dataset.wish === wish && stateName === "ahead"); el.classList.toggle("ready", el.dataset.wish === wish && stateName === "ready"); }
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
  // the creature eats its own weights while they come down: it grows with the
  // fraction, opens an eye per shard, and the thought label says how far
  swallow(frac, shard) {
    this.sky.swallow?.(frac, shard);
    this.thought = frac >= 1 ? "awake" : `swallowing its weights · ${Math.round(frac * 100)}%`;
  }
  setDemos(list, onPick) {
    const chips = this.$("chips");
    chips.innerHTML = "";
    list.forEach((d, i) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "chip"; b.textContent = d.wish;
      b.addEventListener("click", () => { this._demo = i; onPick(i); });
      chips.appendChild(b);
    });
    if (list.length > 1) {
      // inside a world: one small button that steps into the next remembered dream
      const n = document.createElement("button");
      n.type = "button"; n.className = "chip next"; n.textContent = "another dream it had";
      n.addEventListener("click", () => { this._demo = ((this._demo ?? -1) + 1) % list.length; onPick(this._demo); });
      chips.appendChild(n);
    }
    this.$("demos").hidden = this.awake || !list.length;
  }

  get statusText() { return this.$("status").textContent; }
  setVeilNote(text) { this.$("veil-note").textContent = text || ""; }
  setStatus(text, warn = false, quiet = false) {
    if (!quiet) this.statusAt = performance.now(); // so a delayed hint does not talk over a fresh line
    if (this.dreaming) this.$("veil-note").textContent = text;
    const st = this.$("status");
    if (!quiet && st.textContent !== text) { st.classList.add("fresh"); clearTimeout(this._fresh); this._fresh = setTimeout(() => st.classList.remove("fresh"), 1200); }
    st.textContent = text;
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
    document.documentElement.classList.toggle("dreaming", on); // the page's own words step back while the veil is up
    if (on) { this.probs = []; this.anatomy = freshAnatomy(); this.thought = "waking"; this.$("ribbon-inner").textContent = ""; this.$("veil-inner").textContent = ""; this.$("harness").textContent = ""; this.$("stats").textContent = ""; this.openInside(true); this.$("veil").classList.add("on"); }
    else { this.$("veil").classList.remove("on"); this.thought = ""; this._fold = setTimeout(() => this.openInside(false), 6000); }
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

  addToken(lp, rawBefore = "") {
    const { p, alts } = detemper(lp, this.temperature);
    this.paintToken(lp.token, p, alts, rawBefore);
    return { p, alts };
  }
  // a token already weighed: live from addToken, or replayed from a recorded dream.
  // rawBefore is the text written so far, so the token can be filed by what it was deciding
  paintToken(token, p, alts, rawBefore = "") {
    if (/^<\|.*\|>$/.test(token)) return; // the end-of-text token is the model's business, not the page's
    const where = whereInSpec(rawBefore + token);
    if (where.thought !== this.thought) this.thought = where.thought;
    const a = this.anatomy;
    a.n++;
    // a token the grammar decided has no rival: the sampler saw one legal continuation
    const forced = !alts || alts.length <= 1 || p > 0.995;
    if (forced) a.forced++;
    else {
      const g = (a.groups[where.group] ||= { n: 0, sum: 0, hes: 0 });
      g.n++; g.sum += p; if (p < 0.35) g.hes++;
      if (p < 0.5) { a.hesitations.push({ token, p, alts: (alts || []).filter((x) => x.token !== token).slice(0, 2), thought: where.thought }); a.hesitations.sort((x, y) => x.p - y.p); a.hesitations.length = Math.min(a.hesitations.length, 6); }
    }
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
    const veil = this.$("veil-inner");
    veil.appendChild(span.cloneNode(true));
    while (veil.childNodes.length > 260) veil.removeChild(veil.firstChild);
    this.probs.push(p);
    this.doubt = this.doubt * 0.92 + (1 - p) * 0.08;
    this.sky.spark(p);
    this.sky.feed(p, alts.length);
  }

  updateStats(t0, n, note, secondsThen = null) {
    const secs = secondsThen ?? (performance.now() - t0) / 1000;
    const mean = this.probs.reduce((a, b) => a + b, 0) / Math.max(1, this.probs.length);
    const hes = this.probs.filter((p) => p < 0.35).length;
    const speed = secondsThen != null ? `${secondsThen.toFixed(0)} s that day` : `${(n / Math.max(0.1, secs)).toFixed(1)} tok/s`;
    this.$("stats").textContent = `${n} tokens · ${speed} · ${(mean * 100).toFixed(0)}% sure · ${hes} hesitations` + (note ? " · " + note : "");
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

  /* ---- inside its head ---- */

  openHead(open = true) {
    const h = this.$("head");
    h.hidden = !open;
    if (open) this.renderHead();
  }
  renderHead() {
    const a = this.anatomy;
    const choices = a.n - a.forced;
    const groups = Object.entries(a.groups).sort((x, y) => x[1].sum / x[1].n - y[1].sum / y[1].n);
    const meanChoice = choices ? Object.values(a.groups).reduce((s, g) => s + g.sum, 0) / choices : 0;
    const world = this.worldActive;
    let html = "";
    if (!a.n) html += `<p>Nothing yet. It has not dreamt in this tab; wake it, or step into a remembered dream, and this fills with what it was thinking.</p>`;
    else {
      html += `<p>${a.n} tokens. <b>${a.forced}</b> of them the grammar decided: syntax, braces, the names of fields, the only legal continuation. <b>${choices}</b> were its own choices, and on those it was <b>${Math.round(meanChoice * 100)}%</b> sure on average.</p>`;
      html += `<h4>where it doubted</h4>`;
      for (const [g, v] of groups) html += `<div class="row"><span>${esc(g)}</span><span class="bar"><i style="--p:${(v.sum / v.n).toFixed(2)}"></i></span><span class="num">${Math.round((v.sum / v.n) * 100)}% · ${v.hes} hes.</span></div>`;
      if (a.hesitations.length) {
        html += `<h4>what it nearly said</h4><div class="hes">` + a.hesitations.map((h) => `<div>${esc(h.thought)}: said <b>${esc(visible(h.token))}</b> at ${Math.round(h.p * 100)}%${h.alts.length ? `, nearly <i>${h.alts.map((x) => esc(visible(x.token)) + " " + Math.round(x.p * 100) + "%").join(", ")}</i>` : ""}</div>`).join("") + `</div>`;
      }
    }
    html += `<h4>the mind</h4><p class="arch">${esc(ARCH)}</p>`;
    html += `<h4>who is the shoggoth</h4><p>The name people gave the thing under the chat window. Here there is no window: it is the thing dreaming, and you are standing in what it dreams. But look at what it is made of. Your word, its habits, and a coin at every choice, weighted the way it was weighted. The ghosts are the worlds you nearly got. Send the link and someone walks into your world with these doubts intact. The brave new world is not the island or the desert; it is the moment one dissolves into the next.</p>`;
    html += `<p class="honest">What it says about itself is all here: the probability of every token it wrote and of the words it did not. Its attention and activations stay inside the GPU; this runtime does not hand them out, and I would rather show you less than invent the rest.</p>`;
    this.$("head-body").innerHTML = html;
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
  let fed = 0, fedShard = 0;
  function swallow(frac, shard) {
    fed = frac;
    if (shard > fedShard) { fedShard = shard; shog.jolt = Math.min(1, shog.jolt + 0.35); if (shog.eyes.length < 9 && shard % 4 === 0) shog.eyes.push({ a: rnd(0, Math.PI * 2), d: rnd(0.25, 0.7), life: 1.6, size: rnd(2.5, 4.5), blink: rnd(0, 6) }); shog.mouth = 1; }
    if (frac >= 1) { fed = 0; shog.jolt = 1; }
  }
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
    // it drifts about the page, away from the console's side, and never under the panel
    const side = small && (host.dataset.side === "left" || host.dataset.side === "right") ? "bottom" : host.dataset.side || "bottom";
    const panelPx = (parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--bnw-panel")) || 0) + 30;
    const underPanel = (fx, fy) => (side === "top" ? fy * H < panelPx : side === "bottom" ? fy * H > H - panelPx : side === "left" ? fx * W < Math.min(400, W * 0.92) : fx * W > W - Math.min(400, W * 0.92));
    if (Math.random() < 0.002 || underPanel(shog.tx, shog.ty) || (Math.abs(shog.x - shog.tx) < 0.01 && Math.abs(shog.y - shog.ty) < 0.01)) {
      const words = host.dataset.words || "center";
      for (let tries = 0; tries < 12; tries++) {
        shog.tx = side === "left" ? rnd(0.55, 0.92) : side === "right" ? rnd(0.08, 0.45) : rnd(0.08, 0.92);
        shog.ty = side === "top" ? rnd(Math.min(0.85, panelPx / H + 0.08), 0.9) : side === "bottom" ? rnd(0.12, Math.max(0.2, 1 - panelPx / H - 0.1)) : rnd(0.12, 0.85);
        // stay out of the words
        const inWords = words === "center" ? Math.abs(shog.tx - 0.5) < 0.25 && shog.ty > 0.15 && shog.ty < 0.6
          : words === "left" ? shog.tx < 0.45 : words === "right" ? shog.tx > 0.55
          : words === "top" ? shog.ty < 0.4 && Math.abs(shog.tx - 0.5) < 0.25 : shog.ty > 0.4 && Math.abs(shog.tx - 0.5) < 0.25;
        if (!inWords) break;
      }
    }
    const ease = 1 - Math.pow(0.5, dt / (underPanel(shog.x, shog.y) ? 900 : 6000));
    shog.x += (shog.tx - shog.x) * ease; shog.y += (shog.ty - shog.y) * ease;
    const cx = shog.x * W, cy = shog.y * H;
    const R = shog.r * (1 + shog.jolt * 0.5 + host.doubt * 0.8 + fed * 0.9) * Math.min(1.4, Math.max(0.7, W / 1000));
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
    // what it is thinking about, in words, under it
    const label = host.dreaming || fed > 0 ? host.thought : host.worldActive || host.anatomy.n ? "tap me" : "";
    if (label) { g.globalAlpha = host.dreaming ? 0.9 : 0.45; g.fillStyle = shog.ink; g.font = "300 11px 'JetBrains Mono', ui-monospace, monospace"; g.textAlign = "center"; g.letterSpacing = "0.12em"; g.fillText(label, cx, cy + R * 1.55 + 12); }
    shog.px = cx; shog.py = cy; shog.pr = R;
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
  return { spark, feed, swallow, shogAt: () => ({ x: shog.px || 0, y: shog.py || 0, r: shog.pr || 30 }) };
}

customElements.define("bnw-console", BnwConsole);
