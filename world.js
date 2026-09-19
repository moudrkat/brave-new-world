// The world engine: the tools a very small mind is given so that it can be
// creative. It names things from a vocabulary, picks colors and words, and
// this file paints them properly. The model decides everything visible; the
// craft of drawing a lighthouse or animating rain is ours and never breaks.

export const KINDS = [
  "sun", "moon", "planet", "star", "comet", "cloud",
  "mountain", "hill", "volcano", "pyramid", "iceberg", "dune",
  "tree", "pine", "palm", "birch", "flower", "mushroom", "reed",
  "lighthouse", "tower", "house", "temple", "skyline", "bridge", "arch", "column", "door", "window", "tent", "windmill",
  "lantern", "candle", "fire", "bell", "clock", "piano", "book", "mirror",
  "boat", "train", "rocket", "balloon", "swing",
  "whale", "fish", "bird", "cat", "deer", "jellyfish", "butterfly",
  "person", "figure",
];
export const TIMES = ["dawn", "noon", "dusk", "night"];
export const WEATHERS = ["clear", "stars", "rain", "snow", "fog", "embers", "petals", "fireflies", "bubbles"];
export const GROUNDS = ["sea", "sand", "grass", "snow", "stone", "floor", "void", "clouds", "wheat", "lava", "ice", "moss", "water"];
export const FONTS = ["serif", "mono", "display", "hand"];
export const PLACES = ["top", "center", "bottom", "left", "right"];
export const XS = ["far-left", "left", "center", "right", "far-right"];
export const YS = ["sky", "high", "horizon", "ground", "low"];
export const SIZES = ["tiny", "small", "medium", "large", "huge"];
export const MOTIONS = ["still", "slow", "restless"];
export const SIDES = ["bottom", "top", "left", "right"];
export const TONES = ["dark", "light", "glass", "paper", "neon"];
export const CON_SHAPES = ["soft", "sharp", "pill"];
export const WIDTHS = ["narrow", "wide", "full"];
// What a button the model invents can actually do. It names the button; the engine does the thing.
export const ACTIONS = ["again", "surprise", "undo", "night", "dawn", "noon", "dusk", "rain", "snow", "stars", "clear", "fog", "calm", "wild", "more", "less", "inside"];

const COLOR = { type: "string", pattern: "^#[0-9a-f]{6}$", minLength: 7, maxLength: 7 };

export const WORLD_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string", minLength: 2, maxLength: 48 },
    time: { type: "string", enum: TIMES },
    weather: { type: "string", enum: WEATHERS },
    sky: { type: "array", items: COLOR, minItems: 2, maxItems: 3 },
    ground: { type: "string", enum: GROUNDS },
    ground_color: COLOR,
    ink: COLOR,
    accent: COLOR,
    font: { type: "string", enum: FONTS },
    text_place: { type: "string", enum: PLACES },
    motion: { type: "string", enum: MOTIONS },
    elements: {
      type: "array", minItems: 1, maxItems: 7,
      items: {
        type: "object",
        properties: {
          kind: { type: "string", enum: KINDS },
          x: { type: "string", enum: XS },
          y: { type: "string", enum: YS },
          size: { type: "string", enum: SIZES },
          color: COLOR,
          count: { type: "integer", enum: [1, 2, 3, 5, 8, 13] },
        },
        required: ["kind", "x", "y", "size", "color", "count"],
      },
    },
    lines: { type: "array", items: { type: "string", minLength: 6, maxLength: 140 }, minItems: 2, maxItems: 3 },
    next: { type: "array", items: { type: "string", minLength: 3, maxLength: 40 }, minItems: 1, maxItems: 3 },
    console: {
      type: "object",
      properties: {
        side: { type: "string", enum: SIDES }, tone: { type: "string", enum: TONES }, shape: { type: "string", enum: CON_SHAPES }, width: { type: "string", enum: WIDTHS },
        prompt: { type: "string", maxLength: 60 }, button: { type: "string", maxLength: 18 },
        buttons: { type: "array", minItems: 1, maxItems: 3, items: { type: "object", properties: { label: { type: "string", maxLength: 18 }, action: { type: "string", enum: ACTIONS } }, required: ["label", "action"] } },
      },
      required: ["side", "tone", "shape", "width", "prompt", "button", "buttons"],
    },
  },
  required: ["title", "time", "weather", "sky", "ground", "ground_color", "ink", "accent", "font", "text_place", "motion", "elements", "lines", "console", "next"],
};

// The same contract as WORLD_SCHEMA, as an EBNF grammar the sampler must obey.
// Written by hand so that the format is exactly JSON.stringify's: no optional
// whitespace anywhere, so a small model cannot spend its budget on newlines.
const enumRule = (list) => list.map((v) => `"\\"${v}\\""`).join(" | ");
export const WORLD_GRAMMAR = `
root ::= "{\\"title\\":" title ",\\"time\\":" time ",\\"weather\\":" weather ",\\"sky\\":[" color "," color ("," color)? "],\\"ground\\":" ground ",\\"ground_color\\":" color ",\\"ink\\":" color ",\\"accent\\":" color ",\\"font\\":" font ",\\"text_place\\":" place ",\\"motion\\":" motion ",\\"elements\\":[" el "," el ("," el)? ("," el)? ("," el)? ("," el)? ("," el)? "],\\"lines\\":[" line "," line ("," line)? "],\\"console\\":{\\"side\\":" side ",\\"tone\\":" tone ",\\"shape\\":" shape ",\\"width\\":" width ",\\"prompt\\":" short ",\\"button\\":" short ",\\"buttons\\":[" btn ("," btn)? ("," btn)? "]},\\"next\\":[" door ("," door)? ("," door)? "]}"
el ::= "{\\"kind\\":" kind ",\\"x\\":" xs ",\\"y\\":" ys ",\\"size\\":" size ",\\"color\\":" color ",\\"count\\":" count "}"
title ::= "\\"" tchar{3,36} "\\""
line ::= "\\"" tchar{8,150} "\\""
tchar ::= [^"\\\\\\n]
color ::= "\\"#" hex hex hex hex hex hex "\\""
hex ::= [0-9a-f]
count ::= "1" | "2" | "3" | "5" | "8" | "13"
time ::= ${enumRule(TIMES)}
weather ::= ${enumRule(WEATHERS)}
ground ::= ${enumRule(GROUNDS)}
font ::= ${enumRule(FONTS)}
place ::= ${enumRule(PLACES)}
motion ::= ${enumRule(MOTIONS)}
xs ::= ${enumRule(XS)}
ys ::= ${enumRule(YS)}
size ::= ${enumRule(SIZES)}
kind ::= ${enumRule(KINDS)}
side ::= ${enumRule(SIDES)}
tone ::= ${enumRule(TONES)}
shape ::= ${enumRule(CON_SHAPES)}
width ::= ${enumRule(WIDTHS)}
short ::= "\\"" tchar{3,56} "\\""
btn ::= "{\\"label\\":" label ",\\"action\\":" action "}"
label ::= "\\"" tchar{3,24} "\\""
door ::= "\\"" tchar{4,40} "\\""
action ::= ${enumRule(ACTIONS)}
`;

