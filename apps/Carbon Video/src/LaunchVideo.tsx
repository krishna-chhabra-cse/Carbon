import type React from "react";
import { AbsoluteFill, Series, useCurrentFrame, useVideoConfig } from "remotion";
import { DirectedVideo } from "./engine/DirectedVideo";
import { Soundtrack } from "./engine/common";
import type { Direction } from "./engine/types";
import { HudChrome } from "./hud/HudChrome";
import { HudCode } from "./hud/HudCode";
import { Backdrop, whipAt } from "./hud/Backdrop";
import { beatPulse, hud, setStyle, STYLES, type StyleName } from "./hud/hud";
import { HudOutro } from "./hud/HudOutro";
import { HudShot } from "./hud/HudShot";
import { HudStat } from "./hud/HudStat";
import { HudTitle } from "./hud/HudTitle";
import { HudTree } from "./hud/HudTree";
import { CHROMES, type ChromeKind } from "./hud/Chrome";
import { CodeFocus, CodeWindow } from "./hud/variants/Codes";
import { FeatGrid, FeatList } from "./hud/variants/Features";
import { OutroCta, OutroWords } from "./hud/variants/Outros";
import { ShotFull, ShotTilt } from "./hud/variants/Shots";
import { StatGiant, StatRing } from "./hud/variants/Stats";
import { TitleCard, TitleStack } from "./hud/variants/Titles";
import { EndScene, NumbersScene, ProblemScene, StatementScene, StepsScene } from "./hud/variants/Story";

// A launch video built from a storyboard. Scene slots are fixed to the
// music's bar lines (90 BPM @ 30fps: 1 bar = 80 frames), so every cut lands on
// a hit no matter what the storyboard says. The 30 s film is
//   160 · 160 · 240 · 160 · 180  = 900 frames
// and what plays in each slot depends on the video type (see FORMATS below).
export const LAUNCH_FRAMES = 900;

type Stat = { kind: "stat"; label: string; value: number; suffix: string; unit: string; note: string };
type Shot = { kind: "shot"; image: string; label: string; heading: string; domain: string; chips: string[] };
type Code = {
  kind: "code";
  label: string;
  heading: string;
  filename: string;
  code: string;
  runCommand: string;
  status: string;
  request: string;
  response: string;
};

// Which composition each scene uses. The original HUD scenes are the first
// option of each slot; the backend (pipeline/looks.js pickLayout) mixes them
// per video so two videos, even in one style, rarely share a layout.
export const LAYOUTS = {
  title: ["scan", "stack", "card"],
  stat: ["chart", "giant", "ring"],
  shot: ["window", "full", "tilt"],
  code: ["split", "window", "focus"],
  features: ["tree", "grid", "list"],
  outro: ["dial", "cta", "words"],
} as const;
type LayoutPick<K extends keyof typeof LAYOUTS> = (typeof LAYOUTS)[K][number];
export type Layout = {
  title?: LayoutPick<"title">;
  stat?: LayoutPick<"stat">;
  shots?: LayoutPick<"shot">[]; // [slot 2, slot 3] for websites
  code?: LayoutPick<"code">;
  features?: LayoutPick<"features">;
  outro?: LayoutPick<"outro">;
  chrome?: ChromeKind;
};
// Each style's own look when a storyboard has no layout (older jobs, Studio).
const STYLE_CHROME: Record<StyleName, ChromeKind> = { hud: "hud", paper: "editorial", bold: "none", glass: "minimal", terminal: "tmux", kinetic: "none", aurora: "minimal" };
const valid = <K extends keyof typeof LAYOUTS>(k: K, v: unknown): LayoutPick<K> => ((LAYOUTS[k] as readonly string[]).includes(v as string) ? (v as LayoutPick<K>) : LAYOUTS[k][0]);

export type Storyboard = {
  accent: string;
  // A classic look (hud.ts) or a directed style (styles/catalog.json).
  style?: string;
  // Soundtrack id (defaults to the style's own track).
  music?: StyleName;
  // Directed styles: the scene plan copied from the catalog by the backend.
  direction?: Direction;
  // Extra facts the directed styles draw (all from the ingested repo/site).
  beats?: string[];
  features?: string[];
  languages?: { name: string; pct: number }[];
  diagram?: { heading: string; nodes: { name: string; desc: string }[] };
  meta?: { type: "repo" | "site"; license: string; language: string; domain: string; commands: string[]; headings: string[]; topics: string[] };
  layout?: Layout;
  format?: Format;
  length?: 15 | 30;
  // Explainer copy (written by the director from the facts).
  explainer?: { problem: string; detail: string; answer: string; steps: { title: string; detail: string }[] };
  // Every real number for the "numbers" type (repos).
  numbers?: { value: number; suffix: string; label: string }[];
  chromeTitle: string;
  watermark: boolean;
  sections: string[];
  title: { title: string; scanLabel: string; ribbon: string; caption: string; tag: string };
  slot2: Stat | Shot;
  slot3: Code | Shot;
  tree: { label: string; heading: string; root: string; plugins: string };
  outro: { command: string; commandLabel?: string; headline: string; url: string; title: string };
};

