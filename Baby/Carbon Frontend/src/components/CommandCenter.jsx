// ============================================================
//  src/components/CommandCenter.jsx
//
//  Personal Command Center Dashboard for Carbon developers.
//  Features: orbital metrics, active quests, recent missions,
//  and 1-click in-app lesson resume.
// ============================================================

import { 
  Cpu, 
  Orbit, 
  Flame, 
  CheckCircle2, 
  Play, 
  Award, 
  Terminal, 
  Layers, 
  ArrowUpRight, 
  Sparkles,
  Compass
} from 'lucide-react';

export default function CommandCenter({ onLaunchLesson, onSelectSample }) {
  const STATS = [
    { label: 'Projects Analyzed', value: '24', icon: Terminal, color: '#38bdf8' },
    { label: 'Courses Started', value: '4 / 6', icon: Orbit, color: '#a855f7' },
    { label: 'Day Streak', value: '12 Days', icon: Flame, color: '#f43f5e' },
    { label: 'Hours Watched', value: '18.4h', icon: Play, color: '#10b981' }
  ];

  const RECENT_MISSIONS = [
    { name: 'expressjs/express', type: 'Backend Architecture', time: '2 hours ago', status: 'Analyzed' },
    { name: 'fastapi/fastapi', type: 'Python Async Framework', time: '1 day ago', status: 'Analyzed' },
    { name: 'facebook/react', type: 'Concurrent UI Engine', time: '3 days ago', status: 'Analyzed' }
  ];

  const ACHIEVEMENTS = [
    { title: 'Architecture Pro', desc: 'Generated 20+ architectural flowcharts', icon: Award, unlocked: true },
    { title: 'AI Explorer', desc: 'Ran 50+ AI analysis sessions', icon: Sparkles, unlocked: true },
    { title: 'Video Learner', desc: 'Watched 10+ hours of video walkthroughs', icon: Play, unlocked: false }
  ];

  return (
    <div className="command-center-view animate-fade-in">
      {/* Header */}
      <div className="section-header-cosmic">
        <div className="header-badge">
          <Cpu size={14} color="#10b981" />
          <span>Your Dashboard</span>
        </div>
        <h2>YOUR DASHBOARD</h2>
        <p>
          Track your learning progress, streaks, achievements, and recent activity — all in one place.
        </p>
      </div>

      {/* Metrics Row */}
      <div className="metrics-grid">
        {STATS.map((st) => {
          const Icon = st.icon;
          return (
            <div key={st.label} className="metric-card glass-panel">
              <div className="metric-icon-circle" style={{ color: st.color, backgroundColor: `${st.color}15`, borderColor: `${st.color}40` }}>
                <Icon size={20} />
              </div>
              <div className="metric-info">
                <span className="metric-value">{st.value}</span>
                <span className="metric-label">{st.label}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Grid: Continue Mission + Quests */}
      <div className="command-main-grid">
        
        {/* Continue Learning Card */}
        <div className="glass-panel continue-card">
          <div className="continue-header">
            <span className="continue-badge">CONTINUE LEARNING</span>
            <span className="continue-time">74% COMPLETE</span>
          </div>

          <h3 className="continue-title">Cosmic Science: The Largest Black Hole in the Universe</h3>
          <p className="continue-desc">
            Explore event horizons, stellar collapse, and TON 618 — the most massive known entity in the observable universe.
          </p>

          <div className="continue-action-bar">
            <button
              type="button"
              className="btn-primary-cosmic"
              onClick={() => onLaunchLesson({
                title: "The Largest Black Hole in the Universe",
                subtitle: "Space & Astrophysics Deep Dive",
                videoUrl: "https://www.youtube.com/embed/libKVRa074Q",
                chapters: [
                  { title: "1. What is the Event Horizon?", time: 0, description: "Understanding the boundary where gravity prevents anything from escaping." },
                  { title: "2. Stellar vs Supermassive Black Holes", time: 180, description: "How collapsed stars compare to the colossal engines at galactic centers." },
                  { title: "3. TON 618: The Ultimate Behemoth", time: 390, description: "A black hole so massive it holds 66 billion times the mass of our Sun." },
                  { title: "4. The Fate of Black Holes", time: 540, description: "How Hawking radiation will slowly evaporate black holes over trillions of years." }
                ],
                notes: {
                  takeaways: "Black holes are the most extreme gravitational objects in the universe, curving spacetime to infinity.",
                  points: [
                    "Stellar black holes form when giant stars collapse at the end of their lifecycle",
                    "Supermassive black holes anchor almost every galaxy, including the Milky Way",
                    "TON 618 is one of the largest structures ever discovered in cosmology"
                  ]
                }
              })}
            >
              <Play size={16} />
              <span>Resume Video</span>
            </button>
          </div>
        </div>

        {/* Quest & Badges Panel */}
        <div className="glass-panel quests-panel">
          <h3 className="panel-title-sm"><Award size={16} color="#eab308" /> Achievements & Badges</h3>
          <div className="quests-list">
            {ACHIEVEMENTS.map((ach) => {
              const Icon = ach.icon;
              return (
                <div key={ach.title} className={`quest-item ${ach.unlocked ? 'unlocked' : 'locked'}`}>
                  <div className="quest-icon-box">
                    <Icon size={16} color={ach.unlocked ? '#38bdf8' : '#64748b'} />
                  </div>
                  <div>
                    <h4 className="quest-title">{ach.title}</h4>
                    <p className="quest-desc">{ach.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Recent Probed Repositories */}
      <div className="glass-panel" style={{ marginTop: '24px' }}>
        <h3 className="panel-title-sm"><Terminal size={16} color="#38bdf8" /> Recent Analyses</h3>
        <div className="missions-table">
          {RECENT_MISSIONS.map((m) => (
            <div key={m.name} className="mission-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="mission-dot" />
                <div>
                  <span className="mission-name">{m.name}</span>
                  <span className="mission-type">{m.type}</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span className="mission-time">{m.time}</span>
                <button 
                  type="button" 
                  className="btn-outline-cosmic"
                  onClick={() => onSelectSample(`https://github.com/${m.name}`)}
                >
                  <span>Re-analyze</span>
                  <ArrowUpRight size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
