# Brave New World

*The brave new world is, in fact, always inside.*

> ***Dedicated to everyone brave enough to leave the old world, whatever that means for them now.***

I had been reading the Shoggoth debates, and at some point I could not
resist.

So: in your browser lives a small model, and it creates the world on demand.
Not a picture of it. The whole page, and the whole UI. You say "a quiet island
at dusk", or just "sad", or "monday", and the page becomes that world: its
colors, its things, its poem, and the panel you are standing at. Where the
panel sits, what the button says, which levers it hands you, and which doors
lead out of this world into the next one. Then it walks you through.

It is not a chat. Nothing answers you. A world happens to you, and it has
buttons. Tap a thing and you walk to it. Tap a ghost, the faint thing the
model almost put there, and you walk into the road it did not take. The door
it thinks you will choose is already being dreamt while you look.

Is it a shoggoth? Is a shoggoth building you a brave new world? Are you
walking through the shoggoth itself? Or was the brave new world inside you all
along?

You might think this is just playful nonsense. Which is, actually, what a
brave new world can be.

A frontier model would do this far better. That was not the point. The point
was to make the edge do it: 0.5 billion parameters, 300 MB once, your own GPU,
and then nothing leaves your browser. Nothing leaves your brave new world.

**Try it:** https://unt1l1f1nd-brave-new-world.static.hf.space

One button wakes the mind. No model to pick, no settings. Before you wake it,
three worlds it already dreamt can be stepped into with nothing downloaded, on
any browser, on a phone.

![the page beginning by itself: tokens first, then a world](docs/opening.gif)

![a world, dreamed](docs/world.jpg)

![a door the model proposed, already dreamt while you looked, opening](docs/door.gif)

## How

