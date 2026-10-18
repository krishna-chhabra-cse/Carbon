// Sign-in and the free daily limit, end to end through Express where it matters.
process.env.NODE_ENV = 'test';
process.env.AUTH_DEV_BYPASS = 'false';
process.env.SUPABASE_URL = 'https://test-project.supabase.co/';
process.env.SUPABASE_ANON_KEY = 'anon-test-key';
delete process.env.GEMINI_API_KEY;

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const axios = require('axios');

const auth = require('../lib/auth');
const { db } = require('../lib/db');
const { FREE_PER_DAY } = require('../lib/plans');

const confirmed = (over = {}) => ({
  id: crypto.randomUUID(),
  email: 'ada@example.com',
  email_confirmed_at: '2026-10-17T10:00:00Z',
  user_metadata: { full_name: 'Ada Lovelace', picture: 'https://img/ada.png' },
  ...over,
});

// A stand-in for axios that answers like Supabase's /auth/v1/user.
const fakeHttp = (status, data) => {
  const calls = [];
  return {
    calls,
    get: async (url, opts) => {
      calls.push({ url, opts });
      return { status, data };
    },
  };
};

const fakeReq = ({ token, devHeader, peer = '127.0.0.1' } = {}) => ({
  socket: { remoteAddress: peer },
  get: (h) => ({ authorization: token ? `Bearer ${token}` : undefined, 'x-carbon-dev-login': devHeader ? '1' : undefined })[h.toLowerCase()],
});

const fakeRes = () => {
  const r = { code: 200, body: null, status(c) { r.code = c; return r; }, json(b) { r.body = b; return r; } };
  return r;
};

async function runRequireUser(req) {
  const res = fakeRes();
  let nextCalled = false;
  await auth.requireUser(req, res, () => { nextCalled = true; });
  return { res, nextCalled, user: req.user };
}

test('toUser: confirmed accounts sign in; anonymous and unconfirmed ones do not', () => {
  const u = auth.toUser(confirmed());
  assert.equal(u.name, 'Ada Lovelace');
  assert.equal(u.avatar_url, 'https://img/ada.png');
  assert.equal(auth.toUser(confirmed({ is_anonymous: true })), null);
  assert.equal(auth.toUser(confirmed({ email_confirmed_at: null })), null);
  // Older Supabase payloads use confirmed_at.
  assert.ok(auth.toUser(confirmed({ email_confirmed_at: null, confirmed_at: '2026-10-17T10:00:00Z' })));
  // Name falls back to the email's first part.
  assert.equal(auth.toUser(confirmed({ user_metadata: {} })).name, 'ada');
  assert.equal(auth.toUser(null), null);
});

test('verifyToken: asks Supabase once, caches, and forgets on sign-out', async () => {
  const http = fakeHttp(200, confirmed());
  const token = `tok-${crypto.randomUUID()}`;
  const first = await auth.verifyToken(token, http);
  assert.equal(first.email, 'ada@example.com');
  assert.equal(http.calls.length, 1);
  assert.equal(http.calls[0].url, 'https://test-project.supabase.co/auth/v1/user');
  assert.equal(http.calls[0].opts.headers.apikey, 'anon-test-key');
  assert.equal(http.calls[0].opts.headers.Authorization, `Bearer ${token}`);
  await auth.verifyToken(token, http);
  assert.equal(http.calls.length, 1, 'second check comes from the cache');
  auth.forgetToken(fakeReq({ token }));
  await auth.verifyToken(token, http);
  assert.equal(http.calls.length, 2, 'after sign-out Supabase is asked again');
});

test('verifyToken: bad tokens are rejected, a Supabase outage throws', async () => {
  assert.equal(await auth.verifyToken('expired', fakeHttp(401, { msg: 'invalid JWT' })), null);
  assert.equal(await auth.verifyToken('revoked', fakeHttp(403, { msg: 'session not found' })), null);
  await assert.rejects(auth.verifyToken('down', fakeHttp(503, {})));
  await assert.rejects(auth.verifyToken('busy', fakeHttp(429, {})));
});

test('requireUser: a valid Supabase token signs you in and creates the user row', async () => {
  const original = axios.get;
  const sbUser = confirmed({ email: 'grace@example.com', user_metadata: { name: 'Grace' } });
  axios.get = async () => ({ status: 200, data: sbUser });
  try {
    const { res, nextCalled, user } = await runRequireUser(fakeReq({ token: `t-${crypto.randomUUID()}` }));
    assert.ok(nextCalled, JSON.stringify(res.body));
    assert.equal(user.id, sbUser.id);
    assert.equal(user.name, 'Grace');
    assert.equal(db.prepare('SELECT email FROM users WHERE id = ?').get(sbUser.id).email, 'grace@example.com');
  } finally {
    axios.get = original;
  }
});

test('requireUser: fails closed (no token, bad token, outage, unconfigured)', async () => {
  const original = axios.get;
  try {
    let r = await runRequireUser(fakeReq());
    assert.equal(r.res.code, 401);
    assert.equal(r.res.body.code, 'AUTH_REQUIRED');

    axios.get = async () => ({ status: 401, data: {} });
    r = await runRequireUser(fakeReq({ token: 'nope' }));
    assert.equal(r.res.code, 401);

    axios.get = async () => { throw new Error('ECONNREFUSED'); };
    r = await runRequireUser(fakeReq({ token: `t-${crypto.randomUUID()}` }));
    assert.equal(r.res.code, 503);
    assert.equal(r.res.body.code, 'AUTH_UNAVAILABLE');
    assert.equal(r.nextCalled, false);

    const url = process.env.SUPABASE_URL;
    delete process.env.SUPABASE_URL;
    r = await runRequireUser(fakeReq({ token: 'anything' }));
    assert.equal(r.res.code, 401);
    assert.match(r.res.body.error, /not configured/);
    process.env.SUPABASE_URL = url;
  } finally {
    axios.get = original;
  }
});

