import type React from "react";
import {
  AbsoluteFill,
  Easing,
  Interactive,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  type InteractivitySchema,
} from "remotion";
import { accentGlow, beatPulse, fitDisplay, hud } from "./hud";

type HudStatProps = {
  readonly label: string;
  readonly value: number;
  readonly suffix: string;
  readonly unit: string;
  readonly note: string;
  readonly accentColor: string;
  readonly style?: React.CSSProperties;
};

const CHART = { x: 1010, y: 250, w: 760, h: 460 };

// Scene 2 (the drop): big count-up stat on the left, a live chart drawing
// itself on the right, and a beat-reactive waveform strip at the bottom.
const HudStatInner: React.FC<HudStatProps> = ({
  label,
  value,
  suffix,
  unit,
  note,
  accentColor,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const count = interpolate(frame, [0, 45], [0, value], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const pop = spring({ frame, fps, config: { damping: 12, stiffness: 200 } });
  const draw = interpolate(frame, [6, 120], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Chart curve: ramps up and settles near the max with a little jitter.
  const pts: [number, number][] = [];
  const samples = 120;
  for (let i = 0; i <= samples * draw; i++) {
    const x = i / samples;
    const v =
      (1 - Math.exp(-x * 5)) * 0.92 +
      0.025 * Math.sin(x * 47) +
      0.015 * Math.sin(x * 113);
    pts.push([CHART.x + x * CHART.w, CHART.y + CHART.h - v * CHART.h]);
  }
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const head = pts[pts.length - 1] ?? [CHART.x, CHART.y + CHART.h];
  const p = beatPulse(frame);

  return (
    <AbsoluteFill style={{ backgroundColor: hud.sceneBg, color: hud.white, ...style }}>
      <div style={{ position: "absolute", left: 160, top: 300 }}>
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
        <div
          style={{
            fontFamily: hud.display,
            fontWeight: hud.displayWeight,
            textTransform: hud.displayCase,
            fontSize: fitDisplay(`${value}${suffix}`, 250, 820, 0.62),
            lineHeight: 1,
            letterSpacing: "-0.05em",
            marginTop: 20,
            textShadow: hud.glow,
            scale: interpolate(pop, [0, 1], [0.8, 1]),
            transformOrigin: "left center",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {Math.round(count)}
          {suffix}
        </div>
        <div
          style={{
            fontFamily: hud.mono,
            fontSize: 30,
            letterSpacing: "0.1em",
            marginTop: 18,
            textTransform: "uppercase",
          }}
        >
          {unit}
        </div>
        <div
          style={{
            fontFamily: hud.mono,
            fontSize: 18,
            letterSpacing: "0.1em",
            color: hud.dim,
            marginTop: 14,
            textTransform: "uppercase",
          }}
        >
          {note}
        </div>
      </div>

      <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0 }}>
        {[0, 0.25, 0.5, 0.75, 1].map((g) => (
          <g key={g}>
            <line
              x1={CHART.x}
              x2={CHART.x + CHART.w}
              y1={CHART.y + CHART.h * (1 - g)}
              y2={CHART.y + CHART.h * (1 - g)}
              stroke={g === 0 ? hud.ink(0.5) : hud.faint}
              strokeDasharray={g === 0 ? undefined : "3 6"}
            />
            <text
              x={CHART.x - 16}
              y={CHART.y + CHART.h * (1 - g) + 6}
              fill={hud.dim}
              fontFamily={hud.mono}
              fontSize={16}
              textAnchor="end"
            >
              {Math.round(value * g)}
              {suffix.replace("+", "")}
            </text>
          </g>
        ))}
        <line
          x1={CHART.x}
          x2={CHART.x}
          y1={CHART.y}
          y2={CHART.y + CHART.h}
          stroke={hud.ink(0.5)}
        />
        <path d={d} fill="none" stroke={hud.white} strokeWidth={2.5} />
        <line
          x1={head[0]}
          x2={head[0]}
          y1={head[1]}
          y2={CHART.y + CHART.h}
          stroke={accentColor}
          strokeWidth={1}
          opacity={0.6}
        />
        <circle cx={head[0]} cy={head[1]} r={7 + 5 * p} fill={accentColor} style={{ filter: `drop-shadow(${accentGlow(accentColor).split(",")[0]})` }} />
        <text
          x={head[0] + 16}
          y={head[1] - 14}
          fill={accentColor}
          fontFamily={hud.mono}
          fontSize={18}
        >
          {Math.round(count)}
          {suffix.replace("+", "")} REQ/S
        </text>
        <text
          x={CHART.x + CHART.w}
          y={CHART.y + CHART.h + 34}
          fill={hud.dim}
          fontFamily={hud.mono}
          fontSize={16}
          textAnchor="end"
        >
          T → LOAD TEST
        </text>
      </svg>

      {/* waveform strip */}
      <div
        style={{
          position: "absolute",
          left: 160,
          right: 160,
          top: 850,
          height: 90,
          display: "flex",
          alignItems: "flex-end",
          gap: 6,
        }}
      >
        {new Array(80).fill(0).map((_, i) => {
          const h =
            (0.5 + 0.5 * Math.sin(i * 0.7 + frame * 0.31) * Math.sin(i * 0.23 - frame * 0.13)) *
            (0.2 + 0.8 * p);
          return (
            <div
              key={i}
              style={{
                flex: 1,
                height: `${Math.max(4, h * 100)}%`,
                backgroundColor: i % 9 === 0 ? accentColor : hud.ink(0.55),
              }}
            />
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const schema = {
  label: { type: "text-content", default: "THROUGHPUT", description: "Label" },
  value: {
    type: "number",
    default: 76,
    min: 0,
    step: 1,
    hiddenFromList: false,
    description: "Number to count up to",
  },
  suffix: { type: "text-content", default: "K+", description: "Text after the number" },
  unit: { type: "text-content", default: "requests / second", description: "Unit line" },
  note: { type: "text-content", default: "", description: "Small source note" },
  accentColor: { type: "color", default: "#f1e05a", description: "Accent color" },
} as const satisfies InteractivitySchema;

export const HudStat = Interactive.withSchema({
  Component: HudStatInner,
  componentName: "<HudStat>",
  schema,
  wrapInSequence: true,
});