It is never asked to write HTML; a model this size writes HTML the way a
child draws a house. It fills in a grammar-constrained form: title, two
lines of poem, colors, time, weather, ground, three to six things from a
vocabulary of fifty-three, the design of its own panel (edge, tone, shape,
width, the invitation, the word on the button, up to three levers with a
label in the world's voice and an action it composes), and one door: the
wish for the next world. Every token is a choice, not syntax; a JavaScript
engine paints what it named.

The world is the interface. The levers hang on the things they change, the
door stands in the scene as a signpost with its price in seconds (0 when it
was dreamt ahead while you looked), and the panel is a wish line that sits
where the model's words are not. Tap a thing and something happens to it;
tap it again to walk there. Tap a ghost, the faint thing it almost placed,
and it re-walks its own text to that token and turns the other way. Every
world lives in the address bar, doubts included.

While it dreams, its tokens land across the page at the certainty it gave
them; tap the creature for its head: what the grammar decided, what it chose,
where it doubted, what it nearly said. Attention and activations stay inside
the GPU; the page shows less rather than inventing the rest. The long
version, and where it runs, is in [docs/how.md](docs/how.md).

## Evals

Measured, not assumed. `eval.html` runs the shipped prompt, grammar and
sampling over held-out wishes and scores what came back; the sets are the
32 wishes, 16 vague ones ("hi", "blue", "monday", one in Czech, one emoji)
and 12 edits to a fixed world. Full tables in `evals/`, the findings and what
was changed because of them in [docs/evals.md](docs/evals.md).

| mind | set | example | tok/s | broken | dead | sense | original | prose | levers | doors | edit | kept | total |
|---|---|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| Qwen2.5 Coder · 0.5B, shipped (one door) | wishes | full | 14 | 6% | 3% | 0.46 | 0.36 | 0.99 | 0.66 | 1.00 | · | · | 0.92 |
| Qwen2.5 Coder · 0.5B | ambiguous | full | 13 | 25% | 19% | 0.00 | 0.33 | 0.98 | 0.75 | 0.92 | · | · | 0.86 |
| Qwen2.5 Coder · 0.5B | followups | full | 15 | 0% | 0% | 0.78 | 0.92 | 1.00 | 0.83 | 0.99 | 0.33 | 0.86 | 0.88 |
| the same, three doors, retry shown its broken attempt | wishes | full | 12 | 12% | 12% | 0.42 | 0.50 | 0.97 | 0.64 | 1.00 | · | · | 0.89 |
| Qwen2.5 Coder · 0.5B | wishes | prose | 14 | 12% | 9% | 0.45 | 0.41 | 0.98 | 0.19 | 0.99 | · | · | 0.87 |
| Qwen2.5 Coder · 0.5B | wishes | bare | 15 | 69% | 62% | 0.41 | 0.38 | 0.86 | 0.10 | 0.98 | · | · | 0.88 |

## Two minds, one page

The page does not care where the mind is. By default it is in the tab. With
`?mind=http://host:8010/v1` it is any OpenAI-compatible server that streams,
and the page becomes a front for a model that would never fit in a browser.

```mermaid
flowchart LR
  W(["a wish"]) --> P["the page<br/>prompt · harness · painter · panel · ghosts"]
  P -->|"grammar, temperature 0.9,<br/>five alternatives per token"| T["<b>the tab</b><br/>WebLLM on WebGPU<br/>Qwen2.5-Coder-0.5B, 300 MB<br/>nothing leaves the device"]
  P -.->|"?mind=…<br/>JSON schema or schema-in-prompt,<br/>logprobs: true"| S["<b>a server</b><br/>vLLM · llama.cpp · brainscope<br/>any size that fits the GPU"]
  T -->|"tokens + probabilities"| P
  S -.->|"tokens + probabilities"| P
  S -.-> B["<b>brainscope's own page</b><br/>logit lens · attention · steering<br/>for the same generation"]
  P --> V(["the world, its levers, its doors,<br/>the certainty of every word"])
  classDef page fill:#16122a,stroke:#e0a458,color:#efe6d6
  classDef mind fill:#07060b,stroke:#9b6bff,color:#efe6d6
  class P,V page
  class T,S,B mind
```

Why open it:

- **To see what size buys.** The whole piece is built around what a 0.5B can
  and cannot do: it copies the example's panel, it names a change instead of
  making it, it goes home when given nothing. Point the same page, the same
  prompt and the same scorer at a 7B or a 30B on your own GPU and every one
  of those numbers gets a second row. The eval already runs against whatever
  is at `?mind=`.
- **To look deeper than logits.** The tab hands out probabilities and nothing
  else; brainscope hands out the residual stream. With brainscope as the
  mind, the world materializes here while its logit lens, attention and
  per-layer readouts play over there, for the very tokens you are watching
  land. Steering directions apply too: a persona vector on the model that
  dreams the world is a world with a persona.
- **To keep the interface honest.** The panel, the ghosts and the doors
  remain the page's; only the mind moves. If a bigger mind makes better
  levers, it shows up in the levers, not in a prompt trick.

What it needs: a schema-aware server (vLLM, llama.cpp) gets the world's
schema as a decoding constraint; brainscope, which has no constrained
decoding yet, gets the schema in the prompt (`&guided=0`) and the harness
keeps the rest. brainscope needs its `--cors` flag and streaming with
logprobs, which it grew for this and which is unreleased at the time of
writing: `brainscope --model <id> --cors --host 127.0.0.1`, then open
`?mind=http://127.0.0.1:8010/v1&guided=0`. `?mindmodel=` picks a model when
the server serves several. Nothing on the page changes; the wake button says
where the wishes go.

## The rest

- `world.js` the vocabulary, the grammar, the painter, the levers, the surprises
- `mind.js` the contract, the harness, the scorer, the wish sets
- `console.js` the one element the model does not write, though it designs it
- `demos.js` three recorded dreams, written by `tools/record-demos.mjs`, never by hand
- `eval.html` the models, the wishes, one table; results in `evals/`, findings in `docs/evals.md`
- `tools/` drive, film, stills, serve, deploy

> ***Dedicated to everyone brave enough to leave the old world, whatever that means for them now.***
