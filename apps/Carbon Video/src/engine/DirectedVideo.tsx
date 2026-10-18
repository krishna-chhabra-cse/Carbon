import { linearTiming, type TransitionPresentation, TransitionSeries } from "@remotion/transitions";
import { clockWipe } from "@remotion/transitions/clock-wipe";
import { fade } from "@remotion/transitions/fade";
import { flip } from "@remotion/transitions/flip";
import { iris } from "@remotion/transitions/iris";
import { pushCut } from "@remotion/transitions/push-cut";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import type { Storyboard } from "../LaunchVideo";
import { STYLE_MODULES } from "../styles/modules";
import { directedStyle } from "../styles/registry";
import { Soundtrack, Watermark } from "./common";
import type { TransitionKind } from "./types";

// Plays a directed style: the scene list the backend copied from the
// catalog, each scene drawn by the style's own component. Cuts land exactly on
// the catalog's frame marks: a transition runs *after* the mark, over the
// first frames of the incoming scene, so the outgoing scene is lengthened by
// the transition and the total still equals the sum of the scene frames.

// Every presentation is used through the same untyped slot of TransitionSeries.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPresentation = TransitionPresentation<any>;

const presentation = (kind: TransitionKind, width: number, height: number, flash: string): AnyPresentation | null => {
  switch (kind) {
    case "fade":
      return fade();
    case "slide":
      return slide({ direction: "from-right" });
    case "wipe":
      return wipe({ direction: "from-left" });
    case "flip":
      return flip();
    case "clockWipe":
      return clockWipe({ width, height });
    case "iris":
      return iris({ width, height });
    case "pushCut":
      return pushCut({ flashColor: flash });
    default:
      return null;
  }
};

export const DirectedVideo: React.FC<{ sb: Storyboard }> = ({ sb }) => {
  const { width, height } = useVideoConfig();
  const d = sb.direction;
  if (!d) throw new Error("DirectedVideo needs storyboard.direction");
  // Unknown or classic ids are an error, never a silent fallback to another look.
  directedStyle(d.style);
  const mod = STYLE_MODULES[d.style];
  if (!mod) throw new Error(`Style "${d.style}" is in the catalog but has no renderer`);
  const accent = mod.accent(sb);
  const scenes = d.scenes.map((s) => {
    const Comp = mod.scenes[s.scene];
    if (!Comp) throw new Error(`Style "${d.style}" has no scene "${s.scene}"`);
    return { ...s, Comp };
  });
  const kind = d.transition?.kind ?? "none";
  const T = kind === "none" ? 0 : Math.max(0, d.transition?.frames ?? 0);
  let t = 0;
  const starts = scenes.map((s) => ((t += s.frames), t - s.frames));
  const cuts = starts.slice(1);

  return (
    <AbsoluteFill style={{ backgroundColor: mod.bg }}>
      <Soundtrack music={sb.music ?? "hud"} short={sb.length === 15} />
      {mod.Background ? <mod.Background sb={sb} accent={accent} cuts={cuts} /> : null}
      <TransitionSeries>
        {scenes.map((s, i) => {
          const last = i === scenes.length - 1;
          const pres = !last && T ? presentation(kind, width, height, accent) : null;
          return (
            <React.Fragment key={i}>
              <TransitionSeries.Sequence name={s.scene} durationInFrames={s.frames + (pres ? T : 0)}>
                <s.Comp sb={sb} accent={accent} index={i} total={scenes.length} start={starts[i]} params={s.params ?? {}} />
              </TransitionSeries.Sequence>
              {pres ? <TransitionSeries.Transition presentation={pres} timing={linearTiming({ durationInFrames: T })} /> : null}
            </React.Fragment>
          );
        })}
      </TransitionSeries>
      {mod.Overlay ? <mod.Overlay sb={sb} accent={accent} cuts={cuts} /> : null}
      {sb.watermark ? <Watermark {...mod.watermark} /> : null}
    </AbsoluteFill>
  );
};
