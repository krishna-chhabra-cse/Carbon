// ============================================================
//  lib/gemini.js — One JSON-mode call to Gemini with a strict schema.
//
//  Used by the director (storyboard), the interviewer (brief questions) and
//  the stylist (recommended look). Returns { data, model } or null when there
//  is no key or every model failed, so callers always have a fallback path.
// ============================================================

const axios = require('axios');

// Aliases first (Google keeps them pointed at current models), then a lite fallback.
const MODELS = () => [...new Set([process.env.GEMINI_MODEL, 'gemini-flash-latest', 'gemini-flash-lite-latest'].filter(Boolean))];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function generateJson({ system, user, schema, temperature = 0.6, tag = 'gemini', retries = [0, 4000, 12000], timeout = 60000 }) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  const body = {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: 'user', parts: [{ text: user }] }],
    generationConfig: { responseMimeType: 'application/json', responseSchema: schema, temperature },
  };
  for (const model of MODELS()) {
    // Rate limits (429) and overloads (503) are usually brief: back off and retry.
    for (const wait of retries) {
      if (wait) await sleep(wait);
      try {
        const res = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, body, {
          headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
          timeout,
        });
        const text = res.data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('');
        if (text) return { data: JSON.parse(text), model };
        break;
      } catch (err) {
        const status = err.response?.status;
        console.warn(`[${tag}] ${model} failed: ${status || ''} ${err.message}`);
        if (status !== 429 && status !== 503 && status !== 500) break; // try the next model
      }
    }
  }
  return null;
}

module.exports = { generateJson };
