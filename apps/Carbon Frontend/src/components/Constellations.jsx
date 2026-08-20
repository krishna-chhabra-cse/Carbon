// ============================================================
//  src/components/Constellations.jsx
//
//  Course & module library for Carbon.
//  Each lesson links to a real embeddable YouTube video.
//  Includes random space facts for a fun learning vibe.
// ============================================================

import { useState, useEffect } from 'react';
import { 
  Orbit, 
  Compass, 
  Sparkles, 
  Play, 
  Clock, 
  CheckCircle2, 
  Layers, 
  Rocket,
  Star,
  Users,
  BookOpen
} from 'lucide-react';

const SPACE_FACTS = [
  "💫 A neutron star is so dense that a teaspoon of it would weigh about 6 billion tons.",
  "🪐 Saturn's rings are made mostly of ice particles, with some rocky debris and dust.",
  "🌍 Earth's core is as hot as the surface of the Sun — about 5,500°C.",
  "🚀 Light from the Sun takes about 8 minutes and 20 seconds to reach Earth.",
  "🌌 There are more stars in the universe than grains of sand on all of Earth's beaches.",
  "☀️ The Sun makes up 99.86% of all mass in our solar system.",
  "🔭 The Hubble Space Telescope has made over 1.5 million observations since 1990.",
  "🌙 The Moon is drifting away from Earth at about 3.8 centimeters per year.",
  "⭐ Betelgeuse, a red supergiant star, is so large it could swallow our entire solar system.",
  "🛸 Voyager 1, launched in 1977, is the farthest human-made object from Earth.",
  "🌊 Europa, Jupiter's moon, may have more water than all of Earth's oceans combined.",
  "💎 It rains diamonds on Neptune and Uranus due to extreme atmospheric pressure.",
  "🔥 Venus is the hottest planet in our solar system, even though Mercury is closer to the Sun.",
  "🧊 The coldest known place in the universe is the Boomerang Nebula at -272°C.",
  "📡 The first radio signal sent to space was in 1974 from the Arecibo Observatory.",
  "🌀 A day on Venus is longer than a year on Venus — it takes 243 Earth days to rotate.",
  "🪨 The largest known asteroid, Ceres, is about 940 km in diameter.",
  "🛰️ The ISS orbits Earth roughly every 90 minutes, seeing 16 sunrises per day.",
  "✨ When you look at the night sky, you're seeing stars as they were years or centuries ago.",
  "🌈 Sunsets on Mars appear blue because of fine dust particles in the Martian atmosphere."
];

