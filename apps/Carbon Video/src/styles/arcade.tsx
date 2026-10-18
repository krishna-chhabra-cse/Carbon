import type React from "react";
import { useEffect, useRef, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, useCurrentFrame } from "remotion";
import { fit, rand, readableOn, stepped, useScene } from "../engine/common";
import { pressStart } from "../engine/fonts";
import type { SceneProps, StyleModule } from "../engine/types";

// Pixel Arcade: the product as a retro video game. Everything moves at 8 fps
// (stepped every 4 frames), type is a bitmap face with hard block shadows,
// screenshots are genuinely downsampled to a low-res bitmap, and features
// become items a pixel character collects across a side-scrolling level.

const BG = "#11112b";
const INK = "#f7f7ff";
const GOLD = "#ffd23f";
const STEP = 4;

const px = (text: string, size: number, color: string, shadow = "#000000", style?: React.CSSProperties): React.CSSProperties => ({
  fontFamily: pressStart,
  fontSize: size,
  lineHeight: 1.35,
  color,
  textShadow: `${size / 8}px ${size / 8}px 0 ${shadow}`,
  whiteSpace: "pre",
  ...style,
});

const blink = (frame: number) => Math.floor(frame / 15) % 2 === 0;

// An original 12×10 character: X body (accent), O visor, A arms, legs alternate.
const BODY = ["....XXXX....", "...XXXXXX...", "..XXOOOOXX..", "..XXOOOOXX..", "...XXXXXX...", ".AAXXXXXXAA.", ".A.XXXXXX.A.", "...XXXXXX..."];
const LEGS = [
  ["...XX..XX...", "..XX....XX.."],
  ["....XXXX....", "....XX.XX..."],
];
const Sprite: React.FC<{ x: number; y: number; scale?: number; accent: string; walk?: number }> = ({ x, y, scale = 10, accent, walk = 0 }) => {
  const rows = [...BODY, ...LEGS[walk % 2]];
  const color = (c: string) => (c === "X" ? accent : c === "O" ? "#9ff3ff" : c === "A" ? GOLD : null);
  return (
    <svg width={12 * scale} height={rows.length * scale} style={{ position: "absolute", left: x, top: y }} shapeRendering="crispEdges">
      {rows.flatMap((row, r) =>
        [...row].map((c, i) => {
          const fill = color(c);
          return fill ? <rect key={`${r}-${i}`} x={i * scale} y={r * scale} width={scale} height={scale} fill={fill} /> : null;
        }),
      )}
    </svg>
  );
};

// A real screenshot, downsampled to `w`×`h` pixels and scaled up blocky.
const PixelImage: React.FC<{ src: string; w: number; h: number; scale: number }> = ({ src, w, h, scale }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const [handle] = useState(() => delayRender("pixelate screenshot"));
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const ctx = ref.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        const ratio = Math.max(w / img.width, h / img.height);
        ctx.drawImage(img, 0, 0, w / ratio, h / ratio, 0, 0, w, h);
      }
      continueRender(handle);
    };
    img.onerror = () => continueRender(handle);
    img.src = src;
  }, [src, w, h, handle]);
  return <canvas ref={ref} width={w} height={h} style={{ width: w * scale, height: h * scale, imageRendering: "pixelated", display: "block" }} />;
};

// A frame drawn from chunky pixel borders.
const Panel: React.FC<{ x: number; y: number; w: number; h: number; color: string; children?: React.ReactNode; fill?: string }> = ({ x, y, w, h, color, children, fill = BG }) => (
  <div style={{ position: "absolute", left: x, top: y, width: w, height: h, background: fill, boxShadow: `0 -8px 0 ${color}, 0 8px 0 ${color}, -8px 0 0 ${color}, 8px 0 0 ${color}, 16px 16px 0 #000` }}>{children}</div>
);

