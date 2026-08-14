// ============================================================
//  src/components/HeroSection.jsx
//
//  Cinematic Space-Themed Hero for Carbon.
//  Communicates the core concept: "Lost in the Universe while learning to build".
// ============================================================

import { Sparkles, Orbit, Compass, ArrowRight, Play, Terminal, Cpu } from 'lucide-react';

export default function HeroSection({ onAnalyzeClick, onExploreClick, onSelectSample }) {
  const SAMPLE_REPOS = [
    { name: 'expressjs/express', url: 'https://github.com/expressjs/express', tag: 'Backend' },
    { name: 'fastapi/fastapi', url: 'https://github.com/fastapi/fastapi', tag: 'Python' },
    { name: 'facebook/react', url: 'https://github.com/facebook/react', tag: 'Frontend' },
    { name: 'reduxjs/redux', url: 'https://github.com/reduxjs/redux', tag: 'State' }
  ];

  return (
    <section className="hero-section animate-fade-in">
      {/* Subtle Orbital Halo Glow */}
      <div className="hero-halo-glow" />

      {/* Concept Badge */}
      <div className="hero-top-badge">
        <Sparkles size={14} className="sparkle-spin" />
        <span>Learn to build, one project at a time</span>
      </div>

      {/* Main Cinematic Title */}
      <h1 className="hero-main-title">
        EXPLORE THE <span className="cosmic-text-gradient">WORLD OF CODE</span>
      </h1>

      {/* Subtitle */}
      <p className="hero-subtitle">
        Paste any GitHub repo and let our AI break it down into visual flowcharts, interactive explanations, and video walkthroughs — so you actually understand how it works.
      </p>

      {/* Feature Badges */}
      <div className="hero-pills-row">
        <span className="cosmic-pill"><Orbit size={14} color="#38bdf8" /> AI-Powered Analysis</span>
        <span className="cosmic-pill"><Terminal size={14} color="#818cf8" /> Visual Flowcharts</span>
        <span className="cosmic-pill"><Play size={14} color="#ec4899" /> Video Walkthroughs</span>
        <span className="cosmic-pill"><Cpu size={14} color="#10b981" /> Chat With Your Code</span>
      </div>

      {/* Primary & Secondary Call to Actions */}
      <div className="hero-cta-group">
        <button 
          type="button" 
          onClick={onAnalyzeClick} 
          className="btn-primary-cosmic"
        >
          <span>Analyze a Codebase</span>
          <ArrowRight size={18} />
        </button>

        <button 
          type="button" 
          onClick={onExploreClick} 
          className="btn-secondary-cosmic"
        >
          <Compass size={18} />
          <span>Explore Videos</span>
        </button>
      </div>

      {/* Fast-Launch Sample Repository Pad */}
      <div className="hero-sample-pad">
        <span className="sample-label">Try a sample:</span>
        <div className="sample-buttons-wrapper">
          {SAMPLE_REPOS.map((sample) => (
            <button
              key={sample.name}
              type="button"
              className="sample-repo-chip"
              onClick={() => onSelectSample(sample.url)}
            >
              <span className="chip-tag">{sample.tag}</span>
              <span className="chip-name">{sample.name}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
