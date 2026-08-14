// ============================================================
//  src/components/HeroSection.jsx
//
//  Cinematic Space-Themed Hero for Carbon.
//  Enhanced with 21st.dev & Motionsites.ai interactive cues:
//  Luminous ambient spotlight, ⌘K command trigger, and magnetic hover chips.
// ============================================================

import { Sparkles, Orbit, Compass, ArrowRight, Play, Terminal, Cpu, Command } from 'lucide-react';

export default function HeroSection({ onAnalyzeClick, onExploreClick, onSelectSample, onOpenPalette }) {
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

      {/* Concept Badge & Quick Command Trigger */}
      <div className="hero-badge-cluster">
        <div className="hero-top-badge">
          <Sparkles size={14} className="sparkle-spin" />
          <span>Learn to build, one project at a time</span>
        </div>

        {onOpenPalette && (
          <button 
            type="button" 
            className="hero-cmd-shortcut-btn"
            onClick={onOpenPalette}
            title="Open Command Menu (Ctrl+K or ⌘K)"
          >
            <Command size={12} />
            <span>Press <kbd className="hero-kbd">⌘K</kbd> to search</span>
          </button>
        )}
      </div>

      {/* Main Cinematic Title */}
      <h1 className="hero-main-title">
        EXPLORE THE <span className="cosmic-text-gradient">WORLD OF CODE</span>
      </h1>

      {/* Subtitle */}
      <p className="hero-subtitle">
        Paste any GitHub repo and let our multi-agent AI break it down into visual flowcharts, interactive explanations, and video walkthroughs — so you actually understand how it works.
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
          aria-label="Analyze a Codebase"
        >
          <span>Analyze a Codebase</span>
          <ArrowRight size={18} />
        </button>

        <button 
          type="button" 
          onClick={onExploreClick} 
          className="btn-secondary-cosmic"
          aria-label="Explore Video Lessons"
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
              aria-label={`Analyze sample repository ${sample.name}`}
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