const Stars: React.FC = () => {
  const frame = stepped(useCurrentFrame(), STEP);
  return (
    <AbsoluteFill style={{ background: `linear-gradient(${BG}, #1d1440 70%, #2a1650)` }}>
      {Array.from({ length: 90 }, (_, i) => {
        const speed = 0.4 + rand(`s${i}`) * 1.6;
        const x = (rand(`x${i}`) * 2000 - frame * speed) % 2000;
        const size = rand(`z${i}`) > 0.85 ? 8 : 4;
        return <div key={i} style={{ position: "absolute", left: x < 0 ? x + 2000 : x, top: rand(`y${i}`) * 1080, width: size, height: size, background: rand(`c${i}`) > 0.8 ? GOLD : INK, opacity: 0.35 + rand(`o${i}`) * 0.6 }} />;
      })}
    </AbsoluteFill>
  );
};

// ── Scenes ──────────────────────────────────────────────────────────────
const Start: React.FC<SceneProps> = ({ sb, accent }) => {
  const { frame } = useScene();
  const f = stepped(frame, STEP);
  const name = sb.title.title.toUpperCase();
  const size = fit(name, 150, 1600, 1.02);
  const drop = Math.max(0, 1 - f / 24);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 0, right: 0, top: 300 - drop * 500, textAlign: "center", ...px(name, size, accent, "#000", { textShadow: `${size / 10}px ${size / 10}px 0 #000, ${size / 5}px ${size / 5}px 0 ${GOLD}` }) }}>{name}</div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 360 + size, textAlign: "center", ...px("", 26, INK) }}>{f > 30 ? sb.title.caption.toUpperCase().slice(0, 48) : ""}</div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 760, textAlign: "center", ...px("", 40, GOLD), opacity: f > 50 && blink(frame) ? 1 : 0 }}>PRESS START</div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 70, textAlign: "center", ...px("", 18, INK), opacity: 0.6 }}>© {sb.meta?.domain || sb.outro.url}</div>
      <Sprite x={140} y={760} accent={accent} walk={Math.floor(f / STEP)} />
      <Sprite x={1660} y={760} accent={GOLD} walk={Math.floor(f / STEP) + 1} />
    </AbsoluteFill>
  );
};

// Real numbers only: bars on a log scale, value printed exactly.
const Select: React.FC<SceneProps> = ({ sb, accent }) => {
  const { frame } = useScene();
  const f = stepped(frame, STEP);
  const shot = sb.slot2.kind === "shot" ? sb.slot2 : null;
  const nums = (sb.numbers ?? []).slice(0, 4);
  const max = Math.max(1, ...nums.map((n) => Math.log10(1 + n.value * (n.suffix === "M+" ? 1e6 : n.suffix === "K+" ? 1e3 : 1))));
  const feats = (sb.features ?? []).slice(0, 4);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 120, top: 80, ...px("", 44, GOLD) }}>PLAYER 1 — SELECT</div>
      <Panel x={120} y={200} w={720} h={720} color={accent}>
        {shot ? (
          <div style={{ position: "absolute", inset: 24, overflow: "hidden" }}>
            <PixelImage src={shot.image} w={168} h={168} scale={4} />
          </div>
        ) : (
          <Sprite x={160} y={170} scale={34} accent={accent} walk={Math.floor(f / 8)} />
        )}
        <div style={{ position: "absolute", left: 0, right: 0, bottom: -90, textAlign: "center", ...px("", 40, INK) }}>{sb.title.title.toUpperCase().slice(0, 16)}</div>
      </Panel>
      <div style={{ position: "absolute", left: 960, top: 210, ...px("", 30, INK) }}>{nums.length ? "STATS" : "ABILITIES"}</div>
      {nums.length
        ? nums.map((n, i) => {
            const at = 10 + i * 8;
            const raw = Math.log10(1 + n.value * (n.suffix === "M+" ? 1e6 : n.suffix === "K+" ? 1e3 : 1)) / max;
            const k = Math.min(1, Math.max(0, (f - at) / 16));
            const cells = Math.round(raw * 20 * k);
            return (
              <div key={n.label} style={{ position: "absolute", left: 960, top: 290 + i * 150 }}>
                <div style={px("", 22, GOLD)}>{n.label.toUpperCase().slice(0, 18)}</div>
                <div style={{ display: "flex", gap: 6, marginTop: 16 }}>
                  {Array.from({ length: 20 }, (_, c) => (
                    <div key={c} style={{ width: 26, height: 34, background: c < cells ? accent : "rgba(255,255,255,0.12)" }} />
                  ))}
                  <span style={{ ...px("", 26, INK), marginLeft: 18 }}>{k > 0.9 ? `${n.value}${n.suffix}` : ""}</span>
                </div>
              </div>
            );
          })
        : feats.map((ft, i) => (
            <div key={ft} style={{ position: "absolute", left: 960, top: 290 + i * 120, ...px("", 30, f > 10 + i * 8 ? INK : "transparent", "#000") }}>
              <span style={{ color: accent }}>▶ </span>
              {ft.toUpperCase().slice(0, 22)}
            </div>
          ))}
      {nums.length ? <div style={{ position: "absolute", left: 960, top: 900, ...px("", 16, INK), opacity: 0.55 }}>LOG SCALE · LIVE FROM GITHUB</div> : null}
    </AbsoluteFill>
  );
};

