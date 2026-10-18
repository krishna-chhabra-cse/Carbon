// ============================================================
//  lib/db.js — SQLite store for users, video jobs and payments.
//  One file on disk (DATA_DIR/carbon.sqlite). On a host, mount DATA_DIR on a
//  persistent volume so accounts, credits and videos survive redeploys.
// ============================================================

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(__dirname, '..', 'data'));

function openDb(file = process.env.NODE_ENV === 'test' ? ':memory:' : path.join(DATA_DIR, 'carbon.sqlite')) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT,
      name TEXT,
      avatar_url TEXT,
      credits INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS video_jobs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      ip TEXT,
      input_url TEXT NOT NULL,
      input_type TEXT NOT NULL,
      tier TEXT NOT NULL,
      style TEXT NOT NULL DEFAULT 'hud',
      music TEXT,
      style_source TEXT,
      style_reason TEXT,
      brief_id TEXT,
      format TEXT,
      length INTEGER NOT NULL DEFAULT 30,
      status TEXT NOT NULL DEFAULT 'queued',
      step TEXT,
      progress REAL NOT NULL DEFAULT 0,
      error TEXT,
      title TEXT,
      storyboard TEXT,
      deck TEXT,
      video_file TEXT,
      deck_file TEXT,
      used_llm INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_jobs_user ON video_jobs(user_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_jobs_status ON video_jobs(status, created_at);
    -- The pre-video questions: product facts read once, the questions asked,
    -- the creator's answers and the recommended look (pipeline/brief.js).
    CREATE TABLE IF NOT EXISTS video_briefs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      input_url TEXT NOT NULL,
      input_type TEXT NOT NULL,
      facts TEXT NOT NULL,
      questions TEXT NOT NULL,
      brief TEXT,
      look TEXT,
      used_llm INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_briefs_user ON video_briefs(user_id, created_at);
    CREATE TABLE IF NOT EXISTS payments (
      order_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      pack TEXT NOT NULL,
      amount INTEGER NOT NULL,
      credits INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'created',
      payment_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  // Columns added after launch: add them to databases created earlier.
  const cols = db.prepare('PRAGMA table_info(video_jobs)').all().map((c) => c.name);
  if (!cols.includes('style')) db.exec("ALTER TABLE video_jobs ADD COLUMN style TEXT NOT NULL DEFAULT 'hud'");
  if (!cols.includes('length')) db.exec('ALTER TABLE video_jobs ADD COLUMN length INTEGER NOT NULL DEFAULT 30');
  for (const c of ['music', 'style_source', 'style_reason', 'brief_id', 'format']) if (!cols.includes(c)) db.exec(`ALTER TABLE video_jobs ADD COLUMN ${c} TEXT`);
  return db;
}

const db = openDb();

module.exports = { db, openDb, DATA_DIR };
