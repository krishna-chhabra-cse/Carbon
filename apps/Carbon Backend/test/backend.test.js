// Backend tests: node --test (run with `npm test`). Uses an in-memory DB.
process.env.NODE_ENV = 'test';
process.env.AUTH_DEV_BYPASS = 'false';
delete process.env.GEMINI_API_KEY;

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');

const { db } = require('../lib/db');
const { parseInput, isPrivateIp } = require('../lib/inputUrl');
const { pickTier, usage, FREE_PER_DAY } = require('../lib/plans');
const { assemble, formatStat, toAccent, fitCode } = require('../pipeline/storyboard');
const { extractSnippets, extractCommands } = require('../pipeline/ingest');
const billing = require('../routes/billing');

const publicDns = async () => [{ address: '93.184.216.34', family: 4 }];
const privateDns = async () => [{ address: '10.0.0.5', family: 4 }];

test('parseInput accepts GitHub repos in many shapes', async () => {
  for (const raw of ['https://github.com/fastify/fastify', 'github.com/fastify/fastify', 'https://github.com/fastify/fastify.git', 'https://www.github.com/fastify/fastify/tree/main/lib']) {
    const r = await parseInput(raw, { resolve: publicDns });
    assert.equal(r.type, 'repo');
    assert.equal(r.url, 'https://github.com/fastify/fastify');
  }
});

test('parseInput accepts public websites and normalizes them', async () => {
  const r = await parseInput('carbons.codes', { resolve: publicDns });
  assert.deepEqual([r.type, r.url], ['site', 'https://carbons.codes/']);
});

test('parseInput blocks private / local / odd targets', async () => {
  const bad = ['http://localhost:3000', 'http://127.0.0.1', 'http://169.254.169.254/latest', 'file:///etc/passwd', 'http://user:pw@example.com', 'http://example.com:8080', 'https://github.com/onlyowner', '', 'x'.repeat(400)];
  for (const raw of bad) await assert.rejects(parseInput(raw, { resolve: publicDns }), undefined, raw);
  await assert.rejects(parseInput('https://internal-looking.com', { resolve: privateDns }));
});

test('isPrivateIp covers v4, v6 and mapped addresses', () => {
  for (const ip of ['10.1.2.3', '172.20.0.1', '192.168.1.1', '127.0.0.1', '169.254.169.254', '100.64.0.1', '::1', 'fd00::1', '::ffff:10.0.0.1']) assert.ok(isPrivateIp(ip), ip);
  for (const ip of ['8.8.8.8', '93.184.216.34', '2606:4700::1111']) assert.ok(!isPrivateIp(ip), ip);
});

function makeUser(id, credits = 0) {
  db.prepare('INSERT OR REPLACE INTO users (id, email, name, credits) VALUES (?, ?, ?, ?)').run(id, `${id}@x.dev`, id, credits);
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}
function addJob(userId, { tier = 'free', status = 'done', ip = '1.1.1.1', ago = '-1 hour' } = {}) {
  db.prepare(`INSERT INTO video_jobs (id, user_id, ip, input_url, input_type, tier, status, created_at)
    VALUES (?, ?, ?, 'https://github.com/a/b', 'repo', ?, ?, datetime('now', ?))`).run(crypto.randomUUID(), userId, ip, tier, status, ago);
}

test(`free quota: ${FREE_PER_DAY} videos per rolling day, failed jobs don't count`, () => {
  let u = makeUser('quota-user');
  assert.equal(pickTier(u, '2.2.2.2').tier, 'free');
  addJob(u.id, { ip: '2.2.2.2' });
  addJob(u.id, { ip: '2.2.2.2', status: 'error' });
  assert.equal(usage(u).freeLeft, FREE_PER_DAY - 1);
  addJob(u.id, { ip: '2.2.2.2' });
  const r = pickTier(u, '2.2.2.2');
  assert.equal(r.code, 'FREE_LIMIT');
  assert.ok(usage(u).freeResetsAt > Date.now());
  addJob('someone-else', { ago: '-2 days' });
  // Credits bypass the free limit.
  u = makeUser('quota-user', 3);
  assert.equal(pickTier(u, '2.2.2.2').tier, 'paid');
});

