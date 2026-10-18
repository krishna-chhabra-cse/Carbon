// Style engine tests: the catalog, directed scene plans, and that a chosen
// style survives API → job → worker → storyboard → renderer input untouched.
const os = require('os');
const path = require('path');
const fs = require('fs');

process.env.NODE_ENV = 'test';
process.env.AUTH_DEV_BYPASS = 'false';
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'carbon-styles-'));
// Empty (not deleted) so server.js's dotenv can't load a real key: no network in tests.
process.env.GEMINI_API_KEY = '';

const test = require('node:test');
const assert = require('node:assert/strict');

// Stub the slow, networked steps before the worker loads them: facts come from
// a fixture and the "render" just records the storyboard it was handed.
const ingest = require('../pipeline/ingest');
const rendered = [];
ingest.readFacts = async (type) => (type === 'repo' ? repoFacts() : siteFacts());
ingest.runVideoScript = async (script, args) => {
  if (script === 'render-video.mjs') rendered.push(JSON.parse(fs.readFileSync(args[0], 'utf8')));
  return { done: args[1] };
};

const catalog = require('../pipeline/catalog');
const { assemble, buildStoryboard, directorRequest, RESPONSE_SCHEMA } = require('../pipeline/storyboard');
const { recommendLook } = require('../pipeline/brief');

const VIDEO_SRC = path.join(__dirname, '..', '..', 'Carbon Video', 'src');
const FRONTEND_PUBLIC = path.join(__dirname, '..', '..', 'Carbon Frontend', 'public');

function repoFacts() {
  return {
    type: 'repo',
    url: 'https://github.com/acme/rocket',
    displayUrl: 'github.com/acme/rocket',
    name: 'rocket',
    description: 'A tiny task runner for shell scripts',
    language: 'Go',
    languages: [{ name: 'Go', pct: 91 }, { name: 'Shell', pct: 9 }],
    license: 'MIT',
    topics: ['cli', 'tasks'],
    numbers: [{ key: 'stars', label: 'GitHub stars', value: 24512 }, { key: 'forks', label: 'forks', value: 557 }],
    commands: ['brew install rocket'],
    snippets: [{ lang: 'sh', code: 'rocket run build' }],
    headings: ['Install', 'Run tasks', 'Watch mode', 'Config file'],
    packageKeywords: [],
    readme: '',
  };
}
function siteFacts() {
  return { type: 'site', url: 'https://acme.dev/', displayUrl: 'acme.dev', name: 'Acme', description: 'Ship faster', h1: 'Ship faster', headings: ['Deploy', 'Monitor', 'Scale'], paragraphs: [], brand: { accent: '#3355ff' }, numbers: [], commands: [], snippets: [], hero: __filename, heroDataUrl: 'data:image/jpeg;base64,AAA' };
}
const copy = {
  tagline: 'Tasks without the YAML.',
  beats: ['Plain shell.', 'Zero config.', 'Watch mode.'],
  features: ['run tasks', 'watch mode', 'config file'],
  deck: { architecture: { heading: 'How rocket runs', nodes: [{ name: 'Taskfile', desc: 'Your tasks in shell.' }, { name: 'Runner', desc: 'Runs them in order.' }, { name: 'Watcher', desc: 'Re-runs on change.' }], summary: '' } },
};

const directed = catalog.CATALOG.filter((s) => s.engine === 'directed');

test('catalog: at least two directed styles, ids unique, classic looks intact', () => {
  assert.ok(directed.length >= 2);
  const ids = catalog.CATALOG.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of catalog.CLASSIC) assert.ok(ids.includes(id), id);
  assert.deepEqual(catalog.ALL_STYLES.slice(0, catalog.CLASSIC.length), catalog.CLASSIC);
});

test('catalog: every directed scene plan fills the soundtrack exactly and cuts on beats', () => {
  for (const s of directed) {
    assert.deepEqual(Object.keys(s.scenes).map(Number).sort(), [...s.lengths].sort(), `${s.id}: lengths match plans`);
    for (const len of s.lengths) {
      for (const type of s.inputs) {
        const plan = catalog.planDirection(s.id, type, len);
        assert.equal(plan.scenes.reduce((a, x) => a + x.frames, 0), catalog.FRAMES[len], `${s.id} ${len}s ${type}`);
        let t = 0;
        for (const sc of plan.scenes) {
          assert.equal(t % 20, 0, `${s.id}: cut at ${t} is off the beat grid`);
          t += sc.frames;
        }
      }
    }
  }
});

