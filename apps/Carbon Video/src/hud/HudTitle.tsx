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
import { accentGlow, fitDisplay, hud, typed } from "./hud";

type HudTitleProps = {
  readonly title: string;
  readonly scanLabel: string;
  readonly ribbon: string;
  readonly caption: string;
  readonly tag: string;
  readonly accentColor: string;
  readonly style?: React.CSSProperties;
};

// Scene 1 (intro, before the drop): a laser line scans across, a ribbon of
// keywords types under it, then the title draws as an outline and fills
// white on beat 4 (frame 80).
const HudTitleInner: React.FC<HudTitleProps> = ({
  title,
  scanLabel,
  ribbon,
  caption,
  tag,
  accentColor,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scan = interpolate(frame, [0, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.7, 0, 0.2, 1),
  });
  const outline = interpolate(frame, [40, 76], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.65, 0, 0.35, 1),
  });
  const fill = spring({ frame: frame - 80, fps, config: { damping: 14, stiffness: 180 } });
  const capIn = spring({ frame: frame - 96, fps, config: { damping: 200 } });
  const tagIn = spring({ frame: frame - 104, fps, config: { damping: 12 } });

  return (
    <AbsoluteFill style={{ backgroundColor: hud.sceneBg, color: hud.white, ...style }}>
      {/* scan line */}
      <div
        style={{
          position: "absolute",
          left: 160,
          top: 300,
          width: 1600 * scan,
          height: 1,
          backgroundColor: hud.ink(0.3),
          opacity: interpolate(frame, [60, 90], [1, 0.35], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 160 + 1600 * scan - 6,
          top: 294,
          width: 12,
          height: 12,
          borderRadius: 6,
          backgroundColor: accentColor,
          boxShadow: accentGlow(accentColor),
          opacity: interpolate(frame, [30, 44], [1, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 160,
          top: 262,
          fontFamily: hud.mono,
          fontSize: 20,
          letterSpacing: "0.14em",
          color: hud.dim,
          textTransform: "uppercase",
        }}
      >
        {typed(scanLabel, frame, 4, 2.5)}
      </div>
      <div
        style={{
          position: "absolute",
          left: 160,
          top: 318,
          width: 1600,
          overflow: "hidden",
          whiteSpace: "nowrap",
          fontFamily: hud.sans,
          fontWeight: 700,
          fontSize: 34,
          letterSpacing: "0.02em",
          color: hud.white,
          opacity: interpolate(frame, [70, 90], [0.9, 0.22], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        {typed(ribbon, frame, 12, 4)}
      </div>

      {/* title: outline draw, then white fill on the beat */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 390,
          textAlign: "center",
          fontFamily: hud.display,
          fontWeight: hud.displayWeight,
          textTransform: hud.displayCase,
          fontSize: fitDisplay(title, 290, 1700, 0.62),
          lineHeight: 1,
          letterSpacing: hud.titleTracking,
          scale: interpolate(fill, [0, 1], [1.06, 1]),
        }}
      >
        <span
          style={{
            color: "transparent",
            WebkitTextStroke: `2px ${accentColor}`,
            clipPath: `inset(0 ${100 - outline}% 0 0)`,
            opacity: 1 - fill,
          }}
        >
          {title}
        </span>
        <span
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            opacity: fill,
            textShadow: hud.glow,
          }}
        >
          {title}
        </span>
      </div>

      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 720,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 28,
          fontFamily: hud.mono,
          fontSize: 26,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        <span
          style={{
            color: hud.dim,
            opacity: capIn,
            translate: `0px ${interpolate(capIn, [0, 1], [16, 0])}px`,
          }}
        >
          {caption}
        </span>
        <span
          style={{
            color: hud.bg,
            backgroundColor: accentColor,
            padding: "6px 14px",
            fontWeight: 500,
            opacity: tagIn,
            scale: interpolate(tagIn, [0, 1], [0.6, 1]),
          }}
        >
          {tag}
        </span>
      </div>
    </AbsoluteFill>
  );
};

const schema = {
  title: { type: "text-content", default: "fastify", description: "Title" },
  scanLabel: {
    type: "text-content",
    default: "SIG 01 — repo scan · github.com/fastify/fastify",
    description: "Label above the scan line",
  },
  ribbon: { type: "text-content", default: "", description: "Keyword ribbon" },
  caption: { type: "text-content", default: "", description: "Caption under title" },
  tag: { type: "text-content", default: "JAVASCRIPT", description: "Accent tag" },
  accentColor: { type: "color", default: "#f1e05a", description: "Accent color" },
} as const satisfies InteractivitySchema;

export const HudTitle = Interactive.withSchema({
  Component: HudTitleInner,
  componentName: "<HudTitle>",
  schema,
  wrapInSequence: true,
});
