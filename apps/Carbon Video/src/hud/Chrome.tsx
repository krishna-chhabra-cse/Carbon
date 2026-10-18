import type React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { hud } from "./hud";

// The on-screen UI around the scenes, one kind per style family, so videos
// don't all wear the same HUD (HudChrome draws the "hud" kind itself).
//   tmux       a terminal status bar with one window per scene + a prompt
//   editorial  a magazine folio: top rule, title, issue number, page count
//   minimal    a small product pill and a segmented progress bar
//   none       nothing but the atmosphere (grain, vignette, flashes)
export type ChromeKind = "hud" | "tmux" | "editorial" | "minimal" | "none";
export const CHROMES: ChromeKind[] = ["hud", "tmux", "editorial", "minimal", "none"];

type Section = { readonly from: number; readonly label: string };
const plain = (label: string) => label.replace(/^SIG \d+\s*·\s*/i, "").trim();

export const ChromeUI: React.FC<{ kind: ChromeKind; sections: Section[]; title: string; product: string; accentColor: string }> = ({ kind, sections, title, product, accentColor }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const idx = Math.max(0, sections.reduce((last, s, i) => (frame >= s.from ? i : last), 0));
  const current = plain(sections[idx]?.label ?? "");
  const fadeIn = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });

  if (kind === "tmux") {
    const sec = Math.floor(frame / fps);
    return (
      <div style={{ position: "absolute", inset: 0, opacity: fadeIn, fontFamily: hud.mono }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 46, display: "flex", alignItems: "center", gap: 6, padding: "0 28px", background: hud.ink(0.1), borderBottom: `1px solid ${hud.faint}`, fontSize: 19 }}>
          <span style={{ color: hud.bg, background: accentColor, padding: "2px 12px", marginRight: 14 }}>{product.toLowerCase()}</span>
          {sections.map((s, i) => (
            <span key={i} style={{ padding: "2px 12px", color: i === idx ? hud.bg : hud.dim, background: i === idx ? hud.mid : "transparent" }}>
              {i}:{plain(s.label) || "scene"}{i === idx ? "*" : ""}
            </span>
          ))}
          <span style={{ marginLeft: "auto", color: hud.dim }}>00:{String(sec).padStart(2, "0")}</span>
        </div>
        <div style={{ position: "absolute", left: 40, bottom: 34, fontSize: 20, color: hud.dim }}>
          ~/{product.toLowerCase()} $ carbon launch <span style={{ color: accentColor, opacity: Math.floor(frame / 15) % 2 ? 0 : 1 }}>▌</span>
        </div>
      </div>
    );
  }

  if (kind === "editorial") {
    return (
      <div style={{ position: "absolute", inset: 0, opacity: fadeIn, color: hud.dim }}>
        <div style={{ position: "absolute", left: 80, right: 80, top: 52, display: "flex", justifyContent: "space-between", alignItems: "baseline", paddingBottom: 12, borderBottom: `1px solid ${hud.faint}` }}>
          <span style={{ fontFamily: hud.display, fontStyle: "italic", fontSize: 30, color: hud.mid }}>{product}</span>
          <span style={{ fontFamily: hud.mono, fontSize: 16, letterSpacing: "0.16em", textTransform: "uppercase" }}>
            No. {String(idx + 1).padStart(2, "0")} — {current}
          </span>
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 44, textAlign: "center", fontFamily: hud.mono, fontSize: 16, letterSpacing: "0.2em" }}>
          {String(idx + 1).padStart(2, "0")} / {String(sections.length).padStart(2, "0")}
        </div>
      </div>
    );
  }

  if (kind === "minimal") {
    const bounds = [...sections.map((s) => s.from), durationInFrames];
    return (
      <div style={{ position: "absolute", inset: 0, opacity: fadeIn }}>
        <div style={{ position: "absolute", left: 70, top: 56, display: "flex", alignItems: "center", gap: 12, padding: "10px 20px", borderRadius: 999, background: hud.panel, border: `1px solid ${hud.faint}`, fontFamily: hud.sans, fontWeight: 600, fontSize: 22, color: hud.white }}>
          <span style={{ width: 10, height: 10, borderRadius: 5, background: accentColor }} />
          {product}
        </div>
        <div style={{ position: "absolute", left: 70, right: 70, bottom: 54, display: "flex", gap: 10 }}>
          {sections.map((s, i) => {
            const k = interpolate(frame, [bounds[i], bounds[i + 1]], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            return (
              <div key={i} style={{ flex: bounds[i + 1] - bounds[i], height: 4, borderRadius: 2, background: hud.faint, overflow: "hidden" }}>
                <div style={{ width: `${k * 100}%`, height: "100%", background: i === idx ? accentColor : hud.mid }} />
              </div>
            );
          })}
        </div>
        <div style={{ position: "absolute", right: 70, top: 66, fontFamily: hud.mono, fontSize: 16, letterSpacing: "0.14em", color: hud.dim, textTransform: "uppercase" }}>{title.split(" · ").slice(1).join(" · ")}</div>
      </div>
    );
  }

  return null;
};
