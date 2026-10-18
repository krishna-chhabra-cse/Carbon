import { evolvePath } from "@remotion/paths";
import type React from "react";
import rough from "roughjs";
import type { Drawable, Options } from "roughjs/bin/core";
import { AbsoluteFill, Img, useCurrentFrame } from "remotion";
import { BEAT, fit, readableOn, useScene } from "../engine/common";
import { caveat, jetbrains, marker } from "../engine/fonts";
import type { SceneProps, StyleModule } from "../engine/types";

// Whiteboard Explainer: the product explained like a founder at a
// whiteboard. Problem → answer → three steps → proof → try it. Every box,
// arrow and circle is a rough.js hand-drawn stroke that draws itself on, the
// lines "boil" (re-drawn every few frames like hand-made animation), and text
// is written on in marker and handwriting.

const BOARD = "#fbfbf8";
const BLACK = "#232323";
const BLUE = "#2350c7";
const RED = "#d43b33";

const gen = rough.generator();
const BOIL = 8; // frames per redraw

const Rough: React.FC<{ draw: (o: Options) => Drawable; k: number; color?: string; width?: number; seed: number }> = ({ draw, k, color = BLACK, width = 3, seed }) => {
  const frame = useCurrentFrame();
  if (k <= 0) return null;
  const shape = draw({ seed: seed * 7 + (Math.floor(frame / BOIL) % 3) + 1, roughness: 1.4, bowing: 1.2, stroke: color, strokeWidth: width });
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
      {gen.toPaths(shape).map((p, i) => (
        <path key={i} d={p.d} fill="none" stroke={p.stroke} strokeWidth={p.strokeWidth} strokeLinecap="round" {...(k < 1 ? evolvePath(k, p.d) : {})} />
      ))}
    </svg>
  );
};

// Text written on from left to right at a hand-writing pace.
const Write: React.FC<{ text: string; at: number; font?: string; size: number; color?: string; cps?: number; style?: React.CSSProperties }> = ({ text, at, font = caveat, size, color = BLACK, cps = 1.4, style }) => {
  const frame = useCurrentFrame();
  const p = Math.max(0, Math.min(1, ((frame - at) * cps) / Math.max(1, text.length)));
  return <div style={{ position: "absolute", fontFamily: font, fontWeight: font === caveat ? 700 : 400, fontSize: size, lineHeight: 1.15, color, clipPath: `inset(-20% ${(1 - p) * 100}% -20% 0)`, ...style }}>{text}</div>;
};
const writeEnd = (text: string, at: number, cps = 1.4) => at + text.length / cps;

const draw = (frame: number, at: number, len = 18) => Math.max(0, Math.min(1, (frame - at) / len));

const Background: React.FC = () => (
  <AbsoluteFill style={{ background: BOARD }}>
    {/* ghosts of old marker and the board's aluminium frame */}
    <AbsoluteFill style={{ background: "radial-gradient(ellipse 30% 12% at 70% 80%, rgba(80,90,110,0.06), transparent), radial-gradient(ellipse 25% 10% at 20% 30%, rgba(80,90,110,0.05), transparent)" }} />
    <AbsoluteFill style={{ boxShadow: "inset 0 0 0 18px #c9ccd1, inset 0 0 0 20px #a9adb4, inset 0 30px 60px rgba(0,0,0,0.05)" }} />
  </AbsoluteFill>
);

// ── Scenes ──────────────────────────────────────────────────────────────
const Problem: React.FC<SceneProps> = ({ sb }) => {
  const { frame } = useScene();
  const problem = sb.explainer?.problem || sb.title.caption;
  const detail = sb.explainer?.detail || "";
  const size = fit(problem, 96, 1500 * 1.7, 0.42);
  const pEnd = writeEnd(problem, 30, 1.6);
  return (
    <AbsoluteFill>
      <Write text="The problem" at={0} font={marker} size={64} color={RED} cps={1} style={{ left: 160, top: 130 }} />
      <Rough draw={(o) => gen.line(160, 230, 560, 236, o)} k={draw(frame, 12, 14)} color={RED} width={4} seed={1} />
      <Write text={problem} at={30} size={size} cps={1.6} style={{ left: 160, top: 330, width: 1500, whiteSpace: "normal" }} />
      <Rough draw={(o) => gen.rectangle(120, 300, 1660, size * 2.6 + 60, o)} k={draw(frame, pEnd + 4, 24)} color={BLACK} width={3} seed={2} />
      {detail ? <Write text={detail} at={pEnd + 20} size={54} color={BLUE} cps={2} style={{ left: 170, top: 400 + size * 2.6 }} /> : null}
    </AbsoluteFill>
  );
};

