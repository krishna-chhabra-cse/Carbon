// ============================================================
//  routes/telemetry.js — Carbon usage event telemetry
//  POST /api/telemetry  — log an event
//  GET  /api/telemetry/stats — aggregate stats for dashboards
// ============================================================

const express = require('express');
const router = express.Router();
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Ensure db/ directory exists at startup
const dbDir = path.join(__dirname, '..', 'db');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Open / create the SQLite database (lazy singleton)
let _db = null;
function getDb() {
  if (!_db) {
    _db = new Database(path.join(dbDir, 'events.db'));
    _db.exec(`
      CREATE TABLE IF NOT EXISTS events (
        id         INTEGER  PRIMARY KEY AUTOINCREMENT,
        event      TEXT     NOT NULL,
        repo_url   TEXT,
        source     TEXT,
        metadata   TEXT,
        ip         TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_events_event ON events (event);
      CREATE INDEX IF NOT EXISTS idx_events_created ON events (created_at);
    `);
  }
  return _db;
}

// ── POST /api/telemetry ──────────────────────────────────────
// Body: { event, repo_url?, source?, metadata? }
// Records a single usage event. Always responds 200 to keep the
// client fire-and-forget path simple.
router.post('/telemetry', (req, res) => {
  try {
    const { event, repo_url, source, metadata } = req.body || {};
    if (!event || typeof event !== 'string') {
      return res.status(400).json({ error: 'event field is required and must be a string' });
    }

    const ip = String(
      req.headers['x-forwarded-for'] || req.ip || 'unknown'
    ).split(',')[0].trim();

    getDb()
      .prepare('INSERT INTO events (event, repo_url, source, metadata, ip) VALUES (?, ?, ?, ?, ?)')
      .run(
        event,
        repo_url || null,
        source || null,
        metadata ? JSON.stringify(metadata) : null,
        ip
      );

    res.json({ ok: true });
  } catch (err) {
    console.error('[Telemetry] Write error:', err.message);
    // Return 200 anyway so clients don't retry and spam logs
    res.json({ ok: false });
  }
});

// ── GET /api/telemetry/stats ─────────────────────────────────
// Returns aggregate counts for use in pitch decks / dashboard
router.get('/telemetry/stats', (req, res) => {
  try {
    const db = getDb();

    const totalScans = db
      .prepare("SELECT COUNT(*) as count FROM events WHERE event = 'repo_analyzed'")
      .get();

    const byEvent = db
      .prepare('SELECT event, COUNT(*) as count FROM events GROUP BY event ORDER BY count DESC')
      .all();

    const last7Days = db
      .prepare(`
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM events
        WHERE created_at >= DATE('now', '-7 days')
        GROUP BY DATE(created_at)
        ORDER BY date
      `)
      .all();

    const uniqueRepos = db
      .prepare("SELECT COUNT(DISTINCT repo_url) as count FROM events WHERE repo_url IS NOT NULL")
      .get();

    res.json({
      total_scans: totalScans.count,
      unique_repos: uniqueRepos.count,
      by_event: byEvent,
      last_7_days: last7Days
    });
  } catch (err) {
    console.error('[Telemetry] Stats error:', err.message);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

module.exports = router;