export const STAR_PATHS = [
  {
    id: 'hyperion',
    systemName: 'Hyperion Core',
    type: 'Distributed Systems & Microservices',
    planetColor: '#38bdf8',
    glowColor: 'rgba(56, 189, 248, 0.25)',
    summary: 'Learn how to build large-scale apps with multiple services that communicate reliably, even under heavy load.',
    flightTime: '4.5 hours',
    level: 'Advanced',
    learners: '2.4k',
    nodes: [
      { id: 'h1', title: '01. Service Meshes & RPC Boundaries', duration: '22 min', completed: true, videoUrl: 'https://www.youtube.com/embed/rv4LlmLmVWk' },
      { id: 'h2', title: '02. Event Sourcing & CQRS Streams', duration: '34 min', completed: true, videoUrl: 'https://www.youtube.com/embed/STKCRSUsyP0' },
      { id: 'h3', title: '03. Zero-Downtime Deployments', duration: '28 min', completed: false, videoUrl: 'https://www.youtube.com/embed/AWVTKBUnoIg' },
      { id: 'h4', title: '04. High-Throughput Data Pipelines', duration: '45 min', completed: false, videoUrl: 'https://www.youtube.com/embed/xmYekD6-PZ8' }
    ]
  },
  {
    id: 'nebula9',
    systemName: 'Nebula-9',
    type: 'Agentic AI & Graph Intelligence',
    planetColor: '#a855f7',
    glowColor: 'rgba(168, 85, 247, 0.25)',
    summary: 'Build AI agents that can reason, use tools, and work together to solve complex problems automatically.',
    flightTime: '3.8 hours',
    level: 'Advanced',
    learners: '3.1k',
    nodes: [
      { id: 'n1', title: '01. Multi-Agent StateGraph Topologies', duration: '18 min', completed: true, videoUrl: 'https://www.youtube.com/embed/PqS1kib7RTw' },
      { id: 'n2', title: '02. Context Windows & Token Budgets', duration: '26 min', completed: false, videoUrl: 'https://www.youtube.com/embed/ySus5ZS0b94' },
      { id: 'n3', title: '03. MCP Protocol & Tool Integrations', duration: '31 min', completed: false, videoUrl: 'https://www.youtube.com/embed/kQmXtrmQ5Zg' },
      { id: 'n4', title: '04. Error Recovery & Self-Healing Loops', duration: '24 min', completed: false, videoUrl: 'https://www.youtube.com/embed/jq1JsMGTr9c' }
    ]
  },
  {
    id: 'helios',
    systemName: 'Helios Prime',
    type: 'Modern Reactive Web Architecture',
    planetColor: '#10b981',
    glowColor: 'rgba(16, 185, 129, 0.25)',
    summary: 'Create fast, smooth web interfaces with modern React patterns, animations, and offline-ready features.',
    flightTime: '5.2 hours',
    level: 'Beginner-Friendly',
    learners: '5.7k',
    nodes: [
      { id: 'he1', title: '01. Concurrent Rendering & Suspense', duration: '20 min', completed: true, videoUrl: 'https://www.youtube.com/embed/pj5N-Khihgc' },
      { id: 'he2', title: '02. Canvas & WebGL Performance', duration: '40 min', completed: true, videoUrl: 'https://www.youtube.com/embed/Mus_vwhTCq0' },
      { id: 'he3', title: '03. Offline-First State Sync', duration: '35 min', completed: false, videoUrl: 'https://www.youtube.com/embed/NNnIGh9g6fA' },
      { id: 'he4', title: '04. Micro-Interaction Design Tokens', duration: '19 min', completed: false, videoUrl: 'https://www.youtube.com/embed/0gNadqOjHKI' }
    ]
  },
  {
    id: 'andromeda',
    systemName: 'Andromeda Deep',
    type: 'Container Orchestration & DevOps',
    planetColor: '#f43f5e',
    glowColor: 'rgba(244, 63, 94, 0.25)',
    summary: 'Package and deploy apps with Docker, set up CI/CD pipelines, and manage cloud infrastructure securely.',
    flightTime: '3 hours',
    level: 'Intermediate',
    learners: '1.9k',
    nodes: [
      { id: 'a1', title: '01. Multi-Stage Docker Builds', duration: '15 min', completed: true, videoUrl: 'https://www.youtube.com/embed/PrusdhS2lmo' },
      { id: 'a2', title: '02. Docker Compose & Healthchecks', duration: '22 min', completed: false, videoUrl: 'https://www.youtube.com/embed/SXwC9fSwct8' },
      { id: 'a3', title: '03. Reverse Proxy & Rate Limiting', duration: '30 min', completed: false, videoUrl: 'https://www.youtube.com/embed/C6Il58yQi1g' },
      { id: 'a4', title: '04. CI/CD Packaging Pipelines', duration: '25 min', completed: false, videoUrl: 'https://www.youtube.com/embed/R8_veQiYBjI' }
    ]
  }
];

