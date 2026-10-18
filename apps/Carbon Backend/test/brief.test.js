// Guided brief tests: questions → answers → recommended look. node --test.
process.env.NODE_ENV = 'test';
process.env.AUTH_DEV_BYPASS = 'false';
delete process.env.GEMINI_API_KEY;

const test = require('node:test');
const assert = require('node:assert/strict');

const { db } = require('../lib/db');
const brief = require('../pipeline/brief');
const looks = require('../pipeline/looks');
const { resolveLook } = require('../pipeline/storyboard');

const repoFacts = () => ({
  type: 'repo',
  url: 'https://github.com/acme/rocket',
  displayUrl: 'github.com/acme/rocket',
  name: 'rocket',
  description: 'A tiny web framework that launches fast',
  language: 'TypeScript',
  languages: [{ name: 'TypeScript', pct: 90 }],
  topics: ['web', 'framework', 'fast'],
  numbers: [
    { key: 'stars', label: 'GitHub stars', value: 76543 },
    { key: 'forks', label: 'forks', value: 1200 },
  ],
  commands: ['npm i rocket'],
  snippets: [{ lang: 'js', code: "import rocket from 'rocket'\nrocket().listen(3000)" }],
  headings: ['Install', 'Usage', 'Plugins'],
  packageKeywords: [],
  readme: '',
});
const fakeLlm = (data) => async () => ({ data, model: 'fake' });
const noLlm = async () => null;

test('brief: with no LLM, four sensible default questions', async () => {
  const { questions, usedLlm } = await brief.buildQuestions(repoFacts(), { llm: noLlm });
  assert.equal(usedLlm, false);
  assert.deepEqual(questions.map((q) => q.kind), ['audience', 'feeling', 'focus', 'platform']);
  for (const q of questions) {
    assert.ok(q.options.length >= 2 && q.options.length <= 4, q.kind);
    assert.ok(q.question.endsWith('?'));
    assert.ok(q.options.every((o, i) => o.id === `${q.kind}-${i}` && o.label.length <= 38));
  }
  assert.equal(questions.find((q) => q.kind === 'feeling').max, 2);
  assert.ok(questions.find((q) => q.kind === 'focus').options[0].label.includes('76K+')); // the real number, floored
  assert.ok(questions.find((q) => q.kind === 'feeling').options.every((o) => looks.MOODS.includes(o.mood)));
  const site = await brief.buildQuestions({ type: 'site', url: 'https://acme.dev', name: 'Acme', headings: ['Deploy in seconds'], numbers: [], commands: [], snippets: [] }, { llm: noLlm });
  assert.ok(site.questions.find((q) => q.kind === 'focus').options.some((o) => o.label === 'The homepage design'));
});

test('brief: LLM questions are clamped, deduped and repaired', async () => {
  const evil = {
    audience: { question: 'Who is it for', options: [{ label: 'x'.repeat(200), hint: 'y'.repeat(300) }, { label: 'Node devs', hint: 'ok' }, { label: 'node devs', hint: 'dupe' }] },
    feeling: { question: 'Feel?', options: [{ label: 'Calm', hint: '', mood: 'calm' }, { label: 'Also calm', hint: '', mood: 'calm' }, { label: 'Spooky', hint: '', mood: 'spooky' }] },
    focus: { question: 'Show?', options: [] },
    platform: 'not an object',
  };
  const { questions, usedLlm } = await brief.buildQuestions(repoFacts(), { llm: fakeLlm(evil) });
  assert.equal(usedLlm, true);
  const [aud, feel, focus, plat] = questions;
  assert.equal(aud.question, 'Who is it for?');
  assert.equal(aud.options.length, 2); // the case-insensitive duplicate is gone
  assert.ok(aud.options[0].label.length <= 38 && aud.options[0].hint.length <= 70);
  // Only one distinct valid mood → too few options → the default question instead.
  assert.ok(feel.options.length >= 3);
  assert.equal(new Set(feel.options.map((o) => o.mood)).size, feel.options.length);
  assert.ok(focus.options.length >= 2);
  assert.ok(plat.options.every((o) => looks.PLATFORMS.includes(o.platform)));
});

test('brief: hype words are stripped from LLM questions', async () => {
  const q = brief.cleanQuestion('audience', { question: 'Who will watch?', options: [{ label: 'Seamless teams', hint: 'Showcases the seamless sync, next-level speed' }, { label: 'Founders', hint: 'ok' }] });
  assert.equal(q.options[0].label, 'Teams');
  assert.equal(q.options[0].hint, 'Showcases the sync, speed');
});

