// ============================================================
//  pipeline/catalog.js — The video style catalog, read from the renderer.
//
//  apps/Carbon Video/src/styles/catalog.json is the one list of styles: the
//  Remotion app imports it to draw them, and this module reads the same file
//  (through VIDEO_APP_DIR, like every other render step) to validate
//  requests, plan a directed style's scenes and brief the director. In
//  production both apps ship in one image (deploy/backend.Dockerfile).
//
//  Two engines:
//    classic   the shared launch film (hud, paper, …): palette + type only;
//              video types (formats) and layouts apply.
//    directed  a style that tells its own story: its own scene list, motion
//              and transitions. It has no video type; lengths per style.
//  If the file can't be read, only the classic looks are offered.
// ============================================================

const fs = require('fs');
const path = require('path');

const VIDEO_APP = path.resolve(process.env.VIDEO_APP_DIR || path.join(__dirname, '..', '..', 'Carbon Video'));
const CATALOG_FILE = path.join(VIDEO_APP, 'src', 'styles', 'catalog.json');
const CLASSIC = ['hud', 'paper', 'bold', 'glass', 'terminal', 'kinetic', 'aurora'];
const FRAMES = { 30: 900, 15: 460 };

function load() {
  try {
    const all = JSON.parse(fs.readFileSync(CATALOG_FILE, 'utf8')).styles || [];
    return all.filter((s) => s.status === 'available' && (s.engine === 'classic' ? CLASSIC.includes(s.id) : s.engine === 'directed'));
  } catch (err) {
    console.warn(`[catalog] ${CATALOG_FILE} unreadable (${err.message}); offering classic looks only`);
    return CLASSIC.map((id) => ({ id, version: 1, status: 'available', engine: 'classic', name: id, category: 'Classic', tagline: '', description: '', bestFor: [], inputs: ['repo', 'site'], lengths: [30, 15], music: id, preview: { poster: `/media/style-${id}.jpg` } }));
  }
}

const CATALOG = load();
const byId = new Map(CATALOG.map((s) => [s.id, s]));
const DIRECTED = CATALOG.filter((s) => s.engine === 'directed').map((s) => s.id);
// Every style a video can use, classic looks first (their order is relied on).
const ALL_STYLES = [...CLASSIC.filter((id) => byId.has(id)), ...DIRECTED];

const styleInfo = (id) => byId.get(id) || null;
const isDirected = (id) => styleInfo(id)?.engine === 'directed';
const supportsInput = (id, type) => Boolean(styleInfo(id)?.inputs?.includes(type));
const stylesFor = (type) => ALL_STYLES.filter((id) => supportsInput(id, type));
// A style's own soundtrack (a directed style borrows one of the seven tracks).
const defaultMusic = (id) => (CLASSIC.includes(id) ? id : styleInfo(id)?.music || 'hud');

// The scene list for a directed style, for this input and length.
function scenesFor(style, type, length) {
  const s = styleInfo(style);
  const entry = s?.scenes?.[String(length)];
  const list = Array.isArray(entry) ? entry : entry?.[type];
  return Array.isArray(list) ? list : null;
}

// Why a request can't use this style (null when it can). `format` is the
// requested video type ('auto' when none), `type` the input ('repo'|'site').
function checkStyle({ style, type, format = 'auto', length = 30 }) {
  if (style === 'auto') return null;
  const s = styleInfo(style);
  if (!s) return { code: 'BAD_STYLE', error: 'Unknown style.' };
  if (type && !s.inputs.includes(type)) {
    const needs = s.inputs.includes('repo') ? 'a GitHub repo' : 'a website';
    return { code: 'STYLE_INPUT', error: `${s.name} needs ${needs}.` };
  }
  if (!s.lengths.includes(Number(length))) return { code: 'BAD_LENGTH', error: `${s.name} comes in ${s.lengths.join(' or ')} seconds.` };
  if (s.engine === 'directed' && format && format !== 'auto') {
    return { code: 'BAD_FORMAT', error: `${s.name} tells its own story, so it has no video type. Leave the type on Auto.` };
  }
  if (s.engine === 'directed' && type && !scenesFor(style, type, length)) return { code: 'STYLE_INPUT', error: `${s.name} isn't available for this link yet.` };
  return null;
}

// The `direction` block a directed storyboard carries to the renderer.
function planDirection(style, type, length = 30) {
  const s = styleInfo(style);
  if (!s || s.engine !== 'directed') return null;
  const scenes = scenesFor(style, type, length);
  if (!scenes) throw new Error(`Style "${style}" has no ${length}s scene plan for a ${type}`);
  const total = scenes.reduce((a, sc) => a + sc.frames, 0);
  if (total !== FRAMES[length]) throw new Error(`Style "${style}" ${length}s plan is ${total} frames, not ${FRAMES[length]}`);
  return {
    style: s.id,
    version: s.version,
    scenes: scenes.map((sc) => ({ scene: sc.scene, frames: sc.frames, ...(sc.params ? { params: sc.params } : {}) })),
    transition: s.transition || { kind: 'none', frames: 0 },
    requires: s.requires || [],
  };
}

// What the website shows in the style gallery.
const publicCatalog = () =>
  CATALOG.map((s) => ({
    id: s.id,
    version: s.version,
    engine: s.engine,
    name: s.name,
    category: s.category,
    tagline: s.tagline,
    description: s.description,
    bestFor: s.bestFor || [],
    inputs: s.inputs,
    lengths: s.lengths,
    music: s.music,
    motion: s.motion || null,
    typography: s.typography || null,
    requires: s.requires || [],
    preview: { poster: s.preview?.poster || null, clip: s.preview?.clip || null },
  }));

// The style list the stylist and director choose from, for a prompt.
const styleGuide = (type) =>
  stylesFor(type)
    .map((id) => {
      const s = styleInfo(id);
      const kind = s.engine === 'classic' ? 'classic launch film' : 'own story';
      return `- \`${id}\` (${s.name}, ${kind}): ${s.description} Best for: ${(s.bestFor || []).join(', ') || 'anything'}.`;
    })
    .join('\n');

module.exports = { CATALOG, CATALOG_FILE, CLASSIC, DIRECTED, ALL_STYLES, FRAMES, styleInfo, isDirected, supportsInput, stylesFor, defaultMusic, scenesFor, checkStyle, planDirection, publicCatalog, styleGuide };
