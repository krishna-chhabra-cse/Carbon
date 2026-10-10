import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig, Video, Sequence, staticFile } from 'remotion';

export const MainVideo: React.FC<{ titleText: string; titleColor: string }> = ({ titleText, titleColor }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Cinematic 2.5D Camera movement on the recorded video
  const scale = spring({
    frame: frame - 30,
    fps,
    config: { damping: 14, mass: 0.5 },
    from: 1.1, // Start slightly zoomed in
    to: 1.0, // Zoom out to show full product
  });

  const translateY = spring({
    frame: frame - 30,
    fps,
    config: { damping: 14, mass: 0.5 },
    from: 50,
    to: 0,
  });

  const opacity = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: '#0d1117' }}>
      
      {/* 0:00-0:10: HOOK - Title Sequence */}
      <Sequence from={0} durationInFrames={90}>
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', opacity: interpolate(frame, [60, 90], [1, 0]) }}>
          <h1 style={{ 
            color: titleColor, 
            fontSize: 80, 
            fontFamily: 'system-ui',
            transform: `scale(${spring({ frame, fps, config: { damping: 12 }, from: 0.8, to: 1 })})`
          }}>
            {titleText}
          </h1>
          <h3 style={{ color: '#8b949e', fontSize: 32, marginTop: 20, fontFamily: 'system-ui' }}>
            Security flaws, found before they ship.
          </h3>
        </AbsoluteFill>
      </Sequence>

      {/* 0:03-End: REAL PRODUCT UI Recording composited in 2.5D space */}
      <Sequence from={90}>
        <AbsoluteFill style={{ opacity, transform: `scale(${scale}) translateY(${translateY}px)` }}>
          <div style={{
            position: 'absolute',
            top: '10%',
            left: '10%',
            width: '80%',
            height: '80%',
            borderRadius: 24,
            overflow: 'hidden',
            boxShadow: '0 40px 100px rgba(16, 185, 129, 0.2)',
            border: '2px solid #30363d'
          }}>
            {/* The actual Playwright recording injected here */}
            <Video src={staticFile('recordings/record-ui-record-cinematic-product-workflow/video.webm')} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
          </div>
        </AbsoluteFill>
      </Sequence>

    </AbsoluteFill>
  );
};
