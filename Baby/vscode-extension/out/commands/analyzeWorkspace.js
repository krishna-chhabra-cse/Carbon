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
let activePanel;
async function analyzeWorkspaceCommand() {
    // 1. Make sure a workspace is actually open
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showErrorMessage('Carbon: No workspace is open. Open a folder in VS Code first (File > Open Folder).');
        return;
    }
    // MVP: analyze the first workspace folder. Multi-root workspaces can be
    // supported later by letting the user pick one.
    const workspaceFolder = workspaceFolders[0];
    const localPath = workspaceFolder.uri.fsPath;
    if (!localPath) {
        vscode.window.showErrorMessage('Carbon: Could not resolve a filesystem path for the open workspace.');
        return;
    }
    try {
        const result = await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Carbon: Analyzing workspace…',
            cancellable: false,
        }, async (progress) => {
            return (0, carbonClient_1.analyzeLocalPath)(localPath, (event) => {
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
        case 'reading_workspace':
            return 'Reading workspace files…';
        case 'reading_files':
            return 'Reading files…';
        case 'analyzing':
            return 'Running analysis agents…';
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
        vscode.env.openExternal(vscode.Uri.parse(videoResult.url));
        vscode.window.showInformationMessage('Carbon: Video explanation generated on Scrimba!');
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
  .btn:hover {
    background-color: var(--vscode-button-hoverBackground);
  }
  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
</head>
<body>
  <h1>Carbon Analysis — ${escapeHtml(workspaceName)}</h1>

  <div style="margin-bottom: 2rem;">
    <button id="video-btn" class="btn">🎥 Explain with Video</button>
    <div id="video-status" style="margin-top: 0.5rem; font-size: 0.9rem; display: none;"></div>
  </div>

  <h2>Summary</h2>
  <p>${escapeHtml(summary)}</p>

  <h2>Tech Stack</h2>
  <pre><code>${escapeHtml(techStack)}</code></pre>

  <h2>Key Components</h2>
  <pre><code>${escapeHtml(keyComponents)}</code></pre>

  ${diagram ? `
  <h2>Architecture Diagram (Mermaid source)</h2>
  <p><em>Rendered diagrams aren't wired up yet in this MVP — showing the raw Mermaid definition below. Paste it into the web app or the <a href="https://mermaid.live">Mermaid Live Editor</a> to view it visually.</em></p>
  <pre><code>${escapeHtml(diagram)}</code></pre>
  ` : ''}

  <h2>API Endpoints</h2>
  <pre><code>${escapeHtml(stringifyForDisplay(apiDocs))}</code></pre>

  <h2>Business Logic</h2>
  <pre><code>${escapeHtml(stringifyForDisplay(businessLogic))}</code></pre>

  <script>
    const vscode = acquireVsCodeApi();
    const videoBtn = document.getElementById('video-btn');
    const videoStatus = document.getElementById('video-status');

    videoBtn.addEventListener('click', () => {
      videoBtn.disabled = true;
      videoStatus.style.display = 'block';
      videoStatus.style.color = 'var(--vscode-descriptionForeground)';
      videoStatus.innerHTML = '⚡ Initiating video generation. Please check VS Code notifications for progress...';
      
      vscode.postMessage({ command: 'explainWithVideo' });
    });

    window.addEventListener('message', (event) => {
      const message = event.data;
      if (message.command === 'videoUrlReady') {
        videoBtn.disabled = false;
        videoStatus.style.color = 'var(--vscode-testing-iconPassedColor, #89D185)';
        videoStatus.innerHTML = '🎉 Video explanation is ready! <a href="' + message.url + '" style="color: var(--vscode-textLink-foreground); font-weight: bold;">Click here to watch on Scrimba</a>';
      } else if (message.command === 'videoError') {
        videoBtn.disabled = false;
        videoStatus.style.color = 'var(--vscode-testing-iconFailedColor, #F48771)';
        videoStatus.innerHTML = '❌ Generation failed: ' + message.message;
      }
    });
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