// One worked example. Deliberately not one of the eval wishes, and deliberately
// odd, so that copying it would look wrong.
const EXAMPLES = [["a jazz bar under the sea at 2am", {
  title: "The Jazz Bar Under the Sea",
  time: "night", weather: "bubbles", sky: ["#02131f", "#0b3d4a", "#1e6f6a"], ground: "sand", ground_color: "#2a4a44",
  ink: "#ffe9b3", accent: "#ff6f91", font: "display", text_place: "left", motion: "slow",
  elements: [
    { kind: "piano", x: "right", y: "ground", size: "large", color: "#1a0f1f", count: 1 },
    { kind: "lantern", x: "far-right", y: "high", size: "small", color: "#ff6f91", count: 3 },
    { kind: "jellyfish", x: "center", y: "sky", size: "medium", color: "#8ad8ff", count: 5 },
    { kind: "fish", x: "left", y: "low", size: "tiny", color: "#ffe9b3", count: 8 },
  ],
  lines: ["Two in the morning and the water is warm with saxophone.", "Nobody here has ever seen the surface. Nobody asks."],
  console: { side: "top", tone: "glass", shape: "pill", width: "narrow", prompt: "order something for the room…", button: "play", buttons: [{ label: "later, darker", action: "night" }, { label: "one more set", action: "again" }] },
  next: ["the same bar at closing time", "a lighthouse for the fish", "a rooftop above the sea"],
}], ["a train station in a red desert, noon", {
  title: "Platform Nine, Vermilion",
  lines: ["The timetable was painted over years ago.", "Heat stands on the rails like a passenger."],
  time: "noon", weather: "clear", sky: ["#f4b183", "#e8622a"], ground: "sand", ground_color: "#b8401c",
  ink: "#2b0e05", accent: "#ffd166", font: "mono", text_place: "bottom", motion: "still",
  elements: [
    { kind: "train", x: "left", y: "ground", size: "huge", color: "#3a1f14", count: 1 },
    { kind: "sun", x: "center", y: "sky", size: "large", color: "#fff1c9", count: 1 },
    { kind: "column", x: "right", y: "ground", size: "medium", color: "#d97f4a", count: 3 },
    { kind: "bird", x: "far-right", y: "high", size: "tiny", color: "#2b0e05", count: 2 },
  ],
  console: { side: "bottom", tone: "light", shape: "sharp", width: "full", prompt: "where to, passenger?", button: "depart", buttons: [{ label: "wait for dusk", action: "dusk" }, { label: "let it storm", action: "rain" }, { label: "somewhere else", action: "surprise" }] },
  next: ["the next station, at night", "a train through snow"],
}], ["a city folded out of paper, first light", {
  title: "Creased",
  lines: ["Every roof was once a page. Some still remember the words.", "When the wind comes, the whole town rustles.", "Do not get it wet."],
  time: "dawn", weather: "petals", sky: ["#fbeff0", "#dfe6f2", "#c5d0e6"], ground: "floor", ground_color: "#efe4d2",
  ink: "#3b3a4a", accent: "#e07a5f", font: "serif", text_place: "top", motion: "restless",
  elements: [
    { kind: "skyline", x: "center", y: "horizon", size: "huge", color: "#f5f0e6", count: 1 },
    { kind: "house", x: "far-left", y: "ground", size: "medium", color: "#fff8ee", count: 3 },
    { kind: "balloon", x: "right", y: "high", size: "small", color: "#e07a5f", count: 2 },
    { kind: "tree", x: "far-right", y: "ground", size: "small", color: "#cfd8c9", count: 5 },
    { kind: "cat", x: "left", y: "low", size: "tiny", color: "#3b3a4a", count: 1 },
  ],
  console: { side: "right", tone: "paper", shape: "soft", width: "narrow", prompt: "write on the margin…", button: "fold", buttons: [{ label: "unfold", action: "undo" }, { label: "more houses", action: "more" }] },
  next: ["the same town after rain", "a paper forest", "inside one of the houses"],
}]];

const shuffled = (list) => list.map((v) => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);

// Built fresh for every request: the lists are shuffled, because a small model
// left to itself takes the first few options in the order it was shown them.
// example: true shows a whole worked example; "bare" shows it without its
// console and doors, because a 0.5B copies whatever console it is shown
// (measured: 27 of 32 consoles in evals/2026-09-19-spec-qwen05b-prompt-v1 were
// one of the three examples' consoles, label for label); false shows none.
export const EXAMPLE_MODE = true; // what ships; the eval's default, so it measures what ships
export function systemSpec({ example = EXAMPLE_MODE } = {}) {
  const [exWish, raw] = EXAMPLES[Math.floor(Math.random() * EXAMPLES.length)];
  const ex = {};
  for (const k of ["title", "time", "weather", "sky", "ground", "ground_color", "ink", "accent", "font", "text_place", "motion", "elements", "lines", "console", "next"]) if (!(example === "bare" && (k === "console" || k === "next"))) ex[k] = raw[k];
  return [
    "You design worlds. The user says what world they want to live in; you answer with one compact JSON object and nothing else" + (example ? ", like this example for \"" + exWish + "\":" : "."),
    example ? JSON.stringify(ex) : "",
    example ? "That example belongs to its own wish. Do not reuse its colors, its things or its words." + (example === "bare" ? " It leaves out the console and the doors: those you design for this world, in its own voice." : "") : "",
    "Fields: title (two to five words); lines (two or three short poetic sentences about this world);",
    "time (" + shuffled(TIMES).join(", ") + "); weather (" + shuffled(WEATHERS).join(", ") + "); sky (two or three hex colors, top to horizon);",
    "ground (" + shuffled(GROUNDS).join(", ") + ") and ground_color; ink (text color) and accent, hex;",
    "font (" + shuffled(FONTS).join(", ") + "); text_place (" + shuffled(PLACES).join(", ") + "); motion (" + shuffled(MOTIONS).join(", ") + ");",
    "elements: three to six things in the scene, each with kind, x (" + XS.join(", ") + "), y (" + YS.join(", ") + "), size (" + SIZES.join(", ") + "), color, count (1, 2, 3, 5, 8 or 13).",
    "Kinds: " + shuffled(KINDS).join(", ") + ".",
    "console: the control panel is yours to design too: side (" + shuffled(SIDES).join(", ") + "), tone (" + shuffled(TONES).join(", ") + "), shape (" + shuffled(CON_SHAPES).join(", ") + "), width (" + shuffled(WIDTHS).join(", ") + "),",
    "prompt (the invitation written in the input, in this world's voice), button (the word on the main button), and one to three buttons, each with a two or three word label in this world's voice and an action from: " + shuffled(ACTIONS).join(", ") + ".",
    "next: one to three doors out of this world: short wishes, a few words each, for the world someone standing here would want to step into next. Nearby places, the same place changed, or somewhere this world hints at. Never the wish itself.",
    "Every world is different. Pick the things, colors and words that belong to THIS wish and to nothing else. Big things large, distant things small, mix positions. Colors are real hex colors that match the wish: lavender is #b39ddb, dusk is orange to violet, snow is white-blue, neon is bright on black.",
    "The wish may be vague: a single word, a feeling, a question, a greeting, another language. Still answer with a whole world that fits it; a feeling becomes a place that feels like that.",
    "If a world is already in the conversation and the wish asks for a change (darker, more birds, make it rain, bigger, the same but at noon), keep that world and change only what was asked. The buttons you offer should be the changes someone in this world would want next.",
  ].join("\n");
}

export const SYSTEM_SPEC = [
  "You design worlds. The user says what world they want to live in; you answer with one JSON object and nothing else.",
  "Fields: title; time (dawn, noon, dusk, night); weather (" + WEATHERS.join(", ") + ");",
  "sky (two or three hex colors, top to horizon); ground (" + GROUNDS.join(", ") + ") and ground_color; ink (text color) and accent, both hex;",
  "font (serif, mono, display, hand); text_place (top, center, bottom, left, right); motion (still, slow, restless);",
  "elements: one to seven things in the scene, each with kind, x (far-left to far-right), y (sky, high, horizon, ground, low), size (tiny to huge), color, count.",
  "Kinds: " + KINDS.join(", ") + ".",
  "lines: two or three short poetic sentences about this world. console: where the control panel sits (bottom or top) and its tone (dark, light, glass).",
  "Choose colors that truly fit the wish. Be specific and surprising.",
].join(" ");

/* ------------------------------------------------------------------ */
/* normalise: never trust, always fall back                            */
/* ------------------------------------------------------------------ */

const HEX = /^#[0-9a-f]{6}$/i;
const pick = (v, list, d) => (list.includes(v) ? v : d);
const hex = (v, d) => (typeof v === "string" && HEX.test(v.trim()) ? v.trim().toLowerCase() : d);

