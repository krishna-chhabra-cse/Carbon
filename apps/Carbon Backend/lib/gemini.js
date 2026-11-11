// ============================================================
//  lib/gemini.js — One JSON-mode call to Gemini with a strict schema.
//
//  Used by the director (storyboard), the interviewer (brief questions) and
//  the stylist (recommended look). Returns { data, model } or null when there
//  is no key, every model failed or the time budget ran out, so callers
//  always have a fallback path.
//
//  Time is bounded two ways: `timeout` per attempt and `deadline` for the
//  whole call (all models and retries together). Someone is watching a
//  spinner while the interviewer and stylist run, so those pass `fast`:
//  the lite model goes first and model "thinking" is switched off.
// ============================================================

const axios = require('axios');

const uniq = (list) => [...new Set(list.filter(Boolean))];
// Aliases first (Google keeps them pointed at current models), then a lite fallback.
const MODELS = () => uniq([process.env.GEMINI_MODEL, 'gemini-flash-latest', 'gemini-flash-lite-latest']);
// Short, simple answers a person is waiting for: quickest model first.
const FAST_MODELS = () => uniq([process.env.GEMINI_FAST_MODEL, 'gemini-flash-lite-latest', process.env.GEMINI_MODEL, 'gemini-flash-latest']);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MIN_ATTEMPT_MS = 1500;

// Models that rejected `thinkingConfig` (some can't switch thinking off).
const noThinkingConfig = new Set();

async function generateJson({
  system,
  user,
  schema,
  temperature = 0.6,
  tag = 'gemini',
  retries = [0, 4000, 12000],
  timeout = 60000,
  deadline = Infinity,
  fast = false,
  post = axios.post,
  now = Date.now,
}) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  const started = now();
  const left = () => deadline - (now() - started);
  const request = (model) => {
    const generationConfig = { responseMimeType: 'application/json', responseSchema: schema, temperature };
    if (fast && !noThinkingConfig.has(model)) generationConfig.thinkingConfig = { thinkingBudget: 0 };
    return {
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: user }] }],
      generationConfig,
    };
  };

  for (const model of fast ? FAST_MODELS() : MODELS()) {
    // Rate limits (429) and overloads (503) are usually brief: back off and retry.
    for (let i = 0; i < retries.length; i++) {
      const wait = retries[i];
      if (left() - wait < MIN_ATTEMPT_MS) {
        console.warn(`[${tag}] out of time after ${now() - started}ms`);
        return null;
      }
      if (wait) await sleep(wait);
      const body = request(model);
      const attemptStarted = now();
      try {
        const res = await post(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, body, {
          headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
          timeout: Math.min(timeout, left()),
        });
        const text = res.data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('');
        if (text) {
          const data = JSON.parse(text);
          console.log(`[${tag}] ${model} answered in ${now() - attemptStarted}ms`);
          return { data, model };
        }
        break;
      } catch (err) {
        const status = err.response?.status;
        console.warn(`[${tag}] ${model} failed after ${now() - attemptStarted}ms: ${status || ''} ${err.message}`);
        // This model can't switch thinking off: ask again without the setting.
        if (status === 400 && body.generationConfig.thinkingConfig) {
          noThinkingConfig.add(model);
          i--;
          continue;
        }
        if (status !== 429 && status !== 503 && status !== 500) break; // try the next model
      }
    }
  }
  return null;
}

module.exports = { generateJson, noThinkingConfig };
