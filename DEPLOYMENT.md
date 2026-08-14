# Carbon — Deployment & Distribution Guide

This guide covers how to deploy the **Carbon Agent Service** and **Carbon Backend** using Docker / Docker Compose or Cloud Platforms (Render, Railway, Fly.io, AWS), and how to package the **VS Code Extension** for distribution.

---

## 1. Quick Start: Deploying with Docker Compose

The simplest way to run Carbon locally or on a VPS (AWS EC2, DigitalOcean, Hetzner, etc.):

### Step 1: Clone & Configure
```bash
git clone https://github.com/your-org/carbon.git
cd Carbon

# Copy environment template
cp .env.example .env

# Edit .env to add your Google Gemini API Key
# GEMINI_API_KEY=AIzaSy...
```

### Step 2: Build & Start Containers
```bash
docker compose up --build -d
```

### Step 3: Verify Status
```bash
docker compose ps
curl http://localhost:3002/
# Expected: {"message":"🧠 Carbon Backend is running!","status":"ok"}
```

---

## 2. Deploying to Cloud Platforms (Render / Railway / Fly.io)

You can deploy the two services independently on free/hobby tiers of any cloud provider.

### Service 1: Python Agent Service (`Baby/Carbon Agent Service`)
- **Runtime**: Python 3.11 or Docker
- **Root Directory**: `Baby/Carbon Agent Service`
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- **Environment Variables**:
  - `GEMINI_API_KEY`: *(Your Google Gemini API Key)*

### Service 2: Node.js Backend Proxy (`Baby/Carbon Backend`)
- **Runtime**: Node.js 20 or Docker
- **Root Directory**: `Baby/Carbon Backend`
- **Build Command**: `npm install`
- **Start Command**: `node server.js`
- **Environment Variables**:
  - `PORT`: `3002` (or cloud-assigned port)
  - `PYTHON_SERVICE_URL`: `https://your-python-agent-service.onrender.com`

---

## 3. Packaging the VS Code Extension (`.vsix`)

To install the extension on any machine without building from source:

### Step 1: Install VSCE & Package
```bash
cd "Baby/vscode-extension"
npm install
npm run package
```
*This generates a `carbon-vscode-0.1.0.vsix` file in the folder.*

### Step 2: Install into VS Code
- Open VS Code $\to$ **Extensions** tab (`Ctrl+Shift+X` / `Cmd+Shift+X`).
- Click the `...` menu (Views and More Actions) in the top right $\to$ **"Install from VSIX..."**.
- Select the `carbon-vscode-0.1.0.vsix` file.

### Step 3: Configure Remote Backend (Optional)
If your backend is deployed in the cloud:
1. Open VS Code **Settings** (`Ctrl+,` / `Cmd+,`).
2. Search for `Carbon: Backend Url`.
3. Set it to your deployed URL (e.g. `https://my-carbon-backend.onrender.com`).

---

## 4. Architecture Reference

```
┌──────────────────────────────────────────────────────────┐
│                   VS Code Extension                      │
│   (Configurable carbon.backendUrl in Settings)           │
└────────────────────────────┬─────────────────────────────┘
                             │ HTTP POST /api/analyze
                             │ HTTP POST /api/explain-video
                             ▼
┌──────────────────────────────────────────────────────────┐
│               Carbon Backend (Express :3002)             │
│   • Scrimba MCP Adapter (chunking & retry logic)         │
│   • Request proxy & stream piping                        │
└────────────────────────────┬─────────────────────────────┘
                             │ HTTP POST /run-agents
                             │ HTTP POST /generate-explainer-opml
                             ▼
┌──────────────────────────────────────────────────────────┐
│          Carbon Agent Service (FastAPI :8000)            │
│   • LangGraph Multi-Agent Analysis Pipeline              │
│   • Scrimba OPML Explainer Generator                     │
│   • Powered by Google Gemini                             │
└──────────────────────────────────────────────────────────┘
```