export function normalizeSpec(o) {
  o = o && typeof o === "object" ? o : {};
  const time = pick(o.time, TIMES, "dusk");
  const defSky = { dawn: ["#f7c6a3", "#8aa6c9"], noon: ["#7fb7e8", "#dbeeff"], dusk: ["#2b1b4e", "#c98a9a"], night: ["#05060f", "#1a1f3a"] }[time];
  const sky = (Array.isArray(o.sky) ? o.sky.map((c) => hex(c, null)).filter(Boolean) : []).slice(0, 3);
  const spec = {
    title: String(o.title || "A World").slice(0, 60),
    time,
    weather: pick(o.weather, WEATHERS, "clear"),
    sky: sky.length >= 2 ? sky : defSky,
    ground: pick(o.ground, GROUNDS, "void"),
    ground_color: hex(o.ground_color, "#1a1626"),
    ink: hex(o.ink, "#efe6d6"),
    accent: hex(o.accent, "#e0a458"),
    font: pick(o.font, FONTS, "serif"),
    text_place: pick(o.text_place, PLACES, "center"),
    motion: pick(o.motion, MOTIONS, "slow"),
    elements: (Array.isArray(o.elements) ? o.elements : []).slice(0, 7).map((e) => ({
      kind: pick(e?.kind, KINDS, "star"),
      x: pick(e?.x, XS, "center"),
      y: GROUNDED.has(pick(e?.kind, KINDS, "star")) && ["sky", "high"].includes(e?.y) ? "horizon" : pick(e?.y, YS, "horizon"),
      size: pick(e?.size, SIZES, "medium"),
      color: hex(e?.color, "#efe6d6"),
      count: Math.max(1, Math.min(13, parseInt(e?.count) || 1)),
    })),
    lines: (Array.isArray(o.lines) ? o.lines : []).map((l) => String(l).slice(0, 200)).filter((l) => l.trim()).slice(0, 3),
    console: {
      side: pick(o.console?.side, SIDES, "bottom"),
      tone: pick(o.console?.tone, TONES, "glass"),
      shape: pick(o.console?.shape, CON_SHAPES, "soft"),
      width: pick(o.console?.width, WIDTHS, "wide"),
      prompt: String(o.console?.prompt || "describe the world you want to live in…").slice(0, 70),
      button: String(o.console?.button || "dream").slice(0, 20),
      buttons: (Array.isArray(o.console?.buttons) ? o.console.buttons : []).slice(0, 3)
        .map((b) => ({ label: String(b?.label || "").slice(0, 22), action: pick(b?.action, ACTIONS, "again") }))
        .filter((b) => b.label.trim()),
    },
    next: (Array.isArray(o.next) ? o.next : []).map((l) => String(l).trim().slice(0, 48)).filter(Boolean).slice(0, 3),
  };
  if (!spec.elements.length) spec.elements.push({ kind: "star", x: "center", y: "sky", size: "small", color: spec.ink, count: 5 });
  return spec;
}

/* ------------------------------------------------------------------ */
/* paint                                                               */
/* ------------------------------------------------------------------ */

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const X = { "far-left": 8, left: 26, center: 50, right: 74, "far-right": 92 };
// vertical bands, depending on which edge the console takes
const Y_BY_SIDE = {
  bottom: { sky: 12, high: 27, horizon: 46, ground: 56, low: 66 },
  top: { sky: 32, high: 46, horizon: 64, ground: 78, low: 90 },
  left: { sky: 16, high: 34, horizon: 58, ground: 74, low: 88 },
  right: { sky: 16, high: 34, horizon: 58, ground: 74, low: 88 },
};
let Y = Y_BY_SIDE.bottom;
const SIZE = { tiny: 4, small: 8, medium: 14, large: 24, huge: 40 };
const AT_LEAST = { mountain: 30, hill: 26, volcano: 30, skyline: 34, iceberg: 22, dune: 26, pyramid: 20, temple: 20, bridge: 24, lighthouse: 14, tower: 16, house: 12, train: 22, whale: 22, tree: 12, pine: 12, palm: 14, birch: 12, sun: 10, moon: 8 };
const FONT = {
  serif: '"Cormorant Garamond", Georgia, serif',
  mono: '"JetBrains Mono", ui-monospace, monospace',
  display: '"Cormorant Garamond", "Didot", serif',
  hand: '"Caveat", "Segoe Script", cursive',
};

function lum(h) { const n = parseInt(h.slice(1), 16); return (0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255; }
function mix(a, b, t) {
  const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16);
  const ch = (s) => Math.round(((A >> s) & 255) * (1 - t) + ((B >> s) & 255) * t);
  return "#" + [16, 8, 0].map((s) => ch(s).toString(16).padStart(2, "0")).join("");
}
function rgba(h, a) { const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; }

