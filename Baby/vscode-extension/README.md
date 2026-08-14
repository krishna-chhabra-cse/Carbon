# Carbon — VS Code Extension (MVP)

Explains the codebase currently open in VS Code using Carbon's existing
analysis pipeline (Node backend → Python agent service → LangGraph → Gemini).

This extension does **not** talk to Gemini or the Python service directly.
It only calls the Carbon Backend (`http://localhost:3001`), which forwards
the request to the Python agent service. The Gemini API key stays
server-side and is never bundled into or used by the extension.

## Requirements

Before using the extension, the rest of Carbon must be running locally:

1. **Carbon Agent Service** (Python, port 8000)
2. **Carbon Backend** (Node/Express, port 3001)

(The React frontend is not required for the extension to work, since the
extension talks to the backend directly.)

## Running the extension (Extension Development Host)

1. Open the `vscode-extension/` folder in VS Code.
2. Install dependencies:
   ```
   npm install
   ```
3. Compile:
   ```
   npm run compile
   ```
4. Press `F5` (or Run → Start Debugging). This opens a new **Extension
   Development Host** window with the extension loaded.
5. In that new window, open any folder/workspace you want Carbon to explain.
6. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and run:
   ```
   Carbon: Explain Current Workspace
   ```

## What it does

1. Reads the path of the currently open workspace folder
   (`vscode.workspace.workspaceFolders[0].uri.fsPath`).
2. Sends it to the Carbon Backend:
   ```
   POST http://localhost:3001/api/analyze
   { "localPath": "<workspace path>" }
   ```
3. Streams progress notifications while the backend/agent service work.
4. On completion, opens a Webview panel showing:
   - Summary
   - Tech stack
   - Key components
   - Architecture diagram — shown as raw Mermaid source for this MVP
     (paste it into https://mermaid.live to view it visually)
   - API endpoints (if returned)
   - Business logic (if returned)

## Known limitations (MVP)

- Only the first folder of a multi-root workspace is analyzed.
- The Mermaid diagram is shown as text, not rendered inline, to avoid
  pulling in a rendering library for this first pass.
- No VS Code chat yet — that's a separate follow-up task.
- No caching/re-use awareness in the UI (each run re-analyzes from scratch).
