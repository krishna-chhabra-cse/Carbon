// Layout variety tests: every video gets its own mix of scene compositions.
process.env.NODE_ENV = 'test';
delete process.env.GEMINI_API_KEY;

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { pickLayout, LAYOUTS, STYLES } = require('../pipeline/looks');
const { assemble } = require('../pipeline/storyboard');

const key = (l) => JSON.stringify(l);

test('layout: ids match the video templates', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', '..', 'Carbon Video', 'src', 'LaunchVideo.tsx'), 'utf8');
  for (const [slot, ids] of Object.entries(LAYOUTS)) {
    const m = src.match(new RegExp(`${slot}: \\[([^\\]]+)\\]`));
    assert.ok(m, slot);
    assert.deepEqual(m[1].split(',').map((s) => s.trim().replace(/"/g, '')), ids, slot);
  }
});

test('layout: valid, reproducible per seed, and varied across videos', () => {
  for (const style of STYLES) {
    const seen = new Set();
    for (let i = 0; i < 40; i++) {
      const l = pickLayout(style, `job-${i}`);
      for (const slot of ['title', 'stat', 'code', 'features', 'outro']) assert.ok(LAYOUTS[slot].includes(l[slot]), `${style} ${slot}`);
      assert.equal(l.shots.length, 2);
      assert.notEqual(l.shots[0], l.shots[1]); // a website never shows the same shot layout twice
      assert.deepEqual(pickLayout(style, `job-${i}`), l);
      seen.add(key(l));
    }
    assert.ok(seen.size >= 15, `${style}: only ${seen.size} distinct layouts in 40 videos`);
  }
});

test('layout: each style keeps its own on-screen UI', () => {
  const chromes = Object.fromEntries(STYLES.map((s) => [s, pickLayout(s, 'x').chrome]));
  assert.equal(chromes.hud, 'hud');
  assert.equal(chromes.terminal, 'tmux');
  assert.equal(chromes.paper, 'editorial');
  assert.ok(new Set(Object.values(chromes)).size >= 4);
});

test('layout: answers nudge the mix (loud → kinetic scenes, soft → cards)', () => {
  const count = (brief, slot, id) => Array.from({ length: 300 }, (_, i) => pickLayout('hud', `n-${i}`, brief)[slot]).filter((v) => v === id).length;
  assert.ok(count({ platform: 'x', moods: ['energetic'] }, 'title', 'stack') > count(null, 'title', 'stack') + 30);
  assert.ok(count({ platform: 'linkedin', moods: ['calm'] }, 'title', 'card') > count(null, 'title', 'card') + 30);
});

test('layout: storyboards carry it; remakes of the same product differ', () => {
  const facts = { type: 'site', url: 'https://acme.dev/', displayUrl: 'acme.dev', name: 'Acme', description: 'Ship faster', h1: 'Ship faster', headings: ['Deploy', 'Monitor', 'Scale'], paragraphs: [], brand: {}, numbers: [], commands: [], snippets: [], heroDataUrl: 'data:image/jpeg;base64,AAA' };
  const layouts = new Set(['a', 'b', 'c', 'd', 'e', 'f'].map((seed) => key(assemble(facts, null, { watermark: true, style: 'glass', seed }).storyboard.layout)));
  assert.ok(layouts.size >= 4, `only ${layouts.size} of 6 remakes differ`);
});
