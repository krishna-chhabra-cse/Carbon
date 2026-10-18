import type React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { accentGlow, BEAT, fitDisplay, hud } from "../hud";
import { Chip, clamp, enterStyle, Kicker, useEnter } from "../kit";

type TitleProps = { title: string; scanLabel: string; ribbon: string; caption: string; tag: string; accentColor: string };

// Title "stack": the name fills the frame, letters rising out of a mask one
// after another; on beat 4 it shrinks up and the tagline lands word by word.
export const TitleStack: React.FC<TitleProps> = ({ title, ribbon, caption, tag, accentColor }) => {
  const frame = useCurrentFrame();
  const letters = [...title];
  const big = fitDisplay(title, 420, 1760, 0.62);
  const settle = interpolate(frame, [BEAT * 4 - 4, BEAT * 4 + 10], [0, 1], { ...clamp, easing: Easing.bezier(0.7, 0, 0.2, 1) });
  const words = caption.split(" ").filter(Boolean).slice(0, 10);
  const tagIn = useEnter(BEAT * 6);
  const ribbonX = interpolate(frame, [0, 160], [0, -900]);
  return (
    <AbsoluteFill style={{ backgroundColor: hud.sceneBg, color: hud.white }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: interpolate(settle, [0, 1], [540 - big * 0.55, 250]),
          display: "flex",
          justifyContent: "center",
          fontFamily: hud.display,
          fontWeight: hud.displayWeight,
          textTransform: hud.displayCase,
          fontSize: big,
          lineHeight: 1.1,
          letterSpacing: hud.titleTracking,
          scale: interpolate(settle, [0, 1], [1, 0.62]),
          transformOrigin: "50% 0%",
        }}
      >
        {letters.map((ch, i) => {
          const t = interpolate(frame, [i * 3, i * 3 + 14], [1, 0], { ...clamp, easing: Easing.out(Easing.cubic) });
          return (
            <span key={i} style={{ display: "inline-block", overflow: "hidden", height: big * 1.12, verticalAlign: "top" }}>
              <span style={{ display: "inline-block", translate: `0px ${t * 110}%`, whiteSpace: "pre", textShadow: hud.glow }}>{ch}</span>
            </span>
          );
        })}
      </div>
      <div style={{ position: "absolute", left: 160, right: 160, top: 640, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0 18px" }}>
        {words.map((w, i) => {
          const k = enterAt(frame, BEAT * 4 + 6 + i * 4);
          return (
            <span key={i} style={{ ...enterStyle(k, 30), fontFamily: hud.sans, fontWeight: 700, fontSize: fitDisplay(caption, 64, 1400 * 1.6, 0.5), color: i % 3 === 1 ? accentColor : hud.white }}>
              {w}
            </span>
          );
        })}
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 790, display: "flex", justifyContent: "center", ...enterStyle(tagIn) }}>
        <span style={{ fontFamily: hud.mono, fontSize: 26, letterSpacing: "0.12em", color: hud.bg, background: accentColor, padding: "8px 18px" }}>{tag}</span>
      </div>
      <div style={{ position: "absolute", left: 0, top: 960, whiteSpace: "nowrap", translate: `${ribbonX}px 0px`, fontFamily: hud.mono, fontSize: 24, letterSpacing: "0.2em", color: hud.dim, textTransform: "uppercase" }}>
        {`${ribbon} · `.repeat(4)}
      </div>
    </AbsoluteFill>
  );
};

// Hook-free stagger helper (a spring would need one hook per word).
const enterAt = (frame: number, at: number) => interpolate(frame, [at, at + 12], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });

// Title "card": an app icon and the name on a soft card, keyword chips
// gathering around it on the beats.
export const TitleCard: React.FC<TitleProps> = ({ title, scanLabel, ribbon, caption, tag, accentColor }) => {
  const frame = useCurrentFrame();
  const cardIn = useEnter(4, 20);
  const iconIn = useEnter(BEAT, 11);
  const capIn = useEnter(BEAT * 3);
  const chips = ribbon.split("·").map((s) => s.trim()).filter(Boolean).slice(0, 6);
  const spots: [number, number][] = [[230, 200], [1340, 170], [160, 820], [1360, 840], [700, 120], [820, 930]];
  const float = (i: number) => 10 * Math.sin(frame / 22 + i * 1.7);
  const radius = Math.max(hud.radius * 1.6, 0);
  return (
    <AbsoluteFill style={{ backgroundColor: hud.sceneBg, color: hud.white }}>
      {chips.map((c, i) => (
        <div key={c} style={{ position: "absolute", left: spots[i][0], top: spots[i][1] + float(i) }}>
          <Chip text={c} at={BEAT * 2 + i * (BEAT / 2)} accent={accentColor} size={24} />
        </div>
      ))}
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            ...enterStyle(cardIn, 40),
            scale: interpolate(cardIn, [0, 1], [0.94, 1]),
            width: 1180,
            background: hud.panel,
            border: `1.5px solid ${hud.faint}`,
            boxShadow: "0 40px 120px rgba(0,0,0,0.35)",
            ...hud.card,
            margin: 0,
            padding: "70px 80px",
            borderRadius: radius,
          }}
        >
          <Kicker color={hud.dim} style={{ fontSize: 18 }}>{scanLabel.replace(/^SIG 01 — /, "")}</Kicker>
          <div style={{ display: "flex", alignItems: "center", gap: 44, marginTop: 34 }}>
            <div
              style={{
                width: 190,
                height: 190,
                flex: "none",
                borderRadius: radius ? 44 : 0,
                background: `linear-gradient(140deg, ${accentColor}, ${hud.panelBar})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                scale: interpolate(iconIn, [0, 1], [0.4, 1]),
                opacity: iconIn,
                boxShadow: accentGlow(accentColor),
                fontFamily: hud.display,
                fontWeight: hud.displayWeight,
                fontSize: 130,
                color: hud.bg,
              }}
            >
              {title.slice(0, 1).toUpperCase()}
            </div>
            <div
              style={{
                fontFamily: hud.display,
                fontWeight: hud.displayWeight,
                textTransform: hud.displayCase,
                fontSize: fitDisplay(title, 170, 780, 0.6),
                letterSpacing: hud.titleTracking,
                lineHeight: 1,
                textShadow: hud.glow,
              }}
            >
              {title}
            </div>
          </div>
          <div style={{ ...enterStyle(capIn), marginTop: 40, display: "flex", alignItems: "center", gap: 24 }}>
            <span style={{ fontFamily: hud.sans, fontSize: fitDisplay(caption, 40, 820, 0.5), color: hud.mid }}>{caption}</span>
            <span style={{ fontFamily: hud.mono, fontSize: 20, letterSpacing: "0.12em", color: hud.bg, background: accentColor, padding: "6px 14px", borderRadius: radius ? 8 : 0 }}>{tag}</span>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
