#!/usr/bin/env python3
"""Renders the eval JSONs into one compact markdown table for the README.

    python3 tools/eval-table.py evals/2026-09-19-spec-qwen05b-wishes-full2.json ... > /tmp/table.md

Columns are the ones a reader can act on; the full tables are in evals/*.md.
"""
import json, sys, statistics as st

rows = []
for f in sys.argv[1:]:
    d = json.load(open(f))
    for e in d["results"]:
        runs = e["runs"]
        ok = [r for r in runs if r.get("spec")]
        def mean(k):
            v = [r["score"].get(k) for r in ok if r.get("score") and r["score"].get(k) is not None]
            return st.mean(v) if v else None
        f2 = lambda x: "·" if x is None else f"{x:.2f}"
        pct = lambda x: f"{round(100 * x)}%"
        rows.append("| %s | %s | %s | %.0f | %s | %s | %s | %s | %s | %s | %s | %s | %s | %s |" % (
            e["label"].replace(" · with tools", ""), d.get("set", "wishes"), (d.get("example") if isinstance(d.get("example"), str) and d.get("example") != "default" else next((m for m in ("bare", "prose", "full") if m in f), "full")),
            st.mean(r["tps"] for r in runs), pct(sum(r["fatal"] for r in runs) / len(runs)), pct(sum(1 for r in runs if r.get("fatalAfterRetry")) / len(runs)),
            f2(mean("sense")), f2(mean("original")), f2(mean("prose")), f2(mean("buttons")), f2(mean("doors")), f2(mean("edit")), f2(mean("kept")), f2(st.mean(r["score"]["total"] for r in runs))))
head = "| mind | set | example | tok/s | broken | dead | sense | original | prose | levers | doors | edit | kept | total |\n|---|---|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|"
print(head + "\n" + "\n".join(rows))
print("\nbroken: first attempts the harness sent back (not language, or no spec); dead: still broken after the eval's one retry (the app retries twice). sense: the world matches what the wish plainly says; original: not the prompt example's colors, things or words; prose: readable strings; levers: label says what the composed action does (lower bound); doors: lead away from the wish and each other; edit/kept: follow-ups only, asked change made / share of the prior world preserved.")
