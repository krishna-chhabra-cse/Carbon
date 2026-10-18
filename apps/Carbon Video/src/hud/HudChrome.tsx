import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Overlay } from "./Backdrop";
import { ChromeUI, type ChromeKind } from "./Chrome";
import { BAR, BEAT, beatPulse, hud } from "./hud";

type Section = { readonly from: number; readonly label: string };

// Persistent overlay: corner brackets, section label, timecode, beat meter,
// cut flashes, film grain and vignette. Uses the video's absolute frame.
export const HudChrome: React.FC<{
  readonly sections: Section[];
  readonly cuts: number[];
  readonly title: string;
  readonly accentColor: string;
  // Music tempo for the beat meter; beats are counted from `beatOffset`.
  readonly bpm?: number;
  readonly beatOffset?: number;
  // Which on-screen UI to draw (see Chrome.tsx); the atmosphere is always on.
  readonly kind?: ChromeKind;
  readonly product?: string;
}> = ({ sections, cuts, title, accentColor, bpm, beatOffset = 0, kind = "hud", product = "" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const current = [...sections].reverse().find((s) => frame >= s.from);
  const beatLen = bpm ? (60 / bpm) * fps : BEAT;
  const beatNo = Math.floor(Math.max(0, frame - beatOffset) / beatLen);
  const beat = beatNo % 4;
  const bar = bpm ? Math.floor(beatNo / 4) + 1 : Math.floor(frame / BAR) + 1;
  const sec = Math.floor(frame / fps);
  const tc = `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}:${String(Math.floor(frame % fps)).padStart(2, "0")}`;
  const pulse = beatPulse(Math.max(0, frame - beatOffset), beatLen);

  const lastCut = [...cuts].reverse().find((c) => frame >= c) ?? -999;
  const flash = interpolate(frame - lastCut, [0, (7 * fps) / 30], [0.14, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const label: React.CSSProperties = {
    position: "absolute",
    fontFamily: hud.mono,
    fontSize: 17,
    letterSpacing: "0.14em",
    color: hud.dim,
    textTransform: "uppercase",
  };
  const corner = (pos: React.CSSProperties, rot: number) => (
    <div
      style={{
        position: "absolute",
        width: 26,
        height: 26,
        borderLeft: `1.5px solid ${hud.faint}`,
        borderTop: `1.5px solid ${hud.faint}`,
        rotate: `${rot}deg`,
        ...pos,
      }}
    />
  );

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {/* vignette */}
      <AbsoluteFill
        style={{
          background: hud.vignette,
        }}
      />
      {/* grain */}
      <svg width={1920} height={1080} style={{ position: "absolute", opacity: 0.07 * hud.grain }}>
        <filter id="grain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.85"
            numOctaves={2}
            seed={frame % 12}
          />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>
      <Overlay />
      {/* cut flash */}
      <AbsoluteFill style={{ backgroundColor: hud.flash, opacity: flash }} />

      {kind !== "hud" ? <ChromeUI kind={kind} sections={sections} title={title} product={product} accentColor={accentColor} /> : null}
      {kind === "hud" ? (
      <>
      {corner({ left: 40, top: 40 }, 0)}
      {corner({ right: 40, top: 40 }, 90)}
      {corner({ right: 40, bottom: 40 }, 180)}
      {corner({ left: 40, bottom: 40 }, 270)}

      <div style={{ ...label, left: 80, top: 52 }}>
        <span style={{ color: accentColor }}>■</span>&nbsp;&nbsp;{current?.label}
      </div>
      <div style={{ ...label, right: 80, top: 52 }}>{title}</div>
      <div style={{ ...label, left: 80, bottom: 52 }}>TC {tc}</div>
      <div
        style={{
          ...label,
          right: 80,
          bottom: 50,
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        {bpm ? Math.round(bpm) : 90} BPM · BAR {String(bar).padStart(2, "0")}
        <div style={{ display: "flex", gap: 6 }}>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                width: 12,
                height: 12,
                backgroundColor: i === beat ? accentColor : hud.faint,
                opacity: i === beat ? 0.5 + 0.5 * pulse : 1,
              }}
            />
          ))}
        </div>
      </div>
      </>
      ) : null}
    </AbsoluteFill>
  );
};
