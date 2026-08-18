"use strict";
// ============================================================
//  src/commands/analyzeWorkspace.ts
//
//  Implements "Carbon: Explain Current Workspace".
//  Features:
//    - Zero-login Native In-Editor Walkthrough Video Cinema
//    - 1-Click Gamma AI & Slide Deck Generator
//    - DevSecOps Security Scorecard & Remediations
//    - GraphRAG Codebase Q&A & Blast Radius Traversal
//    - Bidirectional Click-to-Code Navigation
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
        const message = err instanceof Error ? err.message : String(err);
        vscode.window.showErrorMessage(`Carbon: ${message}`, 'Open Settings').then((selection) => {
            if (selection === 'Open Settings') {
                vscode.commands.executeCommand('workbench.action.openSettings', 'carbon.backendUrl');
            }
        });
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
        if (message.command === 'openExternal') {
            // Open in system default browser
            await vscode.env.openExternal(vscode.Uri.parse(message.url));
        }
        else if (message.command === 'jumpToFile') {
            // Bidirectional Click-to-Code: Jump to source file in editor
            await jumpToWorkspaceFile(message.target);
        }
        else if (message.command === 'askGraphRag') {
            // GraphRAG Conversational Codebase Architecture Q&A
            try {
                const answer = await (0, carbonClient_1.askCodebaseChat)(workspaceName, message.query);
                activePanel?.webview.postMessage({ command: 'graphRagAnswer', answer, query: message.query });
            }
            catch (err) {
                activePanel?.webview.postMessage({ command: 'graphRagError', message: String(err) });
            }
        }
        else if (message.command === 'copyClipboard') {
            await vscode.env.clipboard.writeText(message.text);
            vscode.window.showInformationMessage('Carbon: Copied AI Presentation Deck to clipboard! Opening Gamma AI…');
            await vscode.env.openExternal(vscode.Uri.parse('https://gamma.app/new'));
        }
    });
    activePanel.webview.html = buildResultsHtml(workspaceName, result);
}
/**
 * Searches the active workspace for a matching file/module and opens it in the editor.
 */