export default function Constellations({ onLaunchLesson }) {
  const [selectedSystem, setSelectedSystem] = useState(STAR_PATHS[0]);
  const [spaceFact, setSpaceFact] = useState('');

  // Pick a random space fact on mount and rotate every 15 seconds
  useEffect(() => {
    const pick = () => setSpaceFact(SPACE_FACTS[Math.floor(Math.random() * SPACE_FACTS.length)]);
    pick();
    const interval = setInterval(pick, 15000);
    return () => clearInterval(interval);
  }, []);

  // Find the first incomplete lesson for "Start Next Lesson"
  const getNextLesson = (sys) => {
    const next = sys.nodes.find(n => !n.completed);
    return next || sys.nodes[0];
  };

  return (
    <div className="constellations-view animate-fade-in">
      {/* Header */}
      <div className="section-header-cosmic">
        <div className="header-badge">
          <Orbit size={14} color="#38bdf8" />
          <span>Learning Paths</span>
        </div>
        <h2>BROWSE COURSES</h2>
        <p>
          Pick a learning track that matches your goals. Each course is broken into focused lessons with hands-on video walkthroughs.
        </p>
      </div>

      {/* Random Space Fact Banner */}
      <div className="space-fact-banner">
        <Star size={16} className="fact-star-icon" />
        <span className="fact-text">{spaceFact}</span>
      </div>

      {/* Systems Grid */}
      <div className="systems-grid">
        {STAR_PATHS.map((sys) => {
          const isSelected = selectedSystem.id === sys.id;
          const completedCount = sys.nodes.filter(n => n.completed).length;
          const progressPercent = Math.round((completedCount / sys.nodes.length) * 100);

          return (
            <div 
              key={sys.id} 
              className={`system-card ${isSelected ? 'selected' : ''}`}
              onClick={() => setSelectedSystem(sys)}
              style={{ '--planet-glow': sys.glowColor, '--planet-color': sys.planetColor }}
            >
              {/* Planetary Visual Mark */}
              <div className="planet-avatar-container">
                <div className="planet-sphere" style={{ background: `radial-gradient(circle at 30% 30%, ${sys.planetColor}, #05070f)` }}>
                  <div className="planet-orbit-ring" />
                </div>
                <div className="planet-level-badge">{sys.level}</div>
              </div>

              <div className="system-info">
                <span className="system-type-label">{sys.type}</span>
                <h3 className="system-title">{sys.systemName}</h3>
                <p className="system-desc">{sys.summary}</p>
                
                <div className="system-meta-row">
                  <span className="meta-pill"><Clock size={12} /> {sys.flightTime}</span>
                  <span className="meta-pill"><Layers size={12} /> {sys.nodes.length} Lessons</span>
                  <span className="meta-pill"><Users size={12} /> {sys.learners} learners</span>
                </div>

                {/* Progress Bar */}
                <div className="system-progress-container">
                  <div className="progress-labels">
                    <span>Progress</span>
                    <span>{completedCount}/{sys.nodes.length} done</span>
                  </div>
                  <div className="progress-track">
                    <div 
                      className="progress-fill-bar" 
                      style={{ width: `${progressPercent}%`, backgroundColor: sys.planetColor }} 
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Active System Lesson Explorer */}
      {selectedSystem && (
        <div className="orbital-nodes-panel glass-panel animate-fade-in">
          <div className="orbital-header">
            <div>
              <span className="active-sys-badge" style={{ color: selectedSystem.planetColor }}>
                Currently viewing: {selectedSystem.systemName}
              </span>
              <h3 style={{ margin: '6px 0 0', fontSize: '20px', color: '#f8fafc' }}>
                Lessons & Modules
              </h3>
            </div>
            <button
              type="button"
              className="btn-primary-cosmic"
              style={{ padding: '10px 20px', fontSize: '13px' }}
              onClick={() => {
                const next = getNextLesson(selectedSystem);
                onLaunchLesson({
                  title: `${selectedSystem.systemName} • ${next.title}`,
                  subtitle: selectedSystem.type,
                  videoUrl: next.videoUrl
                });
              }}
            >
              <Rocket size={16} />
              <span>Start Next Lesson</span>
            </button>
          </div>

          <div className="nodes-list">
            {selectedSystem.nodes.map((node, index) => (
              <div key={node.id} className="node-card-row">
                <div className="node-index-badge" style={{ borderColor: selectedSystem.planetColor }}>
                  {index + 1}
                </div>
                
                <div style={{ flex: 1 }}>
                  <h4 className="node-title">{node.title}</h4>
                  <div className="node-meta-line">
                    <span className="node-duration"><Clock size={12} /> {node.duration}</span>
                    <span className="node-type-tag"><BookOpen size={12} /> Video Lesson</span>
                  </div>
                </div>

                <div className="node-action-group">
                  {node.completed ? (
                    <div className="node-completed-group">
                      <span className="node-status-completed">
                        <CheckCircle2 size={16} color="#10b981" /> Completed
                      </span>
                      <button
                        type="button"
                        className="btn-node-rewatch"
                        onClick={() => onLaunchLesson({
                          title: `${selectedSystem.systemName} • ${node.title}`,
                          subtitle: selectedSystem.type,
                          videoUrl: node.videoUrl
                        })}
                      >
                        Rewatch
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="btn-node-launch"
                      onClick={() => onLaunchLesson({
                        title: `${selectedSystem.systemName} • ${node.title}`,
                        subtitle: selectedSystem.type,
                        videoUrl: node.videoUrl
                      })}
                    >
                      <Play size={14} /> Watch Lesson
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Course-specific space fact at bottom */}
          <div className="lesson-panel-fact">
            <Sparkles size={14} color="#fbbf24" />
            <span>{spaceFact}</span>
          </div>
        </div>
      )}
    </div>
  );
}