const Answer: React.FC<SceneProps> = ({ sb, accent }) => {
  const { frame } = useScene();
  const name = sb.title.title;
  const size = fit(name, 200, 1100, 0.62);
  const w = Math.min(1300, name.length * size * 0.62 + 200);
  const answer = sb.explainer?.answer || sb.title.caption;
  return (
    <AbsoluteFill>
      <Rough draw={(o) => gen.line(140, 360, 460, 420, o)} k={draw(frame, 0, 12)} color={BLUE} width={4} seed={3} />
      <Rough draw={(o) => gen.linearPath([[430, 390], [462, 421], [420, 438]], o)} k={draw(frame, 10, 6)} color={BLUE} width={4} seed={4} />
      <Write text={name} at={8} font={marker} size={size} color={accent} cps={0.5} style={{ left: 960 - (name.length * size * 0.62) / 2, top: 300 }} />
      <Rough draw={(o) => gen.ellipse(960, 300 + size * 0.62, w, size * 1.6, o)} k={draw(frame, 34, 26)} color={accent} width={5} seed={5} />
      <Write text={answer} at={64} size={fit(answer, 70, 1600, 0.42)} color={BLACK} cps={2} style={{ left: 0, right: 0, top: 720, textAlign: "center" }} />
    </AbsoluteFill>
  );
};

