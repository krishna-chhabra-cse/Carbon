// Video type (format) and length tests. node --test.
process.env.NODE_ENV = 'test';
process.env.AUTH_DEV_BYPASS = 'false';
delete process.env.GEMINI_API_KEY;

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { FORMATS, formatsFor, validFormat, formatFromBrief } = require('../pipeline/looks');
const { assemble } = require('../pipeline/storyboard');
const { recommendLook } = require('../pipeline/brief');

const repo = () => ({
  type: 'repo', url: 'https://github.com/acme/rocket', displayUrl: 'github.com/acme/rocket', name: 'rocket', description: 'A tiny web framework', language: 'TypeScript', languages: [], topics: ['web'],
  numbers: [{ key: 'stars', label: 'GitHub stars', value: 76543 }, { key: 'forks', label: 'forks', value: 1200 }, { key: 'watchers', label: 'watchers', value: 0 }],
  commands: ['npm i rocket'], snippets: [{ lang: 'js', code: 'rocket()' }], headings: ['Install', 'Usage', 'Plugins'], packageKeywords: [], readme: '',
});
const site = () => ({ type: 'site', url: 'https://acme.dev/', displayUrl: 'acme.dev', name: 'Acme', description: 'Ship faster', h1: 'Ship faster', headings: ['Deploy', 'Monitor', 'Scale'], paragraphs: [], brand: {}, numbers: [], commands: [], snippets: [], heroDataUrl: 'data:image/jpeg;base64,AAA' });

test('format: ids match the video templates', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', '..', 'Carbon Video', 'src', 'LaunchVideo.tsx'), 'utf8');
  const m = src.match(/FORMATS = \[([^\]]+)\]/);
  assert.deepEqual(m[1].split(',').map((s) => s.trim().replace(/"/g, '')), FORMATS);
});

test('format: numbers is repo-only, showcase is site-only', () => {
  assert.ok(formatsFor('repo').includes('numbers') && !formatsFor('repo').includes('showcase'));
  assert.ok(formatsFor('site').includes('showcase') && !formatsFor('site').includes('numbers'));
  assert.equal(validFormat('numbers', 'site'), 'launch');
  assert.equal(validFormat('showcase', 'repo'), 'launch');
  assert.equal(validFormat('nope', 'repo'), 'launch');
  assert.equal(validFormat('explainer', 'site'), 'explainer');
});

test('format: answers pick a type when there is no LLM', () => {
  assert.equal(formatFromBrief('repo', null), 'launch');
  assert.equal(formatFromBrief('repo', { platform: 'x', moods: ['energetic'] }), 'kinetic');
  assert.equal(formatFromBrief('site', { audience: 'Businesses taking calls', platform: 'linkedin', moods: ['premium'] }), 'explainer');
  assert.equal(formatFromBrief('site', { audience: 'Backend developers', moods: ['premium'] }), 'showcase');
  assert.equal(formatFromBrief('repo', { audience: 'Backend developers', moods: ['technical'] }), 'launch');
});

test('format: storyboard carries type, length, clamped explainer copy and real numbers', () => {
  const evil = { problem: 'p'.repeat(300), problemDetail: 'd'.repeat(300), answer: 'a', steps: [{ title: 'x'.repeat(80), detail: 'y'.repeat(200) }, null, { title: '' }, { title: 'two' }, { title: 'three' }, { title: 'four' }] };
  // Video types belong to the classic film (directed styles tell their own story).
  const { storyboard } = assemble(repo(), evil, { watermark: true, style: 'hud', format: 'numbers', length: 15 });
  assert.equal(storyboard.format, 'numbers');
  assert.equal(storyboard.length, 15);
  assert.ok(storyboard.explainer.problem.length <= 60 && storyboard.explainer.detail.length <= 90);
  assert.ok(storyboard.explainer.steps.length <= 3 && storyboard.explainer.steps.every((s) => s.title && s.title.length <= 24 && s.detail.length <= 60));
  // Only real, non-zero numbers, floored (76543 → 76K+).
  assert.deepEqual(storyboard.numbers, [{ value: 76, suffix: 'K+', label: 'GitHub stars' }, { value: 1200, suffix: '', label: 'forks' }]);
  const s = assemble(site(), null, { watermark: true, style: 'glass', format: 'numbers', length: 45 }).storyboard;
  assert.equal(s.format, 'launch'); // no numbers for a website
  assert.equal(s.length, 30);
  assert.deepEqual(s.numbers, []);
  assert.ok(s.explainer.steps.length > 0); // fallback steps from the page headings
});

test('format: the stylist recommends a type that fits the input', async () => {
  const b = { audience: 'Founders', feelings: ['Calm'], moods: ['calm'], focus: 'x', platform: 'linkedin', platformLabel: 'LinkedIn', note: '' };
  const llm = (format) => async () => ({ data: { style: 'glass', music: 'glass', reason: 'r', alternative: 'paper', format, formatReason: 'Explain it first.' } });
  const ok = await recommendLook(site(), b, { llm: llm('explainer') });
  assert.deepEqual([ok.format, ok.formatReason], ['explainer', 'Explain it first.']);
  const bad = await recommendLook(site(), b, { llm: llm('numbers') });
  assert.equal(bad.format, formatFromBrief('site', b));
  assert.equal(bad.formatReason, '');
});

test('API: unknown video types and lengths are rejected', async () => {
  const app = require('../server');
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  process.env.AUTH_DEV_BYPASS = 'true';
  const post = (body) => fetch(`${base}/api/videos`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Carbon-Dev-Login': '1' }, body: JSON.stringify(body) });
  try {
    const r1 = await post({ url: 'https://github.com/a/b', format: 'music-video' });
    assert.equal(r1.status, 400);
    assert.equal((await r1.json()).code, 'BAD_FORMAT');
    const r2 = await post({ url: 'https://github.com/a/b', length: 60 });
    assert.equal(r2.status, 400);
    assert.equal((await r2.json()).code, 'BAD_LENGTH');
  } finally {
    process.env.AUTH_DEV_BYPASS = 'false';
    server.close();
  }
});
