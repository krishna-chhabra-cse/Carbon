// Time limits and model order for lib/gemini.js. No network: `post` is faked.
const test = require('node:test');
const assert = require('node:assert/strict');

process.env.GEMINI_API_KEY = 'test-key';
delete process.env.GEMINI_MODEL;
delete process.env.GEMINI_FAST_MODEL;
const { generateJson, noThinkingConfig } = require('../lib/gemini');

const ok = (data) => ({ data: { candidates: [{ content: { parts: [{ text: JSON.stringify(data) }] } }] } });
const httpError = (status) => Object.assign(new Error(`Request failed with status code ${status}`), { response: { status } });
const modelOf = (url) => url.match(/models\/([^:]+):/)[1];
const base = { system: 's', user: 'u', schema: { type: 'OBJECT' }, tag: 'test' };
// A clock the fake `post` moves forward, so no test really waits.
const clock = () => {
  let t = 0;
  return { now: () => t, spend: (ms) => { t += ms; } };
};

test('fast calls try the lite model first with thinking off; normal calls do neither', async () => {
  const calls = [];
  const post = async (url, body) => (calls.push({ model: modelOf(url), cfg: body.generationConfig }), ok({ a: 1 }));
  const fast = await generateJson({ ...base, fast: true, post });
  assert.deepEqual(fast, { data: { a: 1 }, model: 'gemini-flash-lite-latest' });
  assert.deepEqual(calls[0].cfg.thinkingConfig, { thinkingBudget: 0 });
  const normal = await generateJson({ ...base, post });
  assert.equal(normal.model, 'gemini-flash-latest');
  assert.equal(calls[1].cfg.thinkingConfig, undefined);
});

test('a model that rejects the thinking setting is asked again without it, and remembered', async () => {
  noThinkingConfig.clear();
  const calls = [];
  const post = async (url, body) => {
    calls.push(Boolean(body.generationConfig.thinkingConfig));
    if (body.generationConfig.thinkingConfig) throw httpError(400);
    return ok({ a: 2 });
  };
  const res = await generateJson({ ...base, fast: true, retries: [0], post });
  assert.equal(res.data.a, 2);
  assert.deepEqual(calls, [true, false]);
  await generateJson({ ...base, fast: true, retries: [0], post });
  assert.deepEqual(calls, [true, false, false]);
  noThinkingConfig.clear();
});

test('a timed-out model hands over to the next one, capped by the per-attempt timeout', async () => {
  const c = clock();
  const seen = [];
  const post = async (url, body, opts) => {
    seen.push([modelOf(url), opts.timeout]);
    if (seen.length === 1) {
      c.spend(opts.timeout);
      throw new Error(`timeout of ${opts.timeout}ms exceeded`);
    }
    return ok({ a: 3 });
  };
  const res = await generateJson({ ...base, timeout: 8000, deadline: 15000, retries: [0], post, now: c.now });
  assert.equal(res.model, 'gemini-flash-lite-latest');
  assert.deepEqual(seen, [['gemini-flash-latest', 8000], ['gemini-flash-lite-latest', 7000]]);
});

test('the whole call stops at the deadline and returns null for the fallback path', async () => {
  const c = clock();
  let attempts = 0;
  const post = async (url, body, opts) => {
    attempts++;
    c.spend(opts.timeout);
    throw new Error('timeout');
  };
  const res = await generateJson({ ...base, timeout: 8000, deadline: 15000, retries: [0], post, now: c.now });
  assert.equal(res, null);
  assert.equal(attempts, 2);
  assert.ok(c.now() <= 15000);
});

test('overloads are retried on the same model; a retry that would pass the deadline is skipped', async () => {
  const c = clock();
  const models = [];
  const post = async (url) => {
    models.push(modelOf(url));
    c.spend(100);
    if (models.length === 1) throw httpError(503);
    return ok({ a: 4 });
  };
  const res = await generateJson({ ...base, retries: [0, 1], post, now: c.now });
  assert.deepEqual(models, ['gemini-flash-latest', 'gemini-flash-latest']);
  assert.equal(res.data.a, 4);

  const c2 = clock();
  let n = 0;
  const busy = async () => {
    n++;
    c2.spend(2000);
    throw httpError(503);
  };
  assert.equal(await generateJson({ ...base, deadline: 5000, retries: [0, 4000], post: busy, now: c2.now }), null);
  assert.equal(n, 1);
});

test('the brief and storyboard calls carry their time limits', async () => {
  const brief = require('../pipeline/brief');
  const { directorRequest } = require('../pipeline/storyboard');
  const facts = { type: 'repo', url: 'https://github.com/acme/rocket', name: 'rocket', numbers: [], commands: [], snippets: [], headings: [] };
  const reqs = [];
  const llm = async (req) => (reqs.push(req), null);
  await brief.buildQuestions(facts, { llm });
  await brief.recommendLook(facts, { audience: 'Devs', feelings: [], moods: [], focus: '', platform: '', note: '' }, { llm });
  assert.equal(reqs.length, 2);
  for (const r of reqs) {
    assert.equal(r.fast, true);
    assert.ok(r.timeout <= 10000 && r.deadline <= 15000);
  }
  const d = directorRequest(facts, null, null);
  assert.ok(d.deadline <= 90000 && d.timeout <= 40000);
});
