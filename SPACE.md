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

A very small language model lives in this tab. Wake it (one button, 300 MB
once) and say what world you want: a place, a mood, one word, a change to
what is on screen. The page becomes that world, token by token, entirely
inside your browser: its colors, its things, its poem, its type, and the panel
you are wishing from. The model designs that panel too: which edge it sits on,
its tone and shape, the invitation in the input, the word on the button, the
levers beside it, and the doors that lead out of this world into the next.

Not a chat. A world, with buttons. Tap a thing to walk to it; tap a ghost,
the faint thing the model almost placed, to walk into the road not taken; the
address bar holds the exact world, so a link opens it anywhere with nothing
downloaded.

While it dreams you watch its insides. Every token lands across the page
glowing with the probability the model gave it, tapping one shows the words
it almost said, and the things it almost placed are drawn as ghosts at the
probability they almost had. The creature says what it is thinking about;
tap it and its head opens on where it doubted and what it nearly said.

Three worlds it already dreamt can be stepped into without downloading
anything, on any browser, on a phone. Their levers work; their doors wake the
mind.

## What is where

- `index.html`, `style.css`: world zero, the page before anyone has wished.
- `app.js`: wakes the model on demand, streams the dream, hands it to the
  harness, lets the result take over the page, replays the remembered dreams.
- `console.js`: the one element the model never writes, in a shadow root so no
  dreamed CSS can break it. One wake button, one line to wish into, the
  model's levers and doors, the ribbon of its certainty, the creature.
- `mind.js`: the contract. The prompt, the models on offer, the harness, the
  wish sets and the scorer. `eval.html` imports this file, so the eval
  measures exactly what ships.
- `world.js`: the vocabulary, the grammar, the painter, the levers.
- `demos.js`: three real dreams, recorded token by token by
  `tools/record-demos.mjs`. Nothing in it is hand-made.
- `eval.html`, `eval.js`: every candidate model gets the same prompt, the same
  wishes, the same settings; results side by side. `?set=ambiguous` asks the
  vague things people type; `?set=followups` asks for edits to a fixed world.
- `evals/`: what was measured, and when.

## The harness

A 0.5B model writes HTML the way a child draws a house, so it is never asked
to. It fills a grammar-enforced JSON spec; the sampler cannot produce anything
else. What can still go wrong is language: at heat a small model drifts into
symbols and glued-together words. `gibberish()` in `mind.js` catches that in
the title, the lines, the labels and the doors, and the model is shown its
attempt and asked again, at most twice. Everything else is repaired in place
and reported in the console, never silently.

## Certainty, honestly

WebLLM reports each token's probability *after* the sampling temperature,
which sharpens the distribution. The ribbon undoes that from the top five
alternatives (`detemper()` in `mind.js`), so what you see is the model's own
distribution at temperature 1, restricted to those five. It ignores the tail,
so it is an upper bound on certainty.

## Running it

Needs WebGPU for the mind: Chrome, Edge, Safari 26, Firefox where it has
shipped. On Linux, Chrome needs `chrome://flags/#enable-unsafe-webgpu` and
`#enable-vulkan`. The first wake fetches the weights (300 MB); later visits use
the browser cache. `?mock` dry-runs without a GPU, `?wish=…` dreams on load,
`?demo=0` opens a remembered dream, `?model=` picks another WebLLM model.

```bash
python3 tools/serve.py 8765     # then open http://localhost:8765
```

Built with [WebLLM](https://github.com/mlc-ai/web-llm). Code and evals:
https://github.com/moudrkat/brave-new-world