test('dev bypass: only with the flag, the header, from this machine, outside production', async () => {
  const env = { ...process.env };
  try {
    process.env.AUTH_DEV_BYPASS = 'true';
    process.env.NODE_ENV = 'development';
    assert.ok((await runRequireUser(fakeReq({ devHeader: true }))).nextCalled);
    assert.ok((await runRequireUser(fakeReq({ devHeader: true, peer: '::1' }))).nextCalled);
    // No header: not signed in.
    assert.equal((await runRequireUser(fakeReq())).res.code, 401);
    // From another machine (even if X-Forwarded-For says localhost): refused.
    assert.equal((await runRequireUser(fakeReq({ devHeader: true, peer: '203.0.113.9' }))).res.code, 401);
    // Production ignores the flag completely.
    process.env.NODE_ENV = 'production';
    assert.equal(auth.devBypass(), false);
    assert.equal((await runRequireUser(fakeReq({ devHeader: true }))).res.code, 401);
  } finally {
    process.env.AUTH_DEV_BYPASS = env.AUTH_DEV_BYPASS;
    process.env.NODE_ENV = env.NODE_ENV;
  }
});

test(`API: the ${FREE_PER_DAY}-a-day limit is enforced on POST /api/videos; failed videos don't count`, async () => {
  const app = require('../server');
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  process.env.AUTH_DEV_BYPASS = 'true';
  const headers = { 'Content-Type': 'application/json', 'X-Carbon-Dev-Login': '1' };
  const addJob = (status, ago = '-1 hour') =>
    db.prepare(`INSERT INTO video_jobs (id, user_id, ip, input_url, input_type, tier, status, created_at)
      VALUES (?, 'dev-user', '5.5.5.5', 'https://github.com/a/b', 'repo', 'free', ?, datetime('now', ?))`).run(crypto.randomUUID(), status, ago);
  try {
    let me = await (await fetch(`${base}/api/me`, { headers })).json();
    assert.equal(me.usage.freeLeft, FREE_PER_DAY);
    assert.equal(me.packs, undefined, 'no prices in the API the site reads');
    // Failed videos and videos older than a day are free again.
    addJob('error');
    addJob('error');
    addJob('done', '-25 hours');
    me = await (await fetch(`${base}/api/me`, { headers })).json();
    assert.equal(me.usage.freeLeft, FREE_PER_DAY);
    for (let i = 0; i < FREE_PER_DAY; i++) addJob('done');
    me = await (await fetch(`${base}/api/me`, { headers })).json();
    assert.equal(me.usage.freeLeft, 0);
    assert.ok(me.usage.freeResetsAt > Date.now());
    const res = await fetch(`${base}/api/videos`, { method: 'POST', headers, body: JSON.stringify({ url: 'https://github.com/fastify/fastify' }) });
    const body = await res.json();
    assert.equal(res.status, 402);
    assert.equal(body.code, 'FREE_LIMIT');
    assert.doesNotMatch(body.error, /pack|₹|price|buy/i);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM video_jobs WHERE user_id = 'dev-user'").get().n, 3 + FREE_PER_DAY, 'no job was queued');
    // Logout is always safe to call.
    assert.equal((await fetch(`${base}/api/logout`, { method: 'POST', headers: { Authorization: 'Bearer x' } })).status, 200);
  } finally {
    process.env.AUTH_DEV_BYPASS = 'false';
    server.close();
  }
});

test('roast and Go deeper only accept GitHub repo URLs (no raw file uploads)', async () => {
  const { parseRepo } = require('../lib/inputUrl');
  assert.equal(parseRepo('github.com/sindresorhus/ky/tree/main'), 'https://github.com/sindresorhus/ky');
  for (const bad of ['hello', 'https://gitlab.com/a/b', 'https://github.com/onlyowner', '', 'x'.repeat(400)]) assert.throws(() => parseRepo(bad), undefined, bad);
  const app = require('../server');
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (p, body) => fetch(`${base}${p}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  try {
    for (const [p, body] of [
      ['/api/roast', { repo_url: 'hello' }],
      ['/api/roast', { files: [{ path: 'a.js', content: 'x' }] }],
      ['/api/analyze', { repoUrl: 'not a repo' }],
      ['/api/analyze', { files: [{ path: 'a.js', content: 'x' }] }],
    ]) {
      const r = await post(p, body);
      assert.equal(r.status, 400, `${p} ${JSON.stringify(body)}`);
      assert.equal((await r.json()).code, 'BAD_URL');
    }
  } finally {
    server.close();
  }
});

test('old analyzer endpoints (TTS, Scrimba, companion, telemetry) are off by default', async () => {
  const app = require('../server');
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const p of ['/api/tts', '/api/explain-video', '/api/companion', '/api/telemetry']) {
      const r = await fetch(`${base}${p}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      assert.equal(r.status, 404, p);
    }
    const health = await (await fetch(`${base}/health`)).json();
    assert.equal(health.pythonService, undefined, 'health check does not reveal internal URLs');
  } finally {
    server.close();
  }
});
