# Carbon

**Paste a GitHub repo or a website. Get a launch video and a pitch deck.**

[![CI](https://github.com/krishna-chhabra-cse/Carbon/actions/workflows/ci.yml/badge.svg)](https://github.com/krishna-chhabra-cse/Carbon/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**Live at [carbons.codes](https://carbons.codes)**

Carbon reads a public GitHub repo or a live website and makes:

1. **A launch video** (30 or 15 seconds, 16:9, MP4). Real numbers and real code from your project, cut on the beat of an original soundtrack. Pick one of 18 styles, or answer four quick questions and let Carbon recommend one.
2. **An editable pitch deck** (.pptx) built from the same facts: title, why people pick it, architecture, API in one glance, numbers, get started.

Two free tools come with it, no account needed:

- **Roast my codebase** (`/roast`): a score out of 10 backed by real measurements (huge files, circular imports, test ratio, leaked secrets), with fixes and a share link.
- **Go deeper** (`/app`): the architecture, API endpoints and business logic of any public repo in plain English, plus a chat about the code.

Making videos needs a free account. Free accounts get **2 videos per rolling 24 hours** (720p, small watermark). People who want more join the early-access list, for longer videos (up to 2 minutes), more video categories and more soundtracks. There are no paid plans and no prices yet.

## How a video is made

```
link ──► read ──► 4 questions ──► storyboard ──► render ──► MP4 + .pptx
         GitHub API   (Gemini)      (Gemini,       (Remotion,
         or site                     checked)       headless Chrome)
         capture
```

1. **Read.** Repo metadata, languages, README snippets and install commands come from the GitHub API. For websites, a headless browser captures screenshots, headings and brand colors. The facts are read once and reused.
2. **Brief.** Gemini writes four multiple-choice questions for *your* product (who watches, how it should feel, what to show off, where you'll post it). A second call turns your answers into a recommended style and soundtrack, with a reason. Every step has a no-AI fallback.
3. **Storyboard.** Gemini writes the copy against a strict schema. Numbers, code and commands are chosen **by index** from the facts that were read, so a video never shows an invented stat or snippet. Without an API key, a storyboard is built straight from the facts.
4. **Render.** Hand-built [Remotion](https://www.remotion.dev) scenes, cut on the soundtrack's beat grid. There are eleven *directed* styles that each tell their own story (Blueprint, Swiss Poster, Editorial Collage, Pixel Arcade, Data Story, Product Tour, Signal, Bauhaus Geometry, Whiteboard Explainer, Shell Session, Cinematic 3D) and seven classic looks (HUD, Paper, Bold, Glass, Terminal, Kinetic, Aurora) with five video types. The soundtracks are synthesized in code, no samples. See [docs/VIDEO_STYLES.md](docs/VIDEO_STYLES.md).
5. **Deck.** Native PowerPoint shapes, so every slide is editable.

## How it fits together

| Folder | What it is |
|---|---|
| [`apps/Carbon Frontend`](apps/Carbon%20Frontend) | The website (React 19, Vite, Tailwind). Sign-in with Supabase. |
| [`apps/Carbon Backend`](apps/Carbon%20Backend) | Express API: checks sign-in, enforces the daily limit, runs video jobs and the render worker, stores the early-access list (SQLite), and forwards Roast and Go deeper to the agent service. |
| [`apps/Carbon Video`](apps/Carbon%20Video) | The video templates (Remotion), plus the scripts that render videos, build decks and capture websites. |
| [`apps/Carbon Agent Service`](apps/Carbon%20Agent%20Service) | Python (FastAPI, LangGraph) service behind Roast and Go deeper. Needs a shared `X-API-Key`; refuses requests without one. |
| [`tests`](tests) | Python tests for the agent service. The other apps keep their tests next to the code. |
| [`docs`](docs) | Going-live guide, video styles, test notes. |

Side projects, not part of the launch product: `apps/chrome-extension`, `apps/vscode-extension` and `apps/carbon-pr-action` (see [their status](#extensions)), and the older experiments `apps/Carbon Studio` and `carbon-reel`.

## Run it on your computer

You need Node 22+, Python 3.12+, and a [Gemini API key](https://aistudio.google.com/apikey) (the app still works without one, using built-in fallbacks).

```bash
npm install
npm install --prefix "apps/Carbon Frontend"
npm install --prefix "apps/Carbon Backend"
npm install --prefix "apps/Carbon Video"
pip install -r "apps/Carbon Agent Service/requirements.txt"
```

Copy the example settings and fill in what you have:

```bash
cp .env.example "apps/Carbon Backend/.env"
cp "apps/Carbon Agent Service/.env.example" "apps/Carbon Agent Service/.env"
cp "apps/Carbon Frontend/.env.example" "apps/Carbon Frontend/.env.local"
```

For local work without a Supabase project, set `AUTH_DEV_BYPASS=true` in the backend `.env` and `CARBON_AUTH_DISABLED=true` in the agent service `.env`. Then click **Continue as local dev user** on `/login`. That button only works from your own machine and never when `NODE_ENV=production`.

```bash
npm run dev     # website :5173, backend :3002, agent service :8005
```

### Tests

```bash
npm test --prefix "apps/Carbon Backend"           # sign-in checks, daily limit, storyboards, styles
npm test --prefix "apps/Carbon Frontend"          # sign-in form helpers
npm run typecheck --prefix "apps/Carbon Video"    # video templates
python -m pytest tests                            # agent service
```

## Putting it online

Everything you need is in **[docs/LAUNCH_SETUP.md](docs/LAUNCH_SETUP.md)**: Supabase (email, Google, GitHub), sending email, the backend and renderer (Railway or your own server), the agent service, the Vercel settings, a final checklist, and how to read the early-access list.

Main settings (full list in `.env.example`):

| Setting | Where | What for |
|---|---|---|
| `VITE_API_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Website (Vercel) | Where the backend is, and the sign-in project |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | Backend | Checking sign-in tokens. Without them nobody can sign in. |
| `GEMINI_API_KEY`, `GITHUB_TOKEN` | Backend, agent service | The AI, and a higher GitHub rate limit |
| `PYTHON_SERVICE_URL`, `CARBON_API_KEY` | Backend (and `CARBON_API_KEY` on the agent service) | Connecting the backend to the agent service |
| `NODE_ENV=production`, `CORS_ORIGIN`, `DATA_DIR` | Backend | Locks down CORS and the dev sign-in; where the database and videos live |

## Security notes

- Sign-in tokens are checked with Supabase on every request. If Supabase isn't configured or is unreachable, requests are refused.
- The daily limit is enforced on the server. Videos that fail don't count.
- Only public GitHub repo URLs reach Roast and Go deeper. Website links are resolved first, so private or local addresses are refused.
- The old analyzer endpoints (voice narration, Scrimba export, web companion, telemetry, raw file upload) are off unless you set `LEGACY_ROUTES=true` or `ALLOW_FILE_UPLOADS=true`.
- Rate limits protect the heavy endpoints. No keys are put in the website's code except the public Supabase anon key.

## Extensions

`apps/chrome-extension` and `apps/vscode-extension` came first and aren't part of the launch product. The Chrome extension's GitHub button opens Go deeper on carbons.codes. Their other features use the old endpoints listed above and need a backend with those switched on. Each has a status note in its README.

## Limits

- Public repos and public websites only.
- Videos are 30 or 15 seconds, 16:9. Vertical formats and longer videos aren't available yet.
- Rendering needs about 2 GB of RAM; one video renders at a time by default.
- Roast's security check is a pattern scanner, not a full security audit.
- Roast and Go deeper depend on an AI service. When Gemini is out of quota they fall back to other models and get slower.
- The Cinematic 3D style needs WebGL and has only been verified on Windows.

## Contributing

Read [CLAUDE.md](CLAUDE.md) first: it lists the project rules, such as keeping the README honest, shipping tests with every change, and never committing secrets or build output.

## License

[MIT](LICENSE)
