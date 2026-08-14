# Carbon — Cloud Deployment & Extension Distribution Guide

This comprehensive guide details how to deploy **Carbon** to the cloud so anyone in the world can access it, and how to install and configure the **Carbon Chrome Extension**.

---

## 🏗️ System Architecture Overview

Carbon consists of 4 tightly integrated modules:

```
┌────────────────────────────────────────────────────────────┐
│      Carbon Chrome Extension / VS Code Extension           │
│   (Configurable remote Backend & Frontend URLs)            │
└─────────────────────────────┬──────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────┐
│          Carbon Frontend Web App (React 19 + Vite)         │
│   (Vercel / Netlify / Render Static Site / NGINX)          │
└─────────────────────────────┬──────────────────────────────┘
                              │ HTTP POST /api/analyze, /api/explain-video
                              ▼
┌────────────────────────────────────────────────────────────┐
│          Carbon Backend Gateway (Node.js Express)          │
│   (Render / Railway / Fly.io / AWS ECS / Docker)           │
└─────────────────────────────┬──────────────────────────────┘
                              │ HTTP POST /run-agents, /chat
                              ▼
┌────────────────────────────────────────────────────────────┐
│       Carbon Agent Service (FastAPI + LangGraph)           │
│   (Render / Railway / Fly.io / AWS ECS / Docker)           │
│   • Powered by Google Gemini AI Model                      │
└────────────────────────────────────────────────────────────┘
```

---

## 🌐 Option A: 100% Free Cloud Deployment (Render + Vercel)

This is the recommended, zero-cost cloud setup.

### Step 1: Deploy Python Agent Service (Render Web Service)
1. Push your repository to **GitHub**.
2. Go to [dashboard.render.com](https://dashboard.render.com) $\to$ **New** $\to$ **Web Service**.
3. Connect your GitHub repository.
4. Fill in the service configuration:
   - **Name**: `carbon-agent-service`
   - **Root Directory**: `Baby/Carbon Agent Service`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type**: `Free`
5. Under **Environment Variables**, add:
   - `GEMINI_API_KEY`: `AIzaSy...` *(Your Google Gemini API Key)*
6. Click **Deploy**. Note down your service URL (e.g. `https://carbon-agent-service.onrender.com`).

---

### Step 2: Deploy Node.js Backend Proxy (Render Web Service)
1. Go to [dashboard.render.com](https://dashboard.render.com) $\to$ **New** $\to$ **Web Service**.
2. Select the same repository.
3. Fill in the service configuration:
   - **Name**: `carbon-backend`
   - **Root Directory**: `Baby/Carbon Backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Instance Type**: `Free`
4. Under **Environment Variables**, add:
   - `PORT`: `3002`
   - `PYTHON_SERVICE_URL`: `https://carbon-agent-service.onrender.com` *(from Step 1)*
   - `CORS_ORIGIN`: `*`
5. Click **Deploy**. Note down your backend URL (e.g. `https://carbon-backend.onrender.com`).

---

### Step 3: Deploy Frontend Studio (Vercel / Netlify / Render)
1. Go to [vercel.com](https://vercel.com) $\to$ **Add New Project**.
2. Import your GitHub repository.
3. Configure the project settings:
   - **Root Directory**: `Baby/Carbon Frontend`
   - **Framework Preset**: `Vite`
4. Under **Environment Variables**, add:
   - `VITE_API_URL`: `https://carbon-backend.onrender.com` *(from Step 2)*
5. Click **Deploy**.
6. Your Carbon Web App is now live globally at `https://carbon-xyz.vercel.app`! 🎉

---

## 🐳 Option B: 1-Command Production Deployment (Docker Compose / VPS)

If you have a VPS (AWS EC2, DigitalOcean Droplet, Hetzner, Linode):

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/carbon.git
   cd Carbon
   ```

2. **Configure Environment**:
   ```bash
   echo "GEMINI_API_KEY=your_gemini_api_key_here" > .env
   ```

3. **Start all 3 services**:
   ```bash
   docker compose up --build -d
   ```

4. **Verify Health**:
   - Frontend Studio: `http://<your-vps-ip>:3000`
   - Backend Gateway: `http://<your-vps-ip>:3002/health`
   - Python AI Service: `http://<your-vps-ip>:8000/`

---

## 🧩 Carbon Chrome Extension: Installation & Usage

Turn GitHub into an interactive AI codebase explorer with the Carbon Chrome Extension.

### How to Install into Google Chrome / Edge / Brave:

1. Open your browser and go to:
   ```
   chrome://extensions/
   ```
2. In the top-right corner, turn on **Developer mode** toggle.
3. Click the **"Load unpacked"** button in the top-left toolbar.
4. Select the directory:
   ```
   Baby/chrome-extension
   ```
   *(Full path: `c:\Users\krish\Desktop\Project carbon\Carbon\Baby\chrome-extension`)*
5. The **Carbon** extension is now installed!

### How to Use the Chrome Extension:
1. **Direct on GitHub**: Visit any public GitHub repository (e.g. `https://github.com/expressjs/express`). You will see the glowing **🧠 Explain with Carbon** button embedded right beside the repo star/fork buttons. Clicking it opens the repository inside your Carbon Web App studio with automatic analysis!
2. **From the Extension Popup**: Click the Carbon icon in your browser toolbar on any tab to view the detected repo, or type in any GitHub URL manually to jump directly to analysis.
3. **Configure Custom Backend**: Click the ⚙️ icon in the extension popup to point to your cloud-deployed backend URL.

---

## 📦 Carbon VS Code Extension (.vsix)

To distribute Carbon to VS Code users:
1. Navigate to `Baby/vscode-extension`.
2. Run `npm run package` to produce `carbon-vscode-0.1.0.vsix`.
3. Share the `.vsix` file — users can install it via **Extensions $\to$ Install from VSIX...**.