const Slot: React.FC<{ s: Stat | Shot | Code; accent: string; layout: Layout; n: 0 | 1 }> = ({ s, accent, layout, n }) => {
  const { fps } = useVideoConfig();
  if (s.kind === "stat") {
    const v = valid("stat", layout.stat);
    const p = { label: s.label, value: s.value, suffix: s.suffix, unit: s.unit, note: s.note, accentColor: accent };
    if (v === "giant") return <StatGiant {...p} />;
    if (v === "ring") return <StatRing {...p} />;
    return <HudStat premountFor={fps} {...p} />;
  }
  if (s.kind === "code") {
    const v = valid("code", layout.code);
    const p = { label: s.label, heading: s.heading, filename: s.filename, code: s.code, runCommand: s.runCommand, status: s.status, request: s.request, response: s.response, accentColor: accent };
    if (v === "window") return <CodeWindow {...p} />;
    if (v === "focus") return <CodeFocus {...p} />;
    return (
      <HudCode
        premountFor={fps}
        label={s.label}
        heading={s.heading}
        filename={s.filename}
        code={s.code}
        runCommand={s.runCommand}
        status={s.status}
        request={s.request}
        response={s.response}
        accentColor={accent}
      />
    );
  }
  const v = valid("shot", layout.shots?.[n] ?? (n ? "full" : "window"));
  const p = { image: s.image, label: s.label, heading: s.heading, domain: s.domain, chips: s.chips, accentColor: accent };
  if (v === "full") return <ShotFull {...p} />;
  if (v === "tilt") return <ShotTilt {...p} />;
  return <HudShot {...p} />;
};

const Watermark: React.FC<{ low: boolean }> = ({ low }) => (
  <div
    style={{
      position: "absolute",
      right: 70,
      ...(low ? { bottom: 96 } : { top: 46 }),
      fontFamily: hud.mono,
      fontSize: 22,
      letterSpacing: "0.08em",
      color: hud.ink(0.8),
      padding: "8px 14px",
      border: `1px solid ${hud.ink(0.3)}`,
      backgroundColor: hud.panel,
    }}
  >
    made with carbons.codes
  </div>
);

// ── Video types and lengths ─────────────────────────────────────────────
// A video type is a different story told on the same beat grid:
//   launch     title → proof → show → features → CTA (the original film)
//   explainer  the problem → the answer → how it works in 3 steps → proof → CTA
//   kinetic    type only: name → tagline slam → one feature per beat → proof → word slam
//   numbers    (repos) title → the headline stat → all the real numbers → features → CTA
//   showcase   (websites) the product's own pages, three different ways → features → CTA
// 30 s uses five slots on the bar lines (160 · 160 · 240 · 160 · 180). The 15 s
// cut uses four (80 · 160 · 160 · 60) and plays the same soundtrack spliced on
// beat lines (engine/common.tsx SPLICE), the final hit landing on the end card.
export const FORMATS = ["launch", "explainer", "kinetic", "numbers", "showcase"] as const;
export type Format = (typeof FORMATS)[number];
export const SHORT_FRAMES = 460;
export const framesFor = (length?: number) => (length === 15 ? SHORT_FRAMES : LAUNCH_FRAMES);
const LONG = [160, 160, 240, 160, 180];
const SHORT = [80, 160, 160, 60];

type Scene = { name: string; el: React.ReactNode };