// Every kind is a small SVG in a 100x100 box, drawn with the element's color.
const SHAPES = {
  sun: (c) => `<circle cx="50" cy="50" r="30" fill="${c}"/><circle cx="50" cy="50" r="44" fill="${c}" opacity=".18"/>`,
  moon: (c) => `<path d="M62 12a38 38 0 1 0 0 76 30 30 0 1 1 0-76z" fill="${c}"/>`,
  planet: (c) => `<circle cx="50" cy="50" r="26" fill="${c}"/><ellipse cx="50" cy="52" rx="46" ry="9" fill="none" stroke="${c}" stroke-width="4" opacity=".7"/>`,
  star: (c) => `<path d="M50 6l11 30 32 2-25 20 9 31-27-18-27 18 9-31L7 38l32-2z" fill="${c}"/>`,
  comet: (c) => `<path d="M10 90L70 30" stroke="${c}" stroke-width="6" stroke-linecap="round" opacity=".5"/><circle cx="72" cy="28" r="12" fill="${c}"/>`,
  cloud: (c) => `<path d="M20 70a16 16 0 0 1 4-31 22 22 0 0 1 42-6 16 16 0 0 1 16 37z" fill="${c}"/>`,
  mountain: (c) => `<path d="M0 100L38 22 52 44 68 14 100 100z" fill="${c}"/><path d="M68 14l-8 20 6 4 5-8 5 8 6-4z" fill="#fff" opacity=".6"/>`,
  hill: (c) => `<ellipse cx="50" cy="100" rx="60" ry="42" fill="${c}"/>`,
  volcano: (c) => `<path d="M0 100L36 20h28l36 80z" fill="${c}"/><path d="M40 20h20l-4 10h-12z" fill="#ff6a3d"/>`,
  pyramid: (c) => `<path d="M2 96L50 10l48 86z" fill="${c}"/><path d="M50 10l48 86H50z" fill="#000" opacity=".25"/>`,
  iceberg: (c) => `<path d="M10 70L30 20l20 18 14-28 26 60z" fill="${c}"/><path d="M10 70h90l-8 26H18z" fill="${c}" opacity=".45"/>`,
  dune: (c) => `<path d="M0 100C30 40 60 40 100 90V100z" fill="${c}"/>`,
  tree: (c) => `<rect x="46" y="60" width="8" height="40" fill="#3b2a1e"/><circle cx="50" cy="42" r="30" fill="${c}"/>`,
  pine: (c) => `<rect x="46" y="76" width="8" height="24" fill="#3b2a1e"/><path d="M50 4L18 46h18L14 76h72L64 46h18z" fill="${c}"/>`,
  palm: (c) => `<path d="M48 100c2-30 4-50 14-70" stroke="#5a3d22" stroke-width="6" fill="none"/><path d="M62 30c-20-16-40-10-50 4 18-4 32 0 44 8-18 0-36 10-42 26 16-10 30-12 46-6-4 16 0 30 10 40 0-16 6-30 16-38 12 6 26 8 40 4-12-10-28-14-42-10 10-10 24-14 40-12-16-10-38-10-62-16z" fill="${c}"/>`,
  birch: (c) => `<rect x="46" y="20" width="8" height="80" fill="#f2efe6"/><path d="M46 30h8M46 48h8M46 66h8M46 84h8" stroke="#2b2b2b" stroke-width="2"/><circle cx="50" cy="20" r="18" fill="${c}"/>`,
  flower: (c) => `<path d="M50 60v40" stroke="#4c7a3a" stroke-width="4"/><circle cx="50" cy="34" r="12" fill="${c}"/><circle cx="50" cy="60" r="12" fill="${c}"/><circle cx="37" cy="47" r="12" fill="${c}"/><circle cx="63" cy="47" r="12" fill="${c}"/><circle cx="50" cy="47" r="8" fill="#ffe27a"/>`,
  mushroom: (c) => `<rect x="42" y="50" width="16" height="50" rx="6" fill="#efe6d6"/><path d="M8 54a42 34 0 0 1 84 0z" fill="${c}"/>`,
  reed: (c) => `<path d="M30 100V30M50 100V10M70 100V40" stroke="${c}" stroke-width="3"/><rect x="47" y="10" width="6" height="16" rx="3" fill="${c}"/>`,
  lighthouse: (c) => `<path d="M40 100l6-70h8l6 70z" fill="${c}"/><rect x="42" y="18" width="16" height="14" fill="#ffe9a3"/><path d="M38 18h24l-12-10z" fill="#333"/><path d="M58 22L100 4v36z" fill="#ffe9a3" opacity=".35"/><path d="M42 22L0 4v36z" fill="#ffe9a3" opacity=".2"/>`,
  tower: (c) => `<rect x="36" y="20" width="28" height="80" fill="${c}"/><path d="M32 20h36l-18-16z" fill="${c}"/><rect x="46" y="40" width="8" height="12" fill="#ffe9a3"/><rect x="46" y="64" width="8" height="12" fill="#ffe9a3"/>`,
  house: (c) => `<rect x="20" y="50" width="60" height="50" fill="${c}"/><path d="M12 52L50 18l38 34z" fill="#3b2a1e"/><rect x="44" y="70" width="12" height="30" fill="#2b2b2b"/><rect x="26" y="60" width="10" height="10" fill="#ffe9a3"/><rect x="64" y="60" width="10" height="10" fill="#ffe9a3"/>`,
  temple: (c) => `<rect x="10" y="88" width="80" height="12" fill="${c}"/><rect x="16" y="46" width="8" height="42" fill="${c}"/><rect x="34" y="46" width="8" height="42" fill="${c}"/><rect x="58" y="46" width="8" height="42" fill="${c}"/><rect x="76" y="46" width="8" height="42" fill="${c}"/><path d="M6 46h88L50 14z" fill="${c}"/>`,
  skyline: (c) => `<rect x="0" y="50" width="12" height="50" fill="${c}"/><rect x="14" y="30" width="16" height="70" fill="${c}"/><rect x="32" y="60" width="10" height="40" fill="${c}"/><rect x="44" y="14" width="18" height="86" fill="${c}"/><rect x="64" y="42" width="12" height="58" fill="${c}"/><rect x="78" y="24" width="22" height="76" fill="${c}"/><g fill="#ffe9a3" opacity=".8"><rect x="18" y="36" width="3" height="4"/><rect x="24" y="48" width="3" height="4"/><rect x="48" y="22" width="3" height="4"/><rect x="54" y="40" width="3" height="4"/><rect x="50" y="60" width="3" height="4"/><rect x="82" y="30" width="3" height="4"/><rect x="90" y="52" width="3" height="4"/></g>`,
  bridge: (c) => `<path d="M0 60Q50 10 100 60" stroke="${c}" stroke-width="5" fill="none"/><path d="M0 70h100" stroke="${c}" stroke-width="6"/><path d="M20 70V52M40 70V38M60 70V38M80 70V52" stroke="${c}" stroke-width="3"/>`,
  arch: (c) => `<path d="M14 100V50a36 36 0 0 1 72 0v50h-16V52a20 20 0 0 0-40 0v48z" fill="${c}"/>`,
  column: (c) => `<rect x="38" y="16" width="24" height="76" fill="${c}"/><rect x="30" y="8" width="40" height="10" fill="${c}"/><rect x="30" y="90" width="40" height="10" fill="${c}"/>`,
  door: (c) => `<path d="M26 100V40a24 24 0 0 1 48 0v60z" fill="${c}"/><circle cx="64" cy="66" r="3" fill="#ffe9a3"/>`,
  window: (c) => `<rect x="24" y="14" width="52" height="72" rx="4" fill="${c}"/><path d="M50 14v72M24 50h52" stroke="#000" stroke-width="3" opacity=".3"/>`,
  tent: (c) => `<path d="M4 96L50 18l46 78z" fill="${c}"/><path d="M50 40l16 56H34z" fill="#000" opacity=".3"/>`,
  windmill: (c) => `<path d="M42 100l4-50h8l4 50z" fill="${c}"/><g stroke="${c}" stroke-width="5" stroke-linecap="round"><path d="M50 50L50 8M50 50L86 72M50 50L14 72"/></g><circle cx="50" cy="50" r="5" fill="${c}"/>`,
  lantern: (c) => `<path d="M42 10h16v8H42z" fill="#333"/><rect x="30" y="18" width="40" height="60" rx="14" fill="${c}"/><rect x="38" y="80" width="24" height="8" fill="#333"/>`,
  candle: (c) => `<rect x="40" y="40" width="20" height="60" fill="${c}"/><ellipse cx="50" cy="30" rx="7" ry="12" fill="#ffd26b"/><ellipse cx="50" cy="32" rx="3" ry="6" fill="#fff8e1"/>`,
  fire: (c) => `<path d="M50 10c10 20 26 26 26 50a26 26 0 0 1-52 0c0-14 8-20 12-30 2 10 8 14 12 12-4-10 0-24 2-32z" fill="${c}"/><path d="M50 50c6 10 12 14 12 24a12 12 0 0 1-24 0c0-8 6-12 12-24z" fill="#fff1b0" opacity=".85"/>`,
  bell: (c) => `<path d="M30 70V44a20 20 0 0 1 40 0v26l8 10H22z" fill="${c}"/><circle cx="50" cy="88" r="7" fill="${c}"/><rect x="46" y="14" width="8" height="10" fill="${c}"/>`,
  clock: (c) => `<circle cx="50" cy="50" r="40" fill="${c}"/><circle cx="50" cy="50" r="34" fill="#000" opacity=".2"/><path d="M50 50V24M50 50l18 10" stroke="#fff" stroke-width="4" stroke-linecap="round"/>`,
  piano: (c) => `<path d="M10 40h80v40H10z" fill="${c}"/><path d="M10 40h60l20 0v40" fill="none"/><rect x="10" y="80" width="80" height="6" fill="#fff"/><path d="M20 80v6M30 80v6M40 80v6M50 80v6M60 80v6M70 80v6M80 80v6" stroke="#000" stroke-width="2"/><rect x="14" y="86" width="6" height="14" fill="${c}"/><rect x="80" y="86" width="6" height="14" fill="${c}"/>`,
  book: (c) => `<path d="M10 20h34v70H10zM56 20h34v70H56z" fill="${c}"/><path d="M44 20c2 4 10 4 12 0v70c-2-4-10-4-12 0z" fill="#fff" opacity=".7"/>`,
  mirror: (c) => `<ellipse cx="50" cy="46" rx="30" ry="40" fill="${c}"/><ellipse cx="50" cy="46" rx="24" ry="34" fill="#fff" opacity=".35"/><rect x="42" y="86" width="16" height="10" fill="${c}"/>`,
  boat: (c) => `<path d="M10 66h80l-12 20H22z" fill="${c}"/><path d="M50 10v56" stroke="${c}" stroke-width="3"/><path d="M52 14l30 44H52z" fill="#fff" opacity=".85"/>`,
  train: (c) => `<rect x="4" y="40" width="70" height="36" rx="6" fill="${c}"/><rect x="74" y="52" width="22" height="24" fill="${c}"/><rect x="78" y="30" width="10" height="24" fill="${c}"/><circle cx="20" cy="82" r="8" fill="#222"/><circle cx="44" cy="82" r="8" fill="#222"/><circle cx="82" cy="82" r="8" fill="#222"/><rect x="12" y="48" width="12" height="12" fill="#ffe9a3"/><rect x="32" y="48" width="12" height="12" fill="#ffe9a3"/><rect x="52" y="48" width="12" height="12" fill="#ffe9a3"/>`,
  rocket: (c) => `<path d="M50 4c16 16 20 40 14 66H36c-6-26-2-50 14-66z" fill="${c}"/><circle cx="50" cy="40" r="7" fill="#9fdcff"/><path d="M36 60L20 80h16zM64 60l16 20H64z" fill="${c}"/><path d="M42 70h16l-8 26z" fill="#ffb347"/>`,
  balloon: (c) => `<ellipse cx="50" cy="36" rx="30" ry="34" fill="${c}"/><path d="M40 68l4 14h12l4-14z" fill="${c}" opacity=".7"/><rect x="42" y="84" width="16" height="12" fill="#5a3d22"/>`,
  swing: (c) => `<path d="M10 100L30 10h40l20 90" stroke="${c}" stroke-width="5" fill="none"/><path d="M40 10v60M60 10v60" stroke="#ccc" stroke-width="2"/><rect x="34" y="70" width="32" height="6" fill="${c}"/>`,
  whale: (c) => `<path d="M6 54c20-30 60-34 84-12-6 4-14 8-8 18-10-6-18-2-24 4-8-6-18-4-24 2-8-4-18-2-28-12z" fill="${c}"/><path d="M84 40l12-14v26z" fill="${c}"/><circle cx="26" cy="48" r="2" fill="#fff"/>`,
  fish: (c) => `<path d="M14 50c14-20 42-24 62-10-20 14-48 10-62 10zM76 40l18-14v28z" fill="${c}"/><circle cx="30" cy="46" r="2" fill="#fff"/>`,
  bird: (c) => `<path d="M6 50c14-16 30-14 44 0 14-14 30-16 44 0" stroke="${c}" stroke-width="5" fill="none" stroke-linecap="round"/>`,
  cat: (c) => `<ellipse cx="50" cy="70" rx="26" ry="20" fill="${c}"/><circle cx="50" cy="40" r="16" fill="${c}"/><path d="M36 30l2-14 10 8zM64 30l-2-14-10 8z" fill="${c}"/><circle cx="44" cy="38" r="2" fill="#ffe27a"/><circle cx="56" cy="38" r="2" fill="#ffe27a"/><path d="M74 72c14 0 18-10 14-22" stroke="${c}" stroke-width="5" fill="none"/>`,
  deer: (c) => `<rect x="24" y="50" width="44" height="22" rx="8" fill="${c}"/><path d="M28 70v28M40 70v28M56 70v28M64 70v28" stroke="${c}" stroke-width="5"/><rect x="62" y="34" width="12" height="22" fill="${c}"/><path d="M66 34l-8-18 6 4 2-10 4 10 6-4-8 18" fill="none" stroke="${c}" stroke-width="3"/>`,
  jellyfish: (c) => `<path d="M14 46a36 30 0 0 1 72 0z" fill="${c}" opacity=".85"/><path d="M22 48c0 20-6 30-2 46M38 48c0 20 6 30 2 46M50 48v48M62 48c0 20-6 30-2 46M78 48c0 20 6 30 2 46" stroke="${c}" stroke-width="2.5" fill="none" opacity=".8"/>`,
  butterfly: (c) => `<path d="M50 50C30 10 6 20 12 44c4 14 24 16 38 6zM50 50c20-40 44-30 38-6-4 14-24 16-38 6zM50 50C30 90 8 80 14 62c4-12 22-14 36-12zM50 50c20 40 42 30 36 12-4-12-22-14-36-12z" fill="${c}"/><rect x="48" y="30" width="4" height="40" rx="2" fill="#222"/>`,
  person: (c) => `<circle cx="50" cy="22" r="10" fill="${c}"/><path d="M50 32v34M50 44l-16 14M50 44l16 14M50 66l-12 30M50 66l12 30" stroke="${c}" stroke-width="6" stroke-linecap="round" fill="none"/>`,
  figure: (c) => `<circle cx="50" cy="20" r="9" fill="${c}"/><path d="M30 100V50a20 20 0 0 1 40 0v50z" fill="${c}"/>`,
};

