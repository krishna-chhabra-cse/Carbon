// ============================================================
//  routes/tts.js — ElevenLabs AI Audio Narration Engine
//  Supports:
//    - ElevenLabs Free Tier (10k chars/mo) with caching
//    - High-definition MP3 audio streaming
//    - Multiple curated AI studio voices (Adam, Rachel, Antoni, Josh)
//    - Graceful fallback indicator for client-side neural voices
// ============================================================

const express = require('express');
const axios = require('axios');
const router = express.Router();

// Memory cache for synthesized audio clips (prevents duplicate character consumption)
const audioCache = new Map();

// Curated ElevenLabs Voice IDs
const VOICES = {
  adam: 'pNInz6obpgDQGcFmaJgB',     // Deep, authoritative tech narrator
  rachel: '21m00Tcm4TlvDq8ikWAM',   // Professional host / clean clarity
  antoni: 'ErXwobaYiN019PkySvjV',   // Warm, engaging technical lead
  josh: 'TxGEqnHWrfWFTfGW9XjX'      // Natural, conversational developer
};

router.post('/tts', async (req, res) => {
  const { text, voice = 'adam', apiKey: clientKey } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Text prompt is required.' });
  }

  const apiKey = clientKey || process.env.ELEVENLABS_API_KEY;

  // If no ElevenLabs API key is configured, tell frontend to use client-side natural voice
  if (!apiKey) {
    return res.json({ 
      fallback: true, 
      provider: 'browser_neural',
      message: 'No ElevenLabs API key configured. Using high-definition browser natural neural voice.' 
    });
  }

  const voiceId = VOICES[voice.toLowerCase()] || voice || VOICES.adam;
  const cacheKey = `${voiceId}_${text.trim()}`;

  // Check in-memory cache to save free quota
  if (audioCache.has(cacheKey)) {
    return res.json({
      success: true,
      provider: 'elevenlabs',
      audioUrl: audioCache.get(cacheKey),
      cached: true
    });
  }

  try {
    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        text: text.trim(),
        model_id: 'eleven_turbo_v2_5', // Fastest response & highest quality
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.8,
          style: 0.0,
          use_speaker_boost: true
        }
      },
      {
        headers: {
          'xi-api-key': apiKey.trim(),
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg'
        },
        responseType: 'arraybuffer',
        timeout: 15000
      }
    );

    const base64Audio = Buffer.from(response.data, 'binary').toString('base64');
    const audioUrl = `data:audio/mp3;base64,${base64Audio}`;

    // Cache up to 100 clips
    if (audioCache.size > 100) {
      const firstKey = audioCache.keys().next().value;
      audioCache.delete(firstKey);
    }
    audioCache.set(cacheKey, audioUrl);

    return res.json({
      success: true,
      provider: 'elevenlabs',
      audioUrl: audioUrl,
      cached: false
    });

  } catch (err) {
    console.warn('ElevenLabs API error (falling back to browser neural voice):', err.response?.data ? err.response.data.toString() : err.message);
    return res.json({
      fallback: true,
      provider: 'browser_neural',
      error: err.message
    });
  }
});

module.exports = router;
