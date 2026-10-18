import { useThree } from "@react-three/fiber";
import { ThreeCanvas } from "@remotion/three";
import type React from "react";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, Easing, interpolate } from "remotion";
import * as THREE from "three";
import { clamp, fit, readableOn, rgba, useScene } from "../engine/common";
import { jetbrains } from "../engine/fonts";
import type { SceneProps, StyleModule } from "../engine/types";
import { sans } from "../theme";

// Cinematic 3D: a premium launch film shot in a dark studio. The product's
// real screenshot (site) or real code (repo) is a glowing panel floating
// over a reflective floor; light sweeps across it, the camera dollies and
// orbits, features become lit slabs, and the name lands in wide-tracked
// type. Rendered with three.js through @remotion/three (needs WebGL).

const BG = "#030406";
const INK = "#eef1f6";
const SLOW = Easing.inOut(Easing.cubic);
const ease = (f: number, a: number, b: number) => interpolate(f, [a, b], [0, 1], { ...clamp, easing: SLOW });

// A texture from an image URL (waits for it before the frame renders).
const useImageTexture = (src: string | null) => {
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  const [handle] = useState(() => (src ? delayRender("cinema texture") : null));
  useEffect(() => {
    if (!src || handle === null) return;
    new THREE.TextureLoader().load(
      src,
      (t) => {
        t.colorSpace = THREE.SRGBColorSpace;
        setTex(t);
        continueRender(handle);
      },
      undefined,
      () => continueRender(handle),
    );
  }, [src, handle]);
  return tex;
};

// The real code drawn onto a canvas texture (fonts loaded first).
const useCodeTexture = (lines: string[], title: string, accent: string) => {
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  const [handle] = useState(() => delayRender("cinema code texture"));
  const key = lines.join("\n");
  useEffect(() => {
    if (!key) {
      continueRender(handle);
      return;
    }
    const draw = () => {
      const c = document.createElement("canvas");
      c.width = 1600;
      c.height = 1000;
      const ctx = c.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#0b0e14";
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.fillStyle = "#161b24";
        ctx.fillRect(0, 0, c.width, 80);
        ["#ff5f57", "#febc2e", "#28c840"].forEach((col, i) => {
          ctx.fillStyle = col;
          ctx.beginPath();
          ctx.arc(46 + i * 36, 40, 11, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.fillStyle = "#8a93a6";
        ctx.font = `30px ${jetbrains}`;
        ctx.fillText(title, 170, 50);
        // Short snippets are set large so they read on the panel from across the studio.
        const longest = Math.max(10, ...lines.map((l) => l.length));
        const size = Math.min(110, 1400 / (longest * 0.62), 820 / (Math.max(1, lines.length) * 1.6));
        ctx.font = `${size}px ${jetbrains}`;
        const top = 80 + Math.max(90, (920 - lines.length * size * 1.6) / 2);
        lines.forEach((l, i) => {
          ctx.fillStyle = "#4b5263";
          ctx.fillText(String(i + 1).padStart(2, " "), 50, top + i * size * 1.6);
          ctx.fillStyle = i === 0 ? accent : "#dfe5ef";
          ctx.fillText(l, 50 + size * 1.6, top + i * size * 1.6);
        });
      }
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      setTex(t);
      continueRender(handle);
    };
    document.fonts.load(`40px ${jetbrains}`).then(draw, draw);
    // `key` stands for `lines` (a new array every render).
  }, [key, title, accent, handle]); // eslint-disable-line react-hooks/exhaustive-deps
  return tex;
};

const usePanelTexture = (sb: SceneProps["sb"], accent: string) => {
  const shot = sb.slot2.kind === "shot" ? sb.slot2.image : null;
  const code = sb.slot3.kind === "code" ? sb.slot3 : null;
  const lines = useMemo(() => (code ? code.code.split("\n") : [sb.outro.command]), [code, sb.outro.command]);
  const img = useImageTexture(shot);
  const codeTex = useCodeTexture(shot ? [] : lines, code?.filename || sb.title.title, accent);
  return shot ? img : codeTex;
};

const Studio: React.FC<{ children: React.ReactNode; cam: [number, number, number]; look?: [number, number, number]; light: number; accent: string }> = ({ children, cam, look = [0, 0.4, 0], light, accent }) => {
  const { width, height } = useScene();
  return (
    <ThreeCanvas width={width} height={height} camera={{ fov: 32, position: cam }} style={{ position: "absolute", inset: 0 }}>
      <CameraRig cam={cam} look={look} />
      <color attach="background" args={[BG]} />
      <fog attach="fog" args={[BG, 10, 26]} />
      <ambientLight intensity={0.25} />
      <spotLight position={[light, 7, 6]} angle={0.45} penumbra={0.8} intensity={260} color="#ffffff" />
      <pointLight position={[-6, 2, -4]} intensity={40} color={accent} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.6, 0]}>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#0a0c10" metalness={0.85} roughness={0.32} />
      </mesh>
      {children}
    </ThreeCanvas>
  );
};

