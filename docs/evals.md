# What was measured, and what changed because of it

All runs: Qwen2.5-Coder-0.5B-Instruct (q4f16, WebLLM) on one laptop GPU,
2026-09-19, the prompt and grammar the app ships unless a row says
otherwise. Tables with every column are in `evals/*.md`; the JSON with the
specs and issues sits next to them (gitignored for size). `eval.html` reruns
any of it: `?set=wishes|ambiguous|followups`, `?ex=full|prose|bare`, and
`?mind=` for a model on a server.

## The scorer

Per world: did a spec parse (the grammar makes this near-certain), was the
prose language (`gibberish()` in mind.js), how much of the vocabulary and
palette it used, does the world match what the wish plainly says (`sense`),
is it not the prompt example's world (`original`), do the levers' labels say
what their composed action does (`levers`, a keyword lower bound), do the
doors lead away from the wish and from each other (`doors`). Follow-ups add
`edit` (the asked change happened) and `kept` (the share of the prior world
preserved). `broken` is first attempts the harness sent back; `dead` is
still broken after the eval's one retry (the app retries twice).

## The worked example, three ways

Shown a worked example in the prompt,
the model designs the world and plagiarizes the panel: on the final grammar,
27 of 32 consoles used one of the three examples' consoles, label for label
("fold", "unfold", "more houses"). Take the console out of the example and
the copying stops entirely, and so does the model's ability to write one: 22
of 32 first attempts were not language. Describe one example console in prose
instead of JSON and the copying halves, but the levers stop meaning what they
say (label matches action 0.19 against 0.64). So the example ships, the doors
are mostly its own (12 of 77 copied), and the number stays in this paragraph.
The tighter grammar for short strings (a letter first, plain characters after)
came out of the bare run's failures and stayed.

The retry changed too. Shown its own broken attempt in the conversation, the
model copied it back at close to total certainty, so 4 of 32 worlds were
still not language after a retry. A retry is now a fresh start (the prompt's
lists reshuffled, a cooler temperature, the first attempt out of sight), and
all 4 recover; the average wish dropped from 37 s to 28 s with it.

Vague wishes show the same reflex from the other side. On the 16 wishes people
actually type ("hi", "sad", "blue", "monday", one in Czech, one emoji), it
made 14 different worlds, 25% needed a second attempt and 19% were still not
language after it; and 5 of the 16 were the prompt example's own world
wearing a new sky: "hi" got "Platform Nine, Vermilion", "somewhere warm" got
the jazz bar under the sea. A small model with nothing to go on goes home.

Edits are the other honest number. Asked for a change to the world on screen
("make it night", "add a whale", "snow instead"), it keeps the world, 0.86 of
it on average, and makes the asked change 4 times in 12. The other times it
names the change instead of making it: the title becomes "Snow instead" and
the weather stays clear, "Typewriter Letters" over the same serif. That is
why the levers exist and why the engine, not the model, pulls them: the model
decides what a lever is for, and that it does reliably (0.83 of labels match
their composed action on the follow-up set).


## Reading the shipped row

88% of wishes come back clean on the first try; the rest are sent back for a
fresh attempt and all of them recover. Lever labels match their action 0.69
of the time by keyword, more by eye. Doors always lead somewhere else. The
world matches the wish's plain cues 0.38 of the time, which is the honest
number for a 0.5B choosing from fifty-three things: it hears "lighthouse"
and often draws a tower. Originality 0.34 is the copying, measured.
