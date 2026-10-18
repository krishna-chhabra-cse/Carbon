import { evolvePath } from "@remotion/paths";
import type React from "react";
import { AbsoluteFill, Easing, Img, interpolate, spring, useCurrentFrame } from "remotion";
import { BEAT, clamp, fit, ramp, rgba, readableOn, useScene } from "../engine/common";
import type { SceneProps, StyleModule } from "../engine/types";
import { plexMono, sans } from "../theme";

// Blueprint: one technical drawing on drafting-blue paper. Every element is a
// hairline that draws itself; the "camera" pans across the sheet between
// scenes (slide transitions + a parallax grid); the product's real
// architecture (deck nodes from the facts) becomes a labelled system diagram.

const PAPER = "#0d2c52";
const INK = "#e9f2ff";
const ink = (a: number) => rgba(INK, a);
const SLOW = Easing.inOut(Easing.cubic);

const rectPath = (x: number, y: number, w: number, h: number) => `M ${x} ${y} h ${w} v ${h} h ${-w} Z`;

// A stroke that draws itself from 0 → 1.
const Stroke: React.FC<{ d: string; k: number; color?: string; width?: number; dash?: boolean }> = ({ d, k, color = INK, width = 2, dash }) => {
  if (k <= 0) return null;
  const evo = evolvePath(Math.min(1, k), d);
  return <path d={d} fill="none" stroke={color} strokeWidth={width} strokeLinecap="square" opacity={dash ? 0.6 : 1} {...(dash && k >= 1 ? { strokeDasharray: "10 8" } : evo)} />;
};

const Svg: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{ position: "absolute", inset: 0, overflow: "visible" }}>
    {children}
  </svg>
);

const typed = (text: string, frame: number, at: number, cps = 1.4) => text.slice(0, Math.max(0, Math.floor((frame - at) * cps)));

const Label: React.FC<{ x: number; y: number; children: React.ReactNode; size?: number; color?: string; style?: React.CSSProperties }> = ({ x, y, children, size = 22, color = ink(0.6), style }) => (
  <div style={{ position: "absolute", left: x, top: y, fontFamily: plexMono, fontSize: size, letterSpacing: "0.14em", textTransform: "uppercase", color, whiteSpace: "nowrap", ...style }}>{children}</div>
);

// Dimension line with arrowheads and a centred label.
const Dimension: React.FC<{ x0: number; x1: number; y: number; k: number; label: string; color: string }> = ({ x0, x1, y, k, label, color }) => (
  <>
    <Svg>
      <Stroke d={`M ${x0} ${y - 18} v 36 M ${x1} ${y - 18} v 36`} k={k} color={color} width={1.5} />
      <Stroke d={`M ${x0} ${y} H ${x1}`} k={k} color={color} width={1.5} />
      {k >= 1 ? <path d={`M ${x0} ${y} l 16 -7 v 14 Z M ${x1} ${y} l -16 -7 v 14 Z`} fill={color} /> : null}
    </Svg>
    <Label x={(x0 + x1) / 2} y={y - 44} color={color} style={{ translate: "-50% 0", opacity: k, background: PAPER, padding: "0 12px" }}>
      {label}
    </Label>
  </>
);