// Puts the default camera on its mark every frame, before ThreeCanvas renders
// (child layout effects run first). The Canvas `camera` prop only sets it once.
const CameraRig: React.FC<{ cam: [number, number, number]; look: [number, number, number] }> = ({ cam, look }) => {
  const camera = useThree((s) => s.camera);
  const [cx, cy, cz] = cam;
  const [lx, ly, lz] = look;
  useLayoutEffect(() => {
    camera.position.set(cx, cy, cz);
    camera.lookAt(lx, ly, lz);
    camera.updateProjectionMatrix();
  }, [camera, cx, cy, cz, lx, ly, lz]);
  return null;
};

const Panel: React.FC<{ tex: THREE.Texture | null; rotY: number; y?: number; accent: string; glow?: number }> = ({ tex, rotY, y = 0.4, accent, glow = 0.4 }) => (
  <group position={[0, y, 0]} rotation={[0, rotY, 0]}>
    <mesh>
      <boxGeometry args={[6.4, 4, 0.08]} />
      <meshStandardMaterial color="#111318" metalness={0.6} roughness={0.25} emissive={accent} emissiveIntensity={0.05} />
    </mesh>
    <mesh position={[0, 0, 0.045]}>
      <planeGeometry args={[6.2, 3.85]} />
      <meshStandardMaterial map={tex ?? undefined} color={tex ? "#ffffff" : "#222"} emissive="#ffffff" emissiveMap={tex ?? undefined} emissiveIntensity={glow} roughness={0.5} />
    </mesh>
  </group>
);

const Title: React.FC<{ text: string; k: number; size: number; top: number; color?: string; spacing?: number }> = ({ text, k, size, top, color = INK, spacing = 0.18 }) => (
  <div style={{ position: "absolute", left: 0, right: 0, top, textAlign: "center", fontFamily: sans, fontWeight: 300, fontSize: size, letterSpacing: `${spacing + 0.5 * (1 - k)}em`, color, opacity: k, textTransform: "uppercase", textShadow: "0 0 30px rgba(0,0,0,0.8)" }}>{text}</div>
);

// ── Scenes ──────────────────────────────────────────────────────────────
const Open: React.FC<SceneProps> = ({ sb, accent }) => {
  const { frame, duration } = useScene();
  const tex = usePanelTexture(sb, accent);
  const z = interpolate(frame, [0, duration], [16, 11.5], { ...clamp, easing: SLOW });
  const light = interpolate(frame, [0, duration], [-9, 7], clamp);
  return (
    <AbsoluteFill>
      <Studio cam={[0, 0.8, z]} light={light} accent={accent}>
        <Panel tex={tex} rotY={-0.35 + 0.15 * ease(frame, 0, duration)} accent={accent} glow={0.15 + 0.35 * ease(frame, 20, 120)} />
      </Studio>
      <Title text={sb.title.title} k={ease(frame, 70, 140)} size={fit(sb.title.title, 130, 1500, 0.9)} top={820} />
    </AbsoluteFill>
  );
};

const Orbit: React.FC<SceneProps> = ({ sb, accent }) => {
  const { frame, duration } = useScene();
  const tex = usePanelTexture(sb, accent);
  const a = interpolate(frame, [0, duration], [-0.7, 0.45], { ...clamp, easing: SLOW });
  const r = 11;
  const shot = sb.slot2.kind === "shot" ? sb.slot2 : null;
  const code = sb.slot3.kind === "code" ? sb.slot3 : null;
  const caption = shot?.heading || code?.heading || sb.title.caption;
  return (
    <AbsoluteFill>
      <Studio cam={[Math.sin(a) * r, 1.2, Math.cos(a) * r]} light={Math.sin(a) * 6} accent={accent}>
        <Panel tex={tex} rotY={0} y={0.4 + Math.sin(frame / 40) * 0.08} accent={accent} glow={0.45} />
      </Studio>
      <div style={{ position: "absolute", left: 140, bottom: 120, maxWidth: 900, fontFamily: sans, fontWeight: 600, fontSize: fit(caption, 60, 1700, 0.5), lineHeight: 1.15, color: INK, opacity: ease(frame, 40, 90) * (1 - ease(frame, duration - 30, duration)) }}>{caption}</div>
      <div style={{ position: "absolute", left: 140, bottom: 70, fontFamily: jetbrains, fontSize: 22, letterSpacing: "0.3em", textTransform: "uppercase", color: accent, opacity: ease(frame, 60, 100) }}>{sb.meta?.domain || sb.outro.url}</div>
    </AbsoluteFill>
  );
};

