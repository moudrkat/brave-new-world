# How it works, at length

The long version of the README's middle: the contract, the buttons, walking, the doors, sharing, the insides, and where it runs.

## How, given that the model is very small

It isn't asked to write HTML. A model this size writes HTML the way a child
draws a house. It is asked to fill in a form: a grammar-constrained JSON spec
with a title, two lines of poem, colors, time, weather, ground, three to six
things from a vocabulary of fifty-three, the design of its own console (side,
tone, shape, width, the invitation in the input, the word on the button, one
to three levers with a label in the world's voice and an action it composes),
and one to three doors: short wishes for the world you might want next. Those
four words go a long way: the shape is the input's shape too, the tone
dresses the levers (outlined, filled, dashed, glowing), and the width is the
arrangement, a narrow column of levers above the line, a wide row below it,
or levers spread across the whole edge with the line at the rim.
Every token it produces is a choice, not syntax, because the syntax is enforced
by the sampler. A JavaScript engine then paints what it named, properly. The
model decides everything you see; the drawing of a lighthouse is ours.

The buttons do things. The model names a lever and composes what it does,
under the grammar: `set time night`, `set weather rain`, `add whale`, `more
bird`, `fewer cloud`, `undo`, `again`, `elsewhere`. Every combination is legal
by construction and the engine knows them all, so whether a lever called
"hush" really sets the motion still is the model's design decision, and the
eval scores it. The doors are wishes: press one and the mind dreams it, with
the world you are in still in its context, so "the same island at night" is
an edit and "a desert" is a departure. Anything you type works the same way:
a place, a mood, a single word, a change to what is on screen, another
language. What comes back is always a world, because the grammar allows
nothing else; whether it is a good one is what the evals measure.

The world is walkable, as far as this much model allows. Tap a thing in the
scene and you wish to walk to it. Tap a ghost, the faint thing the model
almost placed, and it regenerates the world from that very token with the
other choice: a grammar whose root is the model's own text up to the fork,
verbatim, then the road not taken. In the forked world, what it chose the
first time is the ghost. The scene shifts a little under the pointer or the
phone's tilt, far things less than near ones.

The doors are the next probable world, literally. Each carries the model's
certainty of it, drawn as its weight, and the one it believed in most is
dreamt ahead on the idle GPU while you look at this one. Step through it and
the world is already there; take any other road and the head start is thrown
away. The world after this one exists before you choose it, at the
probability the model gave it.

Every world lives in the address bar. The hash holds the spec, the model's
text, a byte of certainty per token and the ghosts, so a link opens the exact
dream on any browser with nothing downloaded, levers included. The `link`
in the panel copies it, or hands it to the phone's share sheet.

## The insides

While it dreams, every token lands large across the page, glowing with the
probability the model gave it; hovering (or tapping) one shows the words it
almost said. Where the model hesitated over *what* to put in the scene, the
runner-up is drawn too, faintly, at the probability it almost had. Those are
ghosts of the world you nearly got, and you can walk into one. The words on
the page are drawn at the certainty they were written with.

The creature drifting about is the model's state. It writhes while thinking,
opens an eye at every hesitation, and says what it is thinking about, read
off the text so far: finding a title, mixing the sky, naming the third thing,
wording a lever, opening the doors. Tap it and its head opens: how many
tokens the grammar decided and how many were its own choices, how sure it was
on those, where it doubted most, part by part, the places it nearly said
something else and what, and what the mind is made of (24 layers, 14 heads,
896 wide, a vocabulary of 151,936, 4-bit weights).

What it says about itself is all of that: the probability of every token it
wrote and of the words it did not. Its attention and activations stay inside
the GPU; WebLLM does not hand them out. Showing them would take a second copy
of the model through a custom ONNX export, and until then this page shows
less rather than inventing the rest.

## Runs where

The mind needs WebGPU: Chrome and Edge on desktop and Android, Safari 26 on
Mac, iPhone and iPad, and Firefox where it has shipped WebGPU. A GPU without
16-bit shaders gets the same model in its f32 build. On Linux Chrome needs
`chrome://flags/#enable-unsafe-webgpu` and `#enable-vulkan`. Without WebGPU
the three remembered dreams still work, levers included: they are real runs,
recorded token by token, replayed without a model.

The model is loaded through [WebLLM](https://github.com/mlc-ai/web-llm) with
grammar-constrained decoding and per-token log probabilities, which is why it
is not the transformers.js path used in
[coalescence](https://github.com/moudrkat/coalescence): that path has no
grammar and no logprobs, and this piece is nothing without either. The loading
is the same idea: one button that says what it costs, a promise-guarded
download, cached for the next visit.

