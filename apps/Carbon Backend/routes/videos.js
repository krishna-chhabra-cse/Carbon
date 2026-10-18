// ============================================================
//  routes/videos.js — Create launch videos and check on them.
//
//  POST /api/briefs            (signed in)  { url }  → { id, product, questions }
//  POST /api/briefs/:id/look   (signed in)  { answers, note? }  → { look, brief }
//  POST /api/videos            (signed in)  { url | briefId, style?, music?, format?, length? }  → { id }
//  GET  /api/styles            (public)     → the style catalog for the gallery
//  GET  /api/videos            (signed in)  → your videos
//  GET  /api/videos/:id        (public)     → status, progress, file links
//  GET  /api/videos/:id/video.mp4 | deck.pptx  (public, for sharing)
//  GET  /api/me                (signed in)  → profile, credits, free quota
//  POST /api/logout            (any)        → forgets the cached session token
// ============================================================

const crypto = require('crypto');
const express = require('express');
const path = require('path');
const { db } = require('../lib/db');
const { requireUser, forgetToken } = require('../lib/auth');
const { parseInput } = require('../lib/inputUrl');
const { pickTier, usage } = require('../lib/plans');
const fs = require('fs');
const { kick, OUT_DIR, BRIEF_DIR, BRIEF_TTL_HOURS } = require('../pipeline/worker');
const { MUSIC, FORMATS, LENGTHS, formatsFor } = require('../pipeline/looks');
const { ALL_STYLES, checkStyle, isDirected, publicCatalog } = require('../pipeline/catalog');
const { readFacts } = require('../pipeline/ingest');
const { buildQuestions, answersToBrief, recommendLook } = require('../pipeline/brief');
const { clip } = require('../pipeline/storyboard');

const router = express.Router();

const insertJob = db.prepare(`
  INSERT INTO video_jobs (id, user_id, ip, input_url, input_type, tier, style, music, brief_id, format, length, status, step)
  VALUES (@id, @user_id, @ip, @input_url, @input_type, @tier, @style, @music, @brief_id, @format, @length, 'queued', 'queued')
`);
const insertBrief = db.prepare(`
  INSERT INTO video_briefs (id, user_id, input_url, input_type, facts, questions, used_llm)
  VALUES (@id, @user_id, @input_url, @input_type, @facts, @questions, @used_llm)
`);
const getBrief = db.prepare(`SELECT * FROM video_briefs WHERE id = ? AND user_id = ? AND created_at > datetime('now', '-${BRIEF_TTL_HOURS} hours')`);
const getBriefAny = db.prepare('SELECT brief FROM video_briefs WHERE id = ?');
const saveLook = db.prepare('UPDATE video_briefs SET brief = @brief, look = @look WHERE id = @id');
const briefsLastHour = db.prepare("SELECT COUNT(*) AS n FROM video_briefs WHERE user_id = ? AND created_at > datetime('now', '-1 hour')");
const BRIEFS_PER_HOUR = parseInt(process.env.BRIEFS_PER_HOUR || '20', 10);

