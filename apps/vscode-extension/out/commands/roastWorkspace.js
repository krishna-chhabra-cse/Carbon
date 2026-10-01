"use strict";
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
exports.roastWorkspaceCommand = roastWorkspaceCommand;
const vscode = __importStar(require("vscode"));
const workspaceCollector_1 = require("../utils/workspaceCollector");
const carbonClient_1 = require("../api/carbonClient");
async function roastWorkspaceCommand() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showErrorMessage('Carbon: No workspace is open. Open a folder in VS Code first.');
        return;
    }
    const rootFolder = workspaceFolders[0];
    const workspaceName = rootFolder.name;
    try {
        const payload = await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Carbon: Preparing ${workspaceName} for Roasting...`,
            cancellable: false,
        }, async (progress) => {
            return await (0, workspaceCollector_1.collectWorkspaceFiles)(rootFolder, (msg) => {
                progress.report({ message: msg });
            });
        });
        if (payload.files.length === 0) {
            throw new Error('No code files found to roast.');
        }
        vscode.window.showInformationMessage('Carbon: Codebase collected! Opening the Roaster...', 'View Roast');
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Carbon: Roasting ${workspaceName}... (this may take a minute)`,
            cancellable: false,
        }, async (progress) => {
            progress.report({ message: 'Uploading to Carbon AI...' });
            const backendUrl = (0, carbonClient_1.getBackendBaseUrl)();
            const data = await (0, carbonClient_1.roastWorkspacePayload)(payload);
            if (data.status === 'success') {
                const isLocal = backendUrl.includes('localhost');
                const frontendBase = isLocal ? 'http://localhost:5173' : 'https://carbon.ai';
                const targetUrl = vscode.Uri.parse(`${frontendBase}/roast/${data.id}`);
                vscode.env.openExternal(targetUrl);
            }
            else {
                throw new Error(data.error || data.message || 'Unknown error');
            }
        });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        vscode.window.showErrorMessage(`Carbon: ${message}`);
    }
}
//# sourceMappingURL=roastWorkspace.js.map