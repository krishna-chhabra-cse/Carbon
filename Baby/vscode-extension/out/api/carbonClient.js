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
exports.analyzeLocalPath = analyzeLocalPath;
exports.explainWithVideo = explainWithVideo;
const http = __importStar(require("http"));
const https = __importStar(require("https"));
const url_1 = require("url");
class CarbonApiError extends Error {
}
exports.CarbonApiError = CarbonApiError;
const BACKEND_ANALYZE_URL = 'http://localhost:3002/api/analyze';
/**
 * Sends a local workspace path to the Carbon backend and streams back
 * progress events, resolving with the final "complete" payload.
 *
 * @param localPath   Absolute filesystem path of the open workspace.
 * @param onProgress  Called for every NDJSON event as it arrives
 *                     (e.g. {status:"reading_workspace"}, {status:"analyzing"}).
 */
function analyzeLocalPath(localPath, onProgress) {
    return new Promise((resolve, reject) => {
        let target;
        try {
            target = new url_1.URL(BACKEND_ANALYZE_URL);
        }
        catch (err) {
            reject(new CarbonApiError(`Invalid backend URL: ${BACKEND_ANALYZE_URL}`));
            return;
        }
        const payload = JSON.stringify({ localPath });
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
                    errorMessage = parsed.error
                        ? `${parsed.error}${parsed.details ? `: ${parsed.details}` : ''}`
                        : String(parsed.details);
                    return;
                }
                if (parsed.status === 'error') {
                    errorMessage = typeof parsed.message === 'string'
                        ? parsed.message
                        : 'Analysis failed with an unknown error.';
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
                    errorMessage = `Carbon backend returned HTTP ${res.statusCode}.`;
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
                reject(new CarbonApiError('Could not reach the Carbon backend at http://localhost:3001. Is it running? (npm start in "Carbon Backend")'));
            }
            else {
                reject(new CarbonApiError(`Request to Carbon backend failed: ${err.message}`));
            }
        });
        req.write(payload);
        req.end();
    });
}
const BACKEND_EXPLAIN_VIDEO_URL = 'http://localhost:3002/api/explain-video';
function explainWithVideo(analysisResult) {
    return new Promise((resolve, reject) => {
        let target;
        try {
            target = new url_1.URL(BACKEND_EXPLAIN_VIDEO_URL);
        }
        catch (err) {
            reject(new CarbonApiError(`Invalid backend URL: ${BACKEND_EXPLAIN_VIDEO_URL}`));
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
//# sourceMappingURL=carbonClient.js.map