function planScenes(sb: Storyboard, accent: string, fps: number, layout: Layout, short: boolean): { format: Format; scenes: Scene[] } {
  const isRepo = sb.slot2.kind === "stat";
  let format: Format = (FORMATS as readonly string[]).includes(sb.format ?? "") ? (sb.format as Format) : "launch";
  if ((format === "numbers" && !isRepo) || (format === "showcase" && sb.slot2.kind !== "shot")) format = "launch";

  const t = sb.title;
  const o = { ...sb.outro, accentColor: accent };
  const titleKind = valid("title", layout.title);
  const titleEl = (kind = titleKind) => {
    const k = short && kind === "scan" ? "card" : kind; // the scan intro needs a full 160 frames
    if (k === "stack") return <TitleStack {...t} accentColor={accent} />;
    if (k === "card") return <TitleCard {...t} accentColor={accent} />;
    return <HudTitle premountFor={fps} {...t} accentColor={accent} />;
  };
  const featuresEl = (kind = valid("features", layout.features)) =>
    kind === "grid" ? <FeatGrid {...sb.tree} accentColor={accent} /> : kind === "list" ? <FeatList {...sb.tree} accentColor={accent} /> : <HudTree premountFor={fps} {...sb.tree} accentColor={accent} />;
  const outroEl = (kind = valid("outro", layout.outro)) =>
    kind === "cta" ? <OutroCta {...o} finalAt={120} /> : kind === "words" ? <OutroWords {...o} finalAt={120} /> : <HudOutro premountFor={fps} {...sb.outro} finalAt={120} accentColor={accent} />;
  const end = <EndScene title={sb.outro.title} command={sb.outro.command} url={sb.outro.url} accentColor={accent} />;
  const slot2 = <Slot s={sb.slot2} accent={accent} layout={layout} n={0} />;
  const slot3 = <Slot s={sb.slot3} accent={accent} layout={layout} n={1} />;
  // One proof scene for the story formats: the stat, or the live site full-bleed.
  const proof = (statKind: "giant" | "ring") => {
    const s = sb.slot2;
    if (s.kind === "stat") {
      const p = { label: s.label, value: s.value, suffix: s.suffix, unit: s.unit, note: s.note, accentColor: accent };
      return statKind === "giant" ? <StatGiant {...p} /> : <StatRing {...p} />;
    }
    return <ShotFull image={s.image} label={s.label} heading={s.heading} domain={s.domain} chips={s.chips} accentColor={accent} />;
  };
  const ex = sb.explainer;
  const problem = <ProblemScene problem={ex?.problem || t.caption} detail={ex?.detail || ""} accentColor={accent} />;
  const answer = <TitleCard {...t} caption={ex?.answer || t.caption} accentColor={accent} />;
  const steps = (
    <StepsScene
      steps={ex?.steps?.length ? ex.steps : sb.tree.plugins.split(",").slice(0, 3).map((x) => ({ title: x.trim(), detail: "" }))}
      accentColor={accent}
    />
  );
  const stat = sb.slot2.kind === "stat" ? sb.slot2 : null;
  const numbers = <NumbersScene items={sb.numbers?.length ? sb.numbers : stat ? [{ value: stat.value, suffix: stat.suffix, label: stat.unit }] : []} heading={`${t.title} on GitHub.`} accentColor={accent} />;
  const shotOf = (s: Stat | Shot | Code, kind: "window" | "tilt") => {
    if (s.kind !== "shot") return slot3;
    const p = { image: s.image, label: s.label, heading: s.heading, domain: s.domain, chips: s.chips, accentColor: accent };
    return kind === "tilt" ? <ShotTilt {...p} /> : <HudShot {...p} />;
  };
  const opener =
    sb.slot2.kind === "shot" ? (
      <ShotFull image={sb.slot2.image} label="Introducing" heading={t.title} domain={sb.slot2.domain} chips={t.ribbon.split("·").map((x) => x.trim()).filter(Boolean).slice(0, 3)} accentColor={accent} />
    ) : (
      titleEl()
    );

  const S = (name: string, el: React.ReactNode): Scene => ({ name, el });
  const long: Record<Format, Scene[]> = {
    launch: [S("scan", titleEl()), S(isRepo ? "proof" : "homepage", slot2), S(isRepo ? "quickstart" : "product", slot3), S("features", featuresEl()), S("start", outroEl())],
    explainer: [S("problem", problem), S("answer", answer), S("how it works", steps), S("proof", proof("ring")), S("start", outroEl("cta"))],
    kinetic: [S("name", titleEl("stack")), S("tagline", <StatementScene text={t.caption} accentColor={accent} />), S("features", featuresEl("list")), S("proof", proof("giant")), S("start", outroEl("words"))],
    numbers: [S("scan", titleEl()), S("headline", proof("giant")), S("numbers", numbers), S("features", featuresEl()), S("start", outroEl())],
    showcase: [S("intro", opener), S("homepage", shotOf(sb.slot2, "tilt")), S("product", shotOf(sb.slot3, "window")), S("features", featuresEl("grid")), S("start", outroEl("cta"))],
  };
  const shortPlan: Record<Format, Scene[]> = {
    launch: [S("scan", titleEl()), S(isRepo ? "proof" : "homepage", slot2), S("features", featuresEl()), S("start", end)],
    explainer: [S("problem", problem), S("how it works", steps), S("proof", proof("ring")), S("start", end)],
    kinetic: [S("name", titleEl("stack")), S("tagline", <StatementScene text={t.caption} accentColor={accent} />), S("features", featuresEl("list")), S("start", end)],
    numbers: [S("scan", titleEl()), S("headline", proof("giant")), S("numbers", numbers), S("start", end)],
    showcase: [S("intro", opener), S("homepage", shotOf(sb.slot2, "tilt")), S("product", shotOf(sb.slot3, "window")), S("start", end)],
  };
  return { format, scenes: (short ? shortPlan : long)[format] };
}

