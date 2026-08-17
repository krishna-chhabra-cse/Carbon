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

import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';
import * as vscode from 'vscode';

import { WorkspacePayload } from '../utils/workspaceCollector';

export interface AnalyzeEvent {
  status: string;
  [key: string]: unknown;
}

export interface AnalyzeFinalResult {
  status: 'complete';
  success: boolean;
  repo_url?: string | null;
  workspace_name?: string | null;
  architecture?: unknown;
  api_docs?: unknown;
  business_logic?: unknown;
  security?: unknown;
}

export class CarbonApiError extends Error {}

export function getBackendBaseUrl(): string {
  const config = vscode.workspace.getConfiguration('carbon');
  const url = config.get<string>('backendUrl');
  return (url && url.trim()) ? url.trim().replace(/\/+$/, '') : 'https://carbon-backend-a1sg.onrender.com';
}

/**
 * Sends a collected workspace payload (safe files + structure) to the
 * Carbon backend over HTTPS/HTTP and streams back progress events.
 *
 * @param payload     WorkspacePayload containing collected files and tree structure.
 * @param onProgress  Called for every NDJSON event as it arrives.
 */
export function analyzeWorkspacePayload(
  payload: WorkspacePayload,
  onProgress: (event: AnalyzeEvent) => void
): Promise<AnalyzeFinalResult> {
  return new Promise((resolve, reject) => {
    const baseUrl = getBackendBaseUrl();
    const endpoint = `${baseUrl}/api/analyze`;
    let target: URL;
    try {
      target = new URL(endpoint);
    } catch (err) {
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

    const req = transport.request(
      {
        hostname: target.hostname,
        port: target.port,
        path: target.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(bodyData),
        },
      },
      (res) => {
        let buffer = '';
        let finalResult: AnalyzeFinalResult | null = null;
        let errorMessage: string | null = null;

        res.setEncoding('utf8');

        const handleLine = (line: string) => {
          let parsed: any;
          try {
            parsed = JSON.parse(line);
          } catch {
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
            } else {
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
            } else {
              errorMessage = rawMsg;
            }
            return;
          }

          if (parsed.status === 'complete') {
            finalResult = parsed as AnalyzeFinalResult;
          }

          onProgress(parsed as AnalyzeEvent);
        };

        res.on('data', (chunk: string) => {
          buffer += chunk;
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? ''; // keep last partial line for next chunk
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed) handleLine(trimmed);
          }
        });

        res.on('end', () => {
          const leftover = buffer.trim();
          if (leftover) handleLine(leftover);

          if (res.statusCode && res.statusCode >= 400 && !errorMessage && !finalResult) {
            if (res.statusCode === 405) {
              errorMessage = `HTTP 405 (Method Not Allowed) at ${endpoint}. This usually happens when 'carbon.backendUrl' points to a static website rather than the Carbon API server. Please configure 'carbon.backendUrl' in Settings to your backend URL (e.g. Render/Railway URL or http://localhost:3002).`;
            } else if (res.statusCode === 404) {
              errorMessage = `HTTP 404 (Not Found) at ${endpoint}. The /api/analyze route was not found. Please check your 'carbon.backendUrl' setting.`;
            } else if (res.statusCode === 502 || res.statusCode === 503) {
              errorMessage = `HTTP ${res.statusCode} (Service Unavailable) at ${endpoint}. The Carbon backend is currently booting up or unavailable. If using Render free tier, please wait 30 seconds for it to wake up and try again.`;
            } else {
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
      }
    );

    req.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'ECONNREFUSED') {
        reject(new CarbonApiError(
          `Could not connect to Carbon backend at ${baseUrl}. Please check that your server is running or update 'carbon.backendUrl' in Settings.`
        ));
      } else {
        reject(new CarbonApiError(`Request to Carbon backend at ${baseUrl} failed: ${err.message}`));
      }
    });

    req.write(bodyData);
    req.end();
  });
}

export interface ExplainVideoResult {
  success: boolean;
  url: string;
}

export function explainWithVideo(
  analysisResult: AnalyzeFinalResult
): Promise<ExplainVideoResult> {
  return new Promise((resolve, reject) => {
    const baseUrl = getBackendBaseUrl();
    const endpoint = `${baseUrl}/api/explain-video`;
    let target: URL;
    try {
      target = new URL(endpoint);
    } catch (err) {
      reject(new CarbonApiError(`Invalid backend URL: ${endpoint}`));
      return;
    }

    const payload = JSON.stringify({
      architecture: analysisResult.architecture,
      apiDocs: analysisResult.api_docs,
      businessLogic: analysisResult.business_logic
    });
    const transport = target.protocol === 'https:' ? https : http;

    const req = transport.request(
      {
        hostname: target.hostname,
        port: target.port,
        path: target.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      (res) => {
        let body = '';
        res.setEncoding('utf8');

        res.on('data', (chunk: string) => {
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
            } catch {}
            reject(new CarbonApiError(errorMsg));
            return;
          }

          try {
            const parsed = JSON.parse(body) as ExplainVideoResult;
            if (!parsed.url) {
              reject(new CarbonApiError('Carbon backend did not return a video URL.'));
              return;
            }
            resolve(parsed);
          } catch {
            reject(new CarbonApiError(`Carbon returned a malformed response: ${body.slice(0, 200)}`));
          }
        });
      }
    );

    req.on('error', (err: NodeJS.ErrnoException) => {
      reject(new CarbonApiError(`Request to Carbon backend failed: ${err.message}`));
    });

    req.write(payload);
    req.end();
  });
}

/**
 * Sends a GraphRAG architectural query to Carbon AI.
 */
export function askCodebaseChat(repoUrl: string, query: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const baseUrl = getBackendBaseUrl();
    const endpoint = `${baseUrl}/api/chat`;
    let target: URL;
    try {
      target = new URL(endpoint);
    } catch {
      reject(new CarbonApiError(`Invalid backend URL: ${endpoint}`));
      return;
    }

    const bodyData = JSON.stringify({ repoUrl, query });
    const transport = target.protocol === 'https:' ? https : http;

    const req = transport.request(
      {
        hostname: target.hostname,
        port: target.port,
        path: target.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(bodyData),
        },
      },
      (res) => {
        let raw = '';
        res.on('data', chunk => raw += chunk);
        res.on('end', () => {
          try {
            const data = JSON.parse(raw);
            resolve(data.answer || 'No response generated.');
          } catch {
            resolve(raw || 'No response generated.');
          }
        });
      }
    );

    req.on('error', err => reject(err));
    req.write(bodyData);
    req.end();
  });
}

