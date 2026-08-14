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

export interface AnalyzeEvent {
  status: string;
  [key: string]: unknown;
}

export interface AnalyzeFinalResult {
  status: 'complete';
  success: boolean;
  repo_url?: string | null;
  local_path?: string | null;
  architecture?: unknown;
  api_docs?: unknown;
  business_logic?: unknown;
}

export class CarbonApiError extends Error {}

const BACKEND_ANALYZE_URL = 'http://localhost:3002/api/analyze';

/**
 * Sends a local workspace path to the Carbon backend and streams back
 * progress events, resolving with the final "complete" payload.
 *
 * @param localPath   Absolute filesystem path of the open workspace.
 * @param onProgress  Called for every NDJSON event as it arrives
 *                     (e.g. {status:"reading_workspace"}, {status:"analyzing"}).
 */
export function analyzeLocalPath(
  localPath: string,
  onProgress: (event: AnalyzeEvent) => void
): Promise<AnalyzeFinalResult> {
  return new Promise((resolve, reject) => {
    let target: URL;
    try {
      target = new URL(BACKEND_ANALYZE_URL);
    } catch (err) {
      reject(new CarbonApiError(`Invalid backend URL: ${BACKEND_ANALYZE_URL}`));
      return;
    }

    const payload = JSON.stringify({ localPath });
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
      }
    );

    req.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'ECONNREFUSED') {
        reject(new CarbonApiError(
          'Could not reach the Carbon backend at http://localhost:3001. Is it running? (npm start in "Carbon Backend")'
        ));
      } else {
        reject(new CarbonApiError(`Request to Carbon backend failed: ${err.message}`));
      }
    });

    req.write(payload);
    req.end();
  });
}

const BACKEND_EXPLAIN_VIDEO_URL = 'http://localhost:3002/api/explain-video';

export interface ExplainVideoResult {
  success: boolean;
  url: string;
}

export function explainWithVideo(
  analysisResult: AnalyzeFinalResult
): Promise<ExplainVideoResult> {
  return new Promise((resolve, reject) => {
    let target: URL;
    try {
      target = new URL(BACKEND_EXPLAIN_VIDEO_URL);
    } catch (err) {
      reject(new CarbonApiError(`Invalid backend URL: ${BACKEND_EXPLAIN_VIDEO_URL}`));
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