test('free quota: older jobs age out of the window', () => {
  const u = makeUser('old-user');
  addJob(u.id, { ago: '-25 hours', ip: '3.3.3.3' });
  addJob(u.id, { ago: '-30 hours', ip: '3.3.3.3' });
  assert.equal(usage(u).freeLeft, FREE_PER_DAY);
});

test('free quota: per-IP cap stops account farming', () => {
  for (let i = 0; i < 4; i++) addJob(`farm-${i}`, { ip: '9.9.9.9' });
  assert.equal(pickTier(makeUser('farm-new'), '9.9.9.9').code, 'FREE_IP_LIMIT');
});

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

test('storyboard uses real numbers and code even if the LLM lies', () => {
  const evil = { statKey: 'made-up', snippetIndex: 99, commandIndex: 42, tagline: 'x'.repeat(500), features: ['a'.repeat(100), 'b'] };
  const { storyboard, deck } = assemble(repoFacts(), evil, { watermark: true });
  assert.equal(storyboard.slot2.kind, 'stat');
  assert.equal(storyboard.slot2.value, 76); // 76543 → 76K+ (floored, never rounded up)
  assert.equal(storyboard.slot2.suffix, 'K+');
  assert.equal(storyboard.slot3.code, "import rocket from 'rocket'\nrocket().listen(3000)");
  assert.equal(storyboard.outro.command, 'npm i rocket');
  assert.ok(storyboard.title.caption.length <= 60);
  assert.ok(storyboard.tree.plugins.split(', ').every((f) => f.length <= 22));
  assert.equal(storyboard.accent, '#3178c6');
  assert.equal(storyboard.watermark, true);
  assert.deepEqual(deck.numbers.map((n) => n.value), ['76K+', '1200']);
});

test('storyboard works with no LLM at all (fallback copy)', () => {
  const { storyboard, deck } = assemble(repoFacts(), null, { watermark: false });
  assert.equal(storyboard.title.title, 'rocket');
  assert.equal(storyboard.watermark, false);
  assert.ok(storyboard.tree.plugins.length > 0);
  assert.ok(deck.api.items.length > 0);
});

test('site storyboard uses screenshots and brand accent', () => {
  const facts = { type: 'site', url: 'https://acme.dev/', displayUrl: 'acme.dev', name: 'Acme', description: 'Ship faster', h1: 'Ship faster', headings: ['Deploy', 'Monitor', 'Scale'], paragraphs: [], brand: { accent: 'rgb(124, 58, 237)' }, numbers: [], commands: [], snippets: [], heroDataUrl: 'data:image/jpeg;base64,AAA' };
  const { storyboard, deck } = assemble(facts, null, { watermark: true });
  assert.equal(storyboard.slot2.kind, 'shot');
  assert.equal(storyboard.slot3.image, 'data:image/jpeg;base64,AAA');
  assert.equal(storyboard.accent, '#7c3aed');
  assert.equal(storyboard.outro.commandLabel, 'VISIT');
  assert.deepEqual(deck.numbers, []);
});

test('helpers: formatStat floors, toAccent rejects greys, fitCode clamps', () => {
  assert.deepEqual(formatStat(999), { value: 999, suffix: '' });
  assert.deepEqual(formatStat(19999), { value: 19, suffix: 'K+' });
  assert.deepEqual(formatStat(2500000), { value: 2, suffix: 'M+' });
  assert.equal(toAccent('rgb(30, 30, 30)'), null);
  assert.equal(toAccent('#ffffff'), null);
  assert.equal(toAccent('#ff5b1f'), '#ff5b1f');
  const code = fitCode(`${'x'.repeat(80)}\n${'y\n'.repeat(20)}`);
  assert.ok(code.split('\n').length <= 10 && code.split('\n').every((l) => l.length <= 44));
});

test('README parsing finds snippets and install commands', () => {
  const readme = '# X\n\n```bash\nnpm i rocket\n```\n\n```js\nimport r from "rocket"\nr()\n```\n\n```json\n{"a":1}\n```\n\n    pip install rocket\n';
  assert.equal(extractSnippets(readme).length, 2);
  assert.deepEqual(extractCommands(readme), ['npm i rocket', 'pip install rocket']);
});

