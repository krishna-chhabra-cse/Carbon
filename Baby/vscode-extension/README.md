# Carbon — AI Codebase Explainer & Video Synthesizer

**Carbon** is an autonomous AI developer tool for VS Code that analyzes any open codebase, generates interactive architecture flowcharts, uncovers API endpoints, and synthesizes interactive audio-visual video explanations on Scrimba.

---

## ✨ Features

- **⚡ Client-Side Safe File Collection**: Scans your local workspace, automatically ignores binaries, `.git`, `node_modules`, and strictly excludes secrets/`.env` files.
- **🤖 Collaborative AI Agents**: Powered by LangGraph and Gemini for multi-agent reasoning.
- **🗺️ Interactive Flowcharts**: Renders visual SVG architecture diagrams inside VS Code.
- **🎥 Scrimba Video Explainer**: 1-click generation of interactive video walkthroughs with synchronized code highlights and diagrams.
- **🔒 Enterprise-Grade Security**: Your `GEMINI_API_KEY` stays exclusively on your backend server.

---

## 🚀 Quick Start

1. Open any project folder in VS Code.
2. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`).
3. Run:
   ```
   Carbon: Explain Current Workspace
   ```
4. Explore your project architecture, tech stack, API documentation, and click **"🎥 Explain with Video"** to generate a Scrimba video explainer.

---

## ⚙️ Configuration

In your VS Code Settings (`Ctrl+,` or `Cmd+,`), search for **Carbon**:

| Setting | Default | Description |
|---|---|---|
| `carbon.backendUrl` | `http://localhost:3002` | HTTPS URL of your deployed Carbon Backend on Render/Railway, or `http://localhost:3002` for local development. |

---

## 🛠️ Local Development & Self-Hosting

To run the backend services locally:

```bash
# 1. Clone repo
git clone https://github.com/carbon-dev/carbon.git
cd Carbon

# 2. Set your Gemini API key in .env
cp .env.example .env

# 3. Start services via Docker Compose
docker-compose up
```

---

## 📦 Building from Source

```bash
cd Baby/vscode-extension
npm install
npm run compile
npm run package
```
This produces `carbon-vscode-0.1.0.vsix` ready to install in any VS Code instance.
