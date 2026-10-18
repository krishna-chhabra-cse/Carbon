import type React from "react";
import { AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { BEAT, clamp, fit, lum, mixHex, safeHex, useScene } from "../engine/common";
import { grotesk } from "../engine/fonts";
import type { SceneProps, StyleModule } from "../engine/types";

// Bauhaus Geometry: minimalist geometric motion in a primary palette. Circles,
// squares, half-discs and triangles fly in on staggered springs, snap a
// quarter-turn on every beat and lock into a grid. The product's accent
// joins the red, yellow and blue as a fourth primary.

const CREAM = "#f0e9db";
const BLACK = "#151515";
const RED = "#d6402f";
const YELLOW = "#f2b632";
const BLUE = "#2b59a8";

type Kind = "circle" | "square" | "half" | "quarter" | "triangle";

const shapeStyle = (kind: Kind, size: number, color: string): React.CSSProperties => {
  const base: React.CSSProperties = { width: size, height: kind === "half" ? size / 2 : size, background: color };
  if (kind === "circle") return { ...base, borderRadius: "50%" };
  if (kind === "half") return { ...base, borderRadius: `${size}px ${size}px 0 0` };
  if (kind === "quarter") return { ...base, borderTopLeftRadius: "100%" };
  if (kind === "triangle") return { ...base, clipPath: "polygon(50% 0, 100% 100%, 0 100%)" };
  return base;
};

// A shape that flies in from `from` (px offset) with a spring, then turns a
// quarter on every beat if `turn` is set.
const Shape: React.FC<{ kind: Kind; x: number; y: number; size: number; color: string; at: number; from?: [number, number]; turn?: boolean; rot?: number }> = ({ kind, x, y, size, color, at, from = [0, -900], turn, rot = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const k = spring({ frame: frame - at, fps, config: { damping: 15, stiffness: 140, mass: 0.9 } });
  // A quarter-turn snapped onto every beat after landing.
  let angle = rot;
  if (turn && frame >= at + 20) {
    const n = Math.floor((frame - at - 20) / BEAT);
    angle = rot + 90 * (n + Math.min(1, spring({ frame: frame - at - 20 - n * BEAT, fps, config: { damping: 12, stiffness: 220 } })));
  }
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        ...shapeStyle(kind, size, color),
        translate: `${interpolate(k, [0, 1], [from[0], 0])}px ${interpolate(k, [0, 1], [from[1], 0])}px`,
        rotate: `${angle}deg`,
        opacity: frame >= at ? 1 : 0,
      }}
    />
  );
};

const inkOn = (bg: string) => (lum(bg) > 0.4 ? BLACK : "#ffffff");
const palette = (accent: string) => [RED, YELLOW, BLUE, accent, BLACK];

// ── Scenes ──────────────────────────────────────────────────────────────
const Compose: React.FC<SceneProps> = ({ sb, accent }) => {
  const { frame, fps } = useScene();
  const name = sb.title.title.toLowerCase();
  const nameIn = spring({ frame: frame - 34, fps, config: { damping: 200 } });
  const pieces: { kind: Kind; x: number; y: number; s: number; c: string; from: [number, number]; rot?: number }[] = [
    { kind: "circle", x: 1080, y: 120, s: 520, c: YELLOW, from: [900, 0] },
    { kind: "square", x: 1380, y: 520, s: 380, c: BLUE, from: [0, 900] },
    { kind: "half", x: 1000, y: 640, s: 400, c: RED, from: [-900, 0] },
    { kind: "triangle", x: 1560, y: 140, s: 240, c: BLACK, from: [0, -900] },
    { kind: "quarter", x: 1120, y: 840, s: 200, c: accent, from: [0, 900] },
  ];
  return (
    <AbsoluteFill>
      {pieces.map((p, i) => (
        <Shape key={i} kind={p.kind} x={p.x} y={p.y} size={p.s} color={p.c} at={i * 4} from={p.from} />
      ))}
      <div style={{ position: "absolute", left: 120, top: 400, fontFamily: grotesk, fontWeight: 700, fontSize: fit(name, 230, 860, 0.58), lineHeight: 0.9, letterSpacing: "-0.05em", color: BLACK, opacity: nameIn, translate: `${(1 - nameIn) * -60}px 0px` }}>{name}</div>
      <div style={{ position: "absolute", left: 124, top: 620, width: 700 * nameIn, height: 10, background: BLACK }} />
      <div style={{ position: "absolute", left: 124, top: 660, fontFamily: grotesk, fontWeight: 500, fontSize: 34, color: BLACK, opacity: interpolate(frame, [60, 80], [0, 1], clamp) }}>{sb.title.tag.toLowerCase()} · {sb.meta?.domain || sb.outro.url}</div>
    </AbsoluteFill>
  );
};

