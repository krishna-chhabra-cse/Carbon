# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Product focus

Carbon's **only** product focus is: **repo/website → launch video + pitch deck**.
Every change should serve that pipeline. If a request doesn't, say so before doing it.

## Architecture map

| Path | What it is |
| --- | --- |
| `apps/Carbon Frontend/` | React 19 + Vite + Tailwind web UI. Site pages in `src/pages/` (Home, Create, VideoResult, Login, ResetPassword, Dashboard, GoDeeper at `/app`, NotFound) + `src/components/RoastPage.jsx`. Sign-in via Supabase email/password + Google/GitHub (`src/lib/auth.jsx`; form helpers + tests in `src/lib/authForm.js`). No prices on the site: the early-access form is `src/components/site/EarlyAccess.jsx`. `src/lib/razorpay.js` is unused. |
| `apps/Carbon Backend/` | Node/Express API (`server.js`, `routes/`), port 3002. Launch-video product: `routes/videos.js` (jobs, `/api/me`), `routes/earlyAccess.js` (early-access list; export with `npm run early-access`), `routes/billing.js` (Razorpay, unused at launch), `lib/` (SQLite db, Supabase auth that fails closed, free quota, URL safety), `pipeline/` (ingest → Gemini storyboard → render → deck worker), `prompts/director.v5.md` (the storyboard "skill"; told the chosen style, or on Auto picks style + music), `pipeline/brief.js` + `prompts/interviewer.v1.md` / `stylist.v2.md` (the 4 pre-video questions and the recommended look), `pipeline/catalog.js` (reads the style catalog from Carbon Video; validates style × input × length × video type; plans directed scenes; `GET /api/styles`). Also proxies Roast / analysis to the Agent Service via `PYTHON_SERVICE_URL`. |
| `apps/Carbon Video/` | Remotion launch-video templates: `src/styles/catalog.json` (the one list of video styles), one module per directed style in `src/styles/` (registered in `modules.ts`), the directed engine in `src/engine/`, and the classic film (`src/hud/`, `src/LaunchVideo.tsx`). Scripts the worker runs: `render-video.mjs`, `build-deck.mjs` (pptx), `capture-site.mjs` (website screenshots/brand); `style-gallery.mjs` renders the gallery previews. Adding a style: `docs/VIDEO_STYLES.md`. |
| `apps/Carbon Agent Service/` | Python FastAPI service (`main.py`), port 8005 in dev. LangGraph agents in `agents/`, tools in `tools/` (git cloning, AST skeletonizer, GraphRAG, security scanner, LLM client with provider fallback, PPT generator, video storyboard). Auth in `middleware/auth.py` (`X-API-Key`, fails closed). |
| `apps/Carbon Studio/` | Old Remotion experiment, superseded by `apps/Carbon Video/`. |
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

```bash
npm test --prefix "apps/Carbon Backend"           # backend: auth, quota, storyboard, billing
npm test --prefix "apps/Carbon Frontend"          # sign-in form helpers
npm run typecheck --prefix "apps/Carbon Video"    # video templates
```

All of these must pass before every commit. Going-live steps (Supabase, Google, SMTP, Railway, Vercel): `docs/LAUNCH_SETUP.md`.

## Rules

1. **Single focus.** Only work on "repo/website → launch video + pitch deck".
2. **No new surface area.** Add no new apps, extensions or integrations.
3. **Tests required.** Every feature or fix ships with tests, and `pytest tests` + backend `npm test` must pass before committing.
4. **Never commit** secrets, `.env` files, `.db` files, `.mp4` files (except the website's demo/sample media in `apps/Carbon Frontend/public/media/`), `.vsix` files, or build output (`dist/`, `build/`, `out/`). Read API keys from environment variables, never hardcode them.
5. **Small changes.** Prefer small, focused diffs — one feature per session.
6. **Honest README.** Keep README claims accurate; if a change removes or alters a feature, update the README in the same change.
7. **No invented facts in videos.** Numbers, code and commands in a storyboard are picked by index from the ingested facts (see `pipeline/storyboard.js`); keep it that way.
