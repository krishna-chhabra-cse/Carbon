// ============================================================
//  pipeline/worker.js — Turns queued jobs into a video + deck.
//
//  Jobs live in SQLite, so a restart never loses them: anything left
//  "running" is put back in the queue on boot. One job renders at a time
//  (RENDER_CONCURRENCY to change); paid jobs jump ahead of free ones.
//  Steps: ingest → storyboard → render video → build deck → done.
// ============================================================

const fs = require('fs');
const path = require('path');
const { db, DATA_DIR } = require('../lib/db');
const { readFacts, runVideoScript } = require('./ingest');
const { buildStoryboard } = require('./storyboard');

const OUT_DIR = path.join(DATA_DIR, 'outputs');
const BRIEF_DIR = path.join(DATA_DIR, 'briefs');
const BRIEF_TTL_HOURS = 24;
const WORK_DIR = path.join(DATA_DIR, 'work');
const CONCURRENCY = parseInt(process.env.RENDER_CONCURRENCY || '1', 10);
const RENDER_TIMEOUT_MS = parseInt(process.env.RENDER_TIMEOUT_MS || String(15 * 60 * 1000), 10);

const update = db.prepare("UPDATE video_jobs SET status = @status, step = @step, progress = @progress, error = @error, updated_at = datetime('now') WHERE id = @id");
const saveResult = db.prepare(`
  UPDATE video_jobs SET status = 'done', step = 'done', progress = 1, title = @title, style = @style, music = @music, format = @format,
    style_source = @style_source, style_reason = @style_reason, storyboard = @storyboard, deck = @deck,
    video_file = @video_file, deck_file = @deck_file, used_llm = @used_llm, updated_at = datetime('now') WHERE id = @id
`);
const nextJob = db.prepare("SELECT * FROM video_jobs WHERE status = 'queued' ORDER BY (tier = 'paid') DESC, created_at ASC LIMIT 1");
const claim = db.prepare("UPDATE video_jobs SET status = 'running', step = 'reading', updated_at = datetime('now') WHERE id = ? AND status = 'queued'");
const refundCredit = db.prepare('UPDATE users SET credits = credits + 1 WHERE id = ?');
const getBrief = db.prepare(`SELECT * FROM video_briefs WHERE id = ? AND created_at > datetime('now', '-${BRIEF_TTL_HOURS} hours')`);
const oldBriefs = db.prepare(`SELECT id FROM video_briefs WHERE created_at <= datetime('now', '-${BRIEF_TTL_HOURS} hours')`);
const dropBrief = db.prepare('DELETE FROM video_briefs WHERE id = ?');