// Things that stand on something cannot float in the sky, whatever the model said.
const GROUNDED = new Set(["mountain", "hill", "volcano", "pyramid", "iceberg", "dune", "tree", "pine", "palm", "birch", "flower", "mushroom", "reed", "lighthouse", "tower", "house", "temple", "skyline", "bridge", "arch", "column", "door", "tent", "windmill", "candle", "fire", "piano", "book", "mirror", "boat", "train", "swing", "cat", "deer", "person", "figure", "clock", "bell", "lantern"]);
const GLOW = new Set(["sun", "moon", "star", "comet", "lantern", "candle", "fire", "window", "lighthouse", "planet", "fireflies", "jellyfish"]);

function element(e, i, motion) {
  const s = Math.max(SIZE[e.size], AT_LEAST[e.kind] || 0), n = e.count;
  const out = [];
  const spread = n > 1 ? Math.min(36, 6 + n * 4) : 0;
  for (let k = 0; k < n; k++) {
    const t = n > 1 ? k / (n - 1) - 0.5 : 0;
    const jitter = n > 1 ? ((k * 7919) % 11) / 11 - 0.5 : 0;
    const x = X[e.x] + t * spread * 2 + jitter * 6;
    const y = Y[e.y] + jitter * (e.y === "sky" ? 12 : 5) - (n > 1 ? Math.abs(t) * 4 : 0);
    const sz = s * (n > 1 ? 0.7 + ((k * 31) % 7) / 14 : 1);
    const delay = ((i * 3 + k) * 0.7).toFixed(2);
    out.push(`<svg class="el ${e.kind}${GLOW.has(e.kind) ? " glow" : ""}" viewBox="0 0 100 100" style="left:${x.toFixed(1)}%;top:${y.toFixed(1)}%;width:${sz.toFixed(1)}vmin;--d:${delay}s;--c:${e.color}">${SHAPES[e.kind](e.color)}</svg>`);
  }
  return out.join("");
}

function weather(w, spec) {
  const c = spec.ink;
  const speed = { still: 0, slow: 1, restless: 2.2 }[spec.motion];
  switch (w) {
    case "stars": return `<div class="wx stars"></div>`;
    case "rain": return `<div class="wx rain" style="--s:${speed || 1}"></div>`;
    case "snow": return `<div class="wx snow" style="--s:${speed || 0.6}"></div>`;
    case "fog": return `<div class="wx fog"></div><div class="wx fog fog2"></div>`;
    case "embers": return `<div class="wx embers" style="--s:${speed || 0.8}"></div>`;
    case "petals": return `<div class="wx petals" style="--s:${speed || 0.8}"></div>`;
    case "fireflies": return `<div class="wx fireflies"></div>`;
    case "bubbles": return `<div class="wx bubbles" style="--s:${speed || 0.8}"></div>`;
    default: return "";
  }
}

function groundCss(spec) {
  const g = spec.ground, c = spec.ground_color, dark = mix(c, "#000000", 0.35), light = mix(c, "#ffffff", 0.25);
  const wave = `repeating-linear-gradient(180deg, ${rgba(light, 0.18)} 0 2px, transparent 2px 14px)`;
  switch (g) {
    case "sea": case "water": return `background: linear-gradient(180deg, ${light} 0%, ${c} 30%, ${dark} 100%); background-image: ${wave}, linear-gradient(180deg, ${light} 0%, ${c} 30%, ${dark} 100}); animation: sea calc(14s / var(--speed)) linear infinite;`;
    case "sand": case "dune": return `background: linear-gradient(180deg, ${light}, ${c} 60%, ${dark}); background-image: radial-gradient(circle at 20% 30%, ${rgba(light, 0.25)} 0 1px, transparent 2px), linear-gradient(180deg, ${light}, ${c} 60%, ${dark}); background-size: 9px 9px, 100% 100%;`;
    case "grass": case "moss": return `background: linear-gradient(180deg, ${light}, ${c} 40%, ${dark}); background-image: repeating-linear-gradient(100deg, transparent 0 6px, ${rgba(dark, 0.35)} 6px 7px), linear-gradient(180deg, ${light}, ${c} 40%, ${dark});`;
    case "snow": case "ice": return `background: linear-gradient(180deg, ${mix(c, "#ffffff", 0.6)}, ${c} 60%, ${dark}); box-shadow: inset 0 40px 80px -40px rgba(255,255,255,.6);`;
    case "stone": return `background: linear-gradient(180deg, ${light}, ${c} 30%, ${dark}); background-image: repeating-linear-gradient(0deg, transparent 0 18px, ${rgba(dark, 0.5)} 18px 20px), repeating-linear-gradient(90deg, transparent 0 46px, ${rgba(dark, 0.5)} 46px 48px), linear-gradient(180deg, ${light}, ${c} 30%, ${dark});`;
    case "floor": return `background: linear-gradient(180deg, ${c}, ${dark}); background-image: repeating-linear-gradient(90deg, transparent 0 60px, ${rgba(dark, 0.6)} 60px 62px), linear-gradient(180deg, ${light}, ${dark}); transform-origin: top; `;
    case "clouds": return `background: linear-gradient(180deg, ${mix(c, "#ffffff", 0.7)}, ${c}); background-image: radial-gradient(ellipse at 20% 0%, ${mix(c, "#ffffff", 0.9)} 0 18%, transparent 30%), radial-gradient(ellipse at 60% 10%, ${mix(c, "#ffffff", 0.85)} 0 22%, transparent 34%), radial-gradient(ellipse at 90% 0%, ${mix(c, "#ffffff", 0.9)} 0 16%, transparent 28%), linear-gradient(180deg, ${mix(c, "#ffffff", 0.7)}, ${c});`;
    case "wheat": return `background: linear-gradient(180deg, ${light}, ${c} 50%, ${dark}); background-image: repeating-linear-gradient(88deg, transparent 0 3px, ${rgba(dark, 0.3)} 3px 4px), linear-gradient(180deg, ${light}, ${c} 50%, ${dark});`;
    case "lava": return `background: linear-gradient(180deg, ${dark}, ${c}); background-image: radial-gradient(circle at 30% 40%, #ffb347 0 6%, transparent 12%), radial-gradient(circle at 70% 70%, #ff6a3d 0 8%, transparent 16%), linear-gradient(180deg, ${dark}, ${c}); animation: lava calc(6s / var(--speed)) ease-in-out infinite alternate;`;
    case "void": return `background: linear-gradient(180deg, ${rgba(c, 0)} 0%, ${c} 100%);`;
    default: return `background: linear-gradient(180deg, ${light}, ${c}, ${dark});`;
  }
}