const Steps: React.FC<SceneProps> = ({ sb, accent }) => {
  const { frame } = useScene();
  const steps = (sb.explainer?.steps?.length ? sb.explainer.steps : (sb.features ?? []).slice(0, 3).map((f) => ({ title: f, detail: "" }))).slice(0, 3);
  const n = Math.max(1, steps.length);
  const bw = 470;
  const gap = (1640 - n * bw) / Math.max(1, n - 1);
  const per = Math.floor((240 - 20) / n);
  return (
    <AbsoluteFill>
      <Write text="How it works" at={0} font={marker} size={60} color={BLUE} cps={1} style={{ left: 140, top: 110 }} />
      {steps.map((s, i) => {
        const at = 20 + i * per;
        const x = 140 + i * (bw + gap);
        return (
          <div key={i}>
            <Rough draw={(o) => gen.rectangle(x, 300, bw, 420, o)} k={draw(frame, at, 20)} seed={10 + i} />
            <Rough draw={(o) => gen.circle(x + 60, 300, 76, { ...o, fill: i === 0 ? accent : undefined, fillStyle: "hachure" })} k={draw(frame, at + 8, 12)} color={i === 0 ? accent : BLACK} seed={20 + i} />
            <Write text={String(i + 1)} at={at + 14} font={marker} size={46} cps={1} style={{ left: x + 46, top: 270 }} />
            <Write text={s.title} at={at + 22} font={marker} size={fit(s.title, 52, bw - 70, 0.6)} cps={1.2} style={{ left: x + 34, top: 380, width: bw - 60, whiteSpace: "normal" }} />
            {s.detail ? <Write text={s.detail} at={at + 22 + s.title.length / 1.2} size={44} color={BLUE} cps={2.4} style={{ left: x + 34, top: 520, width: bw - 60, whiteSpace: "normal" }} /> : null}
            {i < n - 1 ? (
              <>
                <Rough draw={(o) => gen.line(x + bw + 16, 510, x + bw + gap - 16, 510, o)} k={draw(frame, at + per - 14, 10)} width={4} seed={30 + i} />
                <Rough draw={(o) => gen.linearPath([[x + bw + gap - 40, 490], [x + bw + gap - 14, 510], [x + bw + gap - 40, 530]], o)} k={draw(frame, at + per - 6, 6)} width={4} seed={40 + i} />
              </>
            ) : null}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

const Proof: React.FC<SceneProps> = ({ sb, accent }) => {
  const { frame } = useScene();
  const stat = sb.slot2.kind === "stat" ? sb.slot2 : null;
  const shot = sb.slot2.kind === "shot" ? sb.slot2 : null;
  if (stat) {
    const v = `${stat.value}${stat.suffix}`;
    const size = fit(v, 300, 1000, 0.6);
    const w = v.length * size * 0.6;
    const star = (cx: number, cy: number, r: number): [number, number][] => Array.from({ length: 10 }, (_, i) => [cx + Math.cos(-Math.PI / 2 + (i * Math.PI) / 5) * (i % 2 ? r * 0.45 : r), cy + Math.sin(-Math.PI / 2 + (i * Math.PI) / 5) * (i % 2 ? r * 0.45 : r)]);
    return (
      <AbsoluteFill>
        <Write text={v} at={0} font={marker} size={size} color={accent} cps={0.4} style={{ left: 200, top: 240 }} />
        <Rough draw={(o) => gen.line(200, 300 + size * 1.05, 220 + w, 296 + size * 1.05, o)} k={draw(frame, 24, 12)} color={BLACK} width={5} seed={50} />
        <Rough draw={(o) => gen.line(210, 322 + size * 1.05, 230 + w, 318 + size * 1.05, o)} k={draw(frame, 34, 12)} color={BLACK} width={5} seed={51} />
        <Write text={stat.unit} at={44} size={84} cps={1.4} style={{ left: 210, top: 380 + size * 1.05 }} />
        <Rough draw={(o) => gen.polygon(star(1500, 420, 170), o)} k={draw(frame, 30, 24)} color={RED} width={5} seed={52} />
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill>
      {shot ? <Img src={shot.image} style={{ position: "absolute", left: 300, top: 150, width: 1100, height: 640, objectFit: "cover", objectPosition: "top", rotate: "-1.5deg", opacity: frame >= 4 ? 1 : 0 }} /> : null}
      <Rough draw={(o) => gen.rectangle(286, 136, 1128, 668, o)} k={draw(frame, 6, 20)} width={4} seed={53} />
      {[[270, 120], [1380, 120]].map(([x, y], i) => (
        <div key={i} style={{ position: "absolute", left: x, top: y, width: 120, height: 36, background: "rgba(240,220,140,0.75)", rotate: i ? "24deg" : "-24deg", opacity: frame >= 8 ? 1 : 0 }} />
      ))}
      <Write text={shot?.heading || sb.title.caption} at={28} size={70} color={BLUE} cps={1.8} style={{ left: 300, top: 850 }} />
    </AbsoluteFill>
  );
};

const Cta: React.FC<SceneProps> = ({ sb, accent }) => {
  const { frame } = useScene();
  const isRepo = sb.meta?.type !== "site";
  const cmd = isRepo ? sb.outro.command : sb.outro.url;
  const size = fit(cmd, 64, 1300, 0.6);
  const w = Math.min(1500, cmd.length * size * 0.6 + 120);
  return (
    <AbsoluteFill>
      <Write text="Try it:" at={0} font={marker} size={90} color={RED} cps={0.6} style={{ left: 200, top: 220 }} />
      <Rough draw={(o) => gen.rectangle(200, 420, w, 150, o)} k={draw(frame, 14, 18)} width={4} seed={60} />
      <Write text={cmd} at={26} font={jetbrains} size={size} cps={1.6} style={{ left: 260, top: 420 + 75 - size * 0.6, whiteSpace: "nowrap" }} />
      <Rough draw={(o) => gen.linearPath([[250 + w, 480], [290 + w, 530], [380 + w, 400]], o)} k={draw(frame, 26 + cmd.length / 1.6, 10)} color={accent} width={7} seed={61} />
      <Write text={isRepo ? sb.outro.url : sb.outro.headline} at={60} size={64} color={BLUE} cps={2} style={{ left: 210, top: 640 }} />
      <Write text={sb.title.title} at={BEAT * 4} font={marker} size={110} color={accent} cps={0.6} style={{ right: 200, top: 760 }} />
    </AbsoluteFill>
  );
};

export const whiteboard: StyleModule = {
  bg: BOARD,
  accent: (sb) => readableOn(sb.accent, false),
  Background: () => <Background />,
  watermark: { color: BLACK, background: BOARD, font: caveat, low: true },
  scenes: {
    "wb.problem": Problem,
    "wb.answer": Answer,
    "wb.steps": Steps,
    "wb.proof": Proof,
    "wb.cta": Cta,
  },
};
