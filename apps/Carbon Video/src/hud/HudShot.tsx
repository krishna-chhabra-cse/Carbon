import type React from "react";
import { AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { accentGlow, BEAT, beatPulse, fitDisplay, fitSize, hud } from "./hud";

// Website scene: the captured page in a browser frame, slowly pushed in,
// with a scan line and feature chips that land on the beats.
export const HudShot: React.FC<{
  readonly image: string;
  readonly label: string;
  readonly heading: string;
  readonly domain: string;
  readonly chips: string[];
  readonly accentColor: string;
}> = ({ image, label, heading, domain, chips, accentColor }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const headIn = spring({ frame, fps, config: { damping: 200 } });
  const winIn = spring({ frame: frame - 6, fps, config: { damping: 18, stiffness: 120 } });
  const push = interpolate(frame, [0, durationInFrames], [1, 1.12]);
  const panY = interpolate(frame, [0, durationInFrames], [0, -6]);
  const scan = interpolate(frame % (BEAT * 4), [0, BEAT * 4], [0, 1]);
  const p = beatPulse(frame);
  const shown = chips.slice(0, 3);

  return (
    <AbsoluteFill style={{ backgroundColor: hud.sceneBg, color: hud.white }}>
      <div
        style={{
          position: "absolute",
          left: 160,
          top: 110,
          opacity: headIn,
          translate: `0px ${interpolate(headIn, [0, 1], [20, 0])}px`,
        }}
      >
        <div style={{ fontFamily: hud.mono, fontSize: 22, letterSpacing: "0.16em", color: accentColor, textTransform: "uppercase" }}>
          {label}
        </div>
        <div
          style={{
            fontFamily: hud.display,
            fontWeight: hud.displayWeight,
            textTransform: hud.displayCase,
            fontSize: fitDisplay(heading, 72, 1600, 0.56),
            letterSpacing: "-0.04em",
            marginTop: 10,
            textShadow: hud.glow,
          }}
        >
          {heading}
        </div>
      </div>

      {/* browser window */}
      <div
        style={{
          position: "absolute",
          left: 160,
          top: 300,
          width: 1100,
          height: 660,
          borderRadius: hud.radius,
          overflow: "hidden",
          border: `1.5px solid ${p > 0.6 ? accentColor : hud.ink(0.28)}`,
          boxShadow: `0 40px 120px rgba(0,0,0,0.8), ${accentGlow(accentColor)}`,
          opacity: winIn,
          scale: interpolate(winIn, [0, 1], [0.92, 1]),
          transformOrigin: "left top",
          backgroundColor: hud.panel,
        }}
      >
        <div style={{ height: 44, display: "flex", alignItems: "center", gap: 10, padding: "0 18px", backgroundColor: hud.panelBar, borderBottom: `1px solid ${hud.faint}` }}>
          {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
            <div key={c} style={{ width: 13, height: 13, borderRadius: 7, backgroundColor: c }} />
          ))}
          <div style={{ marginLeft: 20, flex: 1, height: 26, borderRadius: 6, backgroundColor: hud.bg, fontFamily: hud.mono, fontSize: 16, color: hud.mid, display: "flex", alignItems: "center", paddingLeft: 14 }}>
            {domain}
          </div>
        </div>
        <div style={{ position: "relative", width: "100%", height: 616, overflow: "hidden" }}>
          <Img
            src={image}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "top",
              scale: push,
              translate: `0px ${panY}%`,
              transformOrigin: "50% 0%",
              filter: hud.imgFilter,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: `${scan * 100}%`,
              height: 2,
              backgroundColor: accentColor,
              boxShadow: accentGlow(accentColor),
              opacity: 0.7,
            }}
          />
        </div>
      </div>

      {/* feature chips on the beats */}
      <div style={{ position: "absolute", left: 1320, top: 360, display: "flex", flexDirection: "column", gap: 34 }}>
        {shown.map((chip, i) => {
          const s = spring({ frame: frame - (BEAT * 2 + i * BEAT * 2), fps, config: { damping: 14, stiffness: 180 } });
          return (
            <div
              key={chip}
              style={{
                opacity: s,
                translate: `${interpolate(s, [0, 1], [40, 0])}px 0px`,
                display: "flex",
                alignItems: "center",
                gap: 16,
                fontFamily: hud.mono,
                fontSize: fitSize(chip, 30, 440, 0.62),
                color: hud.white,
              }}
            >
              <div style={{ width: 14, height: 14, backgroundColor: accentColor, boxShadow: accentGlow(accentColor) }} />
              {chip}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
