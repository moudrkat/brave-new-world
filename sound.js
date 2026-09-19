// A world has a sound. Nothing is downloaded and nothing is recorded: the tab
// synthesizes it from the spec. The sky's hue picks the root note, the hour
// picks the scale (dawn major, noon lydian, dusk dorian, night minor), the
// weather adds its texture (rain ticks, snow rings, embers crackle, bubbles
// rise), and the motion sets how often a note is plucked. Off by default;
// the choice is remembered in this browser only.
export function makeSound() {
  let ctx = null, master = null, drone = null, timer = 0, spec = null, on = false;
  const SCALES = { dawn: [0, 2, 4, 7, 9, 12, 14, 16], noon: [0, 2, 4, 6, 7, 9, 11, 12, 14], dusk: [0, 2, 3, 5, 7, 9, 10, 12, 14], night: [0, 3, 5, 7, 10, 12, 15, 17] };
  const hue = (hex) => {
    const n = parseInt(String(hex).slice(1), 16); if (Number.isNaN(n)) return 0;
    const r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    if (!d) return 0;
    const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return ((h * 60) + 360) % 360;
  };
  const root = () => 82.41 * Math.pow(2, Math.round((hue(spec?.sky?.[0]) / 360) * 12) / 12); // low E, up to an octave by hue
  const scale = () => SCALES[spec?.time] || SCALES.dusk;
  const note = (degree, octave = 0) => root() * Math.pow(2, (scale()[((degree % scale().length) + scale().length) % scale().length] + 12 * octave) / 12);

  function start() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
  }
  function pluck(freq, { gain = 0.06, dur = 1.4, type = "sine", glide = 0 } = {}) {
    const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (glide) o.frequency.exponentialRampToValueAtTime(freq * glide, t + dur * 0.6);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master); o.start(t); o.stop(t + dur + 0.05);
  }
  function hiss({ gain = 0.03, dur = 0.08, cutoff = 3000, q = 1 } = {}) {
    const t = ctx.currentTime, n = Math.ceil(ctx.sampleRate * dur), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = buf; f.type = "bandpass"; f.frequency.value = cutoff; f.Q.value = q;
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(master); src.start(t);
  }
  // the drone: two voices a fifth apart, slightly out of tune with each other, behind a slow filter
  function buildDrone() {
    const t = ctx.currentTime;
    if (drone) { const old = drone; old.gain.gain.setTargetAtTime(0, t, 0.8); setTimeout(() => old.oscs.forEach((o) => { try { o.stop(); } catch {} }), 3000); }
    const f = root(), g = ctx.createGain(), lp = ctx.createBiquadFilter(), lfo = ctx.createOscillator(), lfoG = ctx.createGain();
    lp.type = "lowpass"; lp.frequency.value = spec.weather === "fog" || spec.time === "night" ? 420 : 900; lp.Q.value = 0.7;
    lfo.frequency.value = 0.07; lfoG.gain.value = 180; lfo.connect(lfoG).connect(lp.frequency); lfo.start();
    const oscs = [["sine", f, 0], ["triangle", f * 1.5, 4], ["sine", f * 2, -3]].map(([type, freq, cents]) => { const o = ctx.createOscillator(); o.type = type; o.frequency.value = freq; o.detune.value = cents; o.connect(lp); o.start(); return o; });
    oscs.push(lfo);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(spec.motion === "still" ? 0.05 : 0.04, t + 2.5);
    lp.connect(g).connect(master);
    drone = { gain: g, oscs };
  }
  function texture() {
    const w = spec.weather;
    if (w === "rain") for (let i = 0; i < 4; i++) setTimeout(() => ctx && hiss({ gain: 0.02, dur: 0.05, cutoff: 3800 + Math.random() * 2000, q: 3 }), Math.random() * 800);
    else if (w === "snow") pluck(note(4 + Math.floor(Math.random() * 3), 3), { gain: 0.022, dur: 2.2 });
    else if (w === "stars" && Math.random() < 0.5) pluck(note(Math.floor(Math.random() * 5), 4), { gain: 0.014, dur: 1.6 });
    else if (w === "embers") for (let i = 0; i < 3; i++) setTimeout(() => ctx && hiss({ gain: 0.03, dur: 0.06, cutoff: 500 + Math.random() * 500, q: 6 }), Math.random() * 900);
    else if (w === "bubbles") pluck(note(Math.floor(Math.random() * 4), 2), { gain: 0.03, dur: 0.5, glide: 1.6 });
    else if (w === "petals") pluck(note(2 + Math.floor(Math.random() * 4), 2), { gain: 0.025, dur: 1.8, type: "triangle" });
    else if (w === "fireflies" && Math.random() < 0.7) pluck(note(Math.floor(Math.random() * 6), 3), { gain: 0.018, dur: 0.35 });
  }
  function schedule() {
    clearTimeout(timer);
    const period = { still: 0, slow: 2600, restless: 950 }[spec.motion] || 2600;
    const beat = () => {
      if (!on || !ctx || !spec) return;
      if (period) pluck(note(Math.floor(Math.random() * 6), 1 + (Math.random() < 0.3 ? 1 : 0)), { gain: 0.045, dur: 2.4 });
      texture();
      timer = setTimeout(beat, (period || 3000) * (0.7 + Math.random() * 0.6));
    };
    timer = setTimeout(beat, 600);
  }
  function enable(v) {
    on = !!v;
    try { localStorage.setItem("bnw-sound", on ? "1" : "0"); } catch {}
    if (on) { if (!ctx) start(); ctx.resume?.(); master.gain.setTargetAtTime(1, ctx.currentTime, 0.4); if (spec) { buildDrone(); schedule(); } }
    else if (ctx) { master.gain.setTargetAtTime(0, ctx.currentTime, 0.25); clearTimeout(timer); }
  }
  // a world arrived (or the page went back to world zero)
  let lastSpec = null;
  function setWorld(s) {
    if (s === lastSpec) return;
    lastSpec = s;
    spec = s && s.sky ? s : null;
    if (!on || !ctx) return;
    if (!spec) { clearTimeout(timer); if (drone) { drone.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.8); } return; }
    buildDrone(); schedule();
  }
  // a surprise, a lever, a walk: one clear note, higher the surer the world was about it
  function ping(p = 0.5) { if (on && ctx && spec) pluck(note(Math.round(p * 5), 2), { gain: 0.07, dur: 1.6 }); }
  // a token landing: a grain of sound, pitched by how sure the model was
  function tick(p = 0.5) { if (on && ctx) pluck(1200 + (1 - p) * 900 + Math.random() * 80, { gain: 0.006, dur: 0.07, type: "triangle" }); }
  const wanted = () => { try { return localStorage.getItem("bnw-sound") === "1"; } catch { return false; } };
  return { enable, setWorld, ping, tick, wanted, get on() { return on; } };
}