const Statement: React.FC<SceneProps> = ({ sb, accent }) => {
  const { frame, fps } = useScene();
  const words = (sb.title.caption || sb.title.title).split(/\s+/).filter(Boolean).slice(0, 8);
  const colors = palette(accent);
  const size = Math.min(130, 1500 / Math.max(4, Math.ceil(words.join(" ").length / 2)));
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 120, top: 160, width: 1680, display: "flex", flexWrap: "wrap", gap: 18 }}>
        {words.map((w, i) => {
          const at = 4 + i * (BEAT / 2);
          const k = spring({ frame: frame - at, fps, config: { damping: 14, stiffness: 200 } });
          const bg = colors[i % colors.length];
          return (
            <span key={i} style={{ padding: "6px 26px 14px", background: bg, color: inkOn(bg), fontFamily: grotesk, fontWeight: 700, fontSize: size, lineHeight: 1.05, letterSpacing: "-0.03em", translate: `0px ${(1 - k) * -700}px`, opacity: frame >= at ? 1 : 0, borderRadius: i % 3 === 1 ? size : 0 }}>
              {w.toLowerCase()}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const Grid: React.FC<SceneProps> = ({ sb, accent }) => {
  const feats = (sb.features ?? []).slice(0, 6);
  const kinds: Kind[] = ["circle", "square", "triangle", "half", "quarter", "circle"];
  const colors = palette(accent);
  const cols = 3;
  const cw = 540;
  const ch = 380;
  return (
    <AbsoluteFill>
      {feats.map((f, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const at = (col + row) * 8;
        const x = 120 + col * (cw + 30);
        const y = 120 + row * (ch + 40);
        const c = colors[i % colors.length];
        return (
          <div key={f}>
            <div style={{ position: "absolute", left: x, top: y, width: cw, height: ch, border: `4px solid ${BLACK}` }} />
            <Shape kind={kinds[i % kinds.length]} x={x + cw - 250} y={y + 40} size={210} color={c} at={at} from={[0, -400]} turn={i % 2 === 0} />
            <div style={{ position: "absolute", left: x + 30, top: y + ch - 110, width: cw - 60, fontFamily: grotesk, fontWeight: 700, fontSize: fit(f, 50, cw - 60, 0.56), lineHeight: 1, color: BLACK }}>{f.toLowerCase()}</div>
            <div style={{ position: "absolute", left: x + 30, top: y + 30, fontFamily: grotesk, fontWeight: 500, fontSize: 26, color: BLACK }}>{String(i + 1).padStart(2, "0")}</div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

const Figure: React.FC<SceneProps> = ({ sb, accent }) => {
  const { frame } = useScene();
  const stat = sb.slot2.kind === "stat" ? sb.slot2 : null;
  const shot = sb.slot2.kind === "shot" ? sb.slot2 : null;
  const grow = interpolate(frame, [0, 30], [0, 1], { ...clamp, easing: (t) => 1 - (1 - t) ** 3 });
  return (
    <AbsoluteFill>
      <Shape kind="square" x={1260} y={140} size={420} color={RED} at={10} from={[700, 0]} />
      <Shape kind="triangle" x={1420} y={600} size={300} color={BLUE} at={18} from={[0, 700]} turn />
      {stat ? (
        <>
          <div style={{ position: "absolute", left: 160, top: 160, width: 760, height: 760, borderRadius: "50%", background: YELLOW, scale: String(grow), display: "flex", alignItems: "center", justifyContent: "center", fontFamily: grotesk, fontWeight: 700, fontSize: fit(`${stat.value}${stat.suffix}`, 300, 620, 0.62), letterSpacing: "-0.05em", color: BLACK }}>
            {Math.round(stat.value * grow)}
            {stat.suffix}
          </div>
          <div style={{ position: "absolute", left: 980, top: 820, fontFamily: grotesk, fontWeight: 700, fontSize: 64, color: BLACK, opacity: interpolate(frame, [30, 50], [0, 1], clamp) }}>{stat.unit.toLowerCase()}</div>
        </>
      ) : shot ? (
        <>
          <div style={{ position: "absolute", left: 140, top: 140, width: 800, height: 800, borderRadius: "50%", overflow: "hidden", scale: String(grow), border: `10px solid ${BLACK}` }}>
            <Img src={shot.image} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top left" }} />
          </div>
          <div style={{ position: "absolute", left: 1000, top: 200, width: 240, fontFamily: grotesk, fontWeight: 700, fontSize: fit(shot.heading, 64, 600, 0.56), lineHeight: 1.02, color: BLACK, opacity: interpolate(frame, [30, 50], [0, 1], clamp) }}>{shot.heading.toLowerCase()}</div>
        </>
      ) : null}
    </AbsoluteFill>
  );
};

const Resolve: React.FC<SceneProps> = ({ sb, accent }) => {
  const { frame, fps } = useScene();
  const isRepo = sb.meta?.type !== "site";
  const cmd = isRepo ? sb.outro.command : sb.outro.url;
  const bar = spring({ frame: frame - 20, fps, config: { damping: 200 } });
  const kinds: Kind[] = ["circle", "square", "triangle", "half", "circle"];
  const colors = palette(accent);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 120, top: 150, fontFamily: grotesk, fontWeight: 700, fontSize: fit(sb.title.title, 200, 1200, 0.58), letterSpacing: "-0.05em", color: BLACK }}>{sb.title.title.toLowerCase()}</div>
      {kinds.map((k, i) => (
        <Shape key={i} kind={k} x={1100 + i * 150} y={240} size={120} color={colors[i % colors.length]} at={i * 5} from={[0, -600]} />
      ))}
      <div style={{ position: "absolute", left: 120, top: 520, height: 170, width: 1680 * bar, background: BLACK, display: "flex", alignItems: "center", paddingLeft: 60, overflow: "hidden" }}>
        <span style={{ fontFamily: grotesk, fontWeight: 500, fontSize: fit(cmd, 64, 1500, 0.6), color: "#ffffff", whiteSpace: "nowrap", opacity: interpolate(frame, [40, 56], [0, 1], clamp) }}>
          {isRepo ? <span style={{ color: YELLOW }}>$ </span> : null}
          {cmd}
        </span>
      </div>
      <div style={{ position: "absolute", left: 120, top: 760, fontFamily: grotesk, fontWeight: 500, fontSize: 44, color: BLACK, opacity: interpolate(frame, [60, 80], [0, 1], clamp) }}>
        {sb.outro.headline.toLowerCase()} — {isRepo ? sb.outro.url : sb.meta?.domain}
      </div>
    </AbsoluteFill>
  );
};

export const bauhaus: StyleModule = {
  bg: CREAM,
  // The accent sits next to red, yellow and blue: keep it saturated but not pale.
  accent: (sb) => (lum(safeHex(sb.accent)) > 0.6 ? mixHex(sb.accent, 0, 0.3) : safeHex(sb.accent)),
  watermark: { color: BLACK, background: CREAM, font: grotesk, low: true },
  scenes: {
    "bauhaus.compose": Compose,
    "bauhaus.statement": Statement,
    "bauhaus.grid": Grid,
    "bauhaus.figure": Figure,
    "bauhaus.resolve": Resolve,
  },
};
