---
title: Brave New World
emoji: 🌒
colorFrom: indigo
colorTo: pink
sdk: static
pinned: false
license: mit
short_description: A tiny in-browser model dreams your world into the page
---

# Brave New World

*The brave new world is, in fact, always inside.*

Tell a very small language model how your world looks. It writes the page,
token by token, entirely inside your browser, and then the page *becomes* that
world: its colors, its type, its shapes. The console you type into lives inside
whatever was dreamed and takes its colors from it.

While it dreams, you watch its insides. Every glyph glows with the probability
the model gave it, and hovering one shows the words it almost said instead.

## What is where

- `index.html`, `style.css`: world zero, the page before anyone has wished.
- `app.js`: wakes the model, streams the dream, hands it to the harness, and
  lets the result take over the page.
- `console.js`: the one element the model never writes, in a shadow root so no
  dreamed CSS can break it. The ribbon, the sparkline, the sky, the prompt.
- `mind.js`: the contract. The system prompt, the models on offer, the harness,
  the 32 held-out wishes and the scorer. `eval.html` imports this file, so the
  eval measures exactly what ships.
- `eval.html`, `eval.js`: every candidate model gets the same prompt, the same
  wishes, the same settings; results and thumbnails side by side, exportable.
- `evals/`: what was measured, and when.

## The harness

A 0.5B model writes HTML the way a child draws a house: recognisable, and not
to code. Every attempt goes through `inspect()` in `mind.js`, which:

1. cuts the document out of whatever surrounds it and counts the chatter;
2. counts the tags it will have to close, and the lines that merely repeat;
3. removes anything that runs, loads or asks (scripts, images, links, forms,
   event handlers, `url()`), so a dreamed page can safely own the real page;
4. parses every stylesheet with the browser's own parser and keeps only the
   rules it accepted, reporting how many were dropped;
5. calls the result **fatal** when there are no CSS rules, no body, or mostly
   repetition. Then the model is shown its attempt and asked again, at most
   twice. Everything else is repaired in place and reported in the console,
   never silently.

## Certainty, honestly

WebLLM reports each token's probability *after* the sampling temperature, which
sharpens the distribution. The ribbon undoes that from the top five
alternatives (`detemper()` in `mind.js`), so what you see is the model's own
distribution at temperature 1, restricted to those five. It ignores the tail,
so it is an upper bound on certainty, and the boilerplate really is that
certain: a small coder model hesitates at colors and adjectives, not at braces.

## Running it

Needs WebGPU. Chrome and Edge have it; on Linux, Chrome needs
`chrome://flags/#enable-unsafe-webgpu` and `chrome://flags/#enable-vulkan`.
The first visit downloads the weights (300 MB for the default model); later
visits use the browser cache. Add `?mock` for a dry run without a GPU, and
`?wish=…` to dream on load.

```bash
python3 -m http.server 8000     # then open http://localhost:8000
```

`tools/drive.mjs` runs the app or the eval from a shell through Chrome's
debugging port, with nothing but Node.

Built with [WebLLM](https://github.com/mlc-ai/web-llm).
