// ============================================================
//  pipeline/looks.js — The visual styles and soundtracks a video can use,
//  and the no-LLM ways of choosing between them.
//
//  STYLES are the classic looks (apps/Carbon Video/src/hud/hud.ts), each with
//  its own soundtrack (music id = style id). Directed styles come from the
//  catalog (pipeline/catalog.js) and borrow one of those seven tracks.
//  ALL_STYLES is everything a video can use.
// ============================================================

const { CLASSIC, ALL_STYLES, stylesFor } = require('./catalog');

const STYLES = [...CLASSIC];
const MUSIC = [...STYLES];

// The feelings a creator can pick in the brief, and where the video should run.
const MOODS = ['calm', 'premium', 'playful', 'energetic', 'technical', 'warm', 'bold'];
const PLATFORMS = ['x', 'linkedin', 'producthunt', 'youtube', 'website'];

// How much each answer pulls toward each style (used when no LLM is available).
// Weights for styles missing from the catalog are ignored.
const MOOD_WEIGHTS = {
  calm: { paper: 2, aurora: 1, glass: 1 },
  premium: { glass: 2, paper: 1, hud: 1 },
  playful: { aurora: 2, bold: 1, kinetic: 1 },
  energetic: { kinetic: 2, bold: 2, hud: 1, poster: 2 },
  technical: { terminal: 2, hud: 2, glass: 1, blueprint: 2 },
  warm: { paper: 2, aurora: 2 },
  bold: { bold: 2, kinetic: 2, poster: 2 },
};
const PLATFORM_WEIGHTS = {
  x: { kinetic: 1, bold: 1, poster: 1 },
  linkedin: { glass: 1, paper: 1 },
  producthunt: { aurora: 1, glass: 1 },
  youtube: { hud: 1 },
  website: {},
};
const DEV_AUDIENCE = /\b(dev|developer|engineer|programmer|hacker|backend|frontend|devops|sre|coder|maintainer|open[- ]source)/i;

const hashOf = (s) => {
  let h = 0;
  for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
};