// A string as spans, each word at the model's certainty when it wrote it.
function certainWords(text, probs) {
  if (!probs || probs.length !== text.length) return esc(text);
  const words = text.split(/(\s+)/);
  let i = 0;
  return words.map((w) => {
    const seg = probs.slice(i, i + w.length); i += w.length;
    if (!w.trim()) return w;
    const p = seg.reduce((a, b) => a + b, 0) / Math.max(1, seg.length);
    return `<span class="w" style="--p:${p.toFixed(2)}" title="${Math.round(p * 100)}% sure of this word">${esc(w)}</span>`;
  }).join("");
}

export function renderWorld(spec, { ghosts = [], certainty = null } = {}) {
  let s = spec;
  Y = Y_BY_SIDE[s.console.side] || Y_BY_SIDE.bottom;
  const speed = { still: 0.001, slow: 1, restless: 2.4 }[s.motion];
  const skyStops = s.sky.map((c, i) => `${c} ${Math.round((i / (s.sky.length - 1)) * 100)}%`).join(", ");
  const horizon = s.ground === "void" ? 100 : Y.horizon + 4;
  const isDark = lum(s.sky[s.sky.length - 1]) < 0.5;
  // the words sit on the sky: push the ink away from the sky's luminance until it reads
  const skyMid = mix(s.sky[0], s.sky[s.sky.length - 1], 0.4);
  let ink = s.ink;
  for (let i = 0; i < 6 && Math.abs(lum(ink) - lum(skyMid)) < 0.45; i++) ink = mix(ink, lum(skyMid) > 0.5 ? "#000000" : "#ffffff", 0.3);
  s = { ...s, ink };
  const dimInk = rgba(s.ink, 0.78);
  const side = s.console.side;
  const midY = side === "bottom" ? 34 : side === "top" ? 56 : 42;
  // the console tells the page how tall it is (--bnw-panel); the words keep clear of it
  const textPos = {
    top: `top:${side === "top" ? "calc(var(--bnw-panel, 30vh) + 4vh)" : "7vh"};left:50%;transform:translateX(-50%);text-align:center;`,
    center: `top:${midY}%;left:50%;transform:translate(-50%,-50%);text-align:center;`,
    bottom: `bottom:${side === "bottom" ? "calc(var(--bnw-panel, 36vh) + 5vh)" : "12vh"};left:50%;transform:translateX(-50%);text-align:center;`,
    left: `top:${midY}%;left:${side === "left" ? 28 : 7}vw;transform:translateY(-50%);text-align:left;`,
    right: `top:${midY}%;right:${side === "right" ? 28 : 7}vw;transform:translateY(-50%);text-align:right;`,
  }[s.text_place];
  const titleSize = s.title.length > 26 ? "clamp(22px, 4vmin, 48px)" : s.title.length > 16 ? "clamp(26px, 5vmin, 60px)" : "clamp(30px, 6vmin, 74px)";
  const tone = s.console.tone;
  const conBg = { dark: "rgba(7,6,11,0.82)", light: "rgba(246,240,230,0.86)", paper: "rgba(243,234,216,0.94)", neon: "rgba(5,0,10,0.88)" }[tone] || rgba(mix(s.sky[s.sky.length - 1], isDark ? "#000000" : "#ffffff", 0.3), 0.55);
  const panelLum = tone === "glass" ? lum(mix(s.sky[s.sky.length - 1], isDark ? "#000000" : "#ffffff", 0.3)) : null;
  const conFg = { dark: "#efe6d6", light: "#1b1620", paper: "#2b2118", neon: "#e8ffb0" }[tone] || (panelLum > 0.45 ? "#1b1620" : "#efe6d6");
  const conAccent = (() => { const bgL = tone === "dark" || tone === "neon" ? 0.05 : tone === "light" || tone === "paper" ? 0.9 : panelLum; let a = s.accent; for (let i = 0; i < 5 && Math.abs(lum(a) - bgL) < 0.42; i++) a = mix(a, bgL > 0.5 ? "#000000" : "#ffffff", 0.3); return a; })();
  const haloDark = isDark ? "0 0 30px rgba(0,0,0,.45)" : "0 0 30px rgba(255,255,255,.5)";
  const elements = s.elements.map((e, i) => element(e, i, s.motion)).join("") +
    ghosts.map((g) => { const e = s.elements[g.index]; if (!e || !SHAPES[g.kind]) return ""; const x = X[e.x] + 7, y = Y[e.y] - 3, sz = SIZE[e.size] * 0.9;
      return `<svg class="el ghost" viewBox="0 0 100 100" style="left:${x}%;top:${y}%;width:${sz}vmin;opacity:${Math.min(0.4, g.p * 0.9).toFixed(2)};--c:${e.color}"><title>almost a ${g.kind} (${Math.round(g.p * 100)}%)</title>${SHAPES[g.kind](e.color)}</svg>`; }).join("");

  const css = `
:root { --bnw-bg: ${conBg}; --bnw-fg: ${conFg}; --bnw-accent: ${conAccent}; --bnw-font: ${FONT[s.font]}; --bnw-side: ${s.console.side}; --bnw-words: ${s.text_place}; --speed: ${speed}; }
body[data-side="left"] .words, body[data-side="right"] .words { max-width: 36ch; }
html, body { margin: 0; height: 100%; overflow: hidden; }
body { background: linear-gradient(180deg, ${skyStops}); color: ${s.ink}; font-family: ${FONT[s.font]}; position: relative; }
.ground { position: absolute; left: 0; right: 0; top: ${horizon}%; bottom: 0; ${groundCss(s)} }
.haze { position: absolute; left: 0; right: 0; top: ${horizon - 14}%; height: 28%; background: linear-gradient(180deg, transparent, ${rgba(s.sky[s.sky.length - 1], 0.7)} 50%, transparent); pointer-events: none; }
.el { position: absolute; transform: translate(-50%, -50%); overflow: visible; }
.el.ghost { mix-blend-mode: screen; animation: ghost calc(5s / var(--speed)) ease-in-out infinite alternate; pointer-events: auto; }
@keyframes ghost { from { opacity: 0.05; } to { opacity: var(--gmax, 0.35); } }
.el.glow { filter: drop-shadow(0 0 14px var(--c)) drop-shadow(0 0 40px ${rgba(s.accent, 0.35)}); }
.el.bird, .el.butterfly, .el.balloon, .el.cloud, .el.boat, .el.jellyfish, .el.fish, .el.whale { animation: drift calc(18s / var(--speed)) ease-in-out infinite alternate; animation-delay: var(--d); }
.el.candle, .el.fire, .el.lantern, .el.star, .el.window { animation: flicker calc(3s / var(--speed)) ease-in-out infinite alternate; animation-delay: var(--d); }
.el.lighthouse { animation: sweep calc(8s / var(--speed)) linear infinite; }
.el.windmill { animation: none; }
.words { position: absolute; ${textPos} max-width: min(46ch, 92vw); padding: 0 18px; text-shadow: ${haloDark}; }
h1 { margin: 0 0 14px; font-weight: 300; font-size: ${titleSize}; letter-spacing: ${s.font === "mono" ? "0.06em" : "0.04em"}; line-height: 1.05; color: ${s.ink}; }
h1::after { content: ""; display: block; width: 3em; height: 1px; margin: 16px auto 0; background: ${s.accent}; opacity: .8; }
.words.left h1::after, .words.right h1::after { margin-left: ${s.text_place === "left" ? 0 : "auto"}; margin-right: ${s.text_place === "right" ? 0 : "auto"}; }
.w { --p: 1; opacity: calc(0.62 + 0.38 * var(--p)); text-shadow: 0 0 calc(14px * (1 - var(--p))) ${rgba(s.accent, 0.9)}; transition: opacity 0.4s; }
.w:hover { opacity: 1; }
p { margin: 0 0 8px; font-size: clamp(15px, 2.3vmin, 24px); line-height: 1.5; font-style: ${s.font === "mono" ? "normal" : "italic"}; color: ${dimInk}; }
.wx { position: absolute; inset: 0; pointer-events: none; }
.stars { background-image: radial-gradient(1px 1px at 12% 18%, ${s.ink} 50%, transparent 60%), radial-gradient(1px 1px at 30% 40%, ${s.ink} 50%, transparent 60%), radial-gradient(1.5px 1.5px at 52% 12%, ${s.ink} 50%, transparent 60%), radial-gradient(1px 1px at 70% 30%, ${s.ink} 50%, transparent 60%), radial-gradient(1px 1px at 88% 8%, ${s.ink} 50%, transparent 60%), radial-gradient(1.5px 1.5px at 42% 26%, ${s.ink} 50%, transparent 60%), radial-gradient(1px 1px at 8% 48%, ${s.ink} 50%, transparent 60%), radial-gradient(1px 1px at 62% 44%, ${s.ink} 50%, transparent 60%), radial-gradient(1px 1px at 94% 36%, ${s.ink} 50%, transparent 60%), radial-gradient(1px 1px at 22% 6%, ${s.ink} 50%, transparent 60%); background-size: 100% 100%; opacity: .8; animation: twinkle calc(6s / var(--speed)) ease-in-out infinite alternate; }
.rain { background-image: repeating-linear-gradient(100deg, transparent 0 22px, ${rgba(s.ink, 0.22)} 22px 23px, transparent 23px 41px); background-size: 200px 300px; animation: rain calc(0.8s / var(--s)) linear infinite; opacity: .75; }
.snow { background-image: radial-gradient(3px 3px at 20px 30px, #fff 50%, transparent 60%), radial-gradient(2px 2px at 80px 120px, #fff 50%, transparent 60%), radial-gradient(2.5px 2.5px at 150px 60px, #fff 50%, transparent 60%), radial-gradient(2px 2px at 220px 180px, #fff 50%, transparent 60%), radial-gradient(3px 3px at 300px 100px, #fff 50%, transparent 60%); background-size: 340px 240px; animation: fall calc(9s / var(--s)) linear infinite; opacity: .85; }
.fog { background: radial-gradient(ellipse 70% 30% at 30% 60%, ${rgba(mix(s.sky[s.sky.length - 1], "#ffffff", 0.5), 0.5)}, transparent 70%), radial-gradient(ellipse 60% 26% at 75% 66%, ${rgba(mix(s.sky[s.sky.length - 1], "#ffffff", 0.6), 0.45)}, transparent 70%); animation: fog calc(30s / var(--speed)) ease-in-out infinite alternate; }
.fog2 { animation-delay: -15s; opacity: .6; }
.embers { background-image: radial-gradient(2px 2px at 40px 200px, #ffb347 50%, transparent 60%), radial-gradient(1.5px 1.5px at 120px 260px, #ff6a3d 50%, transparent 60%), radial-gradient(2px 2px at 200px 220px, #ffd26b 50%, transparent 60%), radial-gradient(1.5px 1.5px at 280px 280px, #ff6a3d 50%, transparent 60%); background-size: 320px 300px; animation: rise calc(7s / var(--s)) linear infinite; }
.petals { background-image: radial-gradient(4px 3px at 30px 20px, ${s.accent} 50%, transparent 60%), radial-gradient(3px 4px at 140px 90px, ${mix(s.accent, "#ffffff", 0.3)} 50%, transparent 60%), radial-gradient(4px 3px at 240px 40px, ${s.accent} 50%, transparent 60%); background-size: 300px 220px; animation: fall calc(11s / var(--s)) linear infinite; opacity: .9; }
.fireflies { background-image: radial-gradient(2px 2px at 60px 240px, #e6ff8a 50%, transparent 60%), radial-gradient(2px 2px at 180px 300px, #e6ff8a 50%, transparent 60%), radial-gradient(2px 2px at 260px 200px, #e6ff8a 50%, transparent 60%); background-size: 320px 360px; animation: twinkle calc(2.5s / var(--speed)) ease-in-out infinite alternate, rise calc(24s / var(--speed)) linear infinite; filter: drop-shadow(0 0 4px #e6ff8a); }
.bubbles { background-image: radial-gradient(circle at 50px 300px, transparent 6px, ${rgba(s.ink, 0.35)} 7px, transparent 8px), radial-gradient(circle at 180px 340px, transparent 4px, ${rgba(s.ink, 0.35)} 5px, transparent 6px), radial-gradient(circle at 270px 260px, transparent 8px, ${rgba(s.ink, 0.3)} 9px, transparent 10px); background-size: 320px 380px; animation: rise calc(12s / var(--s)) linear infinite; }
@keyframes drift { from { translate: -1.5vw 0; } to { translate: 1.5vw -1vh; } }
@keyframes flicker { from { opacity: .82; } to { opacity: 1; } }
@keyframes sweep { from { opacity: 0.8; } 50% { opacity: 1; } to { opacity: 0.8; } }
@keyframes twinkle { from { opacity: .45; } to { opacity: 1; } }
@keyframes rain { from { background-position: 0 0; } to { background-position: -60px 300px; } }
@keyframes fall { from { background-position: 0 0; } to { background-position: 40px 240px; } }
@keyframes rise { from { background-position: 0 0; } to { background-position: 10px -360px; } }
@keyframes fog { from { translate: -6vw 0; } to { translate: 6vw 0; } }
@keyframes sea { from { background-position: 0 0, 0 0; } to { background-position: 0 14px, 0 0; } }
@keyframes lava { from { filter: brightness(1); } to { filter: brightness(1.25); } }
@media (prefers-reduced-motion: reduce) { * { animation: none !important; } }
html.low-power * { animation: none !important; filter: none !important; backdrop-filter: none !important; text-shadow: none !important; }
`;
  const body = `
<div class="ground"></div><div class="haze"></div>
${weather(s.weather, s)}
${elements}
<div class="words ${s.text_place}"><h1>${certainWords(s.title, certainty?.title)}</h1>${s.lines.map((l, i) => `<p>${certainWords(l, certainty?.lines?.[i])}</p>`).join("")}</div>`;
  return `<!DOCTYPE html>\n<html lang="en"><head><meta charset="utf-8"><title>${esc(s.title)}</title><style>${css}</style></head><body>${body}</body></html>`;
}

