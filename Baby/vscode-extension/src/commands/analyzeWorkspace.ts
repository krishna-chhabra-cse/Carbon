// ============================================================
//  src/commands/analyzeWorkspace.ts
//
//  Implements "Carbon: Explain Current Workspace".
// ============================================================

import * as vscode from 'vscode';
import { analyzeWorkspacePayload, AnalyzeFinalResult, CarbonApiError, explainWithVideo } from '../api/carbonClient';
import { collectWorkspaceFiles } from '../utils/workspaceCollector';

let activePanel: vscode.WebviewPanel | undefined;

export async function analyzeWorkspaceCommand(): Promise<void> {
  // 1. Make sure a workspace is actually open
  const workspaceFolders = vscode.workspace.workspaceFolders;

  if (!workspaceFolders || workspaceFolders.length === 0) {
    vscode.window.showErrorMessage(
      'Carbon: No workspace is open. Open a folder in VS Code first (File > Open Folder).'
    );
    return;
  }

  // Support single-root or first folder in multi-root workspaces
  const workspaceFolder = workspaceFolders[0];

  try {
    const result = await vscode.window.withProgress<AnalyzeFinalResult>(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Carbon: Analyzing ${workspaceFolder.name}…`,
        cancellable: false,
      },
      async (progress) => {
        // Step 1: Collect safe files locally
        const payload = await collectWorkspaceFiles(workspaceFolder, (msg) => {
          progress.report({ message: msg });
        });

        if (payload.files.length === 0) {
          throw new Error('No eligible code files were found in this workspace.');
        }

        // Step 2: Send safe payload to backend and stream analysis events
        return analyzeWorkspacePayload(payload, (event) => {
          progress.report({ message: describeProgress(event.status) });
        });
      }
    );

    showResultsPanel(workspaceFolder.name, result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    vscode.window.showErrorMessage(
      `Carbon: ${message}`,
      'Open Settings'
    ).then((selection) => {
      if (selection === 'Open Settings') {
        vscode.commands.executeCommand('workbench.action.openSettings', 'carbon.backendUrl');
      }
    });
  }
}

function describeProgress(status: string): string {
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

function showResultsPanel(workspaceName: string, result: AnalyzeFinalResult): void {
  if (activePanel) {
    activePanel.dispose();
  }

  activePanel = vscode.window.createWebviewPanel(
    'carbonAnalysis',
    `Carbon: ${workspaceName}`,
    vscode.ViewColumn.One,
    { enableScripts: true }
  );

  activePanel.onDidDispose(() => {
    activePanel = undefined;
  });

  activePanel.webview.onDidReceiveMessage(async (message) => {
    if (message.command === 'explainWithVideo') {
      await generateVideoExplainer(result);
    } else if (message.command === 'openInSimpleBrowser') {
      // #4: Open URL inside VS Code's built-in Simple Browser panel
      const uri = vscode.Uri.parse(message.url);
      await vscode.commands.executeCommand('simpleBrowser.show', uri);
    } else if (message.command === 'openExternal') {
      // Open in the system's default browser
      await vscode.env.openExternal(vscode.Uri.parse(message.url));
    } else if (message.command === 'jumpToFile') {
      // Bidirectional Click-to-Code: Jump to source file in editor
      await jumpToWorkspaceFile(message.target);
    }
  });

  activePanel.webview.html = buildResultsHtml(workspaceName, result);
}

async function generateVideoExplainer(result: AnalyzeFinalResult): Promise<void> {
  try {
    const videoResult = await vscode.window.withProgress<{ url: string }>(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Carbon: Generating video explanation on Scrimba…',
        cancellable: false,
      },
      async (progress) => {
        progress.report({ message: 'Requesting Scrimba and writing video script…' });
        return explainWithVideo(result);
      }
    );

    if (activePanel) {
      activePanel.webview.postMessage({ command: 'videoUrlReady', url: videoResult.url });
    }

    // Notify with the URL so the user can also copy it from the notification
    vscode.window.showInformationMessage(
      `Carbon: Video ready! ${videoResult.url}`,
      'Open in Browser'
    ).then(choice => {
      if (choice === 'Open in Browser') {
        vscode.env.openExternal(vscode.Uri.parse(videoResult.url));
      }
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    vscode.window.showErrorMessage(`Carbon: Failed to generate video explanation — ${msg}`);
    if (activePanel) {
      activePanel.webview.postMessage({ command: 'videoError', message: msg });
    }
  }
}

/**
 * Searches the active workspace for a matching file/module and opens it in the editor.
 *
 * @param target String representation of the node clicked in the Mermaid diagram
 */
async function jumpToWorkspaceFile(target: string): Promise<void> {
  if (!target || typeof target !== 'string') {
    return;
  }

  // Clean the node label (strip symbols, brackets, method prefixes)
  const cleaned = target
    .replace(/^\[(NEW|MODIFIED|DELETED)\]\s*/i, '')
    .replace(/^(GET|POST|PUT|DELETE|PATCH)\s+/i, '')
    .replace(/[\(\)\[\]\{\}'"`,;:<>]/g, ' ')
    .trim();

  // Look for file path candidates with extensions (e.g. auth.js, User.py, schema.prisma)
  const tokens = cleaned.split(/\s+/).filter(t => /\.[a-zA-Z0-9_-]{1,6}$/.test(t) || t.includes('/'));
  const candidate = tokens[0] || cleaned.split(/\s+/)[0];

  if (!candidate || candidate.length < 2) {
    return;
  }

  const baseName = candidate.split('/').pop() || candidate;

  // Search workspace for matching file
  const matchedUris = await vscode.workspace.findFiles(`**/${baseName}*`, '**/node_modules/**', 5);

  if (matchedUris.length > 0) {
    const targetUri = matchedUris[0];
    const doc = await vscode.workspace.openTextDocument(targetUri);
    await vscode.window.showTextDocument(doc, {
      viewColumn: vscode.ViewColumn.Beside,
      preserveFocus: false,
      preview: true
    });
    vscode.window.setStatusBarMessage(`$(file-code) Carbon: Opened ${vscode.workspace.asRelativePath(targetUri)}`, 4000);
  } else {
    // If not found as a file, perform a symbol / text search across workspace
    vscode.window.setStatusBarMessage(`$(search) Carbon: Searching workspace for "${baseName}"...`, 3000);
    await vscode.commands.executeCommand('workbench.action.findInFiles', {
      query: baseName,
      triggerSearch: true
    });
  }
}