test('brief: answers map to stored options only; extra picks and junk are dropped', async () => {
  const { questions } = await brief.buildQuestions(repoFacts(), { llm: noLlm });
  const b = brief.answersToBrief(
    questions,
    { audience: 'audience-0', feeling: ['feeling-0', 'feeling-1', 'feeling-2'], focus: 'focus-99', platform: { evil: true }, extra: 'audience-1' },
    `make it pop ${'!'.repeat(400)}`,
  );
  assert.equal(b.audience, questions[0].options[0].label);
  assert.deepEqual(b.moods, [questions[1].options[0].mood, questions[1].options[1].mood]); // max 2 feelings
  assert.equal(b.focus, '');
  assert.equal(b.platform, '');
  assert.ok(b.note.length <= 140);
  assert.ok(brief.isEmptyBrief(brief.answersToBrief(questions, null, '')));
});

test('brief: the stylist picks from the enums; bad picks fall back to the answers', async () => {
  const facts = repoFacts();
  const b = { audience: 'Backend developers', feelings: ['Technical & precise'], moods: ['technical'], focus: 'The quickstart code', platform: 'x', platformLabel: 'X / Twitter', note: '' };
  const good = await brief.recommendLook(facts, b, { llm: fakeLlm({ style: 'glass', music: 'terminal', reason: 'You want precise and modern.', alternative: 'glass' }) });
  assert.deepEqual([good.style, good.music, good.source, good.alternative], ['glass', 'terminal', 'llm', null]);
  const bad = await brief.recommendLook(facts, b, { llm: fakeLlm({ style: 'vaporwave', music: 'x', reason: 'r' }) });
  assert.equal(bad.source, 'brief');
  assert.ok(['terminal', 'hud'].includes(bad.style), bad.style);
  let called = false;
  const empty = await brief.recommendLook(facts, brief.answersToBrief([], {}), { llm: async () => { called = true; return null; } });
  assert.equal(called, false); // nothing answered: no LLM call, plain fallback
  assert.equal(empty.source, 'auto');
  assert.equal(empty.style, looks.pickStyle('auto', facts));
});

test('looks: answers steer the no-LLM pick', () => {
  const site = { type: 'site', url: 'https://calm.app' };
  assert.ok(['paper', 'glass'].includes(looks.lookFromBrief(site, { moods: ['calm', 'premium'], platform: 'linkedin' }).style));
  assert.ok(['kinetic', 'bold', 'poster'].includes(looks.lookFromBrief(site, { moods: ['energetic', 'bold'], platform: 'x' }).style));
  assert.equal(looks.lookFromBrief(site, { moods: [], platform: 'website' }), null);
});

test('look: user style beats the brief look, which beats the director', () => {
  const preset = { style: 'aurora', music: 'glass', source: 'llm', reason: 'You asked for playful.' };
  const copy = { style: 'terminal', music: 'terminal', styleReason: 'no' };
  assert.equal(resolveLook(repoFacts(), copy, { style: 'bold', preset }).style, 'bold');
  assert.deepEqual(resolveLook(repoFacts(), copy, { style: 'auto', preset }), { style: 'aurora', music: 'glass', source: 'llm', reason: 'You asked for playful.' });
  assert.equal(resolveLook(repoFacts(), copy, { style: 'auto', preset: { style: 'nope' } }).style, 'terminal');
  const fromBrief = resolveLook(repoFacts(), null, { style: 'auto', brief: { moods: ['warm'] } });
  assert.equal(fromBrief.source, 'brief');
  assert.ok(['paper', 'aurora'].includes(fromBrief.style));
});

test('API: briefs need sign-in and belong to their creator', async () => {
  const app = require('../server');
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (p, body, headers = {}) => fetch(`${base}${p}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
  db.prepare("INSERT INTO video_briefs (id, user_id, input_url, input_type, facts, questions) VALUES ('brief-other', 'someone-else', 'https://github.com/a/b', 'repo', '{}', '[]')").run();
  try {
    assert.equal((await post('/api/briefs', { url: 'https://github.com/a/b' })).status, 401);
    assert.equal((await post('/api/briefs/brief-other/look', { answers: {} })).status, 401);
    process.env.AUTH_DEV_BYPASS = 'true';
    const dev = { 'X-Carbon-Dev-Login': '1' };
    assert.equal((await post('/api/briefs/brief-other/look', { answers: {} }, dev)).status, 404);
    const r = await post('/api/videos', { briefId: 'brief-other' }, dev);
    assert.equal(r.status, 404);
    assert.equal((await r.json()).code, 'NO_BRIEF');
  } finally {
    process.env.AUTH_DEV_BYPASS = 'false';
    server.close();
  }
});

test('brief: option labels are capitalized, but commands and package names are not', () => {
  const { tidy } = require('../pipeline/brief');
  assert.equal(tidy('npm init fastify', 40), 'npm init fastify');
  assert.equal(tidy('next.js on vercel', 40), 'next.js on vercel');
  assert.equal(tidy('backend devs', 40), 'Backend devs');
  assert.equal(tidy('a revolutionary tool', 40), 'A tool');
});