const parse = (s) => {
  try {
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
};

// The brief already read the product (and captured the site): reuse it when
// its screenshots are still on disk, so a video costs one ingest, not two.
function briefFacts(brief) {
  const f = parse(brief?.facts);
  if (!f) return null;
  if (f.type === 'site' && !(f.hero && fs.existsSync(f.hero))) return null;
  return f;
}

// Briefs (and their screenshots) expire after a day.
function sweepBriefs() {
  for (const { id } of oldBriefs.all()) {
    fs.rmSync(path.join(BRIEF_DIR, path.basename(id)), { recursive: true, force: true });
    dropBrief.run(id);
  }
}

const setStep = (id, step, progress) => update.run({ id, status: 'running', step, progress, error: null });

const toDataUrl = (file) => (file && fs.existsSync(file) ? `data:image/jpeg;base64,${fs.readFileSync(file).toString('base64')}` : null);

async function processJob(job) {
  const work = path.join(WORK_DIR, job.id);
  fs.mkdirSync(work, { recursive: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const paid = job.tier === 'paid';

  // 1 · read the repo or site
  setStep(job.id, 'reading', 0.05);
  const brief = job.brief_id ? getBrief.get(job.brief_id) : null;
  let facts = briefFacts(brief);
  if (!facts) facts = await readFacts(job.input_type, job.input_url, work);
  if (facts.type === 'site') {
    facts.heroDataUrl = toDataUrl(facts.hero);
    facts.sectionDataUrl = toDataUrl(facts.section);
    if (!facts.heroDataUrl) throw new Error('Could not capture that website.');
  }

  // 2 · write the storyboard
  setStep(job.id, 'storyboard', 0.15);
  // On "auto" the look recommended after the questions is used as is.
  const { storyboard, deck, look, usedLlm } = await buildStoryboard(facts, {
    watermark: !paid,
    style: job.style || 'auto',
    music: job.music || undefined,
    brief: parse(brief?.brief),
    preset: (job.style || 'auto') === 'auto' ? parse(brief?.look) : null,
    seed: job.id,
    // "auto" (or nothing) → the type recommended after the questions, else the launch film.
    format: !job.format || job.format === 'auto' ? parse(brief?.look)?.format || 'launch' : job.format,
    // A video type the creator picked is only drawn by the classic film, so Auto stays classic.
    explicitFormat: Boolean(job.format && job.format !== 'auto'),
    length: job.length || 30,
  });
  const sbFile = path.join(work, 'storyboard.json');
  const deckJson = path.join(work, 'deck.json');
  fs.writeFileSync(sbFile, JSON.stringify(storyboard));
  fs.writeFileSync(deckJson, JSON.stringify(deck));

  // 3 · render (progress 0.2 → 0.9)
  setStep(job.id, 'rendering', 0.2);
  const videoName = `${job.id}.mp4`;
  let lastWrite = 0;
  await runVideoScript('render-video.mjs', [sbFile, path.join(OUT_DIR, videoName), '--height', paid ? '1080' : '720'], {
    timeoutMs: RENDER_TIMEOUT_MS,
    onLine: (msg) => {
      if (typeof msg.progress === 'number' && Date.now() - lastWrite > 1000) {
        lastWrite = Date.now();
        setStep(job.id, 'rendering', 0.2 + 0.7 * msg.progress);
      }
    },
  });

  // 4 · deck
  setStep(job.id, 'deck', 0.93);
  const deckName = `${job.id}.pptx`;
  await runVideoScript('build-deck.mjs', [deckJson, path.join(OUT_DIR, deckName)], { timeoutMs: 60000 });

  // Keep the storyboard small in the DB (screenshots are data URLs).
  const slim = JSON.parse(JSON.stringify(storyboard));
  for (const k of ['slot2', 'slot3']) if (slim[k]?.image) slim[k].image = '[screenshot]';
  saveResult.run({
    id: job.id,
    title: facts.name,
    style: look.style,
    music: look.music,
    // Directed styles tell their own story and have no video type.
    format: storyboard.format ?? null,
    style_source: look.source,
    style_reason: look.reason || null,
    storyboard: JSON.stringify(slim),
    deck: JSON.stringify(deck),
    video_file: videoName,
    deck_file: deckName,
    used_llm: usedLlm ? 1 : 0,
  });
  fs.rmSync(work, { recursive: true, force: true });
}

let running = 0;
let timer = null;

async function tick() {
  while (running < CONCURRENCY) {
    const job = nextJob.get();
    if (!job || claim.run(job.id).changes === 0) return;
    running++;
    processJob(job)
      .catch((err) => {
        console.error(`[worker] job ${job.id} failed:`, err.message);
        update.run({ id: job.id, status: 'error', step: 'error', progress: 0, error: String(err.message || err).slice(0, 300) });
        // Failed videos don't count: give the credit back (free ones are
        // excluded from the daily count because status = 'error').
        if (job.tier === 'paid') refundCredit.run(job.user_id);
      })
      .finally(() => {
        running--;
        setImmediate(tick);
      });
  }
}

function startWorker() {
  if (timer) return;
  db.prepare("UPDATE video_jobs SET status = 'queued', step = 'queued' WHERE status = 'running'").run();
  sweepBriefs();
  setInterval(sweepBriefs, 60 * 60 * 1000).unref();
  timer = setInterval(tick, 2000);
  tick();
}

module.exports = { startWorker, processJob, sweepBriefs, kick: () => setImmediate(tick), OUT_DIR, BRIEF_DIR, BRIEF_TTL_HOURS };
