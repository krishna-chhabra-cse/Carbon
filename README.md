# Carbon: paste a repo, get a launch video

**[carbons.codes](https://carbons.codes)** turns a public GitHub repo or a live website into:

1. **A 30-second launch video**: kinetic title, a real stat, real code from the README (or a tour of your site), a feature tree and an end card, cut on the beat of an original soundtrack.
2. **An editable pitch deck** (.pptx): title, why people pick it, architecture, API in one glance, numbers, get started.

Plus two free extras:

- **Roast my codebase**: a score out of 10 backed by real metrics (god files, circular deps, test ratio, leaked secrets) with fixes and a share link. No signup.
- **Go deeper** (`/app`): architecture diagram, API explorer, business logic in plain English and a chat about the code, for any public repo. No signup.

Making a video needs a free account (email + password with email confirmation, or Google; GitHub if switched on in Supabase). Free accounts get **2 videos per rolling 24 hours** (720p, small watermark), enforced on the server; videos that fail don't count. There are no paid plans or prices yet: people who want more join the **early-access list** for longer videos (up to 2 minutes), more video categories and more soundtracks.

## How the video is made

```
URL ─► ingest ─────────► director (Gemini) ─► validate ─► render (Remotion) ─► MP4
       GitHub API /       prompts/director.v5.md   clamp text,     the chosen style's  + deck (.pptx)
       site capture       JSON schema output       pick facts      own scenes
```

- **Ingest** (`apps/Carbon Backend/pipeline/ingest.js`): repo metadata, languages, README snippets and install commands from the GitHub API; for websites, a headless-Chrome capture of screenshots, headings and brand colors (`apps/Carbon Video/scripts/capture-site.mjs`).
- **Brief** (`pipeline/brief.js`, `POST /api/briefs`): before a video, Gemini (`prompts/interviewer.v1.md`) asks the creator four multiple-choice questions written for their product: who watches, the feeling of the first second (up to two), what to show off, where it will be posted, plus an optional note. A second call (`prompts/stylist.v2.md`) turns the answers into a recommended style (from the whole catalog) + soundtrack with a reason. Options are clamped and validated server-side, and every step has a no-LLM fallback. The brief's facts are reused by the render, so the product is read once.
- **Director** (`pipeline/storyboard.js`): Gemini writes the copy against a strict JSON schema. When the style is already chosen (by the creator, or recommended after the questions) the director is told which one and gets that style's own storytelling direction; it never picks another. Numbers, code and commands are chosen **by index** from the ingested facts, so the video never shows invented stats or code. Without an API key, a deterministic storyboard is built from the facts.
- **Styles** (`apps/Carbon Video/src/styles/catalog.json`, one list read by the renderer, the backend and the website via `GET /api/styles`): eleven *directed* styles that each tell their own story with their own scenes, pacing, motion, transitions and typography — Blueprint (line-drawn system diagram), Swiss Poster (kinetic typography, hard cuts), Editorial Collage (stop-motion paper cut-outs), Pixel Arcade (8-bit game), Data Story (repos: the real GitHub numbers as charts), Product Tour (websites: browser walkthrough), Signal (generative particles), Bauhaus Geometry, Whiteboard Explainer (hand-drawn with rough.js), Shell Session (repos: one terminal take) and Cinematic 3D (three.js studio) — plus the seven classic looks below. An explicit pick is validated against the link, length and video type and is never swapped for another style. Gallery previews are rendered by `scripts/style-gallery.mjs`. See `docs/VIDEO_STYLES.md`.
- **Render** (`apps/Carbon Video`): hand-built Remotion scenes whose cuts sit on the music's beat grid. The classic launch film comes in seven looks (HUD, Paper, Bold, Glass, Terminal, Kinetic, Aurora), each with its own palette, typography, background and original 90 BPM soundtrack (synthesized in code by `scripts/make-music-packs.mjs`; no samples). Each scene also has three compositions (title: scan / letter stack / app card; stat: chart / giant number / ring; website shot: browser window / full-bleed / 3D tilt; code: split / editor window / focus; features: tree / card grid / one-per-beat list; outro: beat dial / CTA button / word slam), and each style has its own on-screen UI (HUD brackets, tmux bar, magazine folio, minimal pill + progress bar, or none). `pickLayout()` in `pipeline/looks.js` mixes them per video, seeded by the job and nudged by the brief, so remakes of the same product differ. On "Auto" the director picks the style and the soundtrack from fixed lists, with a one-line reason shown on the result page; an invalid pick falls back to a stable hash of the URL. Long text auto-fits.
- **Video types and lengths** (classic looks): every classic video is one of five stories on the same beat grid: Launch film, Explainer (problem → answer → 3 steps → proof → CTA), Kinetic type, By the numbers (repos, real GitHub numbers only) and Showcase (websites, the product's own pages three ways). The stylist recommends one from the brief; the creator can change it. Each comes in 30 s or a 15 s social cut, which plays the same soundtrack spliced on beat lines so the cuts still land on hits.
- **Deck** (`apps/Carbon Video/scripts/build-deck.mjs`): native PowerPoint shapes, so everything is editable.

## Repo layout

| Path | What |
|---|---|
| `apps/Carbon Frontend` | React + Vite site (Vercel) |
| `apps/Carbon Backend` | Express API: sign-in (Supabase token check), free quota, video jobs, early-access list, render worker. (Razorpay billing code is present but unused: no prices are shown.) |
| `apps/Carbon Video` | Remotion templates + render / deck / capture scripts |
| `apps/Carbon Agent Service` | Python FastAPI: Roast metrics and Go-deeper analysis (LangGraph agents) |
| `tests/` | Python tests (agent service) |

## Run it locally

```bash
npm install && npm run dev                     # frontend :5173, backend :3002, agent :8005
npm test --prefix "apps/Carbon Backend"        # backend tests
npm test --prefix "apps/Carbon Frontend"       # sign-in form helpers
python -m pytest tests                         # agent service tests
npm run studio --prefix "apps/Carbon Video"    # preview the video templates
```

Copy `.env.example` → `apps/Carbon Backend/.env` (set `AUTH_DEV_BYPASS=true` and use "Continue as local dev user" on /login to work without Supabase) and `apps/Carbon Agent Service/.env.example` → `.env`.

Going live (Supabase, Google sign-in, email SMTP, Railway, Vercel): see [docs/LAUNCH_SETUP.md](docs/LAUNCH_SETUP.md).

## Limits (honest)

- Public repos and public websites only.
- Videos are 30 or 15 seconds, 16:9. Vertical formats and longer videos aren't available yet.
- Go deeper and Roast use an LLM; when the Gemini key is out of quota they fall back to other models and get slower.
- The Roast's security check is a pattern scanner (26 rules), not a full SAST tool.
- Rendering needs about 2 GB RAM; one video renders at a time by default.

MIT licensed.
