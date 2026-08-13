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

// The URL of our Python agent service (read from .env)
const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';

// -------------------------------------------------------
// POST /api/analyze
// Frontend sends: { "repoUrl": "https://github.com/..." }
// We return:      { "architecture": {...}, "diagram": "..." }
// -------------------------------------------------------
router.post('/analyze', async (req, res) => {

  // Step 1: Get the repo URL from the request body
  const { repoUrl } = req.body;

  // Step 2: Basic validation — did the user actually send a URL?
  if (!repoUrl) {
    return res.status(400).json({ 
      error: 'repoUrl is required' 
    });
  }

  console.log(`📥 Received analyze request for: ${repoUrl}`);

  // Step 3: Wake up the Python service (Render free tier sleeps after 15 min)
  // Send a quick health check ping to trigger the cold start BEFORE the real request
  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 5000; // 5 seconds between retries

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (attempt === 1) {
        // First attempt: ping the health check to wake up the service
        console.log(`🏓 Pinging Python service to wake it up...`);
        try {
          await axios.get(`${PYTHON_SERVICE_URL}/`, { timeout: 60000 });
          console.log(`✅ Python service is awake!`);
        } catch (pingErr) {
          console.log(`⏳ Python service is waking up (attempt ${attempt})...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
          continue; // retry the whole loop
        }
      }

      // Step 4: Call the Python agent service with streaming
      console.log(`🐍 Forwarding to Python agent service (streaming)... (attempt ${attempt})`);

      const pythonResponse = await axios.post(
        `${PYTHON_SERVICE_URL}/run-agents`,
        { repo_url: repoUrl },
        { 
          timeout: 300000,
          responseType: 'stream'
        }                  
      );

      // Step 5: Forward Python's stream back to the frontend
      console.log(`✅ Piping stream to frontend.`);
      
      res.setHeader('Content-Type', 'application/x-ndjson');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      pythonResponse.data.pipe(res);
      return; // success — exit the retry loop

    } catch (error) {
      console.error(`❌ Attempt ${attempt}/${MAX_RETRIES} failed:`, error.message);

      // If it's a 502 (cold start) and we have retries left, wait and retry
      if (error.response && error.response.status === 502 && attempt < MAX_RETRIES) {
        console.log(`⏳ Python service is cold-starting. Retrying in ${RETRY_DELAY_MS / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
        continue;
      }

      // Final failure — send error to frontend
      if (error.code === 'ECONNREFUSED') {
        return res.status(503).json({ 
          error: 'Python agent service is not running.',
          hint: 'The AI service may be starting up. Please try again in 30 seconds.'
        });
      }

      return res.status(500).json({ 
        error: 'Analysis failed',
        details: error.message 
      });
    }
  }
});

// -------------------------------------------------------
// POST /api/chat
// Frontend sends: { "repoUrl": "...", "query": "..." }
// We return:      { "success": true, "answer": "..." }
// -------------------------------------------------------
router.post('/chat', async (req, res) => {
  const { repoUrl, query } = req.body;

  if (!repoUrl || !query) {
    return res.status(400).json({ error: 'repoUrl and query are required' });
  }

  console.log(`💬 Received chat query for: ${repoUrl}`);

  try {
    const pythonResponse = await axios.post(
      `${PYTHON_SERVICE_URL}/chat`,
      { repo_url: repoUrl, query: query },
      { timeout: 60000 } // 60 seconds
    );

    res.json(pythonResponse.data);
  } catch (error) {
    console.error('❌ Error calling Python chat service:', error.message);
    
    // Check if Python sent a 400 (like Cache Miss)
    if (error.response && error.response.status === 400) {
      return res.status(400).json(error.response.data);
    }
    
    res.status(500).json({ 
      error: 'Chat failed',
      details: error.message 
    });
  }
});

// Export the router so server.js can use it
module.exports = router;
