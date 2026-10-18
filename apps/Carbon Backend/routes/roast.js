const express = require('express');
const axios = require('axios');
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const { parseRepo, fileUploadsAllowed } = require('../lib/inputUrl');

const router = express.Router();

// Initialize SQLite database
const { DATA_DIR } = require('../lib/db');

const dbPath = process.env.NODE_ENV === 'test' ? ':memory:' : path.join(DATA_DIR, 'roasts.sqlite');
if (dbPath !== ':memory:') fs.mkdirSync(DATA_DIR, { recursive: true });
const db = new Database(dbPath);

// Create table if not exists
db.exec(`
  CREATE TABLE IF NOT EXISTS roasts (
    id TEXT PRIMARY KEY,
    repo_url TEXT NOT NULL,
    repo_name TEXT NOT NULL,
    roast_data TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

const insertRoast = db.prepare('INSERT INTO roasts (id, repo_url, repo_name, roast_data) VALUES (?, ?, ?, ?)');
const getRoast = db.prepare('SELECT * FROM roasts WHERE id = ?');

const PYTHON_API_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// 1. POST /api/roast - Generate and save roast
router.post('/', async (req, res) => {
  const { workspace_name, files, folder_structure, architecture_info, security_info } = req.body || {};
  let repo_url = null;
  if (files && !fileUploadsAllowed()) {
    return res.status(400).json({ error: 'Paste a public GitHub repo URL to roast.', code: 'BAD_URL' });
  }
  if (!files) {
    try {
      repo_url = parseRepo(req.body?.repo_url);
    } catch (err) {
      return res.status(400).json({ error: err.message, code: 'BAD_URL' });
    }
  }

  try {
    const headers = {};
    if (process.env.CARBON_API_KEY) {
      headers['X-API-Key'] = process.env.CARBON_API_KEY;
    }

    // Call Python agent service. Free hosts sleep when idle, so retry a
    // couple of times on connection errors / 502-504 while it wakes up.
    const payload = {
      repo_url,
      workspace_name,
      files,
      folder_structure,
      architecture_info: architecture_info || {},
      security_info: security_info || {}
    };
    let response;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        response = await axios.post(`${PYTHON_API_URL}/api/roast`, payload, { headers, timeout: 180000 });
        break;
      } catch (err) {
        const status = err.response?.status;
        const waking = !err.response || [502, 503, 504].includes(status);
        if (!waking || attempt === 3) throw err;
        await new Promise((r) => setTimeout(r, 5000));
      }
    }

    if (response.data.status !== 'success') {
      return res.status(500).json({ error: response.data.message || 'Python service failed' });
    }

    const { repo_name, roast } = response.data;
    const roastId = crypto.randomUUID();

    // Save to DB
    insertRoast.run(roastId, repo_url, repo_name, JSON.stringify(roast));

    res.json({
      status: 'success',
      id: roastId,
      repo_name,
      roast
    });
  } catch (error) {
    console.error('[Roast] Error generating roast:', error.message);
    const status = error.response?.status;
    const message = status === 500
      ? 'Could not roast that repo. Is it public and under 75 MB?'
      : 'The roasting service is waking up. Try again in a minute.';
    res.status(502).json({ error: message });
  }
});

// 2. GET /api/roast/:id - Fetch a saved roast (for the frontend app)
router.get('/:id', (req, res) => {
  try {
    const record = getRoast.get(req.params.id);
    if (!record) {
      return res.status(404).json({ error: 'Roast not found' });
    }
    
    res.json({
      status: 'success',
      id: record.id,
      repo_url: record.repo_url,
      repo_name: record.repo_name,
      roast: JSON.parse(record.roast_data),
      created_at: record.created_at
    });
  } catch (error) {
    console.error('[Roast] Error fetching roast:', error.message);
    res.status(500).json({ error: 'Failed to fetch roast.' });
  }
});

// 3. GET /api/roast/share/:id - Social OG preview and redirect
router.get('/share/:id', (req, res) => {
  try {
    const record = getRoast.get(req.params.id);
    if (!record) {
      return res.status(404).send('Roast not found');
    }

    const roastData = JSON.parse(record.roast_data);
    // Everything below lands in HTML, so escape it (repo names and roast text are user-influenced).
    const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const title = esc(`Roast of ${record.repo_name} - ${roastData.title || roastData.headline || 'Carbon roast'}`);
    const description = esc(roastData.roast || roastData.summary || 'Carbon analyzed this codebase and found a disaster.');
    const frontendTarget = esc(`${FRONTEND_URL}/roast/${encodeURIComponent(record.id)}`);

    // A minimal HTML string for social crawlers (Twitter, LinkedIn, Discord)
    // They read the <meta> tags, while actual users get meta-refreshed or JS-redirected to the SPA.
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <meta name="description" content="${description}">
        
        <!-- Open Graph / Facebook -->
        <meta property="og:type" content="website">
        <meta property="og:url" content="${FRONTEND_URL}/roast/${record.id}">
        <meta property="og:title" content="${title}">
        <meta property="og:description" content="${description}">

        <!-- Twitter -->
        <meta property="twitter:card" content="summary">
        <meta property="twitter:url" content="${FRONTEND_URL}/roast/${record.id}">
        <meta property="twitter:title" content="${title}">
        <meta property="twitter:description" content="${description}">

        <!-- Auto Redirect for human users -->
        <meta http-equiv="refresh" content="0; url=${frontendTarget}">
      </head>
      <body>
        <p>Redirecting you to the roast... <a href="${frontendTarget}">Click here</a> if not redirected.</p>
        <script>
          window.location.href = ${JSON.stringify(`${FRONTEND_URL}/roast/${encodeURIComponent(record.id)}`).replace(/</g, "")};
        </script>
      </body>
      </html>
    `;

    res.send(html);
  } catch (error) {
    console.error('[Roast] Error serving share page:', error.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