test('billing: credits are granted once per order', () => {
  const u = makeUser('payer', 0);
  db.prepare('INSERT INTO payments (order_id, user_id, pack, amount, credits) VALUES (?, ?, ?, ?, ?)').run('order_1', u.id, 'creator', 9900, 5);
  assert.equal(billing.grant('order_1', 'pay_1').ok, true);
  assert.equal(billing.grant('order_1', 'pay_1').already, true);
  assert.equal(billing.grant('missing', 'pay_x').ok, false);
  assert.equal(db.prepare('SELECT credits FROM users WHERE id = ?').get(u.id).credits, 5);
});

test('billing: webhook rejects bad signatures and accepts good ones', async () => {
  process.env.RAZORPAY_WEBHOOK_SECRET = 'whsec_test';
  const u = makeUser('hook-payer', 0);
  db.prepare('INSERT INTO payments (order_id, user_id, pack, amount, credits) VALUES (?, ?, ?, ?, ?)').run('order_2', u.id, 'creator', 9900, 5);
  const body = Buffer.from(JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_2', order_id: 'order_2' } } } }));
  const res = () => {
    const r = { code: 200, json(b) { r.body = b; return r; }, status(c) { r.code = c; return r; } };
    return r;
  };
  const bad = res();
  await billing.webhook({ body, get: () => 'nope' }, bad);
  assert.equal(bad.code, 400);
  const good = res();
  await billing.webhook({ body, get: () => billing.hmac('whsec_test', body) }, good);
  assert.equal(good.code, 200);
  assert.equal(db.prepare('SELECT credits FROM users WHERE id = ?').get(u.id).credits, 5);
});

test('API: video creation requires sign-in; status is public', async () => {
  const app = require('../server');
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const create = await fetch(`${base}/api/videos`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: 'https://github.com/a/b' }) });
    assert.equal(create.status, 401);
    // Dev bypass still needs the explicit dev sign-in header.
    process.env.AUTH_DEV_BYPASS = 'true';
    assert.equal((await fetch(`${base}/api/me`)).status, 401);
    assert.equal((await fetch(`${base}/api/me`, { headers: { 'X-Carbon-Dev-Login': '1' } })).status, 200);
    process.env.AUTH_DEV_BYPASS = 'false';
    assert.equal((await fetch(`${base}/api/me`, { headers: { 'X-Carbon-Dev-Login': '1' } })).status, 401);
    const missing = await fetch(`${base}/api/videos/does-not-exist`);
    assert.equal(missing.status, 404);
    const cfg = await (await fetch(`${base}/api/billing/config`)).json();
    assert.equal(cfg.packs[0].amount, 9900);
  } finally {
    server.close();
  }
});

test('styles: explicit choice wins; auto is stable and light sites get a light style', () => {
  const { pickStyle } = require('../pipeline/storyboard');
  const { stylesFor } = require('../pipeline/catalog');
  assert.equal(pickStyle('bold', repoFacts()), 'bold');
  // Auto spreads over every style that works for the input (classic and directed).
  const a = pickStyle('auto', repoFacts());
  assert.ok(stylesFor('repo').includes(a));
  assert.equal(pickStyle('auto', repoFacts()), a);
  for (const url of ['https://x.dev', 'https://y.dev', 'https://zz.app']) {
    assert.ok(['paper', 'aurora'].includes(pickStyle('auto', { type: 'site', url, brand: { bg: 'rgb(250, 250, 248)' } })), url);
  }
  const { storyboard, deck } = assemble(repoFacts(), null, { watermark: false, style: 'paper' });
  assert.equal(storyboard.style, 'paper');
  assert.equal(deck.style, 'paper');
});

test('look: on auto the director picks style + music from the enums, with a reason', () => {
  const { resolveLook, STYLES, ALL_STYLES, MUSIC, RESPONSE_SCHEMA } = require('../pipeline/storyboard');
  // The director may pick any available style: classic looks and directed styles.
  assert.deepEqual(RESPONSE_SCHEMA.properties.style.enum, ALL_STYLES);
  for (const s of STYLES) assert.ok(ALL_STYLES.includes(s), s);
  assert.deepEqual(RESPONSE_SCHEMA.properties.music.enum, MUSIC);
  assert.ok(RESPONSE_SCHEMA.required.includes('style') && RESPONSE_SCHEMA.required.includes('music'));
  for (const s of ['glass', 'terminal', 'kinetic', 'aurora']) assert.ok(STYLES.includes(s) && MUSIC.includes(s), s);

  const copy = { style: 'terminal', music: 'kinetic', styleReason: `A hacker CLI: retro CRT fits. ${'x'.repeat(200)}` };
  const look = resolveLook(repoFacts(), copy, { style: 'auto' });
  assert.equal(look.style, 'terminal');
  assert.equal(look.music, 'kinetic');
  assert.equal(look.source, 'llm');
  assert.ok(look.reason.startsWith('A hacker CLI') && look.reason.length <= 90);

  const { storyboard, deck } = assemble(repoFacts(), copy, { watermark: true, style: 'auto' });
  assert.deepEqual([storyboard.style, storyboard.music, deck.style], ['terminal', 'kinetic', 'terminal']);
});

