# Brave New World

A 0.5-billion-parameter language model, running in your browser tab, designs
the entire page you are looking at. The background, the things in it, the poem,
the font, and the control panel: where it sits, what the button says, and what
the other buttons do. You type a world. It becomes the page. It is not a chat: there is no reply, only the world, and a few levers the model thought you might want.

**Try it:** https://unt1l1f1nd-brave-new-world.static.hf.space (needs WebGPU;
Chrome or Edge; the first visit downloads 300 MB of weights, then nothing
leaves your machine again).

![a world, dreamed](docs/world.jpg)

## How, given that the model is very small

It isn't asked to write HTML. A model this size writes HTML the way a child
draws a house. It is asked to fill in a form: a grammar-constrained JSON spec
with a title, two lines of poem, colors, time, weather, ground, three to six
things from a vocabulary of fifty-three, and the design of its own console.
Every token it produces is a choice, not syntax, because the syntax is enforced
by the sampler. A JavaScript engine then paints what it named, properly. The
model decides everything you see; the drawing of a lighthouse is ours.

## The insides

While it dreams, every token glows with the probability the model gave it, and
hovering one shows the words it almost said. Where the model hesitated over
*what* to put in the scene, the runner-up is drawn too, faintly, at the
probability it almost had. Those are ghosts of the world you nearly got.

## The rest

- `world.js`: the vocabulary, the grammar, the painter, the levers.
- `mind.js`: the contract, the harness, the scorer.
- `console.js`: the one element the model does not write, though it designs it.
- `eval.html`: thirteen models that fit in a browser, thirty-two wishes, one
  table. Results in `evals/`.
- `tools/drive.mjs`: runs the app or the eval from a shell through Chrome.

Dedicated to everyone brave enough to leave the old world, whatever that means
for them now.