// Directed styles tell their own story; classic looks share the film below.
export const LaunchVideo: React.FC<Storyboard> = (sb) => (sb.direction ? <DirectedVideo sb={sb} /> : <ClassicVideo {...sb} />);

const ClassicVideo: React.FC<Storyboard> = (sb) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const style = (sb.style ?? "hud") as StyleName;
  // An unknown style is an error, never a silent switch to another look.
  if (!STYLES.includes(style)) throw new Error(`Unknown classic style "${sb.style}" (directed styles need storyboard.direction)`);
  // Must run before the scenes render: they read colors and fonts from `hud`.
  const { accent, bg } = setStyle(style, sb.accent);
  const layout = sb.layout ?? {};
  const short = sb.length === 15;
  const durations = short ? SHORT : LONG;
  const { format, scenes } = planScenes(sb, accent, fps, layout, short);
  let t0 = 0;
  const starts = durations.map((d) => ((t0 += d), t0 - d));
  const cuts = starts.slice(1);
  const whip = whipAt(frame, cuts);
  const chrome: ChromeKind = CHROMES.includes(layout.chrome as ChromeKind) ? (layout.chrome as ChromeKind) : STYLE_CHROME[style] ?? "hud";
  const labels = format === "launch" && !short ? sb.sections : scenes.map((s, i) => `SIG ${String(i + 1).padStart(2, "0")} · ${s.name}`);

  return (
    <AbsoluteFill style={{ backgroundColor: bg }}>
      <Soundtrack music={sb.music ?? style} short={short} />
      <Backdrop title={sb.title.title} />
      {whip.blur ? (
        <svg width={0} height={0} style={{ position: "absolute" }}>
          <filter id="whip" x="-20%" width="140%">
            <feGaussianBlur stdDeviation={`${whip.blur} 0`} />
          </filter>
        </svg>
      ) : null}
      <AbsoluteFill
        style={{
          scale: frame >= cuts[0] && frame < cuts[cuts.length - 1] ? 1 + hud.beatZoom * beatPulse(frame, 20, 7) : 1,
          translate: whip.x ? `${whip.x}px 0px` : undefined,
          filter: whip.blur ? "url(#whip)" : undefined,
        }}
      >
        <Series>
          {scenes.map((s, i) => (
            <Series.Sequence key={i} name={s.name} durationInFrames={durations[i]} premountFor={fps}>
              {s.el}
            </Series.Sequence>
          ))}
        </Series>
      </AbsoluteFill>
      <HudChrome
        title={sb.chromeTitle}
        accentColor={accent}
        cuts={cuts}
        sections={starts.map((from, i) => ({ from, label: labels[i] ?? "" }))}
        kind={chrome}
        product={sb.title.title}
      />
      {sb.watermark ? <Watermark low={chrome !== "hud" && chrome !== "none"} /> : null}
    </AbsoluteFill>
  );
};

// Sample storyboard (the fastify film from the demo) for Studio previews.
export const SAMPLE: Storyboard = {
  accent: "#f1e05a",
  chromeTitle: "FASTIFY · NODE.JS · OSS",
  watermark: false,
  sections: ["SIG 01 · repo scan", "SIG 02 · throughput", "SIG 03 · quickstart", "SIG 04 · ecosystem", "SIG 05 · install"],
  title: {
    title: "fastify",
    scanLabel: "SIG 01 — repo scan · github.com/fastify/fastify",
    ribbon: "routes · hooks · plugins · decorators · json schema · serializers · pino logger · typescript",
    caption: "fast & low overhead web framework — for node.js",
    tag: "JAVASCRIPT",
  },
  slot2: { kind: "stat", label: "THROUGHPUT", value: 76, suffix: "K+", unit: "requests / second", note: "per the fastify readme" },
  slot3: {
    kind: "code",
    label: "QUICKSTART",
    heading: "Nine lines to a server.",
    filename: "server.js",
    code: "import Fastify from 'fastify'\n\nconst app = Fastify({ logger: true })\n\napp.get('/', async () => {\n  return { hello: 'world' }\n})\n\nawait app.listen({ port: 3000 })",
    runCommand: "node server.js",
    status: "listening on :3000",
    request: "GET /",
    response: "{ hello: 'world' }",
  },
  tree: { label: "ECOSYSTEM", heading: "Everything is a plugin.", root: "fastify()", plugins: "@fastify/cors, @fastify/jwt, @fastify/swagger, @fastify/static, @fastify/websocket" },
  outro: { command: "npm i fastify", headline: "Start building.", url: "github.com/fastify/fastify", title: "fastify" },
};
