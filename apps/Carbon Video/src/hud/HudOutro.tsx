import type React from "react";
import {
  AbsoluteFill,
  Interactive,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  type InteractivitySchema,
} from "remotion";
import { accentGlow, BAR, BEAT, beatPulse, fitDisplay, fitSize, hud, typed } from "./hud";

type HudOutroProps = {
  readonly command: string;
  readonly commandLabel?: string;
  readonly headline: string;
  readonly url: string;
  readonly title: string;
  readonly finalAt: number;
  readonly accentColor: string;
  readonly style?: React.CSSProperties;
};

const C = { x: 680, y: 560, r: 300 };

// Scene 5: a beat dial sweeps once per bar with the install command in the
// middle and a big beat counter beside it. On `finalAt` (the last hit in
// the music) everything cuts to the end card.
const HudOutroInner: React.FC<HudOutroProps> = ({
  commandLabel,
  command,
  headline,
  url,
  title,
  finalAt,
  accentColor,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inBar = (frame % BAR) / BAR;
  const lit = Math.floor(inBar * 64);
  const beatNum = (Math.floor(frame / BEAT) % 4) + 1;
  const p = beatPulse(frame);
  const dialIn = spring({ frame, fps, config: { damping: 15, stiffness: 140 } });
  const headIn = spring({ frame: frame - 40, fps, config: { damping: 200 } });
  const urlIn = spring({ frame: frame - 60, fps, config: { damping: 200 } });
  const mainOut = interpolate(frame, [finalAt - 1, finalAt], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const end = spring({ frame: frame - finalAt, fps, config: { damping: 18, stiffness: 160 } });
  const rule = interpolate(frame, [finalAt, finalAt + 24], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const angle = inBar * Math.PI * 2 - Math.PI / 2;

  return (
    <AbsoluteFill style={{ backgroundColor: hud.sceneBg, color: hud.white, ...style }}>
      <AbsoluteFill style={{ opacity: mainOut }}>
        <svg
          width={1920}
          height={1080}
          style={{
            position: "absolute",
            scale: interpolate(dialIn, [0, 1], [0.7, 1]),
            opacity: dialIn,
            transformOrigin: `${C.x}px ${C.y}px`,
          }}
        >
          <circle cx={C.x} cy={C.y} r={C.r} fill="none" stroke={hud.faint} strokeWidth={1.5} />
          <circle cx={C.x} cy={C.y} r={C.r - 90} fill="none" stroke={hud.ink(0.5)} strokeWidth={1.5} />
          {new Array(64).fill(0).map((_, i) => {
            const a = (i / 64) * Math.PI * 2 - Math.PI / 2;
            const major = i % 16 === 0;
            const len = major ? 34 : i % 4 === 0 ? 20 : 10;
            const on = i <= lit;
            return (
              <line
                key={i}
                x1={C.x + Math.cos(a) * C.r}
                y1={C.y + Math.sin(a) * C.r}
                x2={C.x + Math.cos(a) * (C.r - len)}
                y2={C.y + Math.sin(a) * (C.r - len)}
                stroke={on ? accentColor : hud.ink(0.35)}
                strokeWidth={major ? 3 : 1.5}
              />
            );
          })}
          {[1, 2, 3, 4].map((n, i) => {
            const a = (i / 4) * Math.PI * 2 - Math.PI / 2;
            return (
              <text
                key={n}
                x={C.x + Math.cos(a) * (C.r - 60)}
                y={C.y + Math.sin(a) * (C.r - 60) + 10}
                fill={n === beatNum ? accentColor : hud.dim}
                fontFamily={hud.mono}
                fontSize={28}
                textAnchor="middle"
              >
                {n}
              </text>
            );
          })}
          <line
            x1={C.x}
            y1={C.y}
            x2={C.x + Math.cos(angle) * (C.r - 14)}
            y2={C.y + Math.sin(angle) * (C.r - 14)}
            stroke={accentColor}
            strokeWidth={2.5}
          />
          <circle
            cx={C.x + Math.cos(angle) * (C.r - 14)}
            cy={C.y + Math.sin(angle) * (C.r - 14)}
            r={7}
            fill={accentColor}
            style={{ filter: `drop-shadow(0 0 10px ${accentColor})` }}
          />
          <circle cx={C.x} cy={C.y} r={6} fill={hud.white} />
        </svg>
        <div
          style={{
            position: "absolute",
            left: C.x - 200,
            width: 400,
            top: C.y - 70,
            textAlign: "center",
            fontFamily: hud.mono,
            opacity: dialIn,
          }}
        >
          <div style={{ fontSize: 18, letterSpacing: "0.2em", color: hud.dim }}>{commandLabel ?? "INSTALL"}</div>
          <div
            style={{
              fontSize: fitSize(command, 40, 400, 0.62),
              marginTop: 60,
              color: hud.white,
              textShadow: hud.glow,
              backgroundColor: hud.bg,
            }}
          >
            {typed(command, frame, 14, 0.7)}
            <span style={{ color: accentColor, opacity: Math.floor(frame / 10) % 2 ? 0 : 1 }}>▌</span>
          </div>
        </div>

        <div style={{ position: "absolute", left: 1110, top: 250 }}>
          <div
            style={{
              fontFamily: hud.display,
              fontWeight: hud.displayWeight,
              textTransform: hud.displayCase,
              fontSize: 220,
              lineHeight: 1,
              color: accentColor,
              textShadow: accentGlow(accentColor),
              scale: 1 + 0.08 * p,
              transformOrigin: "left center",
            }}
          >
            {beatNum}
          </div>
          <div
            style={{
              fontFamily: hud.mono,
              fontSize: 20,
              letterSpacing: "0.16em",
              color: hud.dim,
              marginTop: 8,
            }}
          >
            / 4 BEAT · 90 BPM
          </div>
          <div
            style={{
              fontFamily: hud.display,
              fontWeight: hud.displayWeight,
              textTransform: hud.displayCase,
              fontSize: fitDisplay(headline, 92, 740, 0.58),
              letterSpacing: "-0.04em",
              marginTop: 70,
              lineHeight: 1,
              opacity: headIn,
              translate: `0px ${interpolate(headIn, [0, 1], [24, 0])}px`,
              textShadow: hud.glow,
            }}
          >
            {headline}
          </div>
          <div
            style={{
              fontFamily: hud.mono,
              fontSize: 30,
              color: accentColor,
              marginTop: 26,
              opacity: urlIn,
            }}
          >
            {url}
          </div>
        </div>
      </AbsoluteFill>

      {/* end card */}
      {frame >= finalAt ? (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          <div
            style={{
              fontFamily: hud.display,
              fontWeight: hud.displayWeight,
              textTransform: hud.displayCase,
              fontSize: fitDisplay(title, 280, 1700, 0.62),
              letterSpacing: hud.titleTracking,
              lineHeight: 1,
              textShadow: hud.glow,
              scale: interpolate(end, [0, 1], [1.18, 1]),
            }}
          >
            {title}
          </div>
          <div
            style={{
              width: 1100 * rule,
              height: 1,
              backgroundColor: accentColor,
              marginTop: 40,
              boxShadow: accentGlow(accentColor),
            }}
          />
          <div
            style={{
              display: "flex",
              gap: 60,
              marginTop: 34,
              fontFamily: hud.mono,
              fontSize: 30,
              letterSpacing: "0.06em",
              opacity: rule,
            }}
          >
            <span style={{ color: accentColor }}>$ {command}</span>
            <span style={{ color: hud.dim }}>{url}</span>
          </div>
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};

const schema = {
  command: { type: "text-content", default: "npm i fastify", description: "Install command" },
  headline: { type: "text-content", default: "Start building.", description: "Headline" },
  url: { type: "text-content", default: "github.com/fastify/fastify", description: "URL" },
  title: { type: "text-content", default: "fastify", description: "End card title" },
  finalAt: {
    type: "number",
    default: 120,
    min: 0,
    step: 1,
    hiddenFromList: false,
    description: "Frame of the final hit (end card)",
  },
  accentColor: { type: "color", default: "#f1e05a", description: "Accent color" },
} as const satisfies InteractivitySchema;

export const HudOutro = Interactive.withSchema({
  Component: HudOutroInner,
  componentName: "<HudOutro>",
  schema,
  wrapInSequence: true,
});
