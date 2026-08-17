"use strict";
// ============================================================
//  src/api/carbonClient.ts
//
//  Talks to the Carbon Backend (Node/Express, port 3002) only.
//  Never talks to the Python agent service or Gemini directly —
//  the Gemini API key must stay server-side.
//
//  Uses Node's built-in http/https modules (no extra dependency)
//  and parses the newline-delimited JSON (NDJSON) stream that
//  routes/analyze.js pipes back from the Python service.
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
exports.CarbonApiError = void 0;
exports.getBackendBaseUrl = getBackendBaseUrl;
exports.analyzeWorkspacePayload = analyzeWorkspacePayload;
exports.explainWithVideo = explainWithVideo;
exports.askCodebaseChat = askCodebaseChat;
const http = __importStar(require("http"));
const https = __importStar(require("https"));
const url_1 = require("url");
const vscode = __importStar(require("vscode"));
class CarbonApiError extends Error {
}
exports.CarbonApiError = CarbonApiError;
function getBackendBaseUrl() {
    const config = vscode.workspace.getConfiguration('carbon');
    const url = config.get('backendUrl');
    return (url && url.trim()) ? url.trim().replace(/\/+$/, '') : 'https://carbon-backend-a1sg.onrender.com';
}
/**
 * Sends a collected workspace payload (safe files + structure) to the
 * Carbon backend over HTTPS/HTTP and streams back progress events.
 *
 * @param payload     WorkspacePayload containing collected files and tree structure.
 * @param onProgress  Called for every NDJSON event as it arrives.
 */