// What made this page distinct: colors, words, and the kinds of things in it.
export function fingerprint(spec, html) {
  const set = new Set();
  if (spec) {
    for (const k of ["time", "weather", "ground", "font", "text_place", "motion"]) set.add(k + ":" + spec[k]);
    for (const c of [...spec.sky, spec.ground_color, spec.ink, spec.accent]) set.add("c:" + c.slice(0, 4));
    for (const e of spec.elements) { set.add("k:" + e.kind); set.add("c:" + e.color.slice(0, 4)); }
    for (const w of (spec.title + " " + spec.lines.join(" ")).toLowerCase().split(/[^a-z]+/)) if (w.length > 3) set.add("w:" + w);
    set.add("con:" + spec.console.side + spec.console.tone);
  } else if (html) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const css = [...doc.querySelectorAll("style")].map((e) => e.textContent).join(" ");
    for (const c of css.match(/#[0-9a-f]{6}\b|#[0-9a-f]{3}\b|rgba?\([^)]*\)/gi) || []) set.add("c:" + c.toLowerCase().slice(0, 4));
    for (const m of css.match(/[a-z-]+(?=\s*:)/gi) || []) set.add("p:" + m.toLowerCase());
    for (const e of doc.body?.querySelectorAll("*") || []) { set.add("t:" + e.tagName.toLowerCase()); for (const c of e.classList) set.add("cls:" + c); }
    for (const w of (doc.body?.textContent || "").toLowerCase().split(/[^a-z]+/)) if (w.length > 3) set.add("w:" + w);
  }
  return set;
}

export function variety(fingerprints) {
  const f = fingerprints.filter((s) => s && s.size);
  if (f.length < 2) return null;
  let sum = 0, n = 0;
  for (let i = 0; i < f.length; i++) for (let j = i + 1; j < f.length; j++) {
    let inter = 0;
    for (const x of f[i]) if (f[j].has(x)) inter++;
    const union = f[i].size + f[j].size - inter;
    sum += union ? inter / union : 1; n++;
  }
  return 1 - sum / n;
}

// Everything the examples could leak: their colors and their content words.
export const EXAMPLE_MARKS = (() => {
  const set = new Set();
  for (const [, ex] of EXAMPLES) {
    for (const c of [...ex.sky, ex.ground_color, ex.ink, ex.accent, ...ex.elements.map((e) => e.color)]) set.add("c:" + c);
    for (const w of (ex.title + " " + ex.lines.join(" ")).toLowerCase().split(/[^a-z]+/)) if (w.length > 4) set.add("w:" + w);
  }
  return set;
})();

// 1 when nothing of the examples shows up in a spec, 0 when it is mostly copied.
export function originality(spec) {
  if (!spec) return null;
  const marks = [];
  for (const c of [...spec.sky, spec.ground_color, spec.ink, spec.accent, ...spec.elements.map((e) => e.color)]) marks.push("c:" + c);
  for (const w of (spec.title + " " + spec.lines.join(" ")).toLowerCase().split(/[^a-z]+/)) if (w.length > 4) marks.push("w:" + w);
  if (!marks.length) return 1;
  const copied = marks.filter((m) => EXAMPLE_MARKS.has(m)).length;
  return 1 - Math.min(1, copied / Math.max(4, marks.length) * 2);
}

// Did it listen? Cue words in the wish that map onto a field, checked against the spec.
const CUES = {
  time: [[/\b(dawn|sunrise|first light|morning|4am|5am)\b/, ["dawn"]], [/\b(noon|midday|afternoon|day)\b/, ["noon"]], [/\b(dusk|sunset|evening|twilight)\b/, ["dusk"]], [/\b(night|midnight|2am|3am|stars?)\b/, ["night"]]],
  weather: [[/\brain(y|ing)?\b|\bstorm\b/, ["rain"]], [/\bsnow(s|ing|y)?\b/, ["snow"]], [/\b(fog|mist|haze)\b/, ["fog"]], [/\bstars?\b/, ["stars"]], [/\b(embers?|sparks?|lava|volcano)\b/, ["embers"]], [/\b(petals?|blossom|cherry)\b/, ["petals"]], [/\b(fireflies|lanterns?|glow)\b/, ["fireflies"]], [/\b(under ?water|ocean|sea ?bed|trench)\b/, ["bubbles"]]],
  ground: [[/\b(sea|ocean|waves?|lake|water|trench|reef)\b/, ["sea", "water", "ice"]], [/\b(desert|dunes?|beach|sand)\b/, ["sand"]], [/\b(snow|frozen|ice|glacier)\b/, ["snow", "ice"]], [/\b(forest|garden|meadow|grass|moss|field)\b/, ["grass", "moss", "wheat"]], [/\b(room|kitchen|attic|library|ballroom|hall|bar|shop|station|cathedral|temple|monastery|hospital|pool)\b/, ["floor", "stone"]], [/\b(lava|volcano)\b/, ["lava"]], [/\b(cloud|sky|space|orbit|planet|moon)\b/, ["clouds", "void"]], [/\bwheat\b/, ["wheat"]]],
  kinds: [[/\blighthouse/, ["lighthouse"]], [/\bpyramids?\b/, ["pyramid"]], [/\bbirch/, ["birch", "tree"]], [/\bwhale/, ["whale"]], [/\bpiano/, ["piano"]], [/\bclocks?\b/, ["clock"]], [/\bbooks?|library|bookshop/, ["book"]], [/\bbirds?\b|swallows/, ["bird"]], [/\btrain\b/, ["train"]], [/\bcandle/, ["candle"]], [/\blanterns?\b/, ["lantern"]], [/\bmountain|cliff/, ["mountain"]], [/\bvolcano/, ["volcano"]], [/\bcity|rooftop|skyline/, ["skyline", "house", "tower", "window"]], [/\bsuns?\b/, ["sun"]], [/\bmoon\b/, ["moon", "planet"]], [/\bplanet/, ["planet"]], [/\bhouse|kitchen|attic|bakery/, ["house", "window", "door"]], [/\btemple|monastery|cathedral/, ["temple", "arch", "column", "bell"]], [/\bkoi|fish\b/, ["fish"]], [/\bgoats?|deer/, ["deer"]], [/\bflowers?|wildflowers|garden/, ["flower"]], [/\bstars?\b/, ["star", "comet"]], [/\bboat|ship\b/, ["boat"]], [/\bbells?\b/, ["bell"]], [/\bfire|embers|candle/, ["fire", "candle"]], [/\bjellyfish|bioluminescent/, ["jellyfish"]], [/\bmirror/, ["mirror"]], [/\btrees?|oak\b|forest/, ["tree", "pine", "birch", "palm"]], [/\bswimming pool|pool\b/, ["floor"]]],
};
export function sense(spec, wish) {
  if (!spec) return null;
  const w = wish.toLowerCase();
  let hits = 0, checks = 0;
  for (const field of ["time", "weather", "ground"]) for (const [re, ok] of CUES[field]) if (re.test(w)) { checks++; if (ok.includes(spec[field])) hits++; }
  const kinds = new Set(spec.elements.map((e) => e.kind));
  for (const [re, ok] of CUES.kinds) if (re.test(w)) { checks++; if (ok.some((k) => kinds.has(k))) hits++; }
  return checks ? hits / checks : null;
}

// The things a model-invented button can do to the world it lives in.
const NIGHTFALL = { night: ["#05060f", 0.65], dawn: ["#f7c6a3", 0.45], noon: ["#bfe3ff", 0.5], dusk: ["#c98a9a", 0.45] };
export function applyAction(spec, action) {
  const n = JSON.parse(JSON.stringify(spec));
  switch (action) {
    case "night": case "dawn": case "noon": case "dusk": {
      n.time = action;
      const [toward, t] = NIGHTFALL[action];
      n.sky = n.sky.map((c, i) => mix(c, toward, t * (i === 0 && action === "night" ? 1.2 : 1)).slice(0, 7));
      n.ground_color = mix(n.ground_color, toward, action === "night" ? 0.55 : t * 0.6);
      if (action === "night" && n.weather === "clear") n.weather = "stars";
      if (action !== "night" && n.weather === "stars") n.weather = "clear";
      if (action === "night" && lum(n.ink) < 0.5) n.ink = "#efe6d6";
      if (action === "noon" && lum(n.ink) > 0.7) n.ink = "#1b1620";
      return n;
    }
    case "rain": case "snow": case "stars": case "clear": case "fog": n.weather = action; return n;
    case "calm": n.motion = "still"; return n;
    case "wild": n.motion = "restless"; return n;
    case "more": {
      const src = n.elements[Math.floor(Math.random() * n.elements.length)];
      const xs = XS.filter((x) => x !== src.x);
      n.elements.push({ ...src, x: xs[Math.floor(Math.random() * xs.length)], count: Math.max(1, Math.min(13, src.count)) });
      n.elements = n.elements.slice(-9);
      return n;
    }
    case "less": if (n.elements.length > 1) n.elements.pop(); return n;
    default: return n;
  }
}

// From the token stream to the roads not taken: for every element's kind, the
// alternatives the sampler nearly chose, mapped back onto the vocabulary.
export function ghostsFrom(spec, raw, tokens) {
  if (!spec || !tokens?.length) return [];
  const ghosts = [];
  let from = 0;
  for (let i = 0; i < spec.elements.length; i++) {
    const at = raw.indexOf('"kind":"', from);
    if (at < 0) break;
    const pos = at + 8;
    from = pos;
    const tok = tokens.find((t) => t.start <= pos && t.end > pos);
    if (!tok) continue;
    const chosen = spec.elements[i].kind;
    const already = raw.slice(tok.start, pos);
    const alts = (tok.alts || []).map((a) => {
      const text = (already + a.token).replace(/^"/, "").toLowerCase();
      const kind = KINDS.find((k) => k !== chosen && text.length >= 2 && k.startsWith(text) && !chosen.startsWith(text));
      return kind ? { index: i, kind, p: a.p } : null;
    }).filter(Boolean);
    if (alts.length) ghosts.push(alts.sort((a, b) => b.p - a.p)[0]);
  }
  return ghosts;
}

// What the wish plainly says, read by rules and handed to the model next to the
// wish. Not a model result: a lookup, like the word list in coalescence. The
// model may still ignore it; the grammar leaves every field free.
export function cueHints(wish) {
  const w = wish.toLowerCase();
  const out = [];
  for (const field of ["time", "weather", "ground"]) for (const [re, ok] of CUES[field]) if (re.test(w)) { out.push(field + " " + ok[0]); break; }
  const kinds = [];
  for (const [re, ok] of CUES.kinds) if (re.test(w)) kinds.push(ok[0]);
  if (kinds.length) out.push("things: " + [...new Set(kinds)].slice(0, 4).join(", "));
  return out.length ? "(the wish suggests: " + out.join("; ") + ")" : "";
}

// Per-character certainty for the title and the lines, read off the token stream.
export function certaintyFrom(spec, raw, tokens) {
  if (!spec || !tokens?.length) return null;
  const pAt = new Float32Array(raw.length).fill(1);
  for (const t of tokens) for (let i = t.start; i < t.end && i < pAt.length; i++) pAt[i] = t.p;
  const find = (text, from) => { const needle = JSON.stringify(text).slice(1, -1); const at = raw.indexOf(needle, from); return at < 0 ? null : [at, needle]; };
  const probsOf = (text, from) => { const hit = find(text, from); if (!hit) return null; const [at, needle] = hit; const out = []; let j = at; for (let k = 0; k < text.length; k++) { const ch = JSON.stringify(text[k]).slice(1, -1); out.push(pAt[j] ?? 1); j += ch.length; } return out; };
  const title = probsOf(spec.title, 0);
  let from = raw.indexOf('"lines":');
  const lines = spec.lines.map((l) => { const p = probsOf(l, Math.max(0, from)); return p; });
  return { title, lines };
}
