"use strict";
// ============================================================
//  src/extension.ts — Extension entry point
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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const https = __importStar(require("https"));
const analyzeWorkspace_1 = require("./commands/analyzeWorkspace");
// ── Telemetry helper (fire-and-forget, opt-in only) ──────────
const TELEMETRY_KEY = 'carbon.telemetryOptIn';
const TELEMETRY_ASKED_KEY = 'carbon.telemetryAsked';
/**
 * Fires a telemetry event to the Carbon backend.
 * Only sends if the user has opted in. Never throws — best-effort only.
 */
function fireEvent(context, event, metadata) {
    try {
        const optedIn = context.globalState.get(TELEMETRY_KEY);
        if (!optedIn)
            return;
        const config = vscode.workspace.getConfiguration('carbon');
        const backendUrl = config.get('backendUrl') || 'https://carbon-backend-a1sg.onrender.com';
        const payload = JSON.stringify({ event, source: 'vscode', metadata });
        const url = new URL('/api/telemetry', backendUrl);
        const req = https.request({ hostname: url.hostname, port: url.port || 443, path: url.pathname, method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } }, () => { } // discard response
        );
        req.on('error', () => { }); // never propagate
        req.write(payload);
        req.end();
    }
    catch (_) {
        // telemetry must never break the extension
    }
}
/**
 * Ask the user once (on first activation) whether to opt into telemetry.
 * Stores the decision permanently in globalState.
 */
async function askTelemetryConsent(context) {
    const alreadyAsked = context.globalState.get(TELEMETRY_ASKED_KEY);
    if (alreadyAsked)
        return;
    await context.globalState.update(TELEMETRY_ASKED_KEY, true);
    const choice = await vscode.window.showInformationMessage('Carbon AI: Help improve the product by sharing anonymous usage events (no code, no repo content). You can change this in Settings.', 'Yes, help improve Carbon', 'No thanks');
    const optedIn = choice === 'Yes, help improve Carbon';
    await context.globalState.update(TELEMETRY_KEY, optedIn);
    if (optedIn) {
        vscode.window.showInformationMessage('Thanks! You can opt out anytime in Settings → Carbon.');
    }
}
// ── Extension lifecycle ──────────────────────────────────────
async function activate(context) {
    // Ask for consent on very first activation (non-blocking)
    askTelemetryConsent(context).catch(() => { });
    // Fire activation event (only if opted in)
    fireEvent(context, 'extension_activated');
    // Wrap the analyze command to also fire a telemetry event
    const analyzeDisposable = vscode.commands.registerCommand('carbon.explainWorkspace', async (...args) => {
        fireEvent(context, 'workspace_analysis_started');
        return analyzeWorkspace_1.analyzeWorkspaceCommand(...args);
    });
    // Register the Roast command
    const roastDisposable = vscode.commands.registerCommand('carbon.roastWorkspace', async (...args) => {
        fireEvent(context, 'workspace_roast_started');
        const { roastWorkspaceCommand } = await Promise.resolve().then(() => __importStar(require('./commands/roastWorkspace')));
        return roastWorkspaceCommand(...args);
    });
    context.subscriptions.push(analyzeDisposable, roastDisposable);
}
function deactivate() {
    // Nothing to clean up yet.
}
//# sourceMappingURL=extension.js.map