// ============================================================
//  routes/earlyAccess.js — Collect early-access interest (no payments yet).
//
//  POST /api/early-access  { email, wants?, url? }  → { ok: true }
//  Stores one row per email (updated if they come back). Nothing is charged
//  and no price is shown; this tells us who wants videos and for what.
//
//  GET /api/admin/early-access  (Authorization: Bearer <ADMIN_TOKEN>)  → { count, rows }
//  The owner's view of the list. Off (404) unless ADMIN_TOKEN is set to a
//  long random value (24+ characters).
// ============================================================

const crypto = require('crypto');
const express = require('express');
const { db } = require('../lib/db');

const router = express.Router();

db.exec(`
  CREATE TABLE IF NOT EXISTS early_access (
    email TEXT PRIMARY KEY,
    wants TEXT,
    url TEXT,
    source TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

const upsert = db.prepare(`
  INSERT INTO early_access (email, wants, url, source) VALUES (@email, @wants, @url, @source)
  ON CONFLICT(email) DO UPDATE SET
    wants = COALESCE(NULLIF(excluded.wants, ''), early_access.wants),
    url = COALESCE(NULLIF(excluded.url, ''), early_access.url),
    source = excluded.source,
    updated_at = datetime('now')
`);

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;
const clean = (v, max) => String(v ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);

router.post('/early-access', (req, res) => {
  const email = clean(req.body?.email, 254).toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Enter a valid email address.', code: 'BAD_EMAIL' });
  }
  const url = clean(req.body?.url, 300);
  if (url && !/^(https?:\/\/)?(github\.com\/|[a-z0-9-]+(\.[a-z0-9-]+)+)/i.test(url)) {
    return res.status(400).json({ error: 'That link does not look like a repo or website.', code: 'BAD_URL' });
  }
  upsert.run({
    email,
    wants: clean(req.body?.wants, 500),
    url,
    source: clean(req.body?.source, 40) || 'site',
  });
  res.json({ ok: true });
});

const listAll = db.prepare('SELECT email, wants, url, source, created_at, updated_at FROM early_access ORDER BY created_at DESC');

function adminOnly(req, res, next) {
  const token = (process.env.ADMIN_TOKEN || '').trim();
  if (token.length < 24) return res.status(404).json({ error: 'Not found' });
  const given = Buffer.from((req.get('authorization') || '').replace(/^Bearer /, ''));
  const real = Buffer.from(token);
  if (given.length !== real.length || !crypto.timingSafeEqual(given, real)) {
    return res.status(401).json({ error: 'Wrong token.', code: 'ADMIN_AUTH' });
  }
  next();
}

router.get('/admin/early-access', adminOnly, (req, res) => {
  const rows = listAll.all();
  res.set('Cache-Control', 'no-store');
  res.json({ count: rows.length, rows });
});

module.exports = router;
