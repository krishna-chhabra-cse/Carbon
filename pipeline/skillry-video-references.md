# Skillry launch-video references

Reference notes for Carbon's video pipeline, taken from the public Skillry skill pages
(skillry.dev/skills/<slug>) on 2026-10-17. These are our own summaries of what each
skill says it does. The skills themselves are paid ($4.99 each or $9.99/month) and were
**not installed**, so their actual prompts are not included here.

## Styles

| Style | Slug | Length | What it does | Ideas for Carbon |
|---|---|---|---|---|
| Linear Agent style | `bs-linear-agent-style-launch-video` | 25-40s | Dark, cinematic film that glides over the product's real UI, types a command, shows the result, ends on a glowing wordmark. Music bed plus typing sound effects. | Closest to Carbon's 30s target: "real UI → typed command → result → logo" beat structure. |
| Notion style localize | `bs-notion-style-localize-video` | short social | Announces that a website now supports multiple languages. | Pattern for single-feature announcement cuts. |
| Cue style | `bs-cue-style-launch-video` | 60-90s | Character-led launch video for AI agent/assistant products. | Mascot/character option for agent-type repos. |
| Manus 2.0 style | `bs-manus2-0-style-launch-video` | 75-120s | Keynote-style launch built from the product's own facts and interface. | Long-form "keynote" preset; fact extraction from repo/site. |
| Pixel promo | `bs-hyperframes-pixel-promo` | 20-45s | Pixel-art promo with typewriter captions, music and SFX. | Retro style preset; typewriter caption component. |
| CreatorMotion library | `bs-creatormotion` | per beat | Library of effects that turns a script into 16:9 B-roll segments, one effect per key beat. | "One effect per beat" mapping from storyboard beats to animation templates. |
| Paper cutout story | `bs-paper-cutout-story-video` | short | Paper/sticker story-style animation; optional generated music and stickers. | Playful storytelling preset. |
| ASCII glitch launch | `bs-ascii-glitch-launch-video` | short | ASCII/glitch launch film using captured screenshots and posts. | Dev-tool aesthetic preset for CLI/infra repos. |
| Plush crew launch | `bs-plush-crew-launch-video` | short | Launch video with plush characters, local SFX and rendering. | Friendly consumer-product preset. |

## Common pipeline shape

Across these skills, the public pages describe roughly the same stages:

1. **Research / capture**: read the URL or product materials and capture real screenshots and brand assets.
2. **Facts and script**: pull concrete product facts; write a short beat-by-beat storyboard.
3. **Style direction**: pick one visual style and apply it consistently (palette, type, motion).
4. **Build**: animate one effect per beat over the real UI, then close on the wordmark.
5. **Audio**: music bed (provider or own track) plus SFX such as typing; costs approved first.
6. **QA**: check the render before export.
7. **Render**: MP4 at 1080p and up, sometimes extra aspect ratios.

## Mapping to Carbon

- Stages 1-2: `apps/Carbon Backend/pipeline/` (ingest → storyboard), with website capture in `apps/Carbon Video/scripts/capture-site.mjs`. The storyboard prompt is `apps/Carbon Backend/prompts/director.v3.md`; facts are picked by index (`pipeline/storyboard.js`), so no invented numbers.
- Stage 3: `pipeline/brief.js` with `prompts/stylist.v1.md` already picks a look; the styles above are candidate additions to that list.
- Stage 4: the Remotion templates in `apps/Carbon Video/src/` (`LaunchVideo.tsx`, `hud/`). The "one effect per beat" idea fits the existing storyboard beats.
- Stage 5: `apps/Carbon Backend/routes/tts.js` plus the music the director picks on Auto.
- Stage 7: `apps/Carbon Video/scripts/render-video.mjs`.

## Not included

- The skills' prompts, scripts and assets (paid; not installed).
- Any brand imitation: the Linear-style page itself says it is not for copying official Linear videos.