test('catalog: every directed style and scene has a renderer, a deck palette and a preview', () => {
  const modules = fs.readFileSync(path.join(VIDEO_SRC, 'styles', 'modules.ts'), 'utf8');
  const deck = fs.readFileSync(path.join(VIDEO_SRC, '..', 'scripts', 'build-deck.mjs'), 'utf8');
  for (const s of directed) {
    assert.match(modules, new RegExp(`\\b${s.id},`), `${s.id} registered in modules.ts`);
    const src = fs.readFileSync(path.join(VIDEO_SRC, 'styles', `${s.id}.tsx`), 'utf8');
    for (const plan of Object.values(s.scenes)) {
      for (const sc of Array.isArray(plan) ? plan : Object.values(plan).flat()) assert.ok(src.includes(`"${sc.scene}":`), `${s.id}: no component for ${sc.scene}`);
    }
    assert.match(deck, new RegExp(`\\b${s.id}: \\{ BG`), `${s.id}: deck palette`);
    // Previews are rendered by apps/Carbon Video/scripts/style-gallery.mjs.
    assert.ok(fs.existsSync(path.join(FRONTEND_PUBLIC, s.preview.poster)), `${s.id}: missing preview ${s.preview.poster}`);
    if (s.preview.clip) assert.ok(fs.existsSync(path.join(FRONTEND_PUBLIC, s.preview.clip)), `${s.id}: missing clip ${s.preview.clip}`);
  }
});

test('render: WebGL styles get software GL on Linux (no GPU), GPU GL elsewhere; REMOTION_GL overrides', async () => {
  const gl = path.join(VIDEO_SRC, '..', 'scripts', 'gl.mjs');
  const { chromiumOptionsFor } = await import(require('url').pathToFileURL(gl).href);
  const webgl = catalog.CATALOG.find((s) => s.requires?.includes('webgl'));
  assert.ok(webgl, 'a style needs webgl');
  const sb = { direction: { style: webgl.id, requires: webgl.requires } };
  assert.deepEqual(chromiumOptionsFor(sb, { platform: 'linux', env: {} }), { gl: 'swangle' });
  assert.deepEqual(chromiumOptionsFor(sb, { platform: 'win32', env: {} }), { gl: 'angle' });
  assert.deepEqual(chromiumOptionsFor(sb, { platform: 'linux', env: { REMOTION_GL: 'egl' } }), { gl: 'egl' });
  assert.deepEqual(chromiumOptionsFor({ direction: { style: 'blueprint', requires: [] } }, { platform: 'linux', env: {} }), {});
  assert.deepEqual(chromiumOptionsFor({ style: 'hud' }, { platform: 'linux', env: {} }), {});
});

test('directed: two styles give different scene plans, timing and motion for the same repo', () => {
  const [a, b] = ['blueprint', 'poster'].map((style) => assemble(repoFacts(), copy, { watermark: false, style }).storyboard);
  for (const sb of [a, b]) {
    assert.ok(sb.direction, sb.style);
    assert.equal(sb.layout, undefined); // no classic layout mixing
    assert.equal(sb.format, undefined); // no classic video type
  }
  const scenes = (sb) => sb.direction.scenes.map((s) => s.scene);
  const cuts = (sb) => sb.direction.scenes.reduce((acc, s) => [...acc, (acc.at(-1) ?? 0) + s.frames], []).slice(0, -1);
  assert.equal(scenes(a).filter((s) => scenes(b).includes(s)).length, 0, 'no shared scenes');
  assert.notDeepEqual(cuts(a), cuts(b), 'different cut timing');
  assert.notEqual(a.direction.scenes.length, b.direction.scenes.length, 'different pacing');
  assert.notDeepEqual(a.direction.transition, b.direction.transition, 'different transitions');
  assert.notEqual(a.music, b.music, 'different soundtracks');
  // Same project facts feed both.
  for (const sb of [a, b]) {
    assert.equal(sb.title.title, 'rocket');
    assert.deepEqual(sb.diagram.nodes.map((n) => n.name), ['Taskfile', 'Runner', 'Watcher']);
    assert.deepEqual(sb.beats, ['Plain shell.', 'Zero config.', 'Watch mode.']);
    assert.deepEqual(sb.languages, [{ name: 'Go', pct: 91 }, { name: 'Shell', pct: 9 }]);
    assert.equal(sb.meta.license, 'MIT');
  }
});

test('directed: different projects get their own content in the same style', () => {
  const repo = assemble(repoFacts(), copy, { watermark: false, style: 'blueprint' }).storyboard;
  const site = assemble(siteFacts(), null, { watermark: false, style: 'blueprint' }).storyboard;
  assert.notEqual(repo.title.title, site.title.title);
  assert.equal(repo.slot3.kind, 'code');
  assert.equal(site.slot2.kind, 'shot');
  assert.equal(site.meta.type, 'site');
  assert.deepEqual(site.languages, []); // never invented for a website
});

