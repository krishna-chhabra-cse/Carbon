# Carbon — Phase 1: Codebase Audit

**Date:** August 14, 2026  
**Auditor:** Antigravity (Execution Agent)  
**Target:** Carbon Platform (`carbons.codes`)  

---

## 1. Architectural Inventory

### 1.1 Frontend Architecture
- **Framework & Version:** React `19.2.7` with Vite `8.1.1` (Single Page Application).
- **Routing Approach:** Tab-based state routing (`activeTab`: `'analyzer' | 'explore' | 'quiz' | 'dashboard'`) managed in `App.jsx`, synchronized with URL search params (`?repo=`).
- **State Management:** React local hooks (`useState`, `useEffect`, `useRef`) combined with browser `localStorage` for client-side persistence (quiz progress, recent mission history, user preferences).
- **Styling System:** Vanilla CSS with custom deep-space design tokens, CSS variables, glassmorphic panels (`rgba(13, 18, 36, 0.85)`), and 60 FPS GPU-accelerated HTML5 canvas starfield.
- **Component Libraries:** `lucide-react` (1.24.0) for iconography, `mermaid` (11.16.0) for visual SVG flowcharts, `react-markdown` (10.1.0) for streaming AI markdown.

### 1.2 Backend Architecture
- **API Gateway / Proxy:** Node.js Express (`server.js`, port `3002`) acting as the security gateway, rate limiter, and MCP adapter.
- **Agent Orchestrator:** Python FastAPI (`main.py`, port `8000`) orchestrating collaborative multi-agent LangGraph workflows (`ArchitectureAgent`, `ApiAgent`, `BusinessLogicAgent`, `CompanionAgent`, `ChatAgent`, `ExplainerAgent`).
- **Hosting / Deployment:** Deployed as separate services (Vercel for Frontend, Render/Railway/Docker for Backend Gateway and Agent Service).

### 1.3 Authentication & Session Strategy
- **Current Auth Provider:** No external OAuth/Supabase Auth currently wired; user session and history are maintained on the client via `localStorage` with server-side transient memory caching for multi-turn chat (`REPO_CACHE`).
- **Protected Routes:** Publicly accessible developer tools with IP-based rate limiting on backend endpoints.

### 1.4 Database & Persistence
- **Storage Layer:** In-memory dictionary cache (`REPO_CACHE`) in Python service for active session context; client-side `localStorage` for user mission history and settings. No direct user-scoped SQL/Postgres tables yet.

### 1.5 API Routes Inventory

| Route | Method | Auth Required | Purpose | Rate Limit |
|---|---|---|---|---|
| `/` & `/health` | `GET` | No | Service healthcheck & status monitoring | None |
| `/api/analyze` | `POST` | No (IP rate-limited) | Full codebase architectural analysis (streaming NDJSON) | 30 requests / 15 min |
| `/api/chat` | `POST` | No (IP rate-limited) | Contextual chat on analyzed repositories or web pages | 120 requests / 15 min |
| `/api/companion` | `POST` | No (IP rate-limited) | AI Web Learning Companion (explain, simplify, teach, summarize) | 120 requests / 15 min |
| `/api/explain-video` | `POST` | No (IP rate-limited) | MCP client adapter synthesizing Scrimba video walkthroughs | 30 requests / 15 min |

### 1.6 AI Integration
- **Provider & SDK:** Google Gemini via official `google-genai` SDK.
- **Key Location:** Private server-side `.env` file (`GEMINI_API_KEY`). **Zero AI keys are exposed to the client bundle or extensions.**
- **Failover Cascade:** Multi-model failover engine (`tools/llm_client.py`) rotating across `gemini-3.1-flash-lite`, `gemini-3.5-flash-lite`, `gemini-3.5-flash`, and `gemini-flash-latest` on 503 high-demand spikes.
- **Streaming:** NDJSON streaming over HTTP chunked transfer for `/api/analyze`.

### 1.7 Dashboard (`CommandCenter.jsx`)
- **Current State:** Contains hardcoded placeholder metrics (`24 Projects Analyzed`, `12 Days Streak`, fake missions).
- **Weakness:** Needs real telemetry linked to actual user sessions, genuine empty states, and true connection statuses for VS Code & Chrome extensions.

### 1.8 Landing Page & Navigation
- **Hero & Landing:** Strong cosmic branding, fast sample repository launcher, responsive tabs. Needs real product interactive previews and distinct feature showcases.
- **Navigation:** Desktop tab bar with live AI Mesh indicator and mobile slide-out drawer.

### 1.9 Extension Integration
- **Chrome Extension (`Baby/chrome-extension`):** Native Manifest V3 Side Panel + Context Menu with 5 quick learning actions, communicating with backend `/api/companion` and `/api/chat`.
- **VS Code Extension (`Baby/vscode-extension`):** Packaged VSIX (`1.0.0`) with client-side AST and safe file collector, visual webview diagrams, and Scrimba explainer generator.

### 1.10 Environment Variables Audit
- `GEMINI_API_KEY`: Server-side only (private).
- `PYTHON_SERVICE_URL`: Server-side Node proxy configuration (private).
- `PORT`: Server port configuration (private).
- `CORS_ORIGIN`: Server CORS whitelist (private).
- `VITE_API_URL`: Client-side build variable pointing to backend API gateway.

---

## 2. Good vs. Weak Audit Summary

### ✅ What is Strong & Working Well ("Good"):
1. **Security Separation:** Gemini API key is strictly kept in the Python backend; never bundled into React or extensions.
2. **Visual Identity:** Deep-space theme, dark glassmorphism, 60 FPS canvas starfield, and clean responsive layout.
3. **Multi-Agent Engine:** Collaborative LangGraph graph executing Architecture, API, and Business Logic agents in parallel.
4. **Resilient AI Failover:** Multi-model cascade preventing 503 errors during Google API demand spikes.
5. **Extension Architecture:** Chrome side panel and VS Code client-side file filtering with zero leakage of `.env` or sensitive files.

### ⚠️ What Needs Immediate Improvement ("Weak"):
1. **Fake Dashboard Data:** `CommandCenter.jsx` contains static mock numbers (`24 Projects Analyzed`) instead of dynamic data from real user activity with true empty states.
2. **Missing Real Workspace Telemetry:** Extension connection indicators are not dynamically sensing live connection states.
3. **AI Chat Port Inconsistency:** `Chatbox.jsx` had a fallback to port `5000` instead of `3002`.
4. **Error & Loading States:** Need comprehensive skeleton loaders and categorized error boundaries across all views.
5. **Accessibility & Reduced Motion:** Need comprehensive `prefers-reduced-motion` overrides for all orbital animations and full WCAG AA keyboard focus indicators.