const parseJson = (s) => {
  try {
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
};
// What the creator answered, for the result page.
const briefSummary = (briefId) => {
  const b = briefId ? parseJson(getBriefAny.get(briefId)?.brief) : null;
  return b ? { audience: b.audience || null, feelings: b.feelings || [], focus: b.focus || null, platform: b.platformLabel || null } : null;
};
const spendCredit = db.prepare('UPDATE users SET credits = credits - 1 WHERE id = ? AND credits > 0');
const getJob = db.prepare('SELECT * FROM video_jobs WHERE id = ?');
const myJobs = db.prepare('SELECT * FROM video_jobs WHERE user_id = ? ORDER BY created_at DESC LIMIT 50');
const queuePos = db.prepare("SELECT COUNT(*) AS n FROM video_jobs WHERE status = 'queued' AND created_at < ?");
const activeForUser = db.prepare("SELECT COUNT(*) AS n FROM video_jobs WHERE user_id = ? AND status IN ('queued', 'running')");

const publicJob = (j) => ({
  id: j.id,
  url: j.input_url,
  type: j.input_type,
  tier: j.tier,
  status: j.status,
  step: j.step,
  progress: j.progress,
  error: j.error,
  title: j.title,
  createdAt: j.created_at,
  queuePosition: j.status === 'queued' ? queuePos.get(j.created_at).n + 1 : 0,
  videoUrl: j.status === 'done' ? `/api/videos/${j.id}/video.mp4` : null,
  deckUrl: j.status === 'done' ? `/api/videos/${j.id}/deck.pptx` : null,
  style: j.style,
  music: j.music || null,
  // How the look was chosen: 'user' (picked), 'llm' (Gemini picked it on Auto),
  // 'brief' (scored from the creator's answers) or 'auto' (URL-hash fallback).
  styleSource: j.style_source || null,
  styleReason: j.style_reason || null,
  brief: briefSummary(j.brief_id),
  // Lets the owner remake it in another style with the same answers (GET /api/briefs/:id is owner-only).
  briefId: j.brief_id || null,
  format: j.format || null,
  length: j.length || 30,
  resolution: j.tier === 'paid' ? '1080p' : '720p',
  watermark: j.tier !== 'paid',
});

router.get('/me', requireUser, (req, res) => {
  const u = req.user;
  res.json({ user: { id: u.id, email: u.email, name: u.name, avatarUrl: u.avatar_url }, usage: usage(u) });
});

// Sign-out: the browser drops its Supabase session; we drop our cached copy.
router.post('/logout', (req, res) => {
  forgetToken(req);
  res.json({ ok: true });
});

// Step 1 of the guided flow: read the product once and ask four questions.
router.post('/briefs', requireUser, async (req, res) => {
  let input;
  try {
    input = await parseInput(req.body?.url);
  } catch (err) {
    return res.status(400).json({ error: err.message, code: 'BAD_URL' });
  }
  if (briefsLastHour.get(req.user.id).n >= BRIEFS_PER_HOUR) {
    return res.status(429).json({ error: 'That is a lot of new videos in an hour. Take a short break and try again.', code: 'BRIEF_LIMIT' });
  }
  const id = crypto.randomUUID();
  const work = path.join(BRIEF_DIR, id);
  let facts;
  try {
    fs.mkdirSync(work, { recursive: true });
    facts = await readFacts(input.type, input.url, work);
    if (facts.type === 'site' && !facts.hero) throw new Error('Could not capture that website.');
  } catch (err) {
    fs.rmSync(work, { recursive: true, force: true });
    return res.status(502).json({ error: err.message || 'Could not read that link.', code: 'READ_FAILED' });
  }
  const { questions, usedLlm } = await buildQuestions(facts);
  insertBrief.run({ id, user_id: req.user.id, input_url: input.url, input_type: input.type, facts: JSON.stringify(facts), questions: JSON.stringify(questions), used_llm: usedLlm ? 1 : 0 });
  res.status(201).json({
    id,
    product: { name: facts.name, description: clip(facts.description, 160), type: facts.type, displayUrl: facts.displayUrl },
    questions,
    usedLlm,
  });
});

// Reopen your own brief (e.g. "try another style" from a finished video):
// the product, the questions, your answers and the recommended look.
router.get('/briefs/:id', requireUser, (req, res) => {
  const row = getBrief.get(req.params.id, req.user.id);
  if (!row) return res.status(404).json({ error: 'Those questions expired. Paste your link again.', code: 'NO_BRIEF' });
  const facts = parseJson(row.facts) || {};
  const questions = parseJson(row.questions) || [];
  const brief = parseJson(row.brief);
  // Map the saved answers back onto option ids so the page can show them.
  const answers = {};
  for (const q of questions) {
    const labels = q.kind === 'feeling' ? brief?.feelings || [] : [{ audience: brief?.audience, focus: brief?.focus, platform: brief?.platformLabel }[q.kind]];
    const ids = q.options.filter((o) => labels.includes(o.label)).map((o) => o.id);
    if (ids.length) answers[q.id] = q.max === 1 ? ids[0] : ids;
  }
  res.json({
    id: row.id,
    url: row.input_url,
    product: { name: facts.name, description: clip(facts.description, 160), type: facts.type || row.input_type, displayUrl: facts.displayUrl },
    questions,
    answers,
    brief,
    look: parseJson(row.look),
  });
});

// Step 2: the creator's answers → a recommended style + soundtrack.
router.post('/briefs/:id/look', requireUser, async (req, res) => {
  const row = getBrief.get(req.params.id, req.user.id);
  if (!row) return res.status(404).json({ error: 'Those questions expired. Paste your link again.', code: 'NO_BRIEF' });
  const brief = answersToBrief(parseJson(row.questions), req.body?.answers, req.body?.note);
  const look = await recommendLook(parseJson(row.facts), brief);
  saveLook.run({ id: row.id, brief: JSON.stringify(brief), look: JSON.stringify(look) });
  res.json({ look, brief });
});

// The style gallery: every available style, classic looks and directed styles.
router.get('/styles', (req, res) => {
  res.set('Cache-Control', 'public, max-age=300');
  res.json({ styles: publicCatalog() });
});

router.post('/videos', requireUser, async (req, res) => {
  const style = req.body?.style || 'auto';
  if (style !== 'auto' && !ALL_STYLES.includes(style)) {
    return res.status(400).json({ error: 'Unknown style.', code: 'BAD_STYLE' });
  }
  const music = req.body?.music || null;
  if (music && !MUSIC.includes(music)) {
    return res.status(400).json({ error: 'Unknown music.', code: 'BAD_MUSIC' });
  }
  const format = req.body?.format || 'auto';
  if (format !== 'auto' && !FORMATS.includes(format)) {
    return res.status(400).json({ error: 'Unknown video type.', code: 'BAD_FORMAT' });
  }
  const length = Number(req.body?.length || 30);
  if (!LENGTHS.includes(length)) {
    return res.status(400).json({ error: 'Videos are 15 or 30 seconds.', code: 'BAD_LENGTH' });
  }
  // From the guided flow the link comes from the brief (already checked);
  // otherwise it is parsed and checked here.
  let input;
  let briefId = null;
  if (req.body?.briefId) {
    const row = getBrief.get(String(req.body.briefId), req.user.id);
    if (!row) return res.status(404).json({ error: 'Those questions expired. Paste your link again.', code: 'NO_BRIEF' });
    input = { url: row.input_url, type: row.input_type };
    briefId = row.id;
  } else {
    try {
      input = await parseInput(req.body?.url);
    } catch (err) {
      return res.status(400).json({ error: err.message, code: 'BAD_URL' });
    }
  }
  // The chosen style must work for this link, length and video type; it is
  // never swapped for another one later.
  const styleProblem = checkStyle({ style, type: input.type, format, length });
  if (styleProblem) return res.status(400).json(styleProblem);
  if (format !== 'auto' && !isDirected(style) && !formatsFor(input.type).includes(format)) {
    const what = format === 'numbers' ? 'GitHub repos' : 'websites';
    return res.status(400).json({ error: `That video type only works for ${what}.`, code: 'BAD_FORMAT' });
  }
  if (activeForUser.get(req.user.id).n >= 2) {
    return res.status(429).json({ error: 'You already have videos in progress. Wait for them to finish.', code: 'BUSY' });
  }

  const choice = pickTier(req.user, req.ip);
  if (choice.error) return res.status(402).json({ error: choice.error, code: choice.code, usage: choice.usage });

  const id = crypto.randomUUID();
  const create = db.transaction(() => {
    if (choice.tier === 'paid' && spendCredit.run(req.user.id).changes === 0) throw new Error('NO_CREDIT');
    insertJob.run({ id, user_id: req.user.id, ip: req.ip, input_url: input.url, input_type: input.type, tier: choice.tier, style, music, brief_id: briefId, format, length });
  });
  try {
    create();
  } catch {
    return res.status(409).json({ error: 'Your credits changed. Please try again.', code: 'RETRY' });
  }
  kick();
  res.status(201).json({ id, tier: choice.tier });
});

router.get('/videos', requireUser, (req, res) => {
  res.json({ videos: myJobs.all(req.user.id).map(publicJob) });
});

router.get('/videos/:id', (req, res) => {
  const job = getJob.get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Video not found' });
  res.json(publicJob(job));
});

const sendFile = (field, type, ext) => (req, res) => {
  const job = getJob.get(req.params.id);
  if (!job || job.status !== 'done' || !job[field]) return res.status(404).json({ error: 'Not ready' });
  const file = path.join(OUT_DIR, path.basename(job[field]));
  const name = `${(job.title || 'carbon').replace(/[^\w.-]+/g, '-').slice(0, 40)}-launch.${ext}`;
  res.type(type);
  if (req.query.download) res.attachment(name);
  res.sendFile(file, { maxAge: '7d' }, (err) => err && !res.headersSent && res.status(404).end());
};

router.get('/videos/:id/video.mp4', sendFile('video_file', 'video/mp4', 'mp4'));
router.get('/videos/:id/deck.pptx', sendFile('deck_file', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'pptx'));

module.exports = router;