test('directed: no-LLM storyboards still differ by style and use only facts', () => {
  const a = assemble(repoFacts(), null, { watermark: false, style: 'blueprint' }).storyboard;
  const b = assemble(repoFacts(), null, { watermark: false, style: 'poster' }).storyboard;
  assert.notDeepEqual(a.direction.scenes, b.direction.scenes);
  for (const w of a.beats) assert.ok(a.features.includes(w), w); // beats fall back to real features
});

test('director: told the chosen style, and not asked to pick another', () => {
  const req = directorRequest(repoFacts(), null, 'blueprint');
  assert.match(req.user, /STYLE \(already chosen/);
  assert.match(req.user, /"id":"blueprint"/);
  assert.match(req.user, /blueprint\.system/);
  assert.equal(req.schema.properties.style, undefined);
  assert.ok(!req.schema.required.includes('style'));
  assert.ok(req.schema.required.includes('beats'));
  const auto = directorRequest(repoFacts(), null, null);
  assert.doesNotMatch(auto.user, /STYLE \(already chosen/);
  assert.deepEqual(auto.schema.properties.style.enum, RESPONSE_SCHEMA.properties.style.enum);
  // The prompt's style list comes from the catalog, limited to styles that work for the input.
  for (const s of directed) assert.equal(auto.system.includes(`\`${s.id}\``), s.inputs.includes('repo'), s.id);
});

test('director: a different style in its answer never overrides the creator', async () => {
  const llm = async (req) => ({ data: { ...copy, style: 'hud', music: 'hud', styleReason: 'nope' }, model: 'fake', req });
  const out = await buildStoryboard(repoFacts(), { watermark: true, style: 'poster', llm });
  assert.equal(out.storyboard.style, 'poster');
  assert.equal(out.storyboard.direction.style, 'poster');
  assert.equal(out.look.source, 'user');
  assert.equal(out.storyboard.music, 'kinetic'); // the style's own track
});

test('auto: a recommended directed style is used and briefed; a picked video type keeps Auto classic', async () => {
  const preset = { style: 'blueprint', music: 'paper', source: 'llm', reason: 'You build infrastructure.' };
  let seen;
  const llm = async (req) => ((seen = req), { data: copy, model: 'fake' });
  const out = await buildStoryboard(repoFacts(), { watermark: true, style: 'auto', preset, llm });
  assert.equal(out.storyboard.direction.style, 'blueprint');
  assert.match(seen.user, /"id":"blueprint"/);
  const typed = await buildStoryboard(repoFacts(), { watermark: true, style: 'auto', preset, format: 'explainer', explicitFormat: true, llm });
  assert.ok(catalog.CLASSIC.includes(typed.storyboard.style), typed.storyboard.style);
  assert.equal(typed.storyboard.format, 'explainer');
});

test('stylist: may recommend directed styles, only ones that fit the input', async () => {
  const brief = { audience: 'Backend developers', feelings: ['Technical'], moods: ['technical'], focus: '', platform: 'x', platformLabel: 'X', note: '' };
  const fake = (style) => async () => ({ data: { style, music: 'paper', reason: 'r', alternative: 'hud', format: 'launch', formatReason: '' } });
  assert.equal((await recommendLook(repoFacts(), brief, { llm: fake('blueprint') })).style, 'blueprint');
  const unknown = await recommendLook(repoFacts(), brief, { llm: fake('vaporwave') });
  assert.ok(catalog.stylesFor('repo').includes(unknown.style));
});

test('checkStyle: clear errors for unsupported inputs, lengths and video types', () => {
  assert.equal(catalog.checkStyle({ style: 'auto', type: 'repo', format: 'explainer' }), null);
  assert.equal(catalog.checkStyle({ style: 'blueprint', type: 'repo', format: 'auto', length: 30 }), null);
  assert.equal(catalog.checkStyle({ style: 'blueprint', type: 'repo', format: 'explainer' }).code, 'BAD_FORMAT');
  assert.equal(catalog.checkStyle({ style: 'nope', type: 'repo' }).code, 'BAD_STYLE');
  assert.equal(catalog.checkStyle({ style: 'hud', type: 'repo', format: 'numbers' }), null);
  for (const s of catalog.CATALOG) {
    for (const type of ['repo', 'site']) {
      const r = catalog.checkStyle({ style: s.id, type });
      if (s.inputs.includes(type)) assert.equal(r, null, `${s.id} ${type}`);
      else assert.equal(r.code, 'STYLE_INPUT', `${s.id} ${type}`);
    }
  }
});

test('API: a brief can be reopened by its owner (answers mapped back) to remake in another style', async () => {
  const { db } = require('../lib/db');
  const crypto = require('crypto');
  const app = require('../server');
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  process.env.AUTH_DEV_BYPASS = 'true';
  const headers = { 'X-Carbon-Dev-Login': '1' };
  try {
    // The dev user exists once it has made a request.
    await fetch(`${base}/api/me`, { headers });
    const questions = [
      { id: 'audience', kind: 'audience', question: 'Who?', max: 1, options: [{ id: 'audience-0', label: 'Developers' }, { id: 'audience-1', label: 'Founders' }] },
      { id: 'feeling', kind: 'feeling', question: 'Feel?', max: 2, options: [{ id: 'feeling-0', label: 'Calm', mood: 'calm' }, { id: 'feeling-1', label: 'Bold', mood: 'bold' }] },
    ];
    const brief = { audience: 'Founders', feelings: ['Calm', 'Bold'], moods: ['calm', 'bold'], focus: '', platform: '', platformLabel: '', note: 'keep it short' };
    const look = { style: 'blueprint', music: 'glass', reason: 'r', alternative: 'hud', source: 'llm', format: 'launch', formatReason: '' };
    const id = crypto.randomUUID();
    db.prepare('INSERT INTO video_briefs (id, user_id, input_url, input_type, facts, questions, used_llm, brief, look) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)').run(id, 'dev-user', 'https://github.com/acme/rocket', 'repo', JSON.stringify(repoFacts()), JSON.stringify(questions), JSON.stringify(brief), JSON.stringify(look));
    const mine = await fetch(`${base}/api/briefs/${id}`, { headers });
    assert.equal(mine.status, 200);
    const b = await mine.json();
    assert.deepEqual(b.answers, { audience: 'audience-1', feeling: ['feeling-0', 'feeling-1'] });
    assert.equal(b.look.style, 'blueprint');
    assert.equal(b.product.name, 'rocket');
    assert.equal(b.facts, undefined); // facts and screenshots stay server-side
    db.prepare('UPDATE video_briefs SET user_id = ? WHERE id = ?').run('someone-else', id);
    assert.equal((await fetch(`${base}/api/briefs/${id}`, { headers })).status, 404);
  } finally {
    process.env.AUTH_DEV_BYPASS = 'false';
    server.close();
  }
});

test('API: the gallery catalog, and a chosen style survives API → job → worker → renderer', async () => {
  const app = require('../server');
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  process.env.AUTH_DEV_BYPASS = 'true';
  const headers = { 'Content-Type': 'application/json', 'X-Carbon-Dev-Login': '1' };
  const post = (body) => fetch(`${base}/api/videos`, { method: 'POST', headers, body: JSON.stringify(body) });
  try {
    const list = await (await fetch(`${base}/api/styles`)).json();
    const ids = list.styles.map((s) => s.id);
    for (const s of directed) assert.ok(ids.includes(s.id), s.id);
    const bp = list.styles.find((s) => s.id === 'blueprint');
    assert.equal(bp.engine, 'directed');
    assert.ok(bp.preview.poster && bp.name && bp.category);
    assert.equal(bp.director, undefined); // prompts stay server-side
    assert.equal(bp.preview.sample, undefined);
    assert.ok(bp.music);

    const typed = await post({ url: 'https://github.com/acme/rocket', style: 'blueprint', format: 'explainer' });
    assert.equal(typed.status, 400);
    assert.equal((await typed.json()).code, 'BAD_FORMAT');

    const ok = await post({ url: 'https://github.com/acme/rocket', style: 'poster', format: 'auto', length: 30 });
    assert.equal(ok.status, 201, await ok.clone().text());
    const { id } = await ok.json();
    let job;
    for (let i = 0; i < 100; i++) {
      job = await (await fetch(`${base}/api/videos/${id}`)).json();
      if (job.status === 'done' || job.status === 'error') break;
      await new Promise((r) => setTimeout(r, 50));
    }
    assert.equal(job.status, 'done', job.error || '');
    assert.equal(job.style, 'poster');
    assert.equal(job.styleSource, 'user');
    assert.equal(job.format, null);
    const sb = rendered.at(-1);
    assert.equal(sb.style, 'poster');
    assert.equal(sb.direction.style, 'poster');
    assert.equal(sb.title.title, 'rocket');
  } finally {
    process.env.AUTH_DEV_BYPASS = 'false';
    server.close();
  }
});
