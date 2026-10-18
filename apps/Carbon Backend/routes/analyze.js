// ============================================================
//  routes/analyze.js — Handles the /api/analyze endpoint
//
//  This is where the frontend sends the GitHub repo URL.
//  Our job here is to:
//    1. Validate the input
//    2. Forward it to the Python agent service
//    3. Send the result back to the frontend
// ============================================================

const express = require('express');
const axios   = require('axios');   // for making HTTP calls to Python service

// A "Router" is like a mini Express app — we use it to group related routes
const router = express.Router();
const { parseRepo, fileUploadsAllowed } = require('../lib/inputUrl');

// The URL of our Python agent service (read from .env)
const PYTHON_SERVICE_URL = (process.env.PYTHON_SERVICE_URL || 'http://localhost:8000').trim().replace(/\/+$/, '');

// -------------------------------------------------------
// POST /api/analyze
// Frontend sends:         { "repoUrl": "https://github.com/..." }
// VS Code extension sends: { "workspaceName": "...", "files": [...], "folderStructure": "..." }
// We return:              Streaming NDJSON with architectural analysis
// -------------------------------------------------------
router.post('/analyze', async (req, res) => {
  const { files, folderStructure, workspaceName } = req.body || {};
  let repoUrl = null;

  // Step 1: Input Validation (the site only sends public GitHub repo URLs)
  if (files && !fileUploadsAllowed()) {
    return res.status(400).json({ error: 'Paste a public GitHub repo URL.', code: 'BAD_URL' });
  }
  if (!files) {
    try {
      repoUrl = parseRepo(req.body?.repoUrl);
    } catch (err) {
      return res.status(400).json({ error: err.message, code: 'BAD_URL' });
    }
  } else if (!Array.isArray(files) || files.length === 0) {
    return res.status(400).json({
      error: 'Either repoUrl or a non-empty files array is required.'
    });
  }

  // Safety caps on payload
  if (files && files.length > 100) {
    return res.status(400).json({
      error: 'Payload exceeds maximum limit of 100 files.'
    });
  }

  const sourceLabel = workspaceName ? `Workspace: ${workspaceName} (${files.length} files)` : repoUrl;
  console.log(`📥 Received analyze request for: ${sourceLabel}`);

  // Step 2: Build payload for Python agent service
  const agentPayload = repoUrl
    ? { repo_url: repoUrl }
    : {
        workspace_name: workspaceName || 'Workspace',
        files: files,
        folder_structure: folderStructure || ''
      };

  // Step 3: Wake up the Python service (Render free tier sleeps after 15 min)
  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 5000; // 5 seconds between retries

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (attempt === 1) {
        console.log(`🏓 Pinging Python service to wake it up...`);
        try {
          await axios.get(`${PYTHON_SERVICE_URL}/`, { timeout: 60000 });
          console.log(`✅ Python service is awake!`);
        } catch (pingErr) {
          console.log(`⏳ Python service is waking up (attempt ${attempt})...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
          continue;
        }
      }

      // Step 4: Call the Python agent service with streaming
      console.log(`🐍 Forwarding to Python agent service (streaming)... (attempt ${attempt})`);

      const headers = {};
      if (process.env.CARBON_API_KEY) {
        headers['X-API-Key'] = process.env.CARBON_API_KEY;
      }

      const pythonResponse = await axios.post(
        `${PYTHON_SERVICE_URL}/run-agents`,
        agentPayload,
        { 
          headers,
          timeout: 0,
          responseType: 'stream'
        }                  
      );

      // Step 5: Forward Python's stream back to the client
      console.log(`✅ Piping stream to client.`);
      
      res.setHeader('Content-Type', 'application/x-ndjson');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      pythonResponse.data.pipe(res);

      // Fire telemetry event (best-effort, non-blocking — never breaks main flow)
      try {
        const Database = require('better-sqlite3');
        const path = require('path');
        const fs = require('fs');
        const dbPath = path.join(__dirname, '..', 'db', 'events.db');
        if (fs.existsSync(dbPath)) {
          const db = new Database(dbPath);
          db.prepare('INSERT INTO events (event, repo_url, source) VALUES (?, ?, ?)')
            .run('repo_analyzed', repoUrl || workspaceName || null, repoUrl ? 'github' : 'vscode');
        }
      } catch (_) {} // telemetry must never break the analysis

      return; // success — exit retry loop

    } catch (error) {
      console.error(`❌ Attempt ${attempt}/${MAX_RETRIES} failed:`, error.message);

      const statusCode = error.response ? error.response.status : null;

      if ((statusCode === 502 || statusCode === 503) && attempt < MAX_RETRIES) {
        console.log(`⏳ Python service is cold-starting/warming up (HTTP ${statusCode}). Retrying in ${RETRY_DELAY_MS / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
        continue;
      }

      if (error.code === 'ECONNREFUSED' || statusCode === 502 || statusCode === 503) {
        return res.status(503).json({ 
          error: 'The analysis service is starting up. Please try again in 30 seconds.',
          hint: 'The AI service is currently starting up. Please try again in 15-30 seconds.'
        });
      }

      const auth = statusCode === 401 || statusCode === 403;
      if (auth) console.error('❌ The agent service rejected our API key: check CARBON_API_KEY on both services.');
      return res.status(auth ? 503 : 502).json({
        error: auth ? 'Go deeper is temporarily unavailable. Please try again later.' : 'Could not analyze that repo. Is it public and not too large?'
      });
    }
  }
  // Every wake-up ping failed: answer instead of leaving the request hanging.
  if (!res.headersSent) {
    res.status(503).json({ error: 'The analysis service is starting up. Please try again in a minute.', code: 'AGENT_UNAVAILABLE' });
  }
});

// -------------------------------------------------------
// POST /api/chat
// Frontend sends: { "repoUrl": "...", "query": "..." }
// We return:      { "success": true, "answer": "..." }
// -------------------------------------------------------
router.post('/chat', async (req, res) => {
  const { repoUrl, query } = req.body;

  if (!query) {
    return res.status(400).json({ error: 'Query is required.' });
  }

  const safeTarget = String(repoUrl || 'General Web Context').replace(/[\r\n\x00-\x1F]/g, '').slice(0, 100);
  console.log(`💬 Received chat request for: ${safeTarget}`);

  try {
    const pythonResponse = await axios.post(
      `${PYTHON_SERVICE_URL}/chat`,
      { repo_url: repoUrl || '', query: query },
      { timeout: 120000 }
    );

    res.json(pythonResponse.data);
  } catch (error) {
    console.error('❌ Error calling Python chat service:', error.message);
    
    if (error.response && error.response.status === 400) {
      return res.status(400).json(error.response.data);
    }
    
    res.status(500).json({ 
      error: 'Chat failed',
      details: error.message 
    });
  }
});

// -------------------------------------------------------
// POST /api/companion (Chrome Extension Web Learning Companion)
// Extension sends: { "query": "...", "mode": "explain|simplify|teach|summarize|page_explain|lessons", "context": {...} }
// We return:      { "success": true, "answer": "...", "mode": "..." }
// -------------------------------------------------------
router.post('/companion', async (req, res) => {
  const { query, mode, context } = req.body;

  if (!query) {
    return res.status(400).json({ error: 'Query is required for Carbon Companion.' });
  }

  const safePrompt = String(query || '').replace(/[\r\n\x00-\x1F]/g, '').slice(0, 60);
  console.log(`🧠 [COMPANION] mode=${mode || 'explain'} prompt="${safePrompt}..."`);

  try {
    const pythonResponse = await axios.post(
      `${PYTHON_SERVICE_URL}/companion`,
      { 
        query: query,
        mode: mode || 'explain',
        context: context || {}
      },
      { timeout: 120000 }
    );

    res.json(pythonResponse.data);
  } catch (error) {
    console.error('❌ Error calling Python companion service:', error.message);

    res.status(500).json({ 
      error: 'Learning Companion query failed',
      details: error.message 
    });
  }
});

// Export the router so server.js can use it
module.exports = router;
