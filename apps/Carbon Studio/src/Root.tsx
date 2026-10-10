import { Composition } from 'remotion';
import { MainVideo } from './MainVideo';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Main"
        component={MainVideo}
        durationInFrames={600} /* 20 seconds @ 30fps */
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          titleText: 'Carbon AI: Multi-Agent DevSecOps',
          titleColor: '#10B981',
        }}
      />
    </>
  );
};