const Level: React.FC<SceneProps> = ({ sb, accent }) => {
  const { frame, duration } = useScene();
  const f = stepped(frame, STEP);
  const items = (sb.features ?? []).slice(0, 5);
  const ground = 840;
  const runEnd = duration - 50;
  const x = 80 + (Math.min(f, runEnd) / runEnd) * 1640;
  const itemX = items.map((_, i) => 360 + i * (1300 / Math.max(1, items.length)));
  const near = itemX.map((ix) => Math.abs(x + 60 - ix));
  const jump = Math.max(0, ...near.map((d) => (d < 110 ? Math.sin(((110 - d) / 110) * Math.PI * 0.5) * 150 : 0)));
  const got = itemX.map((ix) => x + 60 >= ix);
  const collected = items.filter((_, i) => got[i]);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 80, top: 60, ...px("", 26, INK) }}>
        ITEMS {collected.length}/{items.length}
      </div>
      <div style={{ position: "absolute", right: 80, top: 60, ...px("", 26, GOLD) }}>WORLD 1-1</div>
      <div style={{ position: "absolute", left: 80, top: 120, display: "flex", gap: 18 }}>
        {items.map((it, i) => (
          <div key={it} style={{ width: 44, height: 44, background: got[i] ? GOLD : "rgba(255,255,255,0.12)", boxShadow: "6px 6px 0 #000" }} />
        ))}
      </div>
      {/* pixel clouds and brick platforms drifting at their own parallax */}
      {[0, 1, 2, 3].map((i) => (
        <div key={`cloud${i}`} style={{ position: "absolute", left: ((i * 560 + 200 - f * 0.6) % 2240) - 160, top: 230 + (i % 2) * 90, width: 160, height: 40, background: "rgba(255,255,255,0.85)", boxShadow: "40px -32px 0 -4px rgba(255,255,255,0.85), 80px 0 0 rgba(255,255,255,0.85)" }} />
      ))}
      {itemX.map((ix, i) => (
        <div key={`brick${i}`} style={{ position: "absolute", left: ix - 120, top: ground - 70, width: 240, height: 40, background: "#b5542f", boxShadow: "inset 0 -8px 0 #7a3418, 8px 8px 0 #000", display: i % 2 ? "block" : "none" }} />
      ))}
      {/* ground tiles */}
      {Array.from({ length: 25 }, (_, i) => (
        <div key={i} style={{ position: "absolute", left: i * 80, top: ground + 100, width: 80, height: 140, background: i % 2 ? "#5b3a8c" : "#6a46a0", boxShadow: "inset 0 10px 0 #9a7be0" }} />
      ))}
      {items.map((it, i) => (
        <div key={it}>
          {!got[i] ? (
            <div style={{ position: "absolute", left: itemX[i] - 36, top: ground - 160 + (Math.floor(f / 8) % 2) * 8, width: 72, height: 72, background: GOLD, boxShadow: "8px 8px 0 #000", ...px("", 40, BG, GOLD), display: "flex", alignItems: "center", justifyContent: "center" }}>?</div>
          ) : null}
          <div style={{ position: "absolute", left: itemX[i] - 40, top: ground - 300 - (got[i] ? Math.min(60, (f - stepped(((itemX[i] - 140) / 1640) * runEnd, STEP)) * 2) : 0), ...px("", 24, accent), opacity: got[i] ? 1 : 0 }}>+ {it.toUpperCase().slice(0, 18)}</div>
        </div>
      ))}
      <Sprite x={x} y={ground - jump} accent={accent} walk={Math.floor(f / STEP)} />
    </AbsoluteFill>
  );
};

