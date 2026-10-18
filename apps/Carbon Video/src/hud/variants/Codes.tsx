import type React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { BEAT, beatPulse, fitSize, hud } from "../hud";
import { clamp, Display, enterStyle, Kicker, useEnter } from "../kit";

type CodeProps = { label: string; heading: string; filename: string; code: string; runCommand: string; status: string; request: string; response: string; accentColor: string };

const TOKEN = /(\s+|'[^']*'|"[^"]*"|`[^`]*`|\d+|[A-Za-z_$][\w$]*|[^\s\w])/g;
const KEYWORDS = /^(import|from|export|const|let|var|function|return|async|await|new|class|def|fn|pub|use|if|else|for|while|package|func|type|interface|struct|impl|echo)$/;
const tint = (t: string, accent: string) => {
  if (/^['"`]/.test(t)) return hud.white;
  if (/^\d+$/.test(t) || KEYWORDS.test(t)) return accent;
  if (/^[A-Za-z_$]/.test(t)) return hud.mid;
  return hud.dim;
};
const Line: React.FC<{ text: string; accent: string }> = ({ text, accent }) => (
  <>{(text.match(TOKEN) ?? []).map((t, i) => <span key={i} style={{ color: tint(t, accent) }}>{t}</span>)}</>
);

// Typing progress shared by both layouts: ~1.6 chars per frame after `start`.
const useTyping = (code: string, start: number) => {
  const frame = useCurrentFrame();
  const shown = Math.max(0, Math.floor((frame - start) * 1.6));
  const doneAt = start + Math.ceil(code.length / 1.6);
  return { frame, shown, doneAt, runAt: Math.ceil((doneAt + 4) / BEAT) * BEAT };
};

// Code "window": a centered editor window types the snippet; on the next beat
// a terminal drawer slides out under it with the run, status and response.
export const CodeWindow: React.FC<CodeProps> = ({ label, heading, filename, code, runCommand, status, request, response, accentColor }) => {
  const { frame, shown, runAt } = useTyping(code, 14);
  const lines = code.split("\n");
  const winIn = useEnter(2, 20);
  const headIn = useEnter(0);
  const drawer = interpolate(frame, [runAt, runAt + 14], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const size = fitSize(lines.reduce((a, l) => (l.length > a.length ? l : a), ""), 30, 1000, 0.6);
  let used = 0;
  return (
    <AbsoluteFill style={{ backgroundColor: hud.sceneBg, color: hud.white }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 90, textAlign: "center", ...enterStyle(headIn) }}>
        <Kicker color={accentColor}>{label}</Kicker>
        <Display text={heading} base={70} maxWidth={1500} style={{ marginTop: 10 }} />
      </div>
      <div
        style={{
          position: "absolute",
          left: 380,
          width: 1160,
          top: 290,
          borderRadius: hud.radius,
          overflow: "hidden",
          border: `1.5px solid ${hud.faint}`,
          background: hud.panel,
          boxShadow: "0 50px 120px rgba(0,0,0,0.45)",
          ...enterStyle(winIn, 50),
          translate: `0px ${interpolate(winIn, [0, 1], [50, 0]) - 90 * drawer}px`,
        }}
      >
        <div style={{ height: 46, display: "flex", alignItems: "center", gap: 10, padding: "0 20px", background: hud.panelBar, fontFamily: hud.mono, fontSize: 17, color: hud.dim }}>
          {["#ff5f57", "#febc2e", "#28c840"].map((c) => <div key={c} style={{ width: 13, height: 13, borderRadius: 7, background: c }} />)}
          <span style={{ marginLeft: 16 }}>{filename}</span>
        </div>
        <div style={{ padding: "26px 34px", fontFamily: hud.mono, fontSize: size, lineHeight: 1.55, whiteSpace: "pre", minHeight: 320 }}>
          {lines.map((l, i) => {
            const from = used;
            used += l.length + 1;
            const vis = l.slice(0, Math.max(0, shown - from));
            return (
              <div key={i} style={{ display: "flex" }}>
                <span style={{ width: 54, color: hud.lineNo }}>{i + 1}</span>
                <Line text={vis} accent={accentColor} />
              </div>
            );
          })}
        </div>
        <div style={{ height: 200 * drawer, overflow: "hidden", borderTop: `1px solid ${hud.faint}`, background: hud.panelBar, fontFamily: hud.mono, fontSize: 26, padding: drawer ? "20px 34px" : 0 }}>
          <div style={{ color: hud.white }}>$ {runCommand}</div>
          <div style={{ color: accentColor, marginTop: 10 }}>● {status}</div>
          <div style={{ color: hud.mid, marginTop: 10, opacity: interpolate(frame, [runAt + BEAT, runAt + BEAT + 8], [0, 1], clamp) }}>
            → {request} <span style={{ color: hud.white, marginLeft: 20 }}>{response}</span>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Code "focus": the snippet in big type, one line lit at a time while the rest
// dims; when typing ends the run result lands as a big stamp.
export const CodeFocus: React.FC<CodeProps> = ({ label, heading, code, runCommand, response, accentColor }) => {
  const { frame, shown, doneAt, runAt } = useTyping(code, 8);
  const lines = code.split("\n");
  const active = code.slice(0, Math.min(shown, code.length)).split("\n").length - 1;
  const size = fitSize(lines.reduce((a, l) => (l.length > a.length ? l : a), ""), 52, 1600, 0.6);
  const stamp = interpolate(frame, [runAt, runAt + 10], [0, 1], { ...clamp, easing: Easing.out(Easing.back(2)) });
  const headIn = useEnter(0);
  let used = 0;
  return (
    <AbsoluteFill style={{ backgroundColor: hud.sceneBg, color: hud.white }}>
      <div style={{ position: "absolute", left: 160, top: 110, ...enterStyle(headIn) }}>
        <Kicker color={accentColor}>{label} · {heading}</Kicker>
      </div>
      <div style={{ position: "absolute", left: 160, right: 160, top: 210, fontFamily: hud.mono, fontSize: size, lineHeight: 1.45, whiteSpace: "pre" }}>
        {lines.map((l, i) => {
          const from = used;
          used += l.length + 1;
          const vis = l.slice(0, Math.max(0, shown - from));
          const on = i === active || frame > doneAt;
          return (
            <div key={i} style={{ opacity: on ? 1 : 0.28, translate: `${i === active && frame <= doneAt ? 12 : 0}px 0px`, borderLeft: `4px solid ${i === active && frame <= doneAt ? accentColor : "transparent"}`, paddingLeft: 24 }}>
              <Line text={vis || " "} accent={accentColor} />
            </div>
          );
        })}
      </div>
      <div
        style={{
          position: "absolute",
          right: 160,
          bottom: 130,
          padding: "22px 34px",
          borderRadius: hud.radius,
          background: accentColor,
          color: hud.bg,
          fontFamily: hud.mono,
          opacity: stamp,
          scale: interpolate(stamp, [0, 1], [1.4, 1]) * (1 + 0.03 * beatPulse(frame - runAt)),
          rotate: "-2deg",
        }}
      >
        <div style={{ fontSize: 22, opacity: 0.8 }}>$ {runCommand}</div>
        <div style={{ fontSize: 46, fontWeight: 500, marginTop: 6 }}>{response}</div>
      </div>
    </AbsoluteFill>
  );
};