// ── Background: drafting grid that pans with the camera ─────────────────
const Background: React.FC<{ cuts: number[] }> = ({ cuts }) => {
  const frame = useCurrentFrame();
  const pan = cuts.reduce((x, c) => x + ramp(frame, c, 20, SLOW) * 240, 0) + frame * 0.25;
  const minor = ink(0.05);
  const major = ink(0.11);
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 50% 40%, #15406f 0%, ${PAPER} 70%)`,
      }}
    >
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(${minor} 1px, transparent 1px), linear-gradient(90deg, ${minor} 1px, transparent 1px), linear-gradient(${major} 1px, transparent 1px), linear-gradient(90deg, ${major} 1px, transparent 1px)`,
          backgroundSize: "24px 24px, 24px 24px, 120px 120px, 120px 120px",
          backgroundPosition: `${-pan}px 0px, ${-pan}px 0px, ${-pan}px 0px, ${-pan}px 0px`,
        }}
      />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, transparent 55%, rgba(2,10,24,0.55) 100%)" }} />
    </AbsoluteFill>
  );
};

// ── Overlay: the sheet border, zone letters and sheet number ────────────
const Overlay: React.FC<{ sb: SceneProps["sb"]; cuts: number[] }> = ({ sb, cuts }) => {
  const frame = useCurrentFrame();
  const k = ramp(frame, 0, 40, SLOW);
  const sheet = cuts.filter((c) => frame >= c).length + 1;
  const total = cuts.length + 1;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <Svg>
        <Stroke d={rectPath(36, 36, 1848, 1008)} k={k} color={ink(0.55)} width={2} />
        <Stroke d={rectPath(52, 52, 1816, 976)} k={k} color={ink(0.25)} width={1} />
      </Svg>
      {["A", "B", "C", "D"].map((z, i) => (
        <Label key={z} x={44 + (i + 0.5) * 454} y={8} size={18} color={ink(0.4 * k)} style={{ translate: "-50% 0" }}>
          {z}
        </Label>
      ))}
      {[1, 2, 3].map((z, i) => (
        <Label key={z} x={14} y={52 + (i + 0.5) * 325} size={18} color={ink(0.4 * k)}>
          {z}
        </Label>
      ))}
      <Label x={1600} y={1050} size={16} color={ink(0.5 * k)}>
        {sb.title.title} · sheet {String(sheet).padStart(2, "0")}/{String(total).padStart(2, "0")}
      </Label>
    </AbsoluteFill>
  );
};

// ── Scenes ──────────────────────────────────────────────────────────────
const TitleBlock: React.FC<SceneProps> = ({ sb, accent, total }) => {
  const { frame } = useScene();
  const t = sb.title;
  const size = fit(t.title, 220, 1400, 0.66);
  const w = Math.min(1500, t.title.length * size * 0.66);
  const x0 = 960 - w / 2;
  const reveal = ramp(frame, 18, 40, SLOW);
  const fill = ramp(frame, 62, 18);
  const isRepo = sb.meta?.type !== "site";
  const rows: [string, string][] = [
    ["Project", t.title],
    ["Source", sb.meta?.domain || sb.outro.url],
    ["Type", isRepo ? ["Repository", sb.meta?.language].filter(Boolean).join(" · ") : "Website"],
    ["Sheets", `01 of ${String(total).padStart(2, "0")}`],
  ];
  return (
    <AbsoluteFill>
      <Svg>
        {/* construction lines through the title */}
        <Stroke d="M 120 470 H 1800" k={ramp(frame, 4, 30, SLOW)} color={ink(0.18)} width={1} />
        <Stroke d="M 960 150 V 760" k={ramp(frame, 8, 30, SLOW)} color={ink(0.18)} width={1} />
        <Stroke d={rectPath(1240, 800, 600, 196)} k={ramp(frame, 70, 24)} color={ink(0.7)} width={1.5} />
        {rows.slice(1).map((_, i) => (
          <Stroke key={i} d={`M 1240 ${800 + (i + 1) * 49} H 1840`} k={ramp(frame, 80 + i * 4, 16)} color={ink(0.35)} width={1} />
        ))}
        <Stroke d="M 1400 800 V 996" k={ramp(frame, 86, 16)} color={ink(0.35)} width={1} />
      </Svg>
      <Dimension x0={x0} x1={x0 + w} y={300} k={ramp(frame, 40, 26, SLOW)} label={t.tag || (isRepo ? "repo" : "site")} color={accent} />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 470 - size * 0.62,
          textAlign: "center",
          fontFamily: sans,
          fontWeight: 800,
          fontSize: size,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          lineHeight: 1,
          color: "transparent",
          WebkitTextStroke: `2px ${INK}`,
          clipPath: `inset(-20% ${(1 - reveal) * 100}% -20% 0)`,
        }}
      >
        {t.title}
        <div style={{ position: "absolute", inset: 0, color: INK, WebkitTextStroke: "0px transparent", opacity: fill }}>{t.title}</div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 560, textAlign: "center", fontFamily: plexMono, fontSize: 34, color: ink(0.75), letterSpacing: "0.02em" }}>
        {typed(t.caption, frame, 70, 1.6)}
      </div>
      {rows.map(([k, v], i) => (
        <div key={k} style={{ position: "absolute", left: 1240, top: 800 + i * 49, height: 49, width: 600, display: "flex", alignItems: "center", opacity: ramp(frame, 92 + i * 5, 10) }}>
          <span style={{ width: 160, paddingLeft: 16, fontFamily: plexMono, fontSize: 16, letterSpacing: "0.16em", textTransform: "uppercase", color: ink(0.55) }}>{k}</span>
          <span style={{ paddingLeft: 18, fontFamily: plexMono, fontSize: 22, color: INK, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 420 }}>{v}</span>
        </div>
      ))}
    </AbsoluteFill>
  );
};

const System: React.FC<SceneProps> = ({ sb, accent }) => {
  const { frame } = useScene();
  const fromDiagram = (sb.diagram?.nodes ?? []).filter((n) => n.name);
  const nodes = (fromDiagram.length >= 2 ? fromDiagram : (sb.features ?? []).map((name) => ({ name, desc: "" }))).slice(0, 5);
  const heading = (fromDiagram.length >= 2 ? sb.diagram?.heading : sb.tree.heading) || "How it fits together";
  const n = Math.max(1, nodes.length);
  const gap = n > 4 ? 56 : 80;
  const bw = (1560 - gap * (n - 1)) / n;
  const bh = 170;
  const y = 420;
  const xs = nodes.map((_, i) => 180 + i * (bw + gap));
  const drawAt = (i: number) => 24 + i * BEAT;
  const arrowsDone = drawAt(n - 1) + 40;
  // A packet travels the chain once everything is drawn.
  const chain = 180 + (n - 1) * (bw + gap) + bw;
  const p = frame > arrowsDone ? ((frame - arrowsDone) % 70) / 70 : -1;
  return (
    <AbsoluteFill>
      <Label x={180} y={160} size={22} color={accent} style={{ opacity: ramp(frame, 0, 12) }}>
        fig. 1 — system
      </Label>
      <div style={{ position: "absolute", left: 180, top: 200, fontFamily: sans, fontWeight: 700, fontSize: fit(heading, 64, 1500, 0.55), color: INK, letterSpacing: "-0.01em", opacity: ramp(frame, 4, 14) }}>
        {heading}
      </div>
      <Svg>
        {nodes.map((_, i) => (
          <g key={i}>
            <Stroke d={rectPath(xs[i], y, bw, bh)} k={ramp(frame, drawAt(i), 26, SLOW)} color={i === 0 ? accent : INK} width={2} />
            {i > 0 ? <Stroke d={`M ${xs[i - 1] + bw + 6} ${y + bh / 2} H ${xs[i] - 10}`} k={ramp(frame, drawAt(i) + 10, 16)} color={ink(0.8)} width={2} /> : null}
            {i > 0 && frame > drawAt(i) + 26 ? <path d={`M ${xs[i] - 6} ${y + bh / 2} l -16 -8 v 16 Z`} fill={ink(0.8)} /> : null}
          </g>
        ))}
        <Stroke d={`M 180 ${y + bh + 210} V ${y + bh + 230} H ${chain} V ${y + bh + 210}`} k={ramp(frame, arrowsDone - 20, 30, SLOW)} color={ink(0.35)} width={1.5} />
        {p >= 0 ? <circle cx={180 + p * (chain - 180)} cy={y + bh / 2} r={9} fill={accent} style={{ filter: `drop-shadow(0 0 10px ${accent})` }} /> : null}
      </Svg>
      {nodes.map((node, i) => (
        <div key={i}>
          <Label x={xs[i]} y={y - 38} size={18} color={ink(0.55)} style={{ opacity: ramp(frame, drawAt(i), 10) }}>
            {String(i + 1).padStart(2, "0")}
          </Label>
          <div
            style={{
              position: "absolute",
              left: xs[i],
              top: y,
              width: bw,
              height: bh,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              padding: "0 18px",
              fontFamily: plexMono,
              fontWeight: 500,
              fontSize: fit(node.name, 30, bw - 36, 0.62),
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: INK,
            }}
          >
            {typed(node.name, frame, drawAt(i) + 14, 1.6)}
          </div>
          {node.desc ? (
            <div style={{ position: "absolute", left: xs[i], top: y + bh + 22, width: bw, fontFamily: plexMono, fontSize: 19, lineHeight: 1.45, color: ink(0.62), opacity: ramp(frame, drawAt(i) + 24, 14) }}>
              {node.desc}
            </div>
          ) : null}
        </div>
      ))}
      <Label x={180} y={y + bh + 246} size={18} color={ink(0.5)} style={{ opacity: ramp(frame, arrowsDone, 14) }}>
        {fromDiagram.length >= 2 ? "flow · left to right" : "modules"}
      </Label>
    </AbsoluteFill>
  );
};

const Detail: React.FC<SceneProps> = ({ sb, accent }) => {
  const { frame } = useScene();
  const code = sb.slot3.kind === "code" ? sb.slot3 : null;
  const shot = sb.slot2.kind === "shot" ? sb.slot2 : null;
  const circle = ramp(frame, 0, 34, SLOW);
  const box = ramp(frame, 18, 36, SLOW);
  const lines = code ? code.code.split("\n") : [];
  const heading = code ? code.heading : shot ? shot.heading : sb.title.caption;
  return (
    <AbsoluteFill>
      <Svg>
        <Stroke d="M 360 360 m -170 0 a 170 170 0 1 0 340 0 a 170 170 0 1 0 -340 0" k={circle} color={accent} width={2.5} />
        <Stroke d="M 520 300 L 640 230" k={ramp(frame, 30, 14)} color={accent} width={1.5} />
        <Stroke d={rectPath(640, 200, 1120, 640)} k={box} color={INK} width={2} />
        <Stroke d="M 640 252 H 1760" k={ramp(frame, 40, 20)} color={ink(0.4)} width={1} />
      </Svg>
      {/* inside the detail bubble: the same thing, magnified */}
      <div style={{ position: "absolute", left: 196, top: 196, width: 328, height: 328, borderRadius: "50%", overflow: "hidden", opacity: ramp(frame, 24, 16) }}>
        {shot ? (
          <Img src={shot.image} style={{ width: 1100, height: "auto", translate: "-30px -10px" }} />
        ) : (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 40, textAlign: "center", fontFamily: plexMono, fontSize: 30, color: INK, background: rgba("#000814", 0.35) }}>
            {lines.find((l) => l.trim()) || sb.outro.command}
          </div>
        )}
      </div>
      <Label x={190} y={560} color={accent} style={{ opacity: ramp(frame, 30, 10) }}>
        detail a · scale 2:1
      </Label>
      <Label x={664} y={214} size={18} color={ink(0.7)} style={{ opacity: ramp(frame, 40, 10) }}>
        {code ? code.filename : shot ? shot.domain : sb.outro.url}
      </Label>
      <div style={{ position: "absolute", left: 640, top: 252, width: 1120, height: 588, overflow: "hidden" }}>
        {shot ? (
          <Img src={shot.image} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top", opacity: ramp(frame, 46, 20), filter: "saturate(0.85)" }} />
        ) : (
          <div
            style={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: lines.length <= 4 ? "center" : "flex-start",
              padding: "26px 34px",
              fontFamily: plexMono,
              // Short snippets are set large and centred so the detail reads as a close-up.
              fontSize: Math.min(fit(lines.reduce((a, l) => (l.length > a.length ? l : a), ""), 46, 980, 0.6), 520 / (Math.max(1, lines.length) * 1.65)),
              lineHeight: 1.65,
              color: INK,
            }}
          >
            {lines.map((l, i) => (
              <div key={i} style={{ display: "flex", gap: 26, opacity: ramp(frame, 50 + i * 6, 6) }}>
                <span style={{ color: ink(0.35), width: 34, textAlign: "right" }}>{i + 1}</span>
                <span style={{ whiteSpace: "pre" }}>{l}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={{ position: "absolute", left: 640, top: 870, fontFamily: sans, fontWeight: 700, fontSize: fit(heading, 46, 1120, 0.52), color: INK, opacity: ramp(frame, 70, 16) }}>
        <span style={{ color: accent, fontFamily: plexMono, fontWeight: 500, fontSize: 26, marginRight: 22 }}>A —</span>
        {heading}
      </div>
      {shot?.chips?.length ? (
        <div style={{ position: "absolute", left: 160, top: 640, display: "flex", flexDirection: "column", gap: 14 }}>
          {shot.chips.map((c, i) => (
            <Label key={c} x={0} y={0} size={20} color={INK} style={{ position: "relative", opacity: ramp(frame, 80 + i * BEAT, 10) }}>
              <span style={{ color: accent }}>{String(i + 1).padStart(2, "0")} </span>
              {c}
            </Label>
          ))}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

const Specs: React.FC<SceneProps> = ({ sb, accent }) => {
  const { frame } = useScene();
  const m = sb.meta;
  const isRepo = m?.type !== "site";
  const stat = sb.slot2.kind === "stat" ? sb.slot2 : null;
  const langs = (sb.languages ?? []).filter((l) => l.pct > 0);
  const rows: [string, string][] = isRepo
    ? [
        ["Source", m?.domain || sb.outro.url],
        ["Languages", langs.slice(0, 3).map((l) => `${l.name} ${l.pct}%`).join(" · ") || m?.language || "—"],
        ...(sb.numbers ?? []).slice(0, 2).map((n) => [n.label, `${n.value}${n.suffix}`] as [string, string]),
        ...(stat && !(sb.numbers ?? []).length ? [[stat.unit, `${stat.value}${stat.suffix}`] as [string, string]] : []),
        ["License", m?.license || "—"],
        ["Install", m?.commands?.[0] || sb.outro.command],
      ]
    : [
        ["Domain", m?.domain || sb.outro.url],
        ["Sections", (m?.headings ?? []).slice(0, 3).join(" · ") || "—"],
        ["Primary colour", sb.accent.toUpperCase()],
        ["Headline", sb.slot2.kind === "shot" ? sb.slot2.heading : sb.title.caption],
      ];
  return (
    <AbsoluteFill>
      <Label x={180} y={170} color={accent} style={{ opacity: ramp(frame, 0, 10) }}>
        fig. 2 — specifications
      </Label>
      <Svg>
        {rows.map((_, i) => (
          <Stroke key={i} d={`M 180 ${300 + (i + 1) * 92} H 1180`} k={ramp(frame, 8 + i * 10, 22, SLOW)} color={ink(0.35)} width={1} />
        ))}
        <Stroke d={`M 520 300 V ${300 + rows.length * 92}`} k={ramp(frame, 10, 30, SLOW)} color={ink(0.25)} width={1} />
      </Svg>
      {rows.map(([k, v], i) => (
        <div key={k} style={{ position: "absolute", left: 180, top: 300 + i * 92, height: 92, width: 1000, display: "flex", alignItems: "center" }}>
          <span style={{ width: 340, fontFamily: plexMono, fontSize: 20, letterSpacing: "0.16em", textTransform: "uppercase", color: ink(0.55), opacity: ramp(frame, 10 + i * 10, 10) }}>{k}</span>
          <span style={{ paddingLeft: 30, fontFamily: plexMono, fontSize: fit(v, 34, 640, 0.6), color: INK, whiteSpace: "nowrap" }}>{typed(v, frame, 18 + i * 10, 2.2)}</span>
        </div>
      ))}
      {isRepo && langs.length ? (
        <div style={{ position: "absolute", left: 1320, top: 300, width: 420 }}>
          <Label x={0} y={0} size={18} color={ink(0.55)} style={{ position: "relative" }}>
            composition by bytes
          </Label>
          <div style={{ marginTop: 26, height: 440, width: 120, border: `1.5px solid ${ink(0.6)}`, position: "relative" }}>
            {(() => {
              let y = 0;
              return langs.slice(0, 5).map((l, i) => {
                const h = Math.max(4, (l.pct / 100) * 440);
                const top = y;
                y += h;
                return (
                  <div key={l.name} style={{ position: "absolute", left: 0, right: 0, top, height: h * ramp(frame, 30 + i * 8, 20, SLOW), background: i === 0 ? accent : ink(0.18 + 0.1 * (i % 2)), borderBottom: `1px solid ${PAPER}` }}>
                    <span style={{ position: "absolute", left: 140, top: Math.max(0, h / 2 - 14), fontFamily: plexMono, fontSize: 20, color: INK, whiteSpace: "nowrap" }}>
                      {l.name} · {l.pct}%
                    </span>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      ) : !isRepo ? (
        <div style={{ position: "absolute", left: 1320, top: 330, display: "flex", flexDirection: "column", gap: 26 }}>
          <div style={{ width: 300, height: 180, background: sb.accent, border: `1.5px solid ${INK}`, scale: String(ramp(frame, 30, 20, SLOW)) }} />
          <Label x={0} y={0} size={20} color={INK} style={{ position: "relative" }}>
            {sb.accent.toUpperCase()} · brand accent
          </Label>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

const Stamp: React.FC<SceneProps> = ({ sb, accent }) => {
  const { frame, fps } = useScene();
  const isRepo = sb.meta?.type !== "site";
  const cmd = isRepo ? sb.outro.command : sb.outro.url;
  const size = fit(sb.title.title, 150, 1400, 0.66);
  const boxW = Math.min(1300, Math.max(520, cmd.length * 30 + 160));
  const stamp = spring({ frame: frame - 70, fps, config: { damping: 12, stiffness: 220 } });
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 0, right: 0, top: 230, textAlign: "center", fontFamily: sans, fontWeight: 800, fontSize: size, letterSpacing: "0.06em", textTransform: "uppercase", color: INK, opacity: ramp(frame, 0, 16) }}>
        {sb.title.title}
      </div>
      <Svg>
        <Stroke d={rectPath(960 - boxW / 2, 520, boxW, 110)} k={ramp(frame, 14, 26, SLOW)} color={INK} width={2} />
      </Svg>
      <Dimension x0={960 - boxW / 2} x1={960 + boxW / 2} y={480} k={ramp(frame, 26, 20, SLOW)} label={isRepo ? sb.outro.commandLabel || "install" : "visit"} color={accent} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 520, height: 110, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: plexMono, fontSize: fit(cmd, 46, boxW - 80, 0.6), color: INK }}>
        {isRepo ? <span style={{ color: accent, marginRight: 18 }}>$</span> : null}
        {typed(cmd, frame, 34, 1.5)}
      </div>
      {isRepo ? (
        <Label x={960} y={680} size={22} color={ink(0.6)} style={{ translate: "-50% 0", opacity: ramp(frame, 60, 12) }}>
          {sb.outro.url}
        </Label>
      ) : null}
      <div
        style={{
          position: "absolute",
          left: 1270,
          top: 740,
          padding: "16px 30px",
          border: `5px double ${accent}`,
          color: accent,
          fontFamily: plexMono,
          fontWeight: 500,
          fontSize: 40,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          rotate: "-8deg",
          opacity: frame >= 70 ? 0.92 : 0,
          scale: String(interpolate(stamp, [0, 1], [1.6, 1], clamp)),
        }}
      >
        {sb.outro.headline}
      </div>
    </AbsoluteFill>
  );
};

export const blueprint: StyleModule = {
  bg: PAPER,
  accent: (sb) => readableOn(sb.accent, true),
  Background: ({ cuts }) => <Background cuts={cuts} />,
  Overlay: ({ sb, cuts }) => <Overlay sb={sb} cuts={cuts} />,
  watermark: { color: ink(0.85), background: PAPER, font: plexMono, low: true },
  scenes: {
    "blueprint.titleblock": TitleBlock,
    "blueprint.system": System,
    "blueprint.detail": Detail,
    "blueprint.specs": Specs,
    "blueprint.stamp": Stamp,
  },
};