function buildResultsHtml(workspaceName: string, result: AnalyzeFinalResult): string {
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
  const totalFindings = Number(scorecard.totalFindings || 0);
  const criticalCount = Number(scorecard.critical || 0);
  const highCount = Number(scorecard.high || 0);
  const mediumCount = Number(scorecard.medium || 0);
  const lowCount = Number(scorecard.low || 0);
  const findingsList = Array.isArray(security.findings) ? security.findings : [];
  const remediationsList = Array.isArray(security.remediations) ? security.remediations : [];

  const gradeColor = securityGrade.startsWith('A') ? '#10B981' : (securityGrade === 'B' ? '#38BDF8' : (securityGrade === 'C' || securityGrade === 'D' ? '#F59E0B' : '#EF4444'));

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline' https://cdn.jsdelivr.net; connect-src https://cdn.jsdelivr.net; font-src https:; img-src https: data:;" />
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
  /* ── Interactive Click-to-Code Nodes ── */
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
      ${findingsList.map((f: any) => `
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

    // Monitor for Mermaid rendering completion
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

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object') {
    return value as Record<string, unknown>;
  }
  return {};
}

function pickString(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
  }
  return undefined;
}

function stringifyForDisplay(value: unknown): string {
  if (value === undefined || value === null) {
    return renderUnavailable();
  }
  if (typeof value === 'string') {
    return value;
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function renderUnavailable(): string {
  return 'Not available for this analysis.';
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
