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

// CORS: allow VS Code extensions and web clients
const allowedOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim()) 
  : '*';

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

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

app.use('/api', generalLimiter);
app.use('/api/analyze', analyzeLimiter);

// ── 3. Routes ────────────────────────────────────────────────

const analyzeRoutes = require('./routes/analyze');
const explainVideoRoutes = require('./routes/explainVideo');
const ttsRoutes = require('./routes/tts');
const telemetryRoutes = require('./routes/telemetry');

app.use('/api', analyzeRoutes);
app.use('/api', explainVideoRoutes);
app.use('/api', ttsRoutes);
app.use('/api', telemetryRoutes);

// Healthcheck endpoints for uptime monitors & load balancers
app.get(['/', '/health'], (req, res) => {
  res.json({
    status: 'ok',
    service: 'Carbon Backend',
    version: '1.0.0',
    pythonService: process.env.PYTHON_SERVICE_URL || 'http://localhost:8000'
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
app.listen(PORT, () => {
  console.log(`✅ Carbon Backend running on port ${PORT}`);
  console.log(`🐍 Connected to Python Agent Service at ${process.env.PYTHON_SERVICE_URL || 'http://localhost:8000'}`);
});
