import type React from "react";
import { AbsoluteFill, Easing, Img, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { BEAT, hud } from "../hud";
import { Chip, clamp, Display, enterStyle, Kicker, useEnter } from "../kit";

type ShotProps = { image: string; label: string; heading: string; domain: string; chips: string[]; accentColor: string };

// Shot "full": the page fills the frame; the camera drifts down it (Ken
// Burns), a scrim rises from the bottom and the heading + chips sit on it.
export const ShotFull: React.FC<ShotProps> = ({ image, label, heading, chips, accentColor }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const zoom = interpolate(frame, [0, durationInFrames], [1.18, 1.04]);
  const pan = interpolate(frame, [0, durationInFrames], [0, -14], { easing: Easing.inOut(Easing.sin) });
  const headIn = useEnter(BEAT);
  return (
    <AbsoluteFill style={{ backgroundColor: hud.sceneBg, overflow: "hidden" }}>
      <Img src={image} style={{ position: "absolute", width: "100%", height: "135%", objectFit: "cover", objectPosition: "top", scale: zoom, translate: `0px ${pan}%`, transformOrigin: "50% 0%", filter: hud.imgFilter }} />
      {/* scrim: keeps the page visible up top and gives the heading a clean surface */}
      <AbsoluteFill style={{ background: `linear-gradient(180deg, ${hud.bg}00 18%, ${hud.bg}d9 50%, ${hud.bg} 68%)` }} />
      <div style={{ position: "absolute", left: 160, right: 160, bottom: 130, color: hud.white, ...enterStyle(headIn, 40) }}>
        <Kicker color={accentColor}>{label}</Kicker>
        <Display text={heading} base={96} maxWidth={1600} style={{ marginTop: 14 }} />
        <div style={{ display: "flex", gap: 18, marginTop: 34, flexWrap: "wrap" }}>
          {chips.slice(0, 3).map((c, i) => (
            <Chip key={c} text={c} at={BEAT * 3 + i * BEAT} accent={accentColor} size={26} />
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Shot "tilt": the page floats in 3D, swings flat on beat 4, and the heading
// reads beside it; chips stack under the heading.
export const ShotTilt: React.FC<ShotProps> = ({ image, label, heading, domain, chips, accentColor }) => {
  const frame = useCurrentFrame();
  const swing = interpolate(frame, [0, BEAT * 4], [1, 0], { ...clamp, easing: Easing.bezier(0.3, 0, 0.1, 1) });
  const drift = interpolate(frame, [BEAT * 4, BEAT * 12], [0, 1], clamp);
  const inK = useEnter(0, 22);
  const headIn = useEnter(BEAT * 2);
  return (
    <AbsoluteFill style={{ backgroundColor: hud.sceneBg, color: hud.white, perspective: 1800 }}>
      <div
        style={{
          position: "absolute",
          left: 760,
          top: 170,
          width: 1060,
          height: 740,
          borderRadius: hud.radius,
          overflow: "hidden",
          border: `1.5px solid ${hud.faint}`,
          background: hud.panel,
          boxShadow: `0 60px 140px rgba(0,0,0,0.45), 0 0 0 1px ${hud.faint}`,
          transform: `rotateY(${-28 * swing - 6 * drift}deg) rotateX(${10 * swing + 2 * drift}deg) translateZ(${-200 * (1 - inK)}px)`,
          opacity: inK,
          transformOrigin: "40% 50%",
        }}
      >
        <div style={{ height: 40, display: "flex", alignItems: "center", gap: 9, padding: "0 16px", background: hud.panelBar, fontFamily: hud.mono, fontSize: 15, color: hud.dim }}>
          {["#ff5f57", "#febc2e", "#28c840"].map((c) => <div key={c} style={{ width: 12, height: 12, borderRadius: 6, background: c }} />)}
          <span style={{ marginLeft: 14 }}>{domain}</span>
        </div>
        <Img src={image} style={{ width: "100%", height: 700, objectFit: "cover", objectPosition: "top", filter: hud.imgFilter, translate: `0px ${-40 * drift}px` }} />
      </div>
      <div style={{ position: "absolute", left: 160, top: 300, width: 540, ...enterStyle(headIn) }}>
        <Kicker color={accentColor}>{label}</Kicker>
        <Display text={heading} base={78} maxWidth={540 * 2.2} style={{ marginTop: 14 }} />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 16, marginTop: 40 }}>
          {chips.slice(0, 3).map((c, i) => (
            <Chip key={c} text={c} at={BEAT * 4 + i * BEAT} accent={accentColor} size={24} />
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};
