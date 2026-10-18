# Video styles

Carbon's launch videos come in **directed styles**: each one tells the
product's story with its own scenes, pacing, motion, transitions and
typography. Seven **classic looks** of the original launch film remain
available too. This doc covers where the styles came from, how they are built,
how to add one, and how they were checked.

- Catalog: `apps/Carbon Video/src/styles/catalog.json`
- Renderers: `apps/Carbon Video/src/styles/<id>.tsx`, registered in `modules.ts`
- Engine: `apps/Carbon Video/src/engine/` (`DirectedVideo.tsx`, shared helpers, fonts)
- Backend: `apps/Carbon Backend/pipeline/catalog.js` (reads the same JSON)
- Website: `GET /api/styles` → `src/components/site/StyleGallery.jsx`
- Previews: `node scripts/style-gallery.mjs` (in `apps/Carbon Video`)

## 1. Research (observed 2026-10-17)

Numbers and licences below are **verified**: stars, forks, last push and latest
release come from the GitHub API on 2026-10-17; licences come from each repo's
licence file or official licence page. The "Assessment" and "Use in Carbon"
columns are our own judgement.

| Project | Stars / forks | Activity | Licence (verified) | Assessment | Use in Carbon |
| --- | --- | --- | --- | --- | --- |
| [remotion-dev/remotion](https://github.com/remotion-dev/remotion) | 64,708 / 5,121 | pushed 2026-10-17, v4.0.536 (2026-10-16) | Remotion License: free for individuals, for-profits with ≤ 3 employees and non-profits; a **Company License** otherwise | Frame-exact React video; already Carbon's foundation; first-party transitions, paths, shapes, noise and three.js packages | **B, reuse**: `@remotion/transitions` (Remotion License), `@remotion/paths`, `@remotion/shapes`, `@remotion/noise`, `@remotion/three` (these four declare MIT), all pinned to 4.0.535 |
| [remotion-dev/template-prompt-to-motion-graphics-saas](https://github.com/remotion-dev/template-prompt-to-motion-graphics-saas) | 276 / 78 | pushed 2026-10-16 | no SPDX licence; README points to the Remotion License | LLM writes Remotion code, compiled with Babel in the browser and run; no sandbox is described | **A, study**: prompt validation and per-domain "skills" informed the per-style director guidance. **Rejected**: executing generated code |
| [motion-canvas/motion-canvas](https://github.com/motion-canvas/motion-canvas) | 19,369 / 842 | pushed 2026-07-02, last release v3.17.2 (2024-12) | MIT | Generator timelines, one canvas with camera moves; release cadence has slowed | **A, study**: one continuous sheet with camera pans → Blueprint |
| [ManimCommunity/manim](https://github.com/ManimCommunity/manim) (and [3b1b/manim](https://github.com/3b1b/manim), 95,225★) | 41,619 / 3,203 | v0.22.0 (2026-10-08) | MIT | The reference for explanatory animation: construct, then transform; Python renderer | **A, study**: construct-then-reveal pacing → Blueprint, Whiteboard, Data Story. A second (Python) render pipeline was not justified |
| [mrdoob/three.js](https://github.com/mrdoob/three.js) | 116,536 / 36,660 | r186 (2026-09-24) | MIT | The standard WebGL engine | **C, new capability**: Cinematic 3D (`three@0.180.0`) |
| [pmndrs/react-three-fiber](https://github.com/pmndrs/react-three-fiber) | 33,031 / 2,032 | v9.8.2 (2026-10-15) | MIT | React renderer for three.js; what `@remotion/three` builds on | **B, reuse**: `@react-three/fiber@9.3.0` for Cinematic 3D |
| [greensock/GSAP](https://github.com/greensock/GSAP) | 29,350 / 2,268 | pushed 2026-04-13 | GSAP Standard "no charge" licence: commercial use allowed; not OSI open source; bars use in tools that compete with Webflow's visual builder | Best-in-class timelines and SplitText | **A, study**: per-character mask staggers → Swiss Poster. Not added: Remotion springs cover it and the licence adds a restriction |
| [juliangarnier/anime](https://github.com/juliangarnier/anime) | 73,666 / 4,975 | v4.5.0 (2026-06-22) | MIT | Stagger-from-centre grids, timelines | **A, study**: grid staggers → Bauhaus, Data Story |
| [motiondivision/motion](https://github.com/motiondivision/motion) | 34,241 / 1,435 | pushed 2026-10-16 | MIT | Spring-based UI motion | **A, study**: spring UI and cursor motion → Product Tour |
| [rough-stuff/rough](https://github.com/rough-stuff/rough) | 21,273 / 665 | stable (npm `roughjs` 4.6.6) | MIT | Hand-drawn, seeded, deterministic strokes | **B, reuse**: `roughjs@4.6.6` → Whiteboard Explainer |
| [d3/d3](https://github.com/d3/d3) | 113,765 / 22,633 | v7.9.0 (2024) | ISC | Scales, arcs, data joins | **A, study**: log scale and donut arcs implemented directly in Data Story (no dependency) |
| [processing/p5.js](https://github.com/processing/p5.js) | 24,139 / 3,873 | v2.3.4 (2026-09-25) | **LGPL-2.1** | Generative art, flow fields | **A, study**: flow field → Signal, built on `@remotion/noise` instead (avoids LGPL obligations) |
| [pixijs/pixijs](https://github.com/pixijs/pixijs) | 48,407 / 5,099 | v8.22.0 (2026-10-01) | MIT | Fast 2D sprites | **A, study**: stepped sprite animation → Pixel Arcade (SVG/DOM is enough at 8 fps) |
| [airbnb/lottie-web](https://github.com/airbnb/lottie-web) | 32,242 / 2,950 | pushed 2025-09-01 | MIT | Plays After Effects exports | **A, deferred**: worth adding (`@remotion/lottie`) once Carbon owns licensed animation assets |
| [code-hike/codehike](https://github.com/code-hike/codehike) | 5,390 / 168 | v1.1.0 (2026-03-17) | MIT | Animated code walkthroughs | **A, study**: code as the hero, line by line → Shell Session |

Also reviewed: [theatre-js/theatre](https://github.com/theatre-js/theatre) (12,776★; core Apache-2.0 but **studio AGPL-3.0**; no push since 2024-08 → not adopted), [shikijs/shiki](https://github.com/shikijs/shiki) (MIT; a small tokenizer was enough), [redotvideo/revideo](https://github.com/redotvideo/revideo) (MIT Motion Canvas fork), [yihui-dev/awesome-opus5-5-videos](https://github.com/yihui-dev/awesome-opus5-5-videos) (5,667★, MIT list of 703 prompts; categories motion graphics, explainers, 3D, games) and [skillry.dev/ai-videos/opus-5-5](https://skillry.dev/ai-videos/opus-5-5) (418 videos; paid Skills). The prompt collections were used for category and technique inspiration only: **no prompts, templates, clips or assets were copied**; every Carbon style is an original implementation.

## 2. From techniques to styles

| Technique (source) | Carbon style |
| --- | --- |
| Stroke drawing, one canvas with camera pans, construct-then-reveal (Manim, Motion Canvas, `@remotion/paths`) | **Blueprint** |
| Per-character mask staggers, hard cuts on the beat, grid typography (GSAP SplitText, Swiss style) | **Swiss Poster** |
| Stop-motion on twos, torn paper, halftone (Skillry paper/halftone films, classic animation) | **Editorial Collage** |
| Stepped sprite animation, downsampled bitmaps (PixiJS, p5.js pixel art) | **Pixel Arcade** |
| Scales, arcs, number reveals (d3, Manim) | **Data Story** |
| Spring UI motion, cursor paths, push-ins (Motion, Linear-style launch films) | **Product Tour** |
| Noise flow fields, particles that form shapes (p5.js, `@remotion/noise`) | **Signal** |
| Stagger grids, geometric primitives (anime.js, `@remotion/shapes`) | **Bauhaus Geometry** |
| Seeded hand-drawn strokes with "boil" (rough.js, Excalidraw-style) | **Whiteboard Explainer** |
| Code-first walkthroughs (Code Hike, terminals) | **Shell Session** |
| Lit 3D studio, dolly/orbit, light sweeps (three.js, R3F, `@remotion/three`) | **Cinematic 3D** |

Rejected as near-duplicates: a separate "kinetic typography" style (Swiss Poster covers it; the classic Kinetic look remains), a "sketchbook" style (Whiteboard), and a "terminal" directed style (Shell Session differs from the classic Terminal look in story, not just palette).

## 3. Catalog

| Style | Category | Story (30 s scene plan) | Motion / transitions | Inputs |
| --- | --- | --- | --- | --- |
| Blueprint | Technical | title block → system diagram (deck architecture nodes) → detail A (real code or screenshot) → specifications (real numbers, languages, licence) → stamp + install | strokes draw on; slide transitions + parallax grid (camera pan) | repo, site |
| Swiss Poster | Typography | name → 3 one-word beats → tagline → numbered features → figure (real number or duotone screenshot) → command → end card | 9 scenes, hard cuts every 2–4 beats; letters rise from masks | repo, site |
| Editorial Collage | Editorial | magazine cover → spread → pull quote → pinboard of features → back cover | 12 fps stop-motion; wipe | repo, site |
| Pixel Arcade | Playful | title screen → player select (real stats, log scale) → side-scrolling level collecting features → cheat code (install) → level complete | 8 fps; iris wipe | repo, site |
| Data Story | Data | headline number → log-scale bars of real GitHub numbers → language donut → what's inside → takeaway | expo-out chart growth; wipe | repo only |
| Product Tour | Product | URL typed, page loads → cursor + tooltips on the hero → scroll to the next captured section → feature checklist → CTA click | eased cursor paths, push-ins; fade | site only |
| Signal | Generative | flow field → particles form the name → beats over the field → feature constellations → collapse into the install line | seek-safe noise field with trails; fade | repo, site |
| Bauhaus Geometry | Minimal | composition → tagline on colour blocks → shape grid of features → figure in a circle → resolve | staggered springs, quarter-turns on the beat; clock wipe | repo, site |
| Whiteboard Explainer | Explainer | the problem → product circled as the answer → 3 steps with arrows → proof → try it | rough.js draw-on with boil; handwriting; wipe | repo, site |
| Shell Session | Developer | clone → real README headings → real snippet → numbers pane → install | one continuous take (invisible cuts) | repo only |
| Cinematic 3D | Cinematic | light sweep reveal → orbit around the panel (real screenshot or code) → features as lit slabs → name | dolly, orbit, dissolves; WebGL | repo, site |

Every directed style comes in 30 s and 15 s (the 15 s plan uses three scenes). Cuts are on the 90 BPM beat grid (multiples of 20 frames) so they land on the soundtrack's hits.

## 4. Architecture

```
Create page ──► POST /api/videos {style, format, length}
                 │  catalog.checkStyle(): style × input type × length × video type → 400 with a clear message
                 ▼
              video_jobs.style (explicit, never rewritten)
                 ▼
worker ─► buildStoryboard(): chosen style (or the stylist's pick) is sent to the
          director in a STYLE block; the schema drops the style fields so it can't pick another
                 ▼
          assemble(): resolveLook() keeps the creator's pick (throws if it can't be drawn);
          directed → storyboard.direction = catalog scene plan; classic → layout + format
                 ▼
render-video.mjs ─► LaunchVideo: direction ? DirectedVideo : classic film
          DirectedVideo throws on an unknown style or scene (no silent fallback)
```

**One source of truth.** `catalog.json` lives in the renderer (it must implement every style). The backend reads it through `VIDEO_APP_DIR`, the same path it already uses to run the render scripts; in production both apps ship in one image (`deploy/backend.Dockerfile`). If the file can't be read, the backend logs it and offers only the classic looks. The website never bundles the catalog: it fetches `GET /api/styles` and falls back to the classic looks.

**Facts stay grounded.** Directed styles draw only from the storyboard: the director's clamped copy plus `beats`, `features`, `languages`, `diagram` (deck architecture nodes), `meta` (licence, commands, headings, topics) and real numbers picked by index. Labels that would be claims are derived from facts (e.g. Collage's sticker says "MIT licensed" only when there is a licence).

### Adding a style

1. Add an entry to `catalog.json` (`engine: "directed"`, `inputs`, `lengths`, `music`, `transition`, `director`, `scenes` for `"30"` and `"15"`; frames must sum to 900 / 460 and cut on multiples of 20).
2. Write `src/styles/<id>.tsx` exporting a `StyleModule` whose `scenes` keys match the catalog scene ids; register it in `modules.ts`.
3. Add a deck palette in `scripts/build-deck.mjs`.
4. Pick `preview.sample/posterFrame/clipFrom` and run `node scripts/style-gallery.mjs <id>`.
5. `npm test --prefix "apps/Carbon Backend"` checks plan timing, renderer coverage, deck palette and preview files for every directed style.

## 5. Licensing decisions

- **Remotion** (already in use) is source-available, not OSI open source: a **Company License is required once Carbon is a for-profit company with more than three employees**. The new `@remotion/*` packages fall under the same licence. This is a business decision for the owner, flagged here.
- New packages (licence from each package.json): `three` 0.180.0 (MIT), `@react-three/fiber` 9.3.0 (MIT), `roughjs` 4.6.6 (MIT), `@remotion/three`, `@remotion/noise`, `@remotion/shapes`, `@remotion/paths` 4.0.535 (MIT) and `@remotion/transitions` 4.0.535 (Remotion License). `npm audit --omit=dev` reports no issues in them (its two existing findings are `pptxgenjs` → `image-size`). No GSAP, p5.js (LGPL) or Theatre.js studio (AGPL).
- Fonts added for the styles (Press Start 2P, Caveat, Permanent Marker, Special Elite, DM Serif Display, Space Grotesk, JetBrains Mono) are Google Fonts under the SIL Open Font License.
- Gallery previews are original renders by Carbon's own pipeline from public data: `github.com/fastify/fastify` (MIT; the same sample as the existing site demo) and `carbons.codes` (Carbon's own site).
- No third-party prompts, templates, clips or assets were copied.

## 6. Evaluation (2026-10-17)

**Projects** (facts read by the real ingest step, copy written by the real
director): `charmbracelet/gum` (CLI dev tool), `fastify/fastify` (framework,
data-rich), `krishna-chhabra-cse/Carbon` (AI/DevSecOps repo), cal.com (SaaS),
stripe.com (finance), allbirds.com (e-commerce) and a personal portfolio site.

**Method.** Every project × every style it supports (11 directed + the HUD,
Glass and Paper classic looks as a baseline) rendered at the same five film
frames (3, 9, 15, 21, 27 s): 87 combinations, 435 frames. For each pair of
styles on the same project and frame we compare (a) *layout similarity*: the
correlation of edge-magnitude maps, which ignores colour, so two frames with
the same composition in different palettes still score high; and (b) mean
colour difference.

| Comparison | Pairs | Layout similarity (mean / p90) | Colour difference |
| --- | --- | --- | --- |
| Classic look vs classic look (the original problem) | 3 | **0.69 / 0.90** | 0.52 |
| Directed style vs directed style | 53 | **0.07 / 0.22** | 0.47 |

The most similar directed pair (Cinematic 3D / Signal, both dark) scores 0.20,
far below any classic pair. Within one style, different projects keep the
style's structure (layout 0.42–0.76) while the content changes: their own
names, features, numbers, code and screenshots.

**End to end.** A Blueprint video started from the Create page for
`fastify/fastify` went through API → job → worker → director (briefed with the
style) → renderer: the job record says `blueprint` / `user` / no video type,
the stored storyboard carries Blueprint's scene plan with the director's
fastify-specific diagram nodes, and frames sampled from the 1080p MP4 are
Blueprint scenes. 15-second renders (one directed, one classic) both come out
at 460 frames with the spliced soundtrack.

## 7. Known limitations

- Cinematic 3D needs WebGL in headless Chrome, and renders it on the CPU on Linux. `scripts/gl.mjs` picks the GL backend: `swangle` (ANGLE on SwiftShader, no GPU needed) on Linux, `angle` (GPU, verified on Windows) everywhere else. `REMOTION_GL` overrides it, e.g. `angle` on a Linux host that has a GPU. Verified in the production image (`deploy/backend.Dockerfile`, no GPU): `angle` fails there with "Could not create a WebGL context", while `swangle` renders a 30 s video at 720p in 72–83 s (under WSL2 on a laptop).
- Directed styles share one copy schema; per-style copy comes from the director's style guidance, not a per-style schema.
- All soundtracks are 90 BPM; styles differ in cut rhythm, not tempo.
- Gallery previews use the same sample copy for every style so the styles can be compared.