test('look: explicit user choices beat the director', () => {
  const { resolveLook } = require('../pipeline/storyboard');
  const copy = { style: 'terminal', music: 'kinetic', styleReason: 'nope' };
  assert.deepEqual(resolveLook(repoFacts(), copy, { style: 'paper' }), { style: 'paper', music: 'paper', source: 'user', reason: '' });
  assert.equal(resolveLook(repoFacts(), copy, { style: 'glass', music: 'aurora' }).music, 'aurora');
  assert.equal(resolveLook(repoFacts(), copy, { style: 'auto', music: 'hud' }).music, 'hud');
});

test('look: bad or missing director picks fall back to the hash', () => {
  const { resolveLook, pickStyle } = require('../pipeline/storyboard');
  const { defaultMusic } = require('../pipeline/catalog');
  const fallback = pickStyle('auto', repoFacts());
  for (const copy of [null, {}, { style: 'vaporwave', music: 'terminal' }, { style: 'HUD' }, { style: ['glass'] }, { style: 42 }]) {
    const look = resolveLook(repoFacts(), copy, { style: 'auto' });
    assert.equal(look.style, fallback, JSON.stringify(copy));
    assert.equal(look.music, defaultMusic(fallback)); // music is ignored when the style pick was invalid
    assert.equal(look.source, 'auto');
    assert.equal(look.reason, '');
  }
  // Valid style but made-up music: the style's own track.
  const look = resolveLook(repoFacts(), { style: 'aurora', music: 'dubstep' }, { style: 'auto' });
  assert.deepEqual([look.style, look.music, look.source], ['aurora', 'aurora', 'llm']);
  // An unknown requested style is an error, never silently swapped for another
  // look (the API rejects it with BAD_STYLE before a job exists).
  assert.throws(() => resolveLook(repoFacts(), null, { style: 'nope' }), /not available/);
});

test('API: style and music are checked against the allowlists', async () => {
  const app = require('../server');
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  process.env.AUTH_DEV_BYPASS = 'true';
  const post = (body) => fetch(`${base}/api/videos`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Carbon-Dev-Login': '1' }, body: JSON.stringify(body) });
  try {
    const badStyle = await post({ url: 'https://github.com/fastify/fastify', style: 'vaporwave' });
    assert.equal(badStyle.status, 400);
    assert.equal((await badStyle.json()).code, 'BAD_STYLE');
    const badMusic = await post({ url: 'https://github.com/fastify/fastify', style: 'glass', music: 'dubstep' });
    assert.equal(badMusic.status, 400);
    assert.equal((await badMusic.json()).code, 'BAD_MUSIC');
  } finally {
    process.env.AUTH_DEV_BYPASS = 'false';
    server.close();
  }
});

test('early access: validates email and stores one row per email', async () => {
  const router = require('../routes/earlyAccess');
  const { db } = require('../lib/db');
  const handler = router.stack.find((l) => l.route && l.route.path === '/early-access').route.stack[0].handle;
  const call = (body) => {
    const r = { code: 200, json(b) { r.body = b; return r; }, status(c) { r.code = c; return r; } };
    handler({ body }, r);
    return r;
  };
  assert.equal(call({ email: 'not-an-email' }).code, 400);
  assert.equal(call({ email: 'a@b.co', url: 'javascript:alert(1)' }).code, 400);
  assert.equal(call({ email: 'Ada@Example.com', wants: 'a video for my CLI', url: 'github.com/ada/cli' }).code, 200);
  call({ email: 'ada@example.com', wants: '' });
  const rows = db.prepare("SELECT * FROM early_access WHERE email = 'ada@example.com'").all();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].wants, 'a video for my CLI');
});
