// ============================================================
//  src/extension.ts — Extension entry point
// ============================================================

import * as vscode from 'vscode';
import * as https from 'https';
import { analyzeWorkspaceCommand } from './commands/analyzeWorkspace';

// ── Telemetry helper (fire-and-forget, opt-in only) ──────────

const TELEMETRY_KEY = 'carbon.telemetryOptIn';
const TELEMETRY_ASKED_KEY = 'carbon.telemetryAsked';

/**
 * Fires a telemetry event to the Carbon backend.
 * Only sends if the user has opted in. Never throws — best-effort only.
 */
function fireEvent(
  context: vscode.ExtensionContext,
  event: string,
  metadata?: Record<string, unknown>
): void {
  try {
    const optedIn = context.globalState.get<boolean>(TELEMETRY_KEY);
    if (!optedIn) return;

    const config = vscode.workspace.getConfiguration('carbon');
    const backendUrl = config.get<string>('backendUrl') || 'https://carbon-backend-a1sg.onrender.com';

    const payload = JSON.stringify({ event, source: 'vscode', metadata });
    const url = new URL('/api/telemetry', backendUrl);

    const req = https.request(
      { hostname: url.hostname, port: url.port || 443, path: url.pathname, method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } },
      () => {} // discard response
    );
    req.on('error', () => {}); // never propagate
    req.write(payload);
    req.end();
  } catch (_) {
    // telemetry must never break the extension
  }
}

/**
 * Ask the user once (on first activation) whether to opt into telemetry.
 * Stores the decision permanently in globalState.
 */
async function askTelemetryConsent(context: vscode.ExtensionContext): Promise<void> {
  const alreadyAsked = context.globalState.get<boolean>(TELEMETRY_ASKED_KEY);
  if (alreadyAsked) return;

  await context.globalState.update(TELEMETRY_ASKED_KEY, true);

  const choice = await vscode.window.showInformationMessage(
    'Carbon AI: Help improve the product by sharing anonymous usage events (no code, no repo content). You can change this in Settings.',
    'Yes, help improve Carbon',
    'No thanks'
  );

  const optedIn = choice === 'Yes, help improve Carbon';
  await context.globalState.update(TELEMETRY_KEY, optedIn);

  if (optedIn) {
    vscode.window.showInformationMessage('Thanks! You can opt out anytime in Settings → Carbon.');
  }
}

// ── Extension lifecycle ──────────────────────────────────────

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  // Ask for consent on very first activation (non-blocking)
  askTelemetryConsent(context).catch(() => {});

  // Fire activation event (only if opted in)
  fireEvent(context, 'extension_activated');

  // Wrap the analyze command to also fire a telemetry event
  const disposable = vscode.commands.registerCommand(
    'carbon.explainWorkspace',
    async (...args: unknown[]) => {
      fireEvent(context, 'workspace_analysis_started');
      return (analyzeWorkspaceCommand as (...a: unknown[]) => unknown)(...args);
    }
  );

  context.subscriptions.push(disposable);
}

export function deactivate(): void {
  // Nothing to clean up yet.
}
