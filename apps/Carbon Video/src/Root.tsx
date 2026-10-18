import { Composition } from "remotion";
import { framesFor, LAUNCH_FRAMES, LaunchVideo, SAMPLE } from "./LaunchVideo";

// Length comes from the storyboard: 30 s (900 frames) or the 15 s cut.
export const RemotionRoot: React.FC = () => (
  <Composition
    id="LaunchVideo"
    component={LaunchVideo}
    durationInFrames={LAUNCH_FRAMES}
    fps={30}
    width={1920}
    height={1080}
    defaultProps={SAMPLE}
    calculateMetadata={({ props }) => ({ durationInFrames: framesFor(props.length) })}
  />
);
