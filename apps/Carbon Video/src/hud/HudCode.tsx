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
import { BEAT, beatPulse, fitDisplay, hud } from "./hud";

type HudCodeProps = {
  readonly label: string;
  readonly heading: string;
  readonly filename: string;
  readonly code: string;
  readonly runCommand: string;
  readonly status: string;
  readonly request: string;
  readonly response: string;
  readonly accentColor: string;
  readonly style?: React.CSSProperties;
};

const KEYWORDS = /^(import|from|export|const|let|async|await|return|function|new)$/;
const TOKEN = /('[^']*'?|"[^"]*"?|\d+|[A-Za-z_$][\w$]*|\s+|.)/g;

// Scene 3: code types itself in a HUD panel; once done, the right column
// runs it, one step per beat, ending on a glowing response.
const HudCodeInner: React.FC<HudCodeProps> = ({
  label,
  heading,
  filename,
  code,
  runCommand,
  status,
  request,
  response,
  accentColor,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cps = 1.7;
  const start = 12;
  const shown = Math.max(0, Math.floor((frame - start) * cps));
  const doneAt = start + Math.ceil(code.length / cps);
  // First beat after typing finishes, then one step per beat.
  const runAt = Math.ceil((doneAt + 4) / BEAT) * BEAT;
  const lines = code.split("\n");
  const activeLine = code.slice(0, shown).split("\n").length - 1;
  const headIn = spring({ frame, fps, config: { damping: 200 } });

  const color = (t: string) => {
    if (/^['"]/.test(t)) return hud.white;
    if (/^\d+$/.test(t)) return accentColor;
    if (KEYWORDS.test(t)) return accentColor;
    if (/^[A-Za-z_$]/.test(t)) return hud.mid;
    return hud.dim;
  };

  const step = (i: number) =>
    spring({ frame: frame - runAt - i * BEAT, fps, config: { damping: 13, stiffness: 190 } });

  let consumed = 0;

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
        <div
          style={{
            fontFamily: hud.display,
            fontWeight: hud.displayWeight,
            textTransform: hud.displayCase,
            fontSize: fitDisplay(heading, 76, 1000, 0.58),
            letterSpacing: "-0.04em",
            marginTop: 10,
          }}
        >
          {heading}
        </div>
      </div>

      {/* code panel */}
      <div
        style={{
          position: "absolute",
          left: 160,
          top: 330,
          width: 960,
          borderTop: `1px solid ${hud.faint}`,
          paddingTop: 22,
          ...hud.card,
        }}
      >
        <div
          style={{
            fontFamily: hud.mono,
            fontSize: 18,
            letterSpacing: "0.14em",
            color: hud.dim,
            marginBottom: 22,
            textTransform: "uppercase",
          }}
        >
          [ {filename} ] · {lines.length} lines · esm
        </div>
        {lines.map((line, li) => {
          const lineStart = consumed;
          consumed += line.length + 1;
          const visible = line.slice(0, Math.max(0, shown - lineStart));
          const isActive = li === activeLine && shown < code.length;
          return (
            <div
              key={li}
              style={{
                display: "flex",
                fontFamily: hud.mono,
                fontSize: 32,
                lineHeight: "50px",
                whiteSpace: "pre",
              }}
            >
              <span
                style={{
                  width: 64,
                  color: isActive ? accentColor : hud.lineNo,
                }}
              >
                {String(li + 1).padStart(2, "0")}
              </span>
              <span
                style={{
                  width: 4,
                  marginRight: 22,
                  backgroundColor: isActive ? accentColor : "transparent",
                }}
              />
              {(visible.match(TOKEN) ?? []).map((t, i) => (
                <span key={i} style={{ color: color(t) }}>
                  {t}
                </span>
              ))}
              {isActive || (li === lines.length - 1 && shown >= code.length) ? (
                <span
                  style={{
                    display: "inline-block",
                    width: 16,
                    height: 36,
                    marginTop: 7,
                    backgroundColor: accentColor,
                    opacity: shown >= code.length ? (Math.floor(frame / 10) % 2 ? 0 : 1) : 1,
                  }}
                />
              ) : null}
            </div>
          );
        })}
      </div>

      {/* run column */}
      <div
        style={{
          position: "absolute",
          left: 1200,
          top: 350,
          width: 560,
          display: "flex",
          flexDirection: "column",
          gap: 26,
          fontFamily: hud.mono,
          ...hud.card,
        }}
      >
        {[
          { text: `$ ${runCommand}`, color: hud.white, size: 28 },
          { text: `● ${status}`, color: accentColor, size: 28 },
          { text: `→ ${request}`, color: hud.mid, size: 28 },
        ].map((row, i) => {
          const s = step(i);
          return (
            <div
              key={i}
              style={{
                fontSize: row.size,
                color: row.color,
                opacity: interpolate(s, [0, 0.3], [0, 1], { extrapolateRight: "clamp" }),
                translate: `${interpolate(s, [0, 1], [30, 0])}px 0px`,
              }}
            >
              {row.text}
            </div>
          );
        })}
        <div
          style={{
            marginTop: 20,
            paddingTop: 26,
            borderTop: `1px solid ${hud.faint}`,
            opacity: interpolate(step(3), [0, 0.3], [0, 1], { extrapolateRight: "clamp" }),
            scale: interpolate(step(3), [0, 1], [0.85, 1]),
            transformOrigin: "left center",
          }}
        >
          <div
            style={{
              fontFamily: hud.display,
              fontWeight: hud.displayWeight,
              textTransform: hud.displayCase,
              fontSize: fitDisplay("200 OK", 96, 540, 0.62),
              letterSpacing: "-0.04em",
              color: accentColor,
              lineHeight: 1,
              scale: 1 + 0.03 * beatPulse(frame - runAt - 3 * BEAT),
              transformOrigin: "left center",
            }}
          >
            200 OK
          </div>
          <div style={{ fontSize: 40, marginTop: 18, textShadow: hud.glow }}>{response}</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const schema = {
  label: { type: "text-content", default: "QUICKSTART", description: "Label" },
  heading: { type: "text-content", default: "Nine lines to a server.", description: "Heading" },
  filename: { type: "text-content", default: "server.js", description: "File name" },
  code: { type: "text-content", default: "", description: "Code to type" },
  runCommand: { type: "text-content", default: "node server.js", description: "Run command" },
  status: { type: "text-content", default: "listening on :3000", description: "Status line" },
  request: { type: "text-content", default: "GET /", description: "Request line" },
  response: { type: "text-content", default: "{ hello: 'world' }", description: "Response body" },
  accentColor: { type: "color", default: "#f1e05a", description: "Accent color" },
} as const satisfies InteractivitySchema;

export const HudCode = Interactive.withSchema({
  Component: HudCodeInner,
  componentName: "<HudCode>",
  schema,
  wrapInSequence: true,
});