function analyzeWorkspacePayload(payload, onProgress) {
    return new Promise((resolve, reject) => {
        const baseUrl = getBackendBaseUrl();
        const endpoint = `${baseUrl}/api/analyze`;
        let target;
        try {
            target = new url_1.URL(endpoint);
        }
        catch (err) {
            reject(new CarbonApiError(`Invalid backend URL: ${endpoint}`));
            return;
        }
        const bodyData = JSON.stringify({
            workspaceName: payload.workspaceName,
            files: payload.files,
            folderStructure: payload.folderStructure,
            totalFiles: payload.totalFiles,
            totalBytes: payload.totalBytes
        });
        const transport = target.protocol === 'https:' ? https : http;
        const req = transport.request({
            hostname: target.hostname,
            port: target.port,
            path: target.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(bodyData),
            },
        }, (res) => {
            let buffer = '';
            let finalResult = null;
            let errorMessage = null;
            res.setEncoding('utf8');
            const handleLine = (line) => {
                let parsed;
                try {
                    parsed = JSON.parse(line);
                }
                catch {
                    // The backend/Python service always emits one JSON object per line.
                    // If a line doesn't parse, surface it rather than silently dropping it.
                    errorMessage = `Carbon returned a malformed response: ${line.slice(0, 200)}`;
                    return;
                }
                // Non-streaming error responses from Express (400/503/500) look like
                // { error: "...", details: "..." } with no "status" field.
                if (!parsed.status && (parsed.error || parsed.details)) {
                    const rawErr = parsed.error
                        ? `${parsed.error}${parsed.details ? `: ${parsed.details}` : ''}`
                        : String(parsed.details);
                    if (rawErr.includes('429') || rawErr.includes('RESOURCE_EXHAUSTED')) {
                        errorMessage = 'AI Rate Limit (429): Free Gemini quota was briefly reached. Please wait 15 seconds and try again.';
                    }
                    else {
                        errorMessage = rawErr;
                    }
                    return;
                }
                if (parsed.status === 'error') {
                    const rawMsg = typeof parsed.message === 'string'
                        ? parsed.message
                        : 'Analysis failed with an unknown error.';
                    if (rawMsg.includes('429') || rawMsg.includes('RESOURCE_EXHAUSTED')) {
                        errorMessage = 'AI Rate Limit (429): Free Gemini quota was briefly reached. Please wait 15 seconds and try again.';
                    }
                    else {
                        errorMessage = rawMsg;
                    }
                    return;
                }
                if (parsed.status === 'complete') {
                    finalResult = parsed;
                }
                onProgress(parsed);
            };
            res.on('data', (chunk) => {
                buffer += chunk;
                const lines = buffer.split('\n');
                buffer = lines.pop() ?? ''; // keep last partial line for next chunk
                for (const line of lines) {
                    const trimmed = line.trim();
                    if (trimmed)
                        handleLine(trimmed);
                }
            });
            res.on('end', () => {
                const leftover = buffer.trim();
                if (leftover)
                    handleLine(leftover);
                if (res.statusCode && res.statusCode >= 400 && !errorMessage && !finalResult) {
                    if (res.statusCode === 405) {
                        errorMessage = `HTTP 405 (Method Not Allowed) at ${endpoint}. This usually happens when 'carbon.backendUrl' points to a static website rather than the Carbon API server. Please configure 'carbon.backendUrl' in Settings to your backend URL (e.g. Render/Railway URL or http://localhost:3002).`;
                    }
                    else if (res.statusCode === 404) {
                        errorMessage = `HTTP 404 (Not Found) at ${endpoint}. The /api/analyze route was not found. Please check your 'carbon.backendUrl' setting.`;
                    }
                    else if (res.statusCode === 502 || res.statusCode === 503) {
                        errorMessage = `HTTP ${res.statusCode} (Service Unavailable) at ${endpoint}. The Carbon backend is currently booting up or unavailable. If using Render free tier, please wait 30 seconds for it to wake up and try again.`;
                    }
                    else {
                        errorMessage = `Carbon backend returned HTTP ${res.statusCode}.`;
                    }
                }
                if (errorMessage) {
                    reject(new CarbonApiError(errorMessage));
                    return;
                }
                if (!finalResult) {
                    reject(new CarbonApiError('Carbon backend closed the connection without returning a result.'));
                    return;
                }
                resolve(finalResult);
            });
        });
        req.on('error', (err) => {
            if (err.code === 'ECONNREFUSED') {
                reject(new CarbonApiError(`Could not connect to Carbon backend at ${baseUrl}. Please check that your server is running or update 'carbon.backendUrl' in Settings.`));
            }
            else {
                reject(new CarbonApiError(`Request to Carbon backend at ${baseUrl} failed: ${err.message}`));
            }
        });
        req.write(bodyData);
        req.end();
    });
}
function explainWithVideo(analysisResult) {
    return new Promise((resolve, reject) => {
        const baseUrl = getBackendBaseUrl();
        const endpoint = `${baseUrl}/api/explain-video`;
        let target;
        try {
            target = new url_1.URL(endpoint);
        }
        catch (err) {
            reject(new CarbonApiError(`Invalid backend URL: ${endpoint}`));
            return;
        }
        const payload = JSON.stringify({
            architecture: analysisResult.architecture,
            apiDocs: analysisResult.api_docs,
            businessLogic: analysisResult.business_logic
        });
        const transport = target.protocol === 'https:' ? https : http;
        const req = transport.request({
            hostname: target.hostname,
            port: target.port,
            path: target.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload),
            },
        }, (res) => {
            let body = '';
            res.setEncoding('utf8');
            res.on('data', (chunk) => {
                body += chunk;
            });
            res.on('end', () => {
                if (res.statusCode && res.statusCode >= 400) {
                    let errorMsg = `Carbon backend returned HTTP ${res.statusCode}.`;
                    try {
                        const parsedError = JSON.parse(body);
                        if (parsedError.error) {
                            errorMsg = parsedError.error;
                        }
                    }
                    catch { }
                    reject(new CarbonApiError(errorMsg));
                    return;
                }
                try {
                    const parsed = JSON.parse(body);
                    if (!parsed.url) {
                        reject(new CarbonApiError('Carbon backend did not return a video URL.'));
                        return;
                    }
                    resolve(parsed);
                }
                catch {
                    reject(new CarbonApiError(`Carbon returned a malformed response: ${body.slice(0, 200)}`));
                }
            });
        });
        req.on('error', (err) => {
            reject(new CarbonApiError(`Request to Carbon backend failed: ${err.message}`));
        });
        req.write(payload);
        req.end();
    });
}
/**
 * Sends a GraphRAG architectural query to Carbon AI.
 */
function askCodebaseChat(repoUrl, query) {
    return new Promise((resolve, reject) => {
        const baseUrl = getBackendBaseUrl();
        const endpoint = `${baseUrl}/api/chat`;
        let target;
        try {
            target = new url_1.URL(endpoint);
        }
        catch {
            reject(new CarbonApiError(`Invalid backend URL: ${endpoint}`));
            return;
        }
        const bodyData = JSON.stringify({ repoUrl, query });
        const transport = target.protocol === 'https:' ? https : http;
        const req = transport.request({
            hostname: target.hostname,
            port: target.port,
            path: target.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(bodyData),
            },
        }, (res) => {
            let raw = '';
            res.on('data', chunk => raw += chunk);
            res.on('end', () => {
                try {
                    const data = JSON.parse(raw);
                    resolve(data.answer || 'No response generated.');
                }
                catch {
                    resolve(raw || 'No response generated.');
                }
            });
        });
        req.on('error', err => reject(err));
        req.write(bodyData);
        req.end();
    });
}
//# sourceMappingURL=carbonClient.js.map