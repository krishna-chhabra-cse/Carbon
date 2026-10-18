// ============================================================
//  lib/auth.js — Sign-in via Supabase Auth.
//
//  The frontend signs users in with Supabase (email + password, Google or
//  GitHub) and sends the access token as `Authorization: Bearer <token>`. We
//  verify it by asking Supabase who the token belongs to, cache the answer
//  briefly, and keep our own `users` row (quota lives here, not in Supabase).
//  Fails closed: no Supabase config, Supabase down, an unconfirmed email or an
//  anonymous user all mean "not signed in".
//
//  Local dev without Supabase: set AUTH_DEV_BYPASS=true. It is ignored when
//  NODE_ENV=production and for any request that doesn't come from this
//  machine. You still have to sign in: /login shows "Continue as local dev
//  user", which sends the X-Carbon-Dev-Login header.
// ============================================================

const axios = require('axios');
const crypto = require('crypto');
const { db } = require('./db');

const CACHE_MS = 2 * 60 * 1000;
const tokenCache = new Map();

// Read at call time so tests (and a misconfigured host) can't get stale values.
const supabaseUrl = () => (process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
const supabaseKey = () => (process.env.SUPABASE_ANON_KEY || '').trim();
const authConfigured = () => Boolean(supabaseUrl() && supabaseKey());

const isLoopback = (addr) => ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(addr || '');
const devBypass = () => process.env.AUTH_DEV_BYPASS === 'true' && process.env.NODE_ENV !== 'production';
// Even in dev, signing in is a deliberate step: the frontend only sends this
// header after you click "Continue as local dev user" on /login.
const DEV_LOGIN_HEADER = 'x-carbon-dev-login';
// The real TCP peer, not X-Forwarded-For (which a client can fake).
const devLoginRequested = (req) => devBypass() && req.get(DEV_LOGIN_HEADER) === '1' && isLoopback(req.socket?.remoteAddress);

const upsertUser = db.prepare(`
  INSERT INTO users (id, email, name, avatar_url) VALUES (@id, @email, @name, @avatar_url)
  ON CONFLICT(id) DO UPDATE SET email = excluded.email, name = excluded.name, avatar_url = excluded.avatar_url
`);
const getUser = db.prepare('SELECT * FROM users WHERE id = ?');

const cacheKey = (token) => crypto.createHash('sha256').update(token).digest('hex');

// Supabase's user object → our user, or null if this account may not sign in.
function toUser(data) {
  if (!data?.id) return null;
  // Anonymous sign-ins would let anyone farm free videos.
  if (data.is_anonymous) return null;
  // Supabase only issues sessions to confirmed emails when "Confirm email" is
  // on (and auto-confirms when it's off), so this is a second lock on the door.
  if (data.email && !data.email_confirmed_at && !data.confirmed_at) return null;
  const meta = data.user_metadata || {};
  return {
    id: data.id,
    email: data.email || null,
    name: meta.full_name || meta.name || meta.user_name || (data.email || '').split('@')[0] || 'Maker',
    avatar_url: meta.avatar_url || meta.picture || null,
  };
}

// Returns the user, null for a bad/expired token, and throws when Supabase
// can't be reached (so the caller answers 503, not "please sign in").
async function verifyToken(token, http = axios) {
  const key = cacheKey(token);
  const hit = tokenCache.get(key);
  if (hit && hit.exp > Date.now()) return hit.user;
  const res = await http.get(`${supabaseUrl()}/auth/v1/user`, {
    headers: { apikey: supabaseKey(), Authorization: `Bearer ${token}` },
    timeout: 8000,
    validateStatus: () => true,
  });
  if (res.status >= 500 || res.status === 429) throw new Error(`Supabase answered ${res.status}`);
  const user = res.status === 200 ? toUser(res.data) : null;
  if (!user) return null;
  if (tokenCache.size > 5000) tokenCache.clear();
  tokenCache.set(key, { user, exp: Date.now() + CACHE_MS });
  return user;
}

const bearer = (req) => {
  const header = req.get('authorization') || '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
};

async function resolveUser(req, http) {
  if (devLoginRequested(req)) {
    const dev = { id: 'dev-user', email: 'dev@localhost', name: 'Dev', avatar_url: null };
    upsertUser.run(dev);
    return getUser.get(dev.id);
  }
  const token = bearer(req);
  if (!token || !authConfigured()) return null;
  const user = await verifyToken(token, http);
  if (!user) return null;
  upsertUser.run(user);
  return getUser.get(user.id);
}

// Rejects with 401 unless the request carries a valid session.
async function requireUser(req, res, next) {
  try {
    const user = await resolveUser(req);
    if (!user) {
      return res.status(401).json({
        error: authConfigured() || devBypass() ? 'Please sign in first.' : 'Sign-in is not configured on this server.',
        code: 'AUTH_REQUIRED',
      });
    }
    req.user = user;
    next();
  } catch (err) {
    console.error('[auth] verification failed:', err.message);
    res.status(503).json({ error: 'Could not verify your session. Try again.', code: 'AUTH_UNAVAILABLE' });
  }
}

// Sign-out: forget the cached token so it stops working here right away.
function forgetToken(req) {
  const token = bearer(req);
  if (token) tokenCache.delete(cacheKey(token));
}

module.exports = { requireUser, resolveUser, verifyToken, toUser, forgetToken, authConfigured, devBypass, isLoopback };
