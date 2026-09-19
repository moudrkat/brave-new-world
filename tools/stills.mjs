// Stills and a GIF for the README, cut from a film take's own frames: no
// staging, the same recording as the video.
//   node tools/stills.mjs out/brave-new-world
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";

const out = process.argv[2] || "out/brave-new-world";
const take = JSON.parse(readFileSync(out + ".take.json", "utf8"));
const frames = JSON.parse(readFileSync(out + ".frames.json", "utf8"));
const dir = out + "-frames";
mkdirSync("docs", { recursive: true });
const at = (t) => frames.reduce((best, f) => (Math.abs(f.t - t) < Math.abs(best.t - t) ? f : best), frames[0]);
const worlds = take.beats.filter((b) => b.kind === "world");
const still = at((worlds[1] || worlds[0]).t + 2.6);
execFileSync("ffmpeg", ["-v", "error", "-y", "-i", still.name, "-vf", "scale=1200:-1:flags=lanczos", "-q:v", "4", "docs/world.jpg"]);
console.log("docs/world.jpg from", still.name.split("/").pop(), "·", worlds[1]?.world?.title);

// the gif: the last few seconds of the world before a door, the door taken, the crossfade, the new world
function gif(kind, name, before = 1.2, after = 6.5, fps = 12, width = 720) {
  const b = take.beats.find((x) => x.kind === kind) || take.beats.find((x) => x.kind === "dream" && String(x.wish || "").startsWith(kind + ":"));
  if (!b) return console.log("no", kind, "beat");
  const sel = frames.filter((f) => f.t >= b.t - before && f.t <= b.t + after);
  let list = "ffconcat version 1.0\n";
  for (let i = 0; i < sel.length; i++) list += `file '${sel[i].name.split("/").pop()}'\nduration ${(i + 1 < sel.length ? sel[i + 1].t - sel[i].t : 1 / fps).toFixed(4)}\n`;
  list += `file '${sel.at(-1).name.split("/").pop()}'\n`;
  writeFileSync(`${dir}/${name}.ffconcat`, list);
  const vf = `fps=${fps},scale=${width}:-1:flags=lanczos`;
  execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", `${dir}/${name}.ffconcat`, "-vf", vf + ",palettegen=stats_mode=diff", `${dir}/${name}-pal.png`]);
  execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", `${dir}/${name}.ffconcat`, "-i", `${dir}/${name}-pal.png`, "-lavfi", vf + " [x]; [x][1:v] paletteuse=dither=bayer:bayer_scale=3", `docs/${name}.gif`]);
  const size = execFileSync("stat", ["-c", "%s", `docs/${name}.gif`]).toString().trim();
  console.log(`docs/${name}.gif · ${sel.length} frames · ${(size / 1e6).toFixed(1)} MB`);
}
gif("uninvited", "opening", 0.4, 11.5, 10, 640); // the page beginning by itself: tokens, then a world
gif("door", "door");
