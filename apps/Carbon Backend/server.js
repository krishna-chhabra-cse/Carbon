// ============================================================
//  server.js — Carbon Backend (Node/Express Proxy Middleware)
// ============================================================

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');

dotenv.config();

const app = express();

// Trust reverse proxies (Render, Railway, Cloudflare, NGINX) for real client IPs
app.set('trust proxy', 1);

// ── 1. Security & Middleware Configuration ───────────────────

// CORS: the site's own origins. Sign-in uses bearer tokens (no cookies), so
// '*' is only the local-dev default; production defaults to carbons.codes.
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim()).filter(Boolean)
  : process.env.NODE_ENV === 'production'
    ? ['https://carbons.codes', 'https://www.carbons.codes']
    : '*';

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Carbon-Dev-Login']
}));

// Razorpay webhook needs the raw body to check its signature, so it is
// registered before the JSON parser.
const billing = require('./routes/billing');
app.post('/api/billing/webhook', express.raw({ type: 'application/json', limit: '1mb' }), billing.webhook);

// Request Body Limits: Cap JSON payload at 10MB to prevent DoS
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── 2. Rate Limiting (Abuse Control) ──────────────────────────

// General API rate limiter: 120 requests per 15 minutes
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 mins
  max: parseInt(process.env.RATE_LIMIT_MAX || '120', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests from this IP. Please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});

// Stricter limiter for heavy AI analysis endpoints: 30 analyses per 15 mins
const analyzeLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 mins
  max: parseInt(process.env.ANALYZE_RATE_LIMIT_MAX || '30', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many analysis requests. Please wait a few minutes before analyzing another workspace.',
    code: 'ANALYZE_RATE_LIMIT_EXCEEDED'
  }
});

// Roasts and video jobs are the expensive calls.
const heavyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.HEAVY_RATE_LIMIT_MAX || '20', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Slow down a little. Try again in a few minutes.', code: 'RATE_LIMIT_EXCEEDED' }
});

app.use('/api', generalLimiter);
app.use('/api/analyze', analyzeLimiter);
app.use('/api/chat', analyzeLimiter);
app.post('/api/roast', heavyLimiter);
app.post('/api/videos', heavyLimiter);
app.post('/api/briefs', heavyLimiter);
app.post('/api/early-access', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many sign-ups from this network. Try again in a few minutes.', code: 'RATE_LIMIT_EXCEEDED' }
}));

// ── 3. Routes ────────────────────────────────────────────────

const analyzeRoutes = require('./routes/analyze');
const explainVideoRoutes = require('./routes/explainVideo');
const ttsRoutes = require('./routes/tts');
const telemetryRoutes = require('./routes/telemetry');
const roastRoutes = require('./routes/roast');

// Endpoints of the old analyzer UI (Scrimba video, ElevenLabs voice, web
// companion, telemetry) aren't used by the site; they stay off unless asked
// for, so nobody can spend those API credits through a public URL.
const legacyRoutes = process.env.LEGACY_ROUTES === 'true';
app.use('/api/companion', (req, res, next) => (legacyRoutes ? next() : res.status(404).json({ error: 'Not found' })));
// The agent service sleeps when idle on free hosts. The site calls this when
// someone opens Roast or Go deeper, so it is awake by the time they press the button.
app.get('/api/warm', (req, res) => {
  const agent = (process.env.PYTHON_SERVICE_URL || '').trim().replace(/\/+$/, '');
  if (agent) require('axios').get(`${agent}/`, { timeout: 90000 }).catch(() => {});
  res.json({ ok: true });
});
app.use('/api', analyzeRoutes);
if (legacyRoutes) {
  app.use('/api', explainVideoRoutes);
  app.use('/api', ttsRoutes);
  app.use('/api', telemetryRoutes);
}
app.use('/api/roast', roastRoutes);
app.use('/api', require('./routes/videos'));
app.use('/api', require('./routes/earlyAccess'));
app.use('/api', billing.router);

// Healthcheck endpoints for uptime monitors & load balancers
app.get(['/', '/health'], (req, res) => {
  res.json({
    status: 'ok',
    service: 'Carbon Backend',
    version: '1.0.0'
  });
});

// ── 4. Global Error Handler ───────────────────────────────────

// Catch unhandled errors and return safe non-leaky responses
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err.message);

  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      error: 'Payload too large. Please reduce the number of files.',
      code: 'PAYLOAD_TOO_LARGE'
    });
  }

  res.status(500).json({
    error: 'Internal server error occurred.',
    code: 'INTERNAL_ERROR'
  });
});

// ── 5. Server Startup ─────────────────────────────────────────

const PORT = process.env.PORT || 3002;
if (require.main === module) app.listen(PORT, () => {
  const auth = require('./lib/auth');
  if (auth.devBypass()) console.warn('⚠️  AUTH_DEV_BYPASS is on: "Continue as local dev user" works from this machine. Never set it in production.');
  else if (!auth.authConfigured()) console.warn('⚠️  SUPABASE_URL / SUPABASE_ANON_KEY are not set: nobody can sign in, so no videos can be made.');
  require('./pipeline/worker').startWorker();
  console.log(`✅ Carbon Backend running on port ${PORT}`);
  console.log(`🐍 Connected to Python Agent Service at ${process.env.PYTHON_SERVICE_URL || 'http://localhost:8000'}`);
});

module.exports = app;
