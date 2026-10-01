const express = require('express');
const axios = require('axios');
const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');

const router = express.Router();

// Initialize SQLite database
const dbPath = path.join(__dirname, '../db/roasts.sqlite');
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
  const { repo_url, workspace_name, files, folder_structure, architecture_info, security_info } = req.body;

  if (!repo_url && !files) {
    return res.status(400).json({ error: 'repo_url or files is required' });
  }

  try {
    // Call Python agent service
    const response = await axios.post(`${PYTHON_API_URL}/api/roast`, {
      repo_url,
      workspace_name,
      files,
      folder_structure,
      architecture_info: architecture_info || {},
      security_info: security_info || {}
    });

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
    res.status(500).json({ error: 'Failed to generate roast.' });
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
    const title = `Roast of ${record.repo_name} - ${roastData.title}`;
    const description = roastData.roast || 'Carbon analyzed this codebase and found a disaster.';
    const frontendTarget = `${FRONTEND_URL}/roast/${record.id}`;

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
        <meta property="og:image" content="${FRONTEND_URL}/roast-card/${record.id}.png">

        <!-- Twitter -->
        <meta property="twitter:card" content="summary_large_image">
        <meta property="twitter:url" content="${FRONTEND_URL}/roast/${record.id}">
        <meta property="twitter:title" content="${title}">
        <meta property="twitter:description" content="${description}">
        <meta property="twitter:image" content="${FRONTEND_URL}/roast-card/${record.id}.png">

        <!-- Auto Redirect for human users -->
        <meta http-equiv="refresh" content="0; url=${frontendTarget}">
      </head>
      <body>
        <p>Redirecting you to the roast... <a href="${frontendTarget}">Click here</a> if not redirected.</p>
        <script>
          window.location.href = "${frontendTarget}";
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
