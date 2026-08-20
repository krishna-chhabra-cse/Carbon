# Carbon — Phase 2: Security Audit & Protection Report

**Date:** August 14, 2026  
**Auditor:** Antigravity (Execution Agent)  
**Security Classification:** Critical / High / Medium / Low  

---

## 1. Executive Summary

A comprehensive security analysis was conducted across all four layers of the Carbon ecosystem:
1. **Frontend Web App (`Carbon Frontend`)**
2. **Backend API Gateway (`Carbon Backend`)**
3. **Python AI Agent Service (`Carbon Agent Service`)**
4. **Browser & Editor Extensions (`chrome-extension`, `vscode-extension`)**

All high-priority risks regarding secret containment, input validation, rate limiting, and client-side safe filtering have been audited and secured.

---

## 2. Vulnerability Assessment & Mitigation Matrix

| ID | Category | Description | Severity | Status | Mitigation / Resolution |
|---|---|---|---|---|---|
| **SEC-01** | Secret Leakage | Private AI API Keys in client bundles | **CRITICAL** | ✅ **Passed** | Verified: `GEMINI_API_KEY` is strictly confined to Python backend `.env`. 0 keys in React bundle or extensions. |
| **SEC-02** | File Exfiltration | Workspace upload of sensitive keys/passwords | **HIGH** | ✅ **Fixed** | `workspaceCollector.ts` strictly blacklists `.env*`, `.key`, `.pem`, `credentials.json`, `node_modules/`. |
| **SEC-03** | DoS / Abuse | AI endpoint flooding & token exhaustion | **HIGH** | ✅ **Fixed** | Rate limiting enforced in `server.js` (30 analyses/15 min, 120 general requests/15 min) + 10MB payload ceiling. |
| **SEC-04** | XSS Injection | Malicious scripts in Markdown / AI responses | **MEDIUM** | ✅ **Fixed** | HTML escaping in `sidepanel.js` and strict Markdown AST parsing via `react-markdown` in React app. |
| **SEC-05** | CORS Misconfiguration | Open wildcards in production environment | **MEDIUM** | ✅ **Hardened** | Configured `CORS_ORIGIN` support in Express to restrict traffic to known origins in production. |
| **SEC-06** | Model Availability / 503 | Single-point AI failure causing service crash | **HIGH** | ✅ **Fixed** | Implemented multi-model fallback cascade (`tools/llm_client.py`) across 5 Gemini models. |

---

## 3. Deep-Dive Security Audits

### 3.1 Secrets & Environment Variables
- **Grep Inspection:** Full scan across `apps/Carbon Frontend/dist`, `apps/chrome-extension`, and `apps/vscode-extension` confirmed **zero secret keys, service-role tokens, or credentials**.
- **Packaging Rules:** `.vscodeignore` strictly excludes `.env*`, `.git/**`, source maps, and development files from the VSIX package.

### 3.2 Database & Data Isolation
- **User Scoping:** Carbon currently processes analyses on-demand in ephemeral memory (`REPO_CACHE`), keeping user workspaces isolated.
- **Client Storage:** User history and learning streaks are persisted locally in `localStorage` / `chrome.storage.local`, preventing cross-tenant data leakage.

### 3.3 AI Endpoint Abuse Protection
- **Rate Limiters:** Express rate limiters guard `/api/analyze` (stricter limit) and `/api/*` (general limiter).
- **Payload Size Caps:** Enforced 10 MB maximum JSON payload in Express and 450 KB budget in the VS Code collector.
- **Socket Timeouts:** Set to 120,000 ms to prevent hung socket accumulation while allowing full AST analysis.

### 3.4 General Web Security
- **XSS Prevention:** AI responses rendering code blocks use escaped HTML entities and DOM-safe Markdown renderers.
- **Secure Headers:** Configured reverse proxy trust (`app.set('trust proxy', 1)`) for accurate IP logging behind Cloudflare, Vercel, and Render.
