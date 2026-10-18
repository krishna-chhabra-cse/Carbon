import type React from "react";
import { AbsoluteFill, Easing, interpolate } from "remotion";
import { clamp, fit, mixHex, readableOn, useScene } from "../engine/common";
import { grotesk, jetbrains } from "../engine/fonts";
import type { SceneProps, StyleModule } from "../engine/types";

// Data Story: the repo told through its real numbers, like an editorial
// data graphic. Calm light canvas, one accent, charts that grow with an
// expo-out ease, and every value printed exactly and sourced. Nothing is
// estimated or extrapolated: no trends, no time series we don't have.

const BG = "#f5f6f8";
const INK = "#14161a";
const MUTED = "#6b7280";
const GRID = "#e1e4ea";
const EXPO = Easing.bezier(0.16, 1, 0.3, 1);
const grow = (frame: number, at: number, len: number) => interpolate(frame, [at, at + len], [0, 1], { ...clamp, easing: EXPO });

const MULT: Record<string, number> = { "K+": 1e3, "M+": 1e6 };
const rawOf = (n: { value: number; suffix: string }) => n.value * (MULT[n.suffix] ?? 1);
const show = (n: { value: number; suffix: string }) => `${n.value}${n.suffix}`;

const Kicker: React.FC<{ children: React.ReactNode; color?: string; style?: React.CSSProperties }> = ({ children, color = MUTED, style }) => (
  <div style={{ fontFamily: jetbrains, fontSize: 22, letterSpacing: "0.06em", textTransform: "uppercase", color, ...style }}>{children}</div>
);

const Source: React.FC<{ sb: SceneProps["sb"] }> = ({ sb }) => (
  <Kicker style={{ position: "absolute", left: 120, bottom: 70, fontSize: 18 }}>Source: GitHub API · {sb.meta?.domain || sb.outro.url} · at render time</Kicker>
);

