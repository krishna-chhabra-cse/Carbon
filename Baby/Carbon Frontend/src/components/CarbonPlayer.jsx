// ============================================================
//  src/components/CarbonPlayer.jsx
//
//  In-App Carbon Cinema Video Player.
//  Keeps developers inside Carbon — zero external redirects.
//  Dynamic chapters & key notes tailored to each video or codebase.
// ============================================================

import { useState, useRef } from 'react';
import { 
  Sparkles, 
  X, 
  BookOpen, 
  List, 
  Compass, 
  ShieldCheck, 
  Clock 
} from 'lucide-react';

export default function CarbonPlayer({ 
  videoUrl, 
  title = "Carbon Codebase Explainer", 
  subtitle = "Synthesized Architectural Walkthrough",
  onClose,
  analysisData,
  chapters: customChapters,
  notes: customNotes
}) {
  const [activeTab, setActiveTab] = useState('chapters'); // 'chapters' | 'notes'
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);

  const containerRef = useRef(null);

  // Dynamic chapters: uses video-specific chapters if provided, else falls back to codebase analysis
  const chapters = (customChapters && customChapters.length > 0) ? customChapters : [
    {
      title: "1. Overview & Architecture",
      time: 0,
      description: analysisData?.architecture?.summary?.slice(0, 100) + "..." || "Overview of system design and primary application goals."
    },
    {
      title: "2. Tech Stack & Dependencies",
      time: 45,
      description: `Discovered core technologies: ${analysisData?.architecture?.tech_stack?.join(', ') || 'Node.js, Express, Python'}.`
    },
    {
      title: "3. Interactive System Flowchart",
      time: 90,
      description: "Visual node walkthrough of data flows and component communication."
    },
    {
      title: "4. API Endpoints & Business Logic",
      time: 135,
      description: "Deep dive into request routing, authentication guards, and database transactions."
    }
  ];

  // Dynamic key notes: uses video-specific notes if provided, else falls back to codebase analysis
  const takeaways = customNotes?.takeaways || analysisData?.architecture?.summary || "Key takeaways and insights synthesized for this topic.";
  const keyPoints = customNotes?.points || [
    "Code examples shown alongside explanations",
    "Slides that sync with the narration",
    "Interactive code playground"
  ];

  const jumpToChapter = (idx) => {
    setActiveChapterIndex(idx);
  };

  return (
    <div className="carbon-player-overlay animate-fade-in" ref={containerRef}>
      <div className="carbon-player-modal">
        
        {/* ── TOP NAV BAR ── */}
        <div className="carbon-player-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="carbon-badge-glow">
              <Sparkles size={14} /> Carbon Cinema
            </div>
            <div>
              <h2 style={{ fontSize: '16px', margin: 0, color: '#f8fafc', fontWeight: 600 }}>
                {title}
              </h2>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                {subtitle}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button 
              type="button" 
              onClick={onClose} 
              className="btn-icon" 
              title="Close Player (Esc)"
              aria-label="Close Player"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* ── MAIN CINEMA BODY ── */}
        <div className="carbon-player-content">
          
          {/* VIDEO SCREEN / EMBED CONTAINER */}
          <div className="carbon-player-viewport">
            {videoUrl ? (
              <iframe
                src={videoUrl}
                title={title}
                className="carbon-video-iframe"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            ) : (
              <div className="carbon-video-placeholder">
                <Compass className="animate-spin" size={48} color="#38bdf8" />
                <h3 style={{ marginTop: '16px', color: '#f8fafc' }}>Loading video...</h3>
                <p style={{ color: '#94a3b8', fontSize: '14px' }}>
                  Your video walkthrough will appear here with slides and narration.
                </p>
              </div>
            )}

          </div>

          {/* ── SIDEBAR: CHAPTERS & LESSON NOTES ── */}
          <div className="carbon-player-sidebar">
            <div className="sidebar-tabs">
              <button
                type="button"
                className={`sidebar-tab ${activeTab === 'chapters' ? 'active' : ''}`}
                onClick={() => setActiveTab('chapters')}
              >
                <List size={14} /> Chapters ({chapters.length})
              </button>
              <button
                type="button"
                className={`sidebar-tab ${activeTab === 'notes' ? 'active' : ''}`}
                onClick={() => setActiveTab('notes')}
              >
                <BookOpen size={14} /> AI Key Notes
              </button>
            </div>

            {/* TAB 1: CHAPTERS */}
            {activeTab === 'chapters' && (
              <div className="chapters-list">
                {chapters.map((ch, idx) => (
                  <div
                    key={idx}
                    onClick={() => jumpToChapter(idx)}
                    className={`chapter-item ${activeChapterIndex === idx ? 'active' : ''}`}
                  >
                    <div className="chapter-header">
                      <span className="chapter-title">{ch.title}</span>
                    </div>
                    <p className="chapter-desc">{ch.description}</p>
                  </div>
                ))}
              </div>
            )}

            {/* TAB 2: LESSON NOTES */}
            {activeTab === 'notes' && (
              <div className="notes-container">
                <div className="notes-card">
                  <h4><ShieldCheck size={16} color="#10b981" /> Key Takeaways</h4>
                  <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: '1.6' }}>
                    {takeaways}
                  </p>
                </div>

                <div className="notes-card" style={{ marginTop: '12px' }}>
                  <h4><Clock size={16} color="#38bdf8" /> Key Points</h4>
                  <ul style={{ paddingLeft: '18px', fontSize: '13px', color: '#94a3b8', lineHeight: '1.7' }}>
                    {keyPoints.map((point, pIdx) => (
                      <li key={pIdx}>{point}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
}
