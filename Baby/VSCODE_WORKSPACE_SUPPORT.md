# Carbon — VS Code Workspace Support

> I don't have the contents of the existing top-level `README.md` (it
> wasn't part of the files shared with me), so I couldn't safely edit it
> in place without risking clobbering content I can't see. This file
> covers everything requirement #13 asked for — merge whatever sections
> are useful into the real README yourself, or share the file with me
> and I'll merge it directly.

## Architecture (updated)

```
React Frontend                 VS Code Extension
      |                                |
      |  POST /api/analyze             |  POST /api/analyze
      |  { repoUrl }                   |  { localPath }
      v                                v
        Node/Express Backend  :3001
                 |
                 |  { repo_url }  OR  { local_path }
                 v
        Python FastAPI Agent Service  :8000
                 |
        repo_url  -> git clone (existing, unchanged)
        local_path -> validate path, read directly (new)
                 |
                 v
            LangGraph
            ├── architecture agent
            ├── API agent
            └── business logic agent
                 |
                 v
              Gemini
```

The GitHub-URL flow is completely unchanged. The only new thing is a second,
parallel path: instead of cloning a repo, a local folder path is validated
and read directly, then fed through the exact same file-reading and agent
pipeline.

## 1. Start Carbon Agent Service (Python)

```
cd "Baby/Carbon Agent Service"
# (create/activate your virtualenv as usual)
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

## 2. Start Carbon Backend (Node)

```
cd "Baby/Carbon Backend"
npm install
npm start
```

## 3. Start Carbon Frontend (React)

```
cd "Baby/Carbon Frontend"
npm install
npm run dev
```

## 4. Launch the VS Code extension (Extension Development Host)

```
cd vscode-extension
npm install
npm run compile
```

Then in VS Code: open the `vscode-extension` folder, press `F5`. A new
**Extension Development Host** window opens — open any project folder in
it, then run **Carbon: Explain Current Workspace** from the Command
Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`).

## 5. Using "Carbon: Explain Current Workspace"

1. Make sure the Agent Service and Backend (steps 1–2) are running.
2. Open a folder in the Extension Development Host window.
3. Run the command from the Command Palette.
4. A progress notification tracks reading/analysis; a Webview panel opens
   with the results when it finishes.

## What changed under the hood

- **`agent-service/tools/workspace_reader.py`** *(new)* — validates a local
  path (exists, is a directory) and hands it to the existing
  `file_reader.py` functions. No file-reading logic was duplicated.
- **`agent-service/main.py`** — `AnalyzeRequest` now accepts `repo_url`
  *or* `local_path` (at least one required). `/run-agents` clones a repo
  as before when `repo_url` is sent, or validates+reads a local folder
  when `local_path` is sent. Cleanup (`cleanup_repo`) only ever runs for
  cloned temp repos — a local workspace is never deleted.
  `REPO_CACHE` is now keyed by a stable identifier (`repo_url`, or the
  normalized absolute path for local workspaces).
- **`Carbon Backend/routes/analyze.js`** — `/api/analyze` now accepts
  `{ repoUrl }` *or* `{ localPath }` and forwards the corresponding field
  to the Python service. GitHub-URL behavior is unchanged.
- **`Carbon Backend/server.js`** — no changes needed. CORS only applies
  to browser requests; the extension calls the backend from the VS Code
  extension host (Node), not from a web page.
- **`vscode-extension/`** *(new)* — a minimal VS Code extension with one
  command, `Carbon: Explain Current Workspace`, that reads the open
  workspace path and calls the backend.

## Limitations / next phase

- Only the first folder of a multi-root VS Code workspace is analyzed.
- Mermaid diagrams are shown as raw text in the Webview, not rendered
  graphically (kept intentionally simple for this MVP, as the task spec
  allowed).
- VS Code chat is not implemented yet — planned as a follow-up task.
- `local_path` analysis is not chat-enabled yet (the existing `/chat`
  endpoint still expects `repo_url`); wiring it up is straightforward but
  out of scope here per the task instructions.
- No automated test suite was added; testing performed was manual syntax/
  unit-level verification (see summary below) since I don't have access
  to your actual running services or repo to do a full integration test.
