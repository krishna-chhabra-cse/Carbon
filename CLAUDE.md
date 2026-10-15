# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Product focus

Carbon's **only** product focus is: **repo/website → launch video + pitch deck**.
Every change should serve that pipeline. If a request doesn't, say so before doing it.

## Architecture map

| Path | What it is |
| --- | --- |
| `apps/Carbon Frontend/` | React 19 + Vite + Tailwind web UI. Talks only to the Backend. |
| `apps/Carbon Backend/` | Node/Express API gateway (`server.js`, `routes/`), port 3002. Rate limiting, SQLite (`better-sqlite3`), proxies work to the Agent Service via `PYTHON_SERVICE_URL`. |
| `apps/Carbon Agent Service/` | Python FastAPI service (`main.py`), port 8005 in dev. LangGraph agents in `agents/`, tools in `tools/` (git cloning, AST skeletonizer, GraphRAG, security scanner, LLM client with provider fallback, PPT generator, video storyboard). Auth in `middleware/auth.py` (`X-API-Key`, fails closed). |
| `apps/Carbon Studio/` | Remotion project for rendering videos (render output goes in `out/`). |
| `carbon-reel/` | Standalone HTML/JS reel prototype. |
| `tests/` | Python pytest suite for the Agent Service: `unit/`, `integration/`, `e2e/`. `tests/conftest.py` sets `CARBON_AUTH_DISABLED=true` for the suite. |
| `benchmarks/` | Scripts behind numbers quoted in the README. |

Legacy apps (`apps/vscode-extension/`, `apps/chrome-extension/`, `apps/carbon-pr-action/`) are slated for archiving — don't extend them.

## Running

```bash
npm run dev            # Frontend + Backend + Agent Service together (concurrently)
npm run dev:frontend   # Vite only
npm run dev:backend    # Express only
npm run dev:agent      # FastAPI on :8005 only
```

Configuration lives in `.env` files (copy from `.env.example` and
`apps/Carbon Agent Service/.env.example`). For local dev without an API key,
set `CARBON_AUTH_DISABLED=true` in the Agent Service `.env`; otherwise set `CARBON_API_KEY`.

## Testing

```bash
python -m pytest tests              # full suite (run from the repo root)
python -m pytest tests/unit -q      # fast unit tests only
```

The whole suite must pass before every commit.

## Rules

1. **Single focus.** Only work on "repo/website → launch video + pitch deck".
2. **No new surface area.** Add no new apps, extensions or integrations.
3. **Tests required.** Every feature or fix ships with tests, and `pytest tests` must pass before committing.
4. **Never commit** secrets, `.env` files, `.db` files, `.mp4` files, `.vsix` files, or build output (`dist/`, `build/`, `out/`). Read API keys from environment variables, never hardcode them.
5. **Small changes.** Prefer small, focused diffs — one feature per session.
6. **Honest README.** Keep README claims accurate; if a change removes or alters a feature, update the README in the same change.