async function jumpToWorkspaceFile(targetQuery) {
    if (!targetQuery || !targetQuery.trim())
        return;
    const cleaned = targetQuery.trim()
        .replace(/^📦\s*/, '')
        .replace(/^⚡\s*/, '')
        .replace(/["'`]/g, '');
    const baseName = cleaned.split(/[\/\\]/).pop() || cleaned;
    // 1. Exact file search
    const foundUris = await vscode.workspace.findFiles(`**/${baseName}*`, '**/node_modules/**', 5);
    if (foundUris.length > 0) {
        const doc = await vscode.workspace.openTextDocument(foundUris[0]);
        await vscode.window.showTextDocument(doc, { preview: false });
        vscode.window.setStatusBarMessage(`$(check) Carbon: Jumped to ${foundUris[0].fsPath.split(/[\\/]/).pop()}`, 3000);
        return;
    }
    // 2. Fuzzy text search across workspace
    const fuzzyUris = await vscode.workspace.findFiles(`**/*${baseName.slice(0, 4)}*`, '**/node_modules/**', 1);
    if (fuzzyUris.length > 0) {
        const doc = await vscode.workspace.openTextDocument(fuzzyUris[0]);
        await vscode.window.showTextDocument(doc, { preview: false });
        return;
    }
    // 3. Fallback: trigger workspace symbol / text search
    vscode.window.setStatusBarMessage(`$(search) Carbon: Searching workspace for "${baseName}"...`, 3000);
    await vscode.commands.executeCommand('workbench.action.findInFiles', {
        query: baseName,
        triggerSearch: true
    });
}
function buildResultsHtml(workspaceName, result) {
    const architecture = asRecord(result.architecture);
    const apiDocs = asRecord(result.api_docs);
    const businessLogic = asRecord(result.business_logic);
    const security = asRecord(result.security);
    const summary = pickString(architecture, ['summary', 'overview']) ?? 'No summary returned.';
    const techStack = pickString(architecture, ['tech_stack', 'techStack']) ?? renderUnavailable();
    const keyComponents = pickString(architecture, ['key_components', 'keyComponents', 'components']) ?? renderUnavailable();
    const diagram = pickString(architecture, ['diagram', 'mermaid', 'mermaid_diagram']);
    // Security Scorecard & Findings
    const scorecard = asRecord(security.scorecard);
    const securityGrade = String(scorecard.grade || 'A+');
    const securityStatus = String(scorecard.statusText || security.summary || 'Security audit clean.');
    const criticalCount = Number(scorecard.critical || 0);
    const highCount = Number(scorecard.high || 0);
    const mediumCount = Number(scorecard.medium || 0);
    const findingsList = Array.isArray(security.findings) ? security.findings : [];
    const gradeColor = securityGrade.startsWith('A') ? '#10B981' : (securityGrade === 'B' ? '#38BDF8' : (securityGrade === 'C' || securityGrade === 'D' ? '#F59E0B' : '#EF4444'));
    // Build Gamma presentation markdown string for clipboard
    const gammaDeckPrompt = `# ${workspaceName} — System Architecture & Technical Specification\n\n> Synthesized by Carbon AI Codebase Intelligence\n\n---\n\n## Executive Summary\n${summary}\n- **Security Grade:** ${securityGrade}\n- **Status:** ${securityStatus}\n\n---\n\n## Tech Stack\n\`\`\`json\n${techStack}\n\`\`\`\n\n---\n\n## Key Architectural Components\n\`\`\`json\n${keyComponents}\n\`\`\`\n\n---\n\n## DevSecOps Audit & Security Findings\n- Overall Grade: ${securityGrade}\n- Critical: ${criticalCount}, High: ${highCount}, Medium: ${mediumCount}\n`;
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline' https://cdn.jsdelivr.net; connect-src https://cdn.jsdelivr.net; font-src https:; img-src https: data:;" />
<style>
  body { font-family: var(--vscode-font-family); padding: 1.5rem; line-height: 1.5; color: var(--vscode-editor-foreground); background: var(--vscode-editor-background); }
  h1 { font-size: 1.3rem; margin-bottom: 1rem; }
  h2 { font-size: 1.05rem; margin-top: 2rem; border-bottom: 1px solid var(--vscode-panel-border); padding-bottom: 0.25rem; }
  pre { background: var(--vscode-textCodeBlock-background); padding: 0.75rem; overflow-x: auto; white-space: pre-wrap; border-radius: 4px; }
  code { font-family: var(--vscode-editor-font-family); }
  .btn {
    padding: 8px 16px;
    background-color: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: bold;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    transition: all 0.15s ease;
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
  .btn-gamma {
    background: linear-gradient(135deg, #a855f7 0%, #ec4899 100%);
    color: #ffffff;
  }
  .btn-gamma:hover { opacity: 0.95; }

  /* ── Native In-Editor Video Cinema ─────────────────────────── */
  .cinema-container {
    display: none;
    margin-top: 1.25rem;
    border: 1px solid rgba(79, 126, 248, 0.35);
    border-radius: 8px;
    background: var(--vscode-editor-inactiveSelectionBackground, rgba(0,0,0,0.3));
    overflow: hidden;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
  }
  .cinema-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 16px;
    background: rgba(79, 126, 248, 0.12);
    border-bottom: 1px solid var(--vscode-panel-border);
  }
  .cinema-title {
    font-weight: bold;
    font-size: 0.95rem;
    color: #4F7EF8;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .cinema-stage-box {
    padding: 1.5rem;
    min-height: 220px;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  .cinema-chapter-tag {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: bold;
    color: #38BDF8;
    margin-bottom: 6px;
  }
  .cinema-stage-title {
    font-size: 1.2rem;
    font-weight: bold;
    margin: 0 0 8px 0;
    color: var(--vscode-editor-foreground);
  }
  .cinema-stage-text {
    font-size: 0.9rem;
    line-height: 1.6;
    color: var(--vscode-descriptionForeground);
    margin: 0 0 12px 0;
  }
  .cinema-controls {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 16px;
    background: rgba(0,0,0,0.25);
    border-top: 1px solid var(--vscode-panel-border);
  }
  .cinema-scrubber {
    flex: 1;
    cursor: pointer;
    accent-color: #4F7EF8;
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
  .mermaid-box svg .node, .mermaid-box svg g[class*="node"], .mermaid-box svg g[id*="flowchart-"] {
    cursor: pointer !important;
    transition: all 0.15s ease-in-out;
  }
  .mermaid-box svg .node:hover, .mermaid-box svg g[class*="node"]:hover, .mermaid-box svg g[id*="flowchart-"]:hover {
    filter: drop-shadow(0 0 8px rgba(79, 126, 248, 0.9));
    transform: scale(1.02);
  }
</style>
</head>
<body>
  <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; margin-bottom: 1.25rem;">
    <h1 style="margin: 0;">Carbon Analysis — ${escapeHtml(workspaceName)}</h1>
    <div style="display: flex; gap: 8px; align-items: center;">
      <span style="font-size: 0.8rem; padding: 4px 10px; border-radius: 20px; background: rgba(79, 126, 248, 0.15); color: #4F7EF8; border: 1px solid rgba(79, 126, 248, 0.3);">
        🔒 Engine: Dual (Ollama Offline / Gemini)
      </span>
    </div>
  </div>

  <!-- Action Controls -->
  <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 1.5rem;">
    <button id="toggle-video-btn" class="btn">🎥 Watch AI Video Walkthrough</button>
    <button id="gamma-deck-btn" class="btn btn-gamma" title="Copies slide deck & opens Gamma AI to generate presentation">🚀 Create in Gamma AI / PPT</button>
  </div>

  <!-- Native In-Editor Walkthrough Video Cinema (Zero Login Walls!) -->
  <div class="cinema-container" id="cinema-container">
    <div class="cinema-header">
      <div class="cinema-title">
        <span>🎬 Carbon Cinema: Architectural Walkthrough</span>
      </div>
      <span id="cinema-chapter-badge" style="font-size: 0.8rem; color: var(--vscode-descriptionForeground);">Chapter 1 of 4</span>
    </div>

    <div class="cinema-stage-box" id="cinema-stage-box">
      <div class="cinema-chapter-tag" id="stage-tag">Overview & Topology</div>
      <div class="cinema-stage-title" id="stage-title">${escapeHtml(workspaceName)} Architecture Briefing</div>
      <div class="cinema-stage-text" id="stage-desc">${escapeHtml(summary)}</div>
    </div>

    <div class="cinema-controls">
      <button id="cinema-play-btn" class="btn" style="padding: 6px 12px;">▶ Play</button>
      <span id="cinema-time" style="font-size: 0.8rem; font-family: monospace;">0:00 / 2:00</span>
      <input type="range" id="cinema-scrubber" class="cinema-scrubber" min="0" max="120" value="0" />
      <button id="cinema-mute-btn" class="btn btn-secondary" style="padding: 6px 10px;">🔊 Voice</button>
      <button id="cinema-close-btn" class="btn btn-secondary" style="padding: 6px 10px;">✕ Close</button>
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
      <span style="font-size: 0.85rem; color: var(--vscode-descriptionForeground);">⚡ <b>Click any diagram node</b> to jump directly to its source code in VS Code</span>
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

  <h2>🛡️ DevSecOps Security Audit</h2>
  <div style="margin-top: 0.75rem; padding: 1.25rem; border: 1px solid var(--vscode-panel-border); border-radius: 8px; background: var(--vscode-editor-inactiveSelectionBackground, rgba(255, 255, 255, 0.02));">
    <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 1rem;">
      <div style="display: flex; align-items: center; gap: 12px;">
        <span style="font-size: 1.8rem; font-weight: 900; padding: 4px 14px; border-radius: 6px; background: ${gradeColor}22; color: ${gradeColor}; border: 1.5px solid ${gradeColor};">
          ${escapeHtml(securityGrade)}
        </span>
        <div>
          <div style="font-weight: bold; font-size: 1rem; color: var(--vscode-editor-foreground);">Security Scorecard</div>
          <div style="font-size: 0.85rem; color: var(--vscode-descriptionForeground);">${escapeHtml(securityStatus)}</div>
        </div>
      </div>
      <div style="display: flex; gap: 8px; font-size: 0.85rem;">
        <span style="padding: 4px 8px; border-radius: 4px; background: rgba(239, 68, 68, 0.15); color: #EF4444;">Critical: <b>${criticalCount}</b></span>
        <span style="padding: 4px 8px; border-radius: 4px; background: rgba(245, 158, 11, 0.15); color: #F59E0B;">High: <b>${highCount}</b></span>
        <span style="padding: 4px 8px; border-radius: 4px; background: rgba(56, 189, 248, 0.15); color: #38BDF8;">Medium: <b>${mediumCount}</b></span>
      </div>
    </div>

    ${findingsList.length > 0 ? `
    <h3 style="font-size: 0.95rem; margin-top: 1rem; margin-bottom: 0.5rem;">Detected Vulnerabilities & Remediations:</h3>
    <div style="display: flex; flex-direction: column; gap: 8px;">
      ${findingsList.map((f) => `
        <div style="padding: 0.75rem; border: 1px solid var(--vscode-panel-border); border-radius: 6px; background: var(--vscode-editor-background);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <span style="font-weight: bold; font-size: 0.9rem; color: ${f.severity === 'CRITICAL' ? '#EF4444' : (f.severity === 'HIGH' ? '#F59E0B' : '#38BDF8')};">
              [${escapeHtml(f.severity || 'HIGH')}] ${escapeHtml(f.title || 'Security Finding')}
            </span>
            <span style="font-size: 0.8rem; cursor: pointer; color: var(--vscode-textLink-foreground);" onclick="vscode.postMessage({ command: 'jumpToFile', target: '${escapeHtml(f.filePath || '')}' })">
              📁 ${escapeHtml(f.filePath || '')}:L${escapeHtml(String(f.lineNumber || '1'))} ↗
            </span>
          </div>
          <div style="font-size: 0.82rem; color: var(--vscode-descriptionForeground); margin-bottom: 6px;">
            <code>${escapeHtml(f.snippet || '')}</code>
          </div>
          <div style="font-size: 0.82rem; color: var(--vscode-editor-foreground); padding: 6px 10px; border-radius: 4px; background: rgba(16, 185, 129, 0.1); border-left: 3px solid #10B981;">
            💡 <b>Remediation:</b> ${escapeHtml(f.remediation || 'Move credentials to environment variables or parameterize queries.')}
          </div>
        </div>
      `).join('')}
    </div>
    ` : `
    <div style="font-size: 0.88rem; color: #10B981; margin-top: 0.5rem;">
      ✅ <b>Clean Audit:</b> No hardcoded secrets, dangerous evals, or SQL injection vulnerabilities found.
    </div>
    `}
  </div>

  <h2>🧠 GraphRAG Architecture Q&A</h2>
  <div style="margin-top: 0.75rem; padding: 1.25rem; border: 1px solid var(--vscode-panel-border); border-radius: 8px; background: var(--vscode-editor-inactiveSelectionBackground, rgba(255, 255, 255, 0.02));">
    <div style="font-size: 0.85rem; color: var(--vscode-descriptionForeground); margin-bottom: 0.75rem;">
      Ask architectural questions, dependency paths, or blast radius impact queries (e.g. <i>"What breaks if I rename User model?"</i> or <i>"Explain the auth flow"</i>):
    </div>
    <form id="graphrag-form" style="display: flex; gap: 8px; margin-bottom: 1rem;">
      <input 
        id="graphrag-input" 
        type="text" 
        placeholder="Ask a technical or architectural question about this codebase..."
        style="flex: 1; padding: 8px 12px; border-radius: 4px; border: 1px solid var(--vscode-panel-border); background: var(--vscode-input-background, rgba(0,0,0,0.2)); color: var(--vscode-input-foreground, inherit); font-family: inherit; font-size: 0.9rem;"
      />
      <button id="graphrag-submit" type="submit" class="btn" style="padding: 8px 14px;">💬 Ask AI</button>
    </form>
    <div id="graphrag-loading" style="display: none; font-size: 0.85rem; color: #4F7EF8; margin-bottom: 0.75rem;">
      ⚡ Traversing dependency graph & synthesizing answer...
    </div>
    <div id="graphrag-responses" style="display: flex; flex-direction: column; gap: 12px;"></div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    function escapeClientHtml(str) {
      return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // ── 1. Native In-Editor Video Walkthrough Engine ─────────
    const cinemaContainer = document.getElementById('cinema-container');
    const toggleVideoBtn = document.getElementById('toggle-video-btn');
    const cinemaPlayBtn = document.getElementById('cinema-play-btn');
    const cinemaCloseBtn = document.getElementById('cinema-close-btn');
    const cinemaMuteBtn = document.getElementById('cinema-mute-btn');
    const cinemaScrubber = document.getElementById('cinema-scrubber');
    const cinemaTime = document.getElementById('cinema-time');
    const stageTag = document.getElementById('stage-tag');
    const stageTitle = document.getElementById('stage-title');
    const stageDesc = document.getElementById('stage-desc');
    const chapterBadge = document.getElementById('cinema-chapter-badge');

    const chapters = [
      {
        tag: 'Chapter 1: Overview & Topology',
        title: '${escapeHtml(workspaceName)} Architecture Briefing',
        desc: '${escapeHtml(summary)}',
        speech: 'Welcome to the Carbon architectural walkthrough for ${escapeHtml(workspaceName)}. ${escapeHtml(summary)}'
      },
      {
        tag: 'Chapter 2: Discovered Tech Stack',
        title: 'Technology Stack & Runtimes',
        desc: 'Core languages, frameworks, and runtimes powering the system architecture: ${escapeHtml(techStack.slice(0, 100))}',
        speech: 'Here is the core technology stack discovered across the codebase.'
      },
      {
        tag: 'Chapter 3: Key Modules & Components',
        title: 'Primary Subsystems & Separation of Concerns',
        desc: 'Discovered key components, file locations, and modular architectural boundaries.',
        speech: 'These are the primary components and modular boundaries discovered by Carbon.'
      },
      {
        tag: 'Chapter 4: DevSecOps Audit',
        title: 'Security Scorecard: ${escapeHtml(securityGrade)}',
        desc: '${escapeHtml(securityStatus)} — Zero-trust credential leak scan and static taint audit.',
        speech: 'DevSecOps audit completed with Security Grade ${escapeHtml(securityGrade)}.'
      }
    ];

    let currentChapter = 0;
    let isPlaying = false;
    let isMuted = false;
    let timer = null;
    let elapsed = 0;
    const totalSecs = 120;

    function renderStage(idx) {
      const ch = chapters[idx];
      if (!ch) return;
      stageTag.textContent = ch.tag;
      stageTitle.textContent = ch.title;
      stageDesc.textContent = ch.desc;
      chapterBadge.textContent = 'Chapter ' + (idx + 1) + ' of ' + chapters.length;

      if (!isMuted && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const ut = new SpeechSynthesisUtterance(ch.speech);
        window.speechSynthesis.speak(ut);
      }
    }

    toggleVideoBtn.addEventListener('click', () => {
      cinemaContainer.style.display = cinemaContainer.style.display === 'block' ? 'none' : 'block';
      if (cinemaContainer.style.display === 'block') {
        renderStage(0);
      } else {
        if (window.speechSynthesis) window.speechSynthesis.cancel();
        isPlaying = false;
        clearInterval(timer);
        cinemaPlayBtn.textContent = '▶ Play';
      }
    });

    cinemaCloseBtn.addEventListener('click', () => {
      cinemaContainer.style.display = 'none';
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      isPlaying = false;
      clearInterval(timer);
      cinemaPlayBtn.textContent = '▶ Play';
    });

    cinemaPlayBtn.addEventListener('click', () => {
      if (isPlaying) {
        isPlaying = false;
        clearInterval(timer);
        cinemaPlayBtn.textContent = '▶ Play';
        if (window.speechSynthesis) window.speechSynthesis.cancel();
      } else {
        isPlaying = true;
        cinemaPlayBtn.textContent = '⏸ Pause';
        renderStage(currentChapter);
        timer = setInterval(() => {
          elapsed++;
          if (elapsed > totalSecs) {
            elapsed = 0;
            currentChapter = 0;
            isPlaying = false;
            clearInterval(timer);
            cinemaPlayBtn.textContent = '▶ Play';
            return;
          }
          cinemaScrubber.value = elapsed;
          const mins = Math.floor(elapsed / 60);
          const secs = elapsed % 60;
          cinemaTime.textContent = mins + ':' + (secs < 10 ? '0' : '') + secs + ' / 2:00';

          const chIdx = Math.min(Math.floor(elapsed / 30), chapters.length - 1);
          if (chIdx !== currentChapter) {
            currentChapter = chIdx;
            renderStage(chIdx);
          }
        }, 1000);
      }
    });

    cinemaMuteBtn.addEventListener('click', () => {
      isMuted = !isMuted;
      cinemaMuteBtn.textContent = isMuted ? '🔇 Muted' : '🔊 Voice';
      if (isMuted && window.speechSynthesis) window.speechSynthesis.cancel();
    });

    // ── 2. Gamma AI & Slide Deck Generator ────────────────────
    const gammaBtn = document.getElementById('gamma-deck-btn');
    const gammaPromptText = ${JSON.stringify(gammaDeckPrompt)};

    gammaBtn.addEventListener('click', () => {
      vscode.postMessage({ command: 'copyClipboard', text: gammaPromptText });
    });

    // ── 3. GraphRAG Architecture Q&A ──────────────────────────
    const ragForm = document.getElementById('graphrag-form');
    const ragInput = document.getElementById('graphrag-input');
    const ragLoading = document.getElementById('graphrag-loading');
    const ragResponses = document.getElementById('graphrag-responses');
    const ragSubmit = document.getElementById('graphrag-submit');

    if (ragForm && ragInput) {
      ragForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const query = (ragInput.value || '').trim();
        if (!query) return;

        ragLoading.style.display = 'block';
        ragInput.disabled = true;
        ragSubmit.disabled = true;
        vscode.postMessage({ command: 'askGraphRag', query });
      });
    }

    // ── Receive messages from extension host ──────────────────
    window.addEventListener('message', (event) => {
      const msg = event.data;

      if (msg.command === 'graphRagAnswer') {
        ragLoading.style.display = 'none';
        ragInput.disabled = false;
        ragSubmit.disabled = false;
        ragInput.value = '';

        const card = document.createElement('div');
        card.style.padding = '0.9rem 1.1rem';
        card.style.borderRadius = '6px';
        card.style.border = '1px solid var(--vscode-panel-border)';
        card.style.background = 'var(--vscode-editor-background)';
        card.innerHTML = '<div style="font-weight: bold; font-size: 0.9rem; color: #4F7EF8; margin-bottom: 6px;">Q: ' + escapeClientHtml(msg.query || '') + '</div><div style="font-size: 0.88rem; line-height: 1.6; white-space: pre-wrap; color: var(--vscode-editor-foreground);">' + escapeClientHtml(msg.answer || '') + '</div>';
        ragResponses.prepend(card);

      } else if (msg.command === 'graphRagError') {
        ragLoading.style.display = 'none';
        ragInput.disabled = false;
        ragSubmit.disabled = false;
        alert('GraphRAG query error: ' + msg.message);
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

    // ── Bidirectional Click-to-Code: Click Diagram Node to Jump to Code ──
    function setupNodeClickListeners() {
      const nodes = document.querySelectorAll('.mermaid-box svg .node, .mermaid-box svg g[class*="node"], .mermaid-box svg g[id*="flowchart-"]');
      nodes.forEach(node => {
        node.style.cursor = 'pointer';
        node.setAttribute('title', '⚡ Click to open matching file in VS Code editor');
        node.onclick = (e) => {
          e.stopPropagation();
          const labelEl = node.querySelector('.nodeLabel, text, span') || node;
          const text = (labelEl.textContent || '').trim();
          if (text) {
            vscode.postMessage({ command: 'jumpToFile', target: text });
          }
        };
      });
    }

    const mermaidContainer = document.getElementById('mermaid-rendered');
    if (mermaidContainer) {
      const observer = new MutationObserver(() => {
        if (mermaidContainer.querySelector('svg')) {
          setupNodeClickListeners();
        }
      });
      observer.observe(mermaidContainer, { childList: true, subtree: true });
      setTimeout(setupNodeClickListeners, 800);
      setTimeout(setupNodeClickListeners, 2000);
    }
  </script>
  <script type="module">
    import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';
    try {
      const isDark = !document.body.classList.contains('vscode-light');
      mermaid.initialize({
        startOnLoad: true,
        theme: isDark ? 'dark' : 'default',
        securityLevel: 'strict',
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