const Boss: React.FC<SceneProps> = ({ sb, accent }) => {
  const { frame } = useScene();
  const f = stepped(frame, 2);
  const isRepo = sb.meta?.type !== "site";
  const code = (isRepo ? sb.outro.command : sb.outro.url).toUpperCase();
  const shown = code.slice(0, Math.max(0, Math.floor((f - 24) / 2)));
  const done = shown.length === code.length && f > 24;
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 0, right: 0, top: 140, textAlign: "center", ...px("", 46, GOLD) }}>{isRepo ? "ENTER CHEAT CODE" : "WARP ZONE"}</div>
      <Panel x={220} y={340} w={1480} h={260} color={INK} fill="#000">
        <div style={{ position: "absolute", left: 40, top: 0, bottom: 0, display: "flex", alignItems: "center", ...px("", fit(code, 44, 1360, 1.02), accent, "#000") }}>
          {shown}
          <span style={{ width: 30, height: 44, background: blink(frame) ? INK : "transparent", marginLeft: 10 }} />
        </div>
      </Panel>
      <div style={{ position: "absolute", left: 0, right: 0, top: 700, textAlign: "center", ...px("", 34, INK), opacity: done ? 1 : 0 }}>{done ? "★ UNLOCKED ★" : ""}</div>
      {done
        ? Array.from({ length: 40 }, (_, i) => {
            const t = Math.max(0, f - (24 + code.length * 2));
            return <div key={i} style={{ position: "absolute", left: 960 + (rand(`cx${i}`) - 0.5) * 30 * t, top: 760 + (rand(`cy${i}`) - 0.8) * 22 * t + 0.4 * t * t, width: 14, height: 14, background: [accent, GOLD, INK][i % 3] }} />;
          })
        : null}
    </AbsoluteFill>
  );
};

const Win: React.FC<SceneProps> = ({ sb, accent }) => {
  const { frame } = useScene();
  const f = stepped(frame, STEP);
  const name = sb.title.title.toUpperCase();
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 0, right: 0, top: 170, textAlign: "center", ...px("", 64, GOLD), opacity: f > 2 ? 1 : 0 }}>LEVEL COMPLETE!</div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 380, textAlign: "center", ...px(name, fit(name, 120, 1600, 1.02), accent, "#000", { textShadow: `10px 10px 0 #000, 20px 20px 0 ${INK}` }), opacity: f > 12 ? 1 : 0 }}>{name}</div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 640, textAlign: "center", ...px("", 30, INK), opacity: f > 24 ? 1 : 0 }}>{sb.outro.url.toUpperCase()}</div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 800, textAlign: "center", ...px("", 32, GOLD), opacity: f > 36 && blink(frame) ? 1 : 0 }}>INSERT COIN</div>
      <Sprite x={180} y={780 - Math.abs(Math.sin(f / 6)) * 80} scale={16} accent={accent} />
      <Sprite x={1548} y={780 - Math.abs(Math.cos(f / 6)) * 80} scale={16} accent={GOLD} />
    </AbsoluteFill>
  );
};

export const arcade: StyleModule = {
  bg: BG,
  accent: (sb) => readableOn(sb.accent, true),
  Background: () => <Stars />,
  watermark: { color: INK, background: BG, font: pressStart, low: true },
  scenes: {
    "arcade.start": Start,
    "arcade.select": Select,
    "arcade.level": Level,
    "arcade.boss": Boss,
    "arcade.win": Win,
  },
};