// ── Scenes ──────────────────────────────────────────────────────────────
const Headline: React.FC<SceneProps> = ({ sb, accent }) => {
  const { frame } = useScene();
  const nums = sb.numbers ?? [];
  const top = nums[0] ?? (sb.slot2.kind === "stat" ? { value: sb.slot2.value, suffix: sb.slot2.suffix, label: sb.slot2.unit } : { value: 0, suffix: "", label: "" });
  const k = grow(frame, 6, 50);
  const value = `${Math.round(top.value * k)}${top.suffix}`;
  return (
    <AbsoluteFill>
      <Kicker style={{ position: "absolute", left: 120, top: 110, opacity: grow(frame, 0, 14) }}>
        {sb.title.title} · {sb.meta?.language}
      </Kicker>
      <div style={{ position: "absolute", left: 105, top: 170, fontFamily: grotesk, fontWeight: 700, fontSize: fit(show(top), 400, 1100, 0.62), lineHeight: 1, letterSpacing: "-0.04em", color: INK, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      <div style={{ position: "absolute", left: 120, top: 600, height: 6, width: 1000 * grow(frame, 40, 40), background: accent }} />
      <div style={{ position: "absolute", left: 120, top: 640, fontFamily: grotesk, fontWeight: 500, fontSize: 56, color: INK, opacity: grow(frame, 46, 20) }}>{top.label}</div>
      <div style={{ position: "absolute", left: 1260, top: 220, width: 540, fontFamily: grotesk, fontSize: 40, lineHeight: 1.3, color: MUTED, opacity: grow(frame, 60, 24) }}>
        <span style={{ color: INK, fontWeight: 700 }}>{sb.title.title}</span> — {sb.title.caption}
      </div>
      <Source sb={sb} />
    </AbsoluteFill>
  );
};

const Bars: React.FC<SceneProps> = ({ sb, accent }) => {
  const { frame } = useScene();
  const nums = (sb.numbers ?? []).slice(0, 4);
  const maxExp = Math.max(1, Math.ceil(Math.log10(Math.max(10, ...nums.map(rawOf)))));
  const W = 1200;
  const xOf = (v: number) => (Math.log10(Math.max(1, v)) / maxExp) * W;
  const tick = (e: number) => (e >= 6 ? `${10 ** (e - 6)}M` : e >= 3 ? `${10 ** (e - 3)}K` : `${10 ** e}`);
  return (
    <AbsoluteFill>
      <Kicker style={{ position: "absolute", left: 120, top: 110 }}>By the numbers</Kicker>
      <div style={{ position: "absolute", left: 120, top: 150, fontFamily: grotesk, fontWeight: 700, fontSize: 72, color: INK, letterSpacing: "-0.02em", opacity: grow(frame, 0, 18) }}>{sb.title.title} on GitHub.</div>
      <div style={{ position: "absolute", left: 480, top: 330, width: W, height: nums.length * 130 }}>
        {Array.from({ length: maxExp + 1 }, (_, e) => (
          <div key={e} style={{ position: "absolute", left: (e / maxExp) * W, top: -20, bottom: -40, width: 1.5, background: GRID }}>
            <span style={{ position: "absolute", bottom: -36, left: -40, width: 80, textAlign: "center", fontFamily: jetbrains, fontSize: 18, color: MUTED }}>{tick(e)}</span>
          </div>
        ))}
        {nums.map((n, i) => {
          const k = grow(frame, 16 + i * 12, 46);
          return (
            <div key={n.label} style={{ position: "absolute", left: 0, top: i * 130, height: 70, width: Math.max(4, xOf(rawOf(n)) * k), background: i === 0 ? accent : mixHex(INK, 255, 0.55 + i * 0.1) }}>
              <span style={{ position: "absolute", left: "100%", marginLeft: 22, top: 10, fontFamily: grotesk, fontWeight: 700, fontSize: 44, color: INK, opacity: k > 0.6 ? 1 : 0, whiteSpace: "nowrap" }}>{show(n)}</span>
            </div>
          );
        })}
      </div>
      {nums.map((n, i) => (
        <div key={n.label} style={{ position: "absolute", left: 120, top: 330 + i * 130, width: 330, height: 70, display: "flex", alignItems: "center", fontFamily: grotesk, fontWeight: 500, fontSize: 34, color: INK, opacity: grow(frame, 10 + i * 12, 14) }}>
          {n.label}
        </div>
      ))}
      <Kicker style={{ position: "absolute", left: 480, top: 360 + nums.length * 130, fontSize: 18 }}>log scale</Kicker>
      <Source sb={sb} />
    </AbsoluteFill>
  );
};

const Donut: React.FC<SceneProps> = ({ sb, accent }) => {
  const { frame } = useScene();
  const langs = (sb.languages ?? []).filter((l) => l.pct > 0);
  const colors = langs.map((_, i) => (i === 0 ? accent : mixHex(INK, 255, 0.35 + i * 0.13)));
  const R = 250;
  const C = 2 * Math.PI * R;
  const total = langs.reduce((a, l) => a + l.pct, 0) || 1;
  let acc = 0;
  if (!langs.length) {
    // No language data (rare): list the repo's topics instead of drawing a chart.
    return (
      <AbsoluteFill>
        <Kicker style={{ position: "absolute", left: 120, top: 110 }}>Built with</Kicker>
        <div style={{ position: "absolute", left: 120, top: 200, fontFamily: grotesk, fontWeight: 700, fontSize: 90, color: INK }}>{(sb.meta?.topics ?? []).slice(0, 4).join(" · ") || sb.meta?.language}</div>
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill>
      <Kicker style={{ position: "absolute", left: 120, top: 110 }}>Code by language</Kicker>
      <svg width={700} height={700} viewBox="-350 -350 700 700" style={{ position: "absolute", left: 160, top: 220 }}>
        <circle r={R} fill="none" stroke={GRID} strokeWidth={90} />
        {langs.map((l, i) => {
          const share = (l.pct / total) * C;
          const offset = acc;
          acc += share;
          const k = grow(frame, 10 + i * 14, 40);
          return <circle key={l.name} r={R} fill="none" stroke={colors[i]} strokeWidth={90} strokeDasharray={`${Math.max(0, share * k - 4)} ${C}`} strokeDashoffset={-offset} transform="rotate(-90)" />;
        })}
        <text textAnchor="middle" y={-6} style={{ fontFamily: grotesk, fontWeight: 700, fontSize: 96, fill: INK }}>
          {Math.round(langs[0].pct * grow(frame, 10, 40))}%
        </text>
        <text textAnchor="middle" y={56} style={{ fontFamily: jetbrains, fontSize: 30, fill: MUTED }}>
          {langs[0].name}
        </text>
      </svg>
      <div style={{ position: "absolute", left: 1040, top: 300, display: "flex", flexDirection: "column", gap: 34 }}>
        {langs.map((l, i) => (
          <div key={l.name} style={{ display: "flex", alignItems: "center", gap: 26, opacity: grow(frame, 16 + i * 14, 16) }}>
            <span style={{ width: 34, height: 34, background: colors[i] }} />
            <span style={{ fontFamily: grotesk, fontWeight: 500, fontSize: 46, color: INK, width: 420 }}>{l.name}</span>
            <span style={{ fontFamily: jetbrains, fontSize: 40, color: MUTED }}>{l.pct}%</span>
          </div>
        ))}
      </div>
      <Kicker style={{ position: "absolute", left: 120, bottom: 70, fontSize: 18 }}>Share of code by bytes · GitHub languages API</Kicker>
    </AbsoluteFill>
  );
};

const Topics: React.FC<SceneProps> = ({ sb, accent }) => {
  const { frame } = useScene();
  const items = [...new Set([...(sb.features ?? []), ...(sb.meta?.topics ?? [])])].slice(0, 12);
  const cols = 4;
  const center = (items.length - 1) / 2;
  return (
    <AbsoluteFill>
      <Kicker style={{ position: "absolute", left: 120, top: 110 }}>What's inside</Kicker>
      <div style={{ position: "absolute", left: 120, top: 150, fontFamily: grotesk, fontWeight: 700, fontSize: 72, color: INK, letterSpacing: "-0.02em" }}>{sb.tree.heading}</div>
      {items.map((it, i) => {
        // Stagger outward from the middle of the grid.
        const k = grow(frame, 12 + Math.abs(i - center) * 5, 26);
        const isFeature = (sb.features ?? []).includes(it);
        return (
          <div
            key={it}
            style={{
              position: "absolute",
              left: 120 + (i % cols) * 430,
              top: 330 + Math.floor(i / cols) * 190,
              width: 400,
              height: 160,
              padding: "26px 30px",
              background: isFeature ? "#ffffff" : "transparent",
              border: `2px solid ${isFeature ? GRID : accent}`,
              opacity: k,
              translate: `0px ${(1 - k) * 30}px`,
            }}
          >
            <Kicker style={{ fontSize: 16, color: isFeature ? accent : MUTED }}>{isFeature ? "feature" : "topic"}</Kicker>
            <div style={{ marginTop: 14, fontFamily: grotesk, fontWeight: 600, fontSize: fit(it, 40, 340, 0.55), color: INK }}>{it}</div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

const Takeaway: React.FC<SceneProps> = ({ sb, accent }) => {
  const { frame } = useScene();
  const cmd = sb.outro.command;
  return (
    <AbsoluteFill>
      <Kicker style={{ position: "absolute", left: 120, top: 110 }}>The takeaway</Kicker>
      <div style={{ position: "absolute", left: 120, top: 200, width: 1600, fontFamily: grotesk, fontWeight: 700, fontSize: fit(sb.title.caption, 110, 1600 * 1.8, 0.55), lineHeight: 1.08, letterSpacing: "-0.025em", color: INK, opacity: grow(frame, 0, 20), translate: `0px ${(1 - grow(frame, 0, 30)) * 30}px` }}>
        {sb.title.caption}
      </div>
      <div style={{ position: "absolute", left: 120, top: 640, display: "flex", alignItems: "center", gap: 30, opacity: grow(frame, 30, 20) }}>
        <span style={{ padding: "22px 36px", background: INK, color: "#ffffff", fontFamily: jetbrains, fontSize: fit(cmd, 44, 1200, 0.6) }}>
          <span style={{ color: readableOn(accent, true), marginRight: 18 }}>$</span>
          {cmd}
        </span>
      </div>
      <div style={{ position: "absolute", left: 120, top: 800, fontFamily: grotesk, fontWeight: 500, fontSize: 40, color: accent, opacity: grow(frame, 44, 20) }}>{sb.outro.url}</div>
      <Source sb={sb} />
    </AbsoluteFill>
  );
};

export const datastory: StyleModule = {
  bg: BG,
  accent: (sb) => readableOn(sb.accent, false),
  watermark: { color: INK, background: BG, font: jetbrains },
  scenes: {
    "data.headline": Headline,
    "data.bars": Bars,
    "data.donut": Donut,
    "data.topics": Topics,
    "data.takeaway": Takeaway,
  },
};
