import type React from "react";
import { AbsoluteFill, Easing, interpolate } from "remotion";
import { clamp, mixHex, readableOn, rgba, useScene } from "../engine/common";
import { jetbrains } from "../engine/fonts";
import type { SceneProps, StyleModule } from "../engine/types";

// Shell Session: a developer-tool film shot as one continuous terminal take.
// Each scene types the next real command into the same window, so the cuts
// are invisible: clone the repo, read the real README headings, print the
// real snippet with syntax colour, open a pane with the real GitHub numbers,
// then install. Nothing on screen is output we can't stand behind: only the
// repo's own text, its numbers, and git's own clone line.

const WALL = "#07080c";
const TERM = "#0d1017";
const FG = "#d7dce5";
const DIM = "#6b7385";
const GREEN = "#7ee787";
const STR = "#a5d6ff";
const KEY = "#ff7b72";
const NUM = "#79c0ff";
const LINE_H = 44;
const ROWS = 17;

type Line = { kind: "cmd" | "out" | "code" | "comment" | "blank"; text: string };
type Block = { scene: string; cmd: string; out: Line[] };

const ownerName = (sb: SceneProps["sb"]) => (sb.meta?.domain || sb.outro.url).replace(/^github\.com\//, "");

// The whole session, built only from the storyboard's facts.
const session = (sb: SceneProps["sb"]): Block[] => {
  const repo = ownerName(sb);
  const name = sb.title.title;
  const code = sb.slot3.kind === "code" ? sb.slot3 : null;
  const headings = (sb.meta?.headings ?? []).slice(0, 4);
  return [
    { scene: "shell.clone", cmd: `git clone https://github.com/${repo}`, out: [{ kind: "out", text: `Cloning into '${name}'...` }] },
    {
      scene: "shell.readme",
      cmd: "head README.md",
      out: [{ kind: "out", text: `# ${name}` }, { kind: "blank", text: "" }, { kind: "out", text: sb.title.caption }, ...headings.map((h) => ({ kind: "out" as const, text: `## ${h}` }))],
    },
    { scene: "shell.code", cmd: `cat ${code?.filename || "example"}`, out: (code?.code || sb.outro.command).split("\n").map((l) => ({ kind: "code" as const, text: l })) },
    { scene: "shell.stats", cmd: "", out: [] },
    { scene: "shell.install", cmd: sb.outro.command, out: [{ kind: "comment", text: `# ${sb.title.caption}` }] },
  ];
};

const TOKENS = /(#.*$|\/\/.*$)|("[^"]*"|'[^']*'|`[^`]*`)|\b(import|from|export|const|let|var|function|return|await|async|def|class|if|else|for|in|new|package|func|fn|use|pub|struct|impl|type|interface|go|sudo|npm|npx|pip|cargo|brew)\b|\b(\d+(?:\.\d+)?)\b/gm;
const Code: React.FC<{ text: string }> = ({ text }) => {
  const parts: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  TOKENS.lastIndex = 0;
  while ((m = TOKENS.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const color = m[1] ? DIM : m[2] ? STR : m[3] ? KEY : NUM;
    parts.push(
      <span key={m.index} style={{ color }}>
        {m[0]}
      </span>,
    );
    last = m.index + m[0].length;
  }
  parts.push(text.slice(last));
  return <>{parts}</>;
};

const Prompt: React.FC<{ dir: string; accent: string }> = ({ dir, accent }) => (
  <>
    <span style={{ color: accent }}>➜ </span>
    <span style={{ color: NUM }}>{dir}</span>
    <span style={{ color: DIM }}> $ </span>
  </>
);

const Row: React.FC<{ line: Line; dir: string; accent: string }> = ({ line, dir, accent }) => (
  <div style={{ height: LINE_H, whiteSpace: "pre", overflow: "hidden" }}>
    {line.kind === "cmd" ? (
      <>
        <Prompt dir={dir} accent={accent} />
        {line.text}
      </>
    ) : line.kind === "code" ? (
      <Code text={line.text} />
    ) : line.kind === "comment" ? (
      <span style={{ color: DIM }}>{line.text}</span>
    ) : (
      <span style={{ color: line.text.startsWith("#") ? FG : mixHex(FG, 0, 0.15) }}>{line.text}</span>
    )}
  </div>
);

// The window, showing everything printed so far plus this scene's typing.
const Terminal: React.FC<SceneProps & { pane?: React.ReactNode; width?: number }> = ({ sb, accent, index, pane, width = 1640 }) => {
  const { frame } = useScene();
  const byScene = Object.fromEntries(session(sb).map((b) => [b.scene, b]));
  // Follow the actual plan (the 15 s cut skips some commands).
  const planned = (sb.direction?.scenes ?? []).map((s) => byScene[s.scene]);
  const name = sb.title.title;
  const isClone = (b?: Block) => b?.scene === "shell.clone";
  const dirOf = (b?: Block) => (isClone(b) ? "~" : `~/${name}`);
  const history: { line: Line; dir: string }[] = [];
  planned.slice(0, index).forEach((b) => {
    if (!b) return;
    if (b.cmd) history.push({ line: { kind: "cmd", text: b.cmd }, dir: dirOf(b) });
    b.out.forEach((l) => history.push({ line: l, dir: dirOf(b) }));
    if (isClone(b)) history.push({ line: { kind: "cmd", text: `cd ${name}` }, dir: "~" });
  });
  const me = planned[index];
  const dirFor = () => dirOf(me);
  const typeAt = 10;
  const cps = 1.3;
  const typedLen = Math.max(0, Math.floor((frame - typeAt) * cps));
  const typedDone = typeAt + (me?.cmd.length ?? 0) / cps;
  const live: { line: Line; dir: string }[] = [];
  if (me?.cmd) live.push({ line: { kind: "cmd", text: me.cmd.slice(0, typedLen) }, dir: dirFor() });
  const shownOut = me ? me.out.filter((_, i) => frame >= typedDone + 6 + i * 3) : [];
  shownOut.forEach((l) => live.push({ line: l, dir: dirFor() }));
  if (isClone(me) && frame >= typedDone + 40) live.push({ line: { kind: "cmd", text: `cd ${name}`.slice(0, Math.max(0, Math.floor((frame - typedDone - 40) * cps))) }, dir: "~" });
  const all = [...history, ...live];
  const visible = all.slice(-ROWS);
  const cursorOn = Math.floor(frame / 15) % 2 === 0;
  const atPrompt = !me?.cmd || (frame >= typedDone + 6 + (me?.out.length ?? 0) * 3 && !isClone(me));
  return (
    <div style={{ position: "absolute", left: 140, top: 90, width, height: 900, borderRadius: 16, overflow: "hidden", background: TERM, boxShadow: `0 50px 140px rgba(0,0,0,0.6), 0 0 0 1px ${rgba(FG, 0.08)}` }}>
      <div style={{ height: 54, display: "flex", alignItems: "center", gap: 10, padding: "0 22px", background: "#161a22", fontFamily: jetbrains, fontSize: 20, color: DIM }}>
        {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
          <span key={c} style={{ width: 14, height: 14, borderRadius: 7, background: c }} />
        ))}
        <span style={{ marginLeft: 20 }}>{ownerName(sb)} — zsh</span>
      </div>
      <div style={{ display: "flex", height: 846 }}>
        <div style={{ flex: 1, padding: "26px 34px", fontFamily: jetbrains, fontSize: 28, lineHeight: `${LINE_H}px`, color: FG }}>
          {visible.map((v, i) => (
            <Row key={i} line={v.line} dir={v.dir} accent={accent} />
          ))}
          {atPrompt ? (
            <div style={{ height: LINE_H }}>
              <Prompt dir={`~/${name}`} accent={accent} />
              <span style={{ display: "inline-block", width: 16, height: 30, verticalAlign: "middle", background: cursorOn ? FG : "transparent" }} />
            </div>
          ) : null}
        </div>
        {pane}
      </div>
    </div>
  );
};

const Wallpaper: React.FC<{ accent: string }> = ({ accent }) => <AbsoluteFill style={{ background: `radial-gradient(ellipse at 20% 0%, ${rgba(accent, 0.28)} 0%, transparent 55%), radial-gradient(ellipse at 100% 100%, ${rgba(accent, 0.16)} 0%, transparent 50%), ${WALL}` }} />;

// ── Scenes (one window, so the cuts don't show) ─────────────────────────
const Plain: React.FC<SceneProps> = (p) => <Terminal {...p} />;

// A tmux-style pane with the repo's real numbers opens beside the shell.
const Stats: React.FC<SceneProps> = (p) => {
  const { frame } = useScene();
  const { sb, accent } = p;
  const open = interpolate(frame, [4, 24], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const rows: [string, string][] = [
    ...(sb.numbers ?? []).slice(0, 3).map((n) => [n.label, `${n.value}${n.suffix}`] as [string, string]),
    ["language", (sb.languages ?? []).slice(0, 2).map((l) => `${l.name} ${l.pct}%`).join(", ") || sb.meta?.language || "—"],
    ["license", sb.meta?.license || "—"],
  ];
  const pane = (
    <div style={{ width: 620 * open, borderLeft: `2px solid ${accent}`, padding: open > 0.9 ? "26px 30px" : 0, overflow: "hidden", fontFamily: jetbrains, fontSize: 26, lineHeight: "44px", color: FG, whiteSpace: "nowrap" }}>
      <div style={{ color: accent }}>┌─ {ownerName(sb)}</div>
      {rows.map(([k, v], i) => (
        <div key={k} style={{ opacity: frame >= 26 + i * 6 ? 1 : 0 }}>
          <span style={{ color: DIM }}>│ {k.padEnd(13, " ")}</span>
          <span style={{ color: i === 0 ? GREEN : FG }}>{v}</span>
        </div>
      ))}
      <div style={{ color: accent }}>└─ via GitHub API</div>
    </div>
  );
  return <Terminal {...p} pane={pane} />;
};

const Install: React.FC<SceneProps> = (p) => {
  const { frame, duration } = useScene();
  const { sb, accent } = p;
  const pull = interpolate(frame, [duration - 70, duration - 30], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ scale: String(1 - 0.18 * pull), translate: `0px ${-110 * pull}px` }}>
        <Terminal {...p} />
      </AbsoluteFill>
      <div style={{ position: "absolute", left: 0, right: 0, top: 900, textAlign: "center", fontFamily: jetbrains, fontWeight: 700, fontSize: 64, color: "#ffffff", opacity: pull }}>
        {sb.title.title} <span style={{ color: accent, fontWeight: 400, fontSize: 40 }}>· {sb.outro.url}</span>
      </div>
    </AbsoluteFill>
  );
};

export const shell: StyleModule = {
  bg: WALL,
  accent: (sb) => readableOn(sb.accent, true),
  Background: ({ accent }) => <Wallpaper accent={accent} />,
  watermark: { color: FG, background: TERM, font: jetbrains },
  scenes: {
    "shell.clone": Plain,
    "shell.readme": Plain,
    "shell.code": Plain,
    "shell.stats": Stats,
    "shell.install": Install,
  },
};
