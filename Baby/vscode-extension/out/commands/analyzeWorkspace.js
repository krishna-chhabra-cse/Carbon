"use strict";
// ============================================================
//  src/commands/analyzeWorkspace.ts
//
//  Implements "Carbon: Explain Current Workspace".
// ============================================================
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeWorkspaceCommand = analyzeWorkspaceCommand;
const vscode = __importStar(require("vscode"));
const carbonClient_1 = require("../api/carbonClient");
const workspaceCollector_1 = require("../utils/workspaceCollector");
let activePanel;
async function analyzeWorkspaceCommand() {
    // 1. Make sure a workspace is actually open
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showErrorMessage('Carbon: No workspace is open. Open a folder in VS Code first (File > Open Folder).');
        return;
    }
    // Support single-root or first folder in multi-root workspaces
    const workspaceFolder = workspaceFolders[0];
    try {
        const result = await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Carbon: Analyzing ${workspaceFolder.name}…`,
            cancellable: false,
        }, async (progress) => {
            // Step 1: Collect safe files locally
            const payload = await (0, workspaceCollector_1.collectWorkspaceFiles)(workspaceFolder, (msg) => {
                progress.report({ message: msg });
            });
            if (payload.files.length === 0) {
                throw new Error('No eligible code files were found in this workspace.');
            }
            // Step 2: Send safe payload to backend and stream analysis events
            return (0, carbonClient_1.analyzeWorkspacePayload)(payload, (event) => {
                progress.report({ message: describeProgress(event.status) });
            });
        });
        showResultsPanel(workspaceFolder.name, result);
    }
    catch (err) {
        if (err instanceof carbonClient_1.CarbonApiError) {
            vscode.window.showErrorMessage(`Carbon: ${err.message}`);
        }
        else {
            const message = err instanceof Error ? err.message : String(err);
            vscode.window.showErrorMessage(`Carbon: Unexpected error during analysis — ${message}`);
        }
    }
}
function describeProgress(status) {
    switch (status) {
        case 'uploading':
            return 'Uploading workspace payload…';
        case 'reading_files':
            return 'Processing codebase AST…';
        case 'analyzing':
            return 'Running collaborative AI agents…';
        case 'node_finished':
            return 'Agent step finished…';
        default:
            return status;
    }
}
function showResultsPanel(workspaceName, result) {
    if (activePanel) {
        activePanel.dispose();
    }
    activePanel = vscode.window.createWebviewPanel('carbonAnalysis', `Carbon: ${workspaceName}`, vscode.ViewColumn.One, { enableScripts: true });
    activePanel.onDidDispose(() => {
        activePanel = undefined;
    });
    activePanel.webview.onDidReceiveMessage(async (message) => {
        if (message.command === 'explainWithVideo') {
            await generateVideoExplainer(result);
        }
        else if (message.command === 'openInSimpleBrowser') {
            // #4: Open URL inside VS Code's built-in Simple Browser panel
            const uri = vscode.Uri.parse(message.url);
            await vscode.commands.executeCommand('simpleBrowser.show', uri);
        }
        else if (message.command === 'openExternal') {
            // Open in the system's default browser
            await vscode.env.openExternal(vscode.Uri.parse(message.url));
        }
    });
    activePanel.webview.html = buildResultsHtml(workspaceName, result);
}
async function generateVideoExplainer(result) {
    try {
        const videoResult = await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Carbon: Generating video explanation on Scrimba…',
            cancellable: false,
        }, async (progress) => {
            progress.report({ message: 'Requesting Scrimba and writing video script…' });
            return (0, carbonClient_1.explainWithVideo)(result);
        });
        if (activePanel) {
            activePanel.webview.postMessage({ command: 'videoUrlReady', url: videoResult.url });
        }
        // Notify with the URL so the user can also copy it from the notification
        vscode.window.showInformationMessage(`Carbon: Video ready! ${videoResult.url}`, 'Open in Browser').then(choice => {
            if (choice === 'Open in Browser') {
                vscode.env.openExternal(vscode.Uri.parse(videoResult.url));
            }
        });
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        vscode.window.showErrorMessage(`Carbon: Failed to generate video explanation — ${msg}`);
        if (activePanel) {
            activePanel.webview.postMessage({ command: 'videoError', message: msg });
        }
    }
}
function buildResultsHtml(workspaceName, result) {
    const architecture = asRecord(result.architecture);
    const apiDocs = asRecord(result.api_docs);
    const businessLogic = asRecord(result.business_logic);
    const summary = pickString(architecture, ['summary', 'overview']) ?? 'No summary returned.';
    const techStack = pickString(architecture, ['tech_stack', 'techStack']) ?? renderUnavailable();
    const keyComponents = pickString(architecture, ['key_components', 'keyComponents', 'components']) ?? renderUnavailable();
    const diagram = pickString(architecture, ['diagram', 'mermaid', 'mermaid_diagram']);
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<style>
  body { font-family: var(--vscode-font-family); padding: 1.5rem; line-height: 1.5; }
  h1 { font-size: 1.3rem; margin-bottom: 1.5rem; }
  h2 { font-size: 1.05rem; margin-top: 2rem; border-bottom: 1px solid var(--vscode-panel-border); padding-bottom: 0.25rem; }
  pre { background: var(--vscode-textCodeBlock-background); padding: 0.75rem; overflow-x: auto; white-space: pre-wrap; }
  code { font-family: var(--vscode-editor-font-family); }
  .btn {
    padding: 8px 16px;
    background-color: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.95rem;
    font-weight: bold;
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
  .btn:hover { background-color: var(--vscode-button-hoverBackground); }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-secondary {
    background-color: var(--vscode-button-secondaryBackground, #3c3c3c);
    color: var(--vscode-button-secondaryForeground, #cccccc);
  }
  .btn-secondary:hover {
    background-color: var(--vscode-button-secondaryHoverBackground, #4c4c4c);
  }
  /* ── Video preview card (#3) ──────────────────────────────── */
  .video-card {
    display: none;
    margin-top: 1rem;
    padding: 1rem 1.25rem;
    border: 1px solid var(--vscode-panel-border);
    border-radius: 6px;
    background: var(--vscode-editor-inactiveSelectionBackground, rgba(255,255,255,0.04));
  }
  .video-card-header {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    margin-bottom: 0.5rem;
  }
  .video-card-icon { font-size: 1.5rem; }
  .video-card-title {
    font-weight: bold;
    font-size: 1rem;
    color: var(--vscode-editor-foreground);
  }
  .video-card-subtitle {
    font-size: 0.82rem;
    color: var(--vscode-descriptionForeground);
    margin-bottom: 0.75rem;
  }
  .video-card-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
  .video-card-error {
    display: none;
    margin-top: 0.6rem;
    font-size: 0.88rem;
    color: var(--vscode-testing-iconFailedColor, #F48771);
  }
  /* ── Interactive Architecture Diagram ──────────────────────── */
  .diagram-wrapper {
    margin-top: 0.5rem;
    border: 1px solid var(--vscode-panel-border);
    border-radius: 6px;
    background: var(--vscode-editor-inactiveSelectionBackground, rgba(255, 255, 255, 0.02));
    padding: 1rem;
  }
  .diagram-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--vscode-panel-border);
  }
  .mermaid-box {
    overflow-x: auto;
    display: flex;
    justify-content: center;
    padding: 1rem 0;
    min-height: 100px;
  }
  .mermaid-box svg {
    max-width: 100%;
    height: auto;
  }
</style>
</head>
<body>
  <h1>Carbon Analysis — ${escapeHtml(workspaceName)}</h1>

  <div style="margin-bottom: 2rem;">
    <button id="video-btn" class="btn">🎥 Explain with Video</button>
    <div id="video-status" style="margin-top: 0.5rem; font-size: 0.85rem; color: var(--vscode-descriptionForeground); display: none;"></div>

    <!-- #3 Video preview card: hidden until a URL arrives -->
    <div class="video-card" id="video-card">
      <div class="video-card-header">
        <span class="video-card-icon">🎬</span>
        <span class="video-card-title">Scrimba Video Explanation</span>
      </div>
      <div class="video-card-subtitle" id="video-card-url">Generating…</div>
      <div class="video-card-actions">
        <button id="open-browser-btn" class="btn">🌐 Open in Browser</button>
        <button id="open-vscode-btn" class="btn btn-secondary">⌨️ Open in VS Code</button>
      </div>
      <div class="video-card-error" id="video-card-error"></div>
    </div>
  </div>

  <h2>Summary</h2>
  <p>${escapeHtml(summary)}</p>

  <h2>Tech Stack</h2>
  <pre><code>${escapeHtml(techStack)}</code></pre>

  <h2>Key Components</h2>
  <pre><code>${escapeHtml(keyComponents)}</code></pre>

  ${diagram ? `
  <h2>Architecture Diagram</h2>
  <div class="diagram-wrapper">
    <div class="diagram-toolbar">
      <span style="font-size: 0.85rem; color: var(--vscode-descriptionForeground);">Interactive visual flowchart</span>
      <button id="toggle-raw-diagram-btn" class="btn btn-secondary" style="padding: 4px 8px; font-size: 0.8rem;">Show Mermaid Source</button>
    </div>
    <div id="mermaid-rendered" class="mermaid-box">
      <pre class="mermaid" style="background: transparent; border: none; display: flex; justify-content: center;">${escapeHtml(diagram)}</pre>
    </div>
    <div id="mermaid-raw" style="display: none; margin-top: 0.75rem;">
      <pre><code>${escapeHtml(diagram)}</code></pre>
    </div>
  </div>
  ` : ''}

  <h2>API Endpoints</h2>
  <pre><code>${escapeHtml(stringifyForDisplay(apiDocs))}</code></pre>

  <h2>Business Logic</h2>
  <pre><code>${escapeHtml(stringifyForDisplay(businessLogic))}</code></pre>

  <script>
    const vscode = acquireVsCodeApi();
    const videoBtn       = document.getElementById('video-btn');
    const videoStatus    = document.getElementById('video-status');
    const videoCard      = document.getElementById('video-card');
    const videoCardUrl   = document.getElementById('video-card-url');
    const videoCardError = document.getElementById('video-card-error');
    const openBrowserBtn = document.getElementById('open-browser-btn');
    const openVscodeBtn  = document.getElementById('open-vscode-btn');

    let currentVideoUrl = null;

    // ── Trigger video generation ──────────────────────────────
    videoBtn.addEventListener('click', () => {
      videoBtn.disabled = true;
      videoCard.style.display = 'none';
      videoCardError.style.display = 'none';
      videoStatus.style.display = 'block';
      videoStatus.textContent = '⚡ Initiating video generation — check VS Code notifications for progress...';
      vscode.postMessage({ command: 'explainWithVideo' });
    });

    // ── #4: Open in browser (external) ───────────────────────
    openBrowserBtn.addEventListener('click', () => {
      if (currentVideoUrl) {
        vscode.postMessage({ command: 'openExternal', url: currentVideoUrl });
      }
    });

    // ── #4: Open in VS Code Simple Browser ───────────────────
    openVscodeBtn.addEventListener('click', () => {
      if (currentVideoUrl) {
        vscode.postMessage({ command: 'openInSimpleBrowser', url: currentVideoUrl });
      }
    });

    // ── Receive messages from extension host ──────────────────
    window.addEventListener('message', (event) => {
      const msg = event.data;

      if (msg.command === 'videoUrlReady') {
        // #3: Show the video preview card
        currentVideoUrl = msg.url;
        videoBtn.disabled = false;
        videoStatus.style.display = 'none';
        videoCard.style.display = 'block';
        videoCardUrl.textContent = msg.url;
        videoCardError.style.display = 'none';

      } else if (msg.command === 'videoError') {
        // Show error inline in the card (or status area if card not yet shown)
        videoBtn.disabled = false;
        videoStatus.style.display = 'none';
        if (videoCard.style.display === 'block') {
          videoCardError.style.display = 'block';
          videoCardError.textContent = '\u274c ' + msg.message;
        } else {
          videoStatus.style.display = 'block';
          videoStatus.style.color = 'var(--vscode-testing-iconFailedColor, #F48771)';
          videoStatus.textContent = '\u274c Generation failed: ' + msg.message;
        }
      }
    });

    // ── Toggle Raw Mermaid Source ─────────────────────────────
    const toggleDiagramBtn = document.getElementById('toggle-raw-diagram-btn');
    const rawDiagramDiv = document.getElementById('mermaid-raw');

    if (toggleDiagramBtn && rawDiagramDiv) {
      toggleDiagramBtn.addEventListener('click', () => {
        const isHidden = rawDiagramDiv.style.display === 'none';
        rawDiagramDiv.style.display = isHidden ? 'block' : 'none';
        toggleDiagramBtn.textContent = isHidden ? 'Hide Mermaid Source' : 'Show Mermaid Source';
      });
    }
  </script>
  <script type="module">
    import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';
    try {
      const isDark = !document.body.classList.contains('vscode-light');
      mermaid.initialize({
        startOnLoad: true,
        theme: isDark ? 'dark' : 'default',
        securityLevel: 'loose',
        fontFamily: 'var(--vscode-font-family)'
      });
    } catch (err) {
      console.error('Mermaid render initialization error:', err);
    }
  </script>
</body>
</html>`;
}
function asRecord(value) {
    if (value && typeof value === 'object') {
        return value;
    }
    return {};
}
function pickString(record, keys) {
    for (const key of keys) {
        const value = record[key];
        if (typeof value === 'string' && value.trim()) {
            return value;
        }
    }
    return undefined;
}
function stringifyForDisplay(value) {
    if (value === undefined || value === null) {
        return renderUnavailable();
    }
    if (typeof value === 'string') {
        return value;
    }
    try {
        return JSON.stringify(value, null, 2);
    }
    catch {
        return String(value);
    }
}
function renderUnavailable() {
    return 'Not available for this analysis.';
}
function escapeHtml(input) {
    return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
//# sourceMappingURL=analyzeWorkspace.js.map