const Slab: React.FC<{ x: number; z: number; rotY: number; lit: number; accent: string }> = ({ x, z, rotY, lit, accent }) => (
  <mesh position={[x, 0.2, z]} rotation={[0, rotY, 0]}>
    <boxGeometry args={[1.6, 3.6, 0.12]} />
    <meshStandardMaterial color="#14161c" metalness={0.7} roughness={0.3} emissive={accent} emissiveIntensity={0.08 + 0.9 * lit} />
  </mesh>
);

const Array_: React.FC<SceneProps> = ({ sb, accent }) => {
  const { frame, duration } = useScene();
  const feats = (sb.features ?? []).slice(0, 5);
  const n = Math.max(1, feats.length);
  const per = (duration - 40) / n;
  const active = Math.min(n - 1, Math.floor(Math.max(0, frame - 20) / per));
  const z = interpolate(frame, [0, duration], [13, 8.5], { ...clamp, easing: SLOW });
  return (
    <AbsoluteFill>
      <Studio cam={[0, 1, z]} look={[0, 0.2, -1]} light={-5 + (10 * frame) / duration} accent={accent}>
        {feats.map((_, i) => {
          const t = n === 1 ? 0 : i / (n - 1) - 0.5;
          return <Slab key={i} x={t * 9} z={-Math.abs(t) * 3 - 1} rotY={-t * 0.9} lit={i === active ? ease(frame, 20 + i * per, 30 + i * per) : 0} accent={accent} />;
        })}
      </Studio>
      <div style={{ position: "absolute", left: 0, right: 0, top: 120, textAlign: "center", fontFamily: jetbrains, fontSize: 24, letterSpacing: "0.35em", textTransform: "uppercase", color: rgba(INK, 0.6) }}>{sb.tree.heading}</div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 150, textAlign: "center", fontFamily: sans, fontWeight: 300, fontSize: fit(feats[active] || "", 96, 1600, 0.6), letterSpacing: "0.08em", textTransform: "uppercase", color: INK, opacity: ease(frame, 24 + active * per, 34 + active * per) }}>{feats[active]}</div>
    </AbsoluteFill>
  );
};

const End: React.FC<SceneProps> = ({ sb, accent }) => {
  const { frame } = useScene();
  const isRepo = sb.meta?.type !== "site";
  const k = ease(frame, 10, 60);
  return (
    <AbsoluteFill style={{ background: BG }}>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 48%, ${rgba(accent, 0.35 * k)} 0%, transparent 45%)` }} />
      <Title text={sb.title.title} k={k} size={fit(sb.title.title, 170, 1600, 0.9)} top={360} spacing={0.22} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 620, textAlign: "center", fontFamily: jetbrains, fontSize: 34, color: INK, opacity: ease(frame, 50, 80) }}>
        {isRepo ? <span style={{ color: accent }}>$ </span> : null}
        {isRepo ? sb.outro.command : sb.outro.url}
      </div>
      {isRepo ? <div style={{ position: "absolute", left: 0, right: 0, top: 690, textAlign: "center", fontFamily: jetbrains, fontSize: 22, letterSpacing: "0.3em", textTransform: "uppercase", color: rgba(INK, 0.55), opacity: ease(frame, 70, 100) }}>{sb.outro.url}</div> : null}
    </AbsoluteFill>
  );
};

export const cinema: StyleModule = {
  bg: BG,
  accent: (sb) => readableOn(sb.accent, true),
  watermark: { color: INK, background: BG, font: jetbrains },
  scenes: {
    "cinema.open": Open,
    "cinema.orbit": Orbit,
    "cinema.array": Array_,
    "cinema.end": End,
  },
};