// No-LLM "auto": light websites get Paper or Aurora; everything else is spread
// across every style that works for the input by a stable hash of the URL, so
// two products rarely share a look.
function pickStyle(requested, f) {
  if (ALL_STYLES.includes(requested)) return requested;
  const h = hashOf(f.url || f.name);
  const bg = String(f.brand?.bg || '').match(/rgba?\(\s*(\d+)[, ]+(\d+)[, ]+(\d+)/);
  if (f.type === 'site' && bg && bg.slice(1, 4).map(Number).reduce((a, b) => a + b, 0) > 600) return h % 2 ? 'aurora' : 'paper';
  const pool = stylesFor(f.type || 'repo');
  return pool[h % pool.length];
}

// Score the styles from the creator's answers. Returns null when the answers
// say nothing about the look (then the caller falls back to pickStyle).
function lookFromBrief(f, brief) {
  if (!brief) return null;
  const pool = stylesFor(f.type || 'repo');
  const score = Object.fromEntries(pool.map((s) => [s, 0]));
  const bump = (w, k = 1) => Object.entries(w || {}).forEach(([s, v]) => s in score && (score[s] += v * k));
  for (const m of brief.moods || []) bump(MOOD_WEIGHTS[m]);
  bump(PLATFORM_WEIGHTS[brief.platform], 1);
  if (DEV_AUDIENCE.test(brief.audience || '')) bump({ terminal: 1, hud: 1, blueprint: 1 });
  const best = Math.max(...Object.values(score));
  if (best <= 0) return null;
  // Ties go to a stable, URL-dependent order so similar briefs still vary.
  const tied = pool.filter((s) => score[s] === best);
  const style = tied[hashOf(f.url || f.name) % tied.length];
  const moods = (brief.moods || []).join(' and ');
  return { style, music: null, source: 'brief', reason: moods ? `Matches the ${moods} feel you asked for.` : 'Fits where you plan to post it.' };
}

// ── Layouts: which composition each scene uses ───────────────────────────
// Ids match LAYOUTS in apps/Carbon Video/src/LaunchVideo.tsx. Every style
// leans toward some compositions (weights), the brief nudges them, and a
// per-video seed draws from the result, so videos stop sharing one layout.
const LAYOUTS = {
  title: ['scan', 'stack', 'card'],
  stat: ['chart', 'giant', 'ring'],
  shot: ['window', 'full', 'tilt'],
  code: ['split', 'window', 'focus'],
  features: ['tree', 'grid', 'list'],
  outro: ['dial', 'cta', 'words'],
};
// Weights in LAYOUTS order, then the style's own on-screen UI.
const AFFINITY = {
  hud: { title: [3, 1, 1], stat: [3, 1, 2], shot: [3, 1, 2], code: [3, 1, 2], features: [3, 1, 1], outro: [3, 1, 1], chrome: 'hud' },
  paper: { title: [1, 2, 2], stat: [1, 3, 2], shot: [2, 3, 1], code: [1, 3, 2], features: [1, 3, 2], outro: [1, 2, 2], chrome: 'editorial' },
  bold: { title: [1, 3, 1], stat: [1, 3, 1], shot: [1, 3, 2], code: [1, 2, 3], features: [1, 2, 3], outro: [1, 2, 3], chrome: 'none' },
  glass: { title: [1, 1, 3], stat: [2, 1, 3], shot: [2, 1, 3], code: [1, 3, 1], features: [1, 3, 1], outro: [1, 3, 1], chrome: 'minimal' },
  terminal: { title: [3, 1, 1], stat: [2, 2, 1], shot: [3, 1, 1], code: [2, 1, 3], features: [2, 1, 2], outro: [2, 2, 1], chrome: 'tmux' },
  kinetic: { title: [1, 4, 0], stat: [1, 4, 1], shot: [1, 3, 2], code: [1, 1, 3], features: [1, 1, 4], outro: [1, 1, 4], chrome: 'none' },
  aurora: { title: [0, 2, 3], stat: [1, 2, 3], shot: [2, 2, 2], code: [1, 3, 1], features: [1, 3, 2], outro: [0, 3, 2], chrome: 'minimal' },
};
// For each slot, the option index a kind of answer pushes toward (+2 weight):
// loud = big kinetic layouts, soft = cards / rings, tech = the original HUD scenes.
const NUDGE = { loud: { title: 1, stat: 1, shot: 1, code: 2, features: 2, outro: 2 }, soft: { title: 2, stat: 2, shot: 2, code: 1, features: 1, outro: 1 }, tech: { title: 0, stat: 0, shot: 0, code: 0, features: 0, outro: 0 } };

// Small seeded PRNG (mulberry32) so a layout is reproducible from its seed.
const rng = (seed) => {
  let a = hashOf(seed) || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
const draw = (rand, weights) => {
  const total = weights.reduce((a, b) => a + Math.max(0, b), 0);
  let r = rand() * total;
  for (let i = 0; i < weights.length; i++) if ((r -= Math.max(0, weights[i])) < 0) return i;
  return weights.length - 1;
};

function pickLayout(style, seed, brief) {
  const aff = AFFINITY[style] || AFFINITY.hud;
  const moods = brief?.moods || [];
  const nudges = [];
  if (brief?.platform === 'x' || moods.some((m) => ['energetic', 'bold'].includes(m))) nudges.push('loud');
  if (brief?.platform === 'linkedin' || moods.some((m) => ['calm', 'premium', 'warm'].includes(m))) nudges.push('soft');
  if (moods.includes('technical')) nudges.push('tech');
  const rand = rng(`${seed}:${style}`);
  const weightsFor = (slot) => {
    const w = aff[slot].map((x) => x + 1); // +1 baseline: every layout stays possible in every style
    for (const n of nudges) w[NUDGE[n][slot]] += 2;
    return w;
  };
  const one = (slot) => LAYOUTS[slot][draw(rand, weightsFor(slot))];
  const shotW = weightsFor('shot');
  const first = draw(rand, shotW);
  const second = draw(rand, shotW.map((w, i) => (i === first ? 0 : w || 1))); // two different site shots
  return {
    title: one('title'),
    stat: one('stat'),
    shots: [LAYOUTS.shot[first], LAYOUTS.shot[second]],
    code: one('code'),
    features: one('features'),
    outro: one('outro'),
    chrome: aff.chrome,
  };
}

// ── Video types and lengths ──────────────────────────────────────────────
// Ids match FORMATS in apps/Carbon Video/src/LaunchVideo.tsx. "numbers" needs a
// repo's real GitHub numbers and "showcase" needs website screenshots.
const FORMATS = ['launch', 'explainer', 'kinetic', 'numbers', 'showcase'];
const LENGTHS = [30, 15];
const formatsFor = (type) => FORMATS.filter((f) => !(f === 'numbers' && type !== 'repo') && !(f === 'showcase' && type !== 'site'));
const validFormat = (format, type) => (formatsFor(type).includes(format) ? format : 'launch');

// No-LLM pick from the answers: loud on X → kinetic; a general audience →
// explainer; a calm, product-led website → showcase; otherwise the launch film.
function formatFromBrief(type, brief) {
  if (!brief) return 'launch';
  const moods = brief.moods || [];
  if (brief.platform === 'x' && moods.some((m) => ['energetic', 'bold', 'playful'].includes(m))) return 'kinetic';
  if (brief.audience && !DEV_AUDIENCE.test(brief.audience) && (brief.platform === 'linkedin' || moods.includes('calm'))) return 'explainer';
  if (type === 'site' && moods.some((m) => ['premium', 'calm'].includes(m))) return 'showcase';
  return 'launch';
}

module.exports = { STYLES, ALL_STYLES, MUSIC, MOODS, PLATFORMS, LAYOUTS, FORMATS, LENGTHS, formatsFor, validFormat, formatFromBrief, pickStyle, lookFromBrief, pickLayout, hashOf };
