# Carbon

> **AI Coding & Learning Companion for VS Code**

**Carbon** delivers instant codebase intelligence right inside Visual Studio Code. Understand complex codebases in seconds through interactive architecture flowcharts, component breakdowns, API documentation, and interactive video walkthroughs.

---

## 🌟 Who is Carbon for?

- **Developers onboarding to new codebases**: Rapidly build a mental model of how components connect.
- **Engineers reviewing architectures**: Inspect auto-generated visual system diagrams and data flows.
- **Technical leads & educators**: Generate interactive video explanations for teammates and students.
- **Open-source explorers**: Understand repository structure without getting lost in boilerplate.

---

## ✨ Main Features

- ⚡ **Local Client-Side File Scanning**: Scans your local workspace directly from disk. Automatically respects `.gitignore`, skips binary files, and strictly filters out `.env` files and credentials.
- 🗺️ **Interactive Architecture Flowcharts**: Renders visual SVG flowcharts and dependency graphs directly inside an interactive VS Code webview panel.
- 🧩 **Component & Tech Stack Breakdown**: Discovers core architectural layers, entry points, and dependencies.
- 📡 **API Endpoint Discovery**: Surfaces REST, GraphQL, and internal route definitions across your files.
- 🎬 **Interactive Video Explanations**: Synthesizes structured video scripts and interactive walkthroughs with synchronized code highlights.
- 🔒 **Enterprise-Grade Security & Privacy**: Never exposes your AI keys in the extension. File scanning is strictly filtered on your local machine before being sent to your secure backend.

---

## 🚀 How to Use

### 1. Installation
Install **Carbon** directly from the Visual Studio Code Marketplace or load the packaged `.vsix` file.

### 2. Explain Any Open Workspace
1. Open any project folder in VS Code (`File > Open Folder...`).
2. Open the Command Palette:
   - **Windows / Linux**: `Ctrl + Shift + P`
   - **macOS**: `Cmd + Shift + P`
3. Type and select:
   ```text
   Carbon: Explain Current Workspace
   ```
4. A progress notification will track the scan and agent analysis.
5. The **Carbon Intelligence Studio** panel opens beside your editor with:
   - Executive Summary
   - Tech Stack & Key Components
   - Visual Architecture Flowchart (with zoom, pan, and raw Mermaid view)
   - Discovered API Routes & Business Logic
   - **🎥 Explain with Video** button

---

## ⌨️ Available Commands

| Command | Title | Description |
|---|---|---|
| `carbon.explainWorkspace` | `Carbon: Explain Current Workspace` | Analyzes the current open workspace and displays interactive visual intelligence. |

---

## ⚙️ Configuration & Settings

You can customize your Carbon backend endpoint in VS Code Settings (`Ctrl + ,` or `Cmd + ,` $\to$ search for `Carbon`):

| Setting | Default | Description |
|---|---|---|
| `carbon.backendUrl` | `http://localhost:3002` | HTTPS URL of your deployed Carbon Backend server (or `http://localhost:3002` for local development). |

---

## 🔒 Security & Privacy Architecture

- **Zero Hardcoded Secrets**: The Carbon VS Code extension contains zero private keys or credentials.
- **Local Client Filtering**: Before any data leaves your machine, the workspace collector strictly ignores:
  - `.env*`, `.key`, `.pem`, `.p12`, `credentials.json`, `serviceaccount*.json`
  - `.git`, `node_modules`, `dist`, `build`, `.venv`, `.idea`, `.vscode`
  - Binary, image, video, font, and archive files
- **Strict Size Caps**: Requests are capped to safe budgets to ensure minimal bandwidth and maximum privacy.

---

## 🌐 Links & Resources

- **Official Website**: [https://carbons.codes](https://carbons.codes)
- **GitHub Repository**: [https://github.com/carbon-dev/carbon](https://github.com/carbon-dev/carbon)
- **Issues & Feedback**: [https://github.com/carbon-dev/carbon/issues](https://github.com/carbon-dev/carbon/issues)

---

## 📄 License

MIT © Carbon
