import type React from "react";
import {
  AbsoluteFill,
  Interactive,
  interpolate,
  random,
  spring,
  useCurrentFrame,
  useVideoConfig,
  type InteractivitySchema,
} from "remotion";
import { BEAT, fitDisplay, hud } from "./hud";

type HudTreeProps = {
  readonly label: string;
  readonly heading: string;
  readonly root: string;
  readonly plugins: string;
  readonly accentColor: string;
  readonly style?: React.CSSProperties;
};

type Branch = { x1: number; y1: number; x2: number; y2: number; depth: number; start: number; end: number };
type Leaf = { x: number; y: number; t: number };

const MAX_DEPTH = 7;
const ROOT = { x: 960, y: 900 };

// Deterministic generative tree (same every render).
const buildTree = () => {
  const branches: Branch[] = [];
  const leaves: Leaf[] = [];
  let n = 0;
  const grow = (x: number, y: number, angle: number, len: number, depth: number, start: number) => {
    const x2 = x + Math.cos(angle) * len;
    const y2 = y + Math.sin(angle) * len;
    const dur = 13 - depth;
    branches.push({ x1: x, y1: y, x2, y2, depth, start, end: start + dur });
    if (depth >= MAX_DEPTH) {
      leaves.push({ x: x2, y: y2, t: start + dur });
      return;
    }
    const kids = depth > 1 && random(`k${n++}`) > 0.6 ? 3 : 2;
    for (let k = 0; k < kids; k++) {
      const spread = 0.55 + random(`s${n++}`) * 0.2;
      const a = angle + (k - (kids - 1) / 2) * spread + (random(`j${n++}`) - 0.5) * 0.25;
      grow(x2, y2, a, len * (0.7 + random(`l${n++}`) * 0.1), depth + 1, start + dur);
    }
  };
  grow(ROOT.x, ROOT.y, -Math.PI / 2, 158, 0, 6);
  return { branches, leaves };
};

const TREE = buildTree();

// Scene 4: a tree grows out of `fastify()`; plugin names attach to its
// leaves on the half-beats, and random leaves light up on every beat.
const HudTreeInner: React.FC<HudTreeProps> = ({
  label,
  heading,
  root,
  plugins,
  accentColor,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const beatIdx = Math.floor(frame / BEAT);
  const headIn = spring({ frame, fps, config: { damping: 200 } });
  const names = plugins.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 6);
  const slotsY = [360, 500, 640];

  const labelFor = (i: number) => {
    const left = i % 2 === 0;
    const y = slotsY[Math.floor(i / 2)];
    const pool = TREE.leaves.filter((l) => (left ? l.x < 880 : l.x > 1040));
    const leaf = pool.reduce((best, l) =>
      Math.abs(l.y - y) < Math.abs(best.y - y) ? l : best,
    pool[0] ?? TREE.leaves[0]);
    return { left, y, leaf };
  };

  return (
    <AbsoluteFill style={{ backgroundColor: hud.sceneBg, color: hud.white, ...style }}>
      <div
        style={{
          position: "absolute",
          left: 160,
          top: 130,
          opacity: headIn,
          translate: `0px ${interpolate(headIn, [0, 1], [20, 0])}px`,
        }}
      >
        <div
          style={{
            fontFamily: hud.mono,
            fontSize: 22,
            letterSpacing: "0.16em",
            color: accentColor,
            textTransform: "uppercase",
          }}
        >
          / {label} /
        </div>
        <div style={{ fontFamily: hud.display, fontWeight: hud.displayWeight, textTransform: hud.displayCase, fontSize: fitDisplay(heading, 76, 1000, 0.58), letterSpacing: "-0.04em", marginTop: 10 }}>
          {heading}
        </div>
      </div>

      <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0 }}>
        {TREE.branches.map((b, i) => {
          const p = interpolate(frame, [b.start, b.end], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          if (p <= 0) return null;
          return (
            <line
              key={i}
              x1={b.x1}
              y1={b.y1}
              x2={b.x1 + (b.x2 - b.x1) * p}
              y2={b.y1 + (b.y2 - b.y1) * p}
              stroke={hud.ink(0.95 - b.depth * 0.08)}
              strokeWidth={Math.max(1, 7 - b.depth)}
              strokeLinecap="round"
            />
          );
        })}
        {TREE.leaves.map((l, i) => {
          if (frame < l.t) return null;
          const lit = frame >= 50 && random(`leaf-${i}-${beatIdx}`) < 0.22;
          const local = (frame % BEAT) / BEAT;
          return (
            <circle
              key={i}
              cx={l.x}
              cy={l.y}
              r={lit ? 6 - local * 2 : 3}
              fill={lit ? accentColor : hud.ink(0.6)}
              style={lit ? { filter: `drop-shadow(0 0 8px ${accentColor})` } : undefined}
            />
          );
        })}
        {names.map((_, i) => {
          const { left, y, leaf } = labelFor(i);
          const s = interpolate(frame, [70 + i * 10, 78 + i * 10], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const x0 = left ? 590 : 1330;
          return (
            <g key={i} opacity={s}>
              <polyline
                points={`${x0},${y} ${x0 + (left ? 40 : -40)},${y} ${leaf.x},${leaf.y}`}
                fill="none"
                stroke={accentColor}
                strokeWidth={1}
                strokeDasharray="4 4"
                opacity={0.8}
              />
              <circle cx={leaf.x} cy={leaf.y} r={8} fill="none" stroke={accentColor} strokeWidth={1.5} />
            </g>
          );
        })}
      </svg>

      {names.map((name, i) => {
        const { left, y } = labelFor(i);
        const s = spring({ frame: frame - 70 - i * 10, fps, config: { damping: 14, stiffness: 200 } });
        return (
          <div
            key={name}
            style={{
              position: "absolute",
              top: y - 20,
              ...(left ? { right: 1920 - 580 } : { left: 1340 }),
              fontFamily: hud.mono,
              fontSize: 30,
              color: hud.white,
              opacity: interpolate(s, [0, 0.3], [0, 1], { extrapolateRight: "clamp" }),
              translate: `${interpolate(s, [0, 1], [left ? -30 : 30, 0])}px 0px`,
              whiteSpace: "nowrap",
            }}
          >
            {name}
          </div>
        );
      })}

      {/* root box */}
      <div
        style={{
          position: "absolute",
          left: ROOT.x - 160,
          top: ROOT.y,
          width: 320,
          height: 76,
          boxSizing: "border-box",
          border: `2px solid ${hud.white}`,
          borderTop: `4px solid ${hud.white}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: hud.mono,
          fontSize: 32,
          color: accentColor,
          clipPath: `inset(0 0 ${interpolate(frame, [0, 10], [100, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}% 0)`,
        }}
      >
        {root}
      </div>
    </AbsoluteFill>
  );
};

const schema = {
  label: { type: "text-content", default: "ECOSYSTEM", description: "Label" },
  heading: { type: "text-content", default: "Everything is a plugin.", description: "Heading" },
  root: { type: "text-content", default: "fastify()", description: "Text in the root box" },
  plugins: {
    type: "text-content",
    default: "",
    description: "Up to 6 plugin names, comma-separated",
  },
  accentColor: { type: "color", default: "#f1e05a", description: "Accent color" },
} as const satisfies InteractivitySchema;

export const HudTree = Interactive.withSchema({
  Component: HudTreeInner,
  componentName: "<HudTree>",
  schema,
  wrapInSequence: true,
});
