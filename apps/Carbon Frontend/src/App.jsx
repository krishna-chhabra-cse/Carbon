// ============================================================
//  src/App.jsx — Carbon Deep-Space Developer Learning Platform
// ============================================================

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LoadingSkeleton } from './components/LoadingSkeleton';
import LandingPage from './components/LandingPage';
import RoastPage from './components/RoastPage';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Search, 
  Loader2, 
  GitBranch, 
  Code2, 
  Server, 
  Database, 
  Layers, 
  Play, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  Orbit,
  Compass,
  Film,
  Maximize2
} from 'lucide-react';

import CosmicCanvas from './components/CosmicCanvas';
import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';
import CommandCenter from './components/CommandCenter';
import CarbonPlayer from './components/CarbonPlayer';
import ArchitectureDiagram from './components/ArchitectureDiagram';
import ApiEndpoints from './components/ApiEndpoints';
import BusinessLogic from './components/BusinessLogic';
import CodebaseStudio from './components/CodebaseStudio';
import CommandPalette from './components/CommandPalette';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import './index.css';

function AnalyzerApp() {
  const [activeTab, setActiveTab] = useState('analyzer'); // 'analyzer' | 'explore' | 'quiz' | 'dashboard'
  const [repoUrl, setRepoUrl] = useState('');
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [currentStep, setCurrentStep] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  // Video Explainer & Cinema state
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState(null);
  const [videoError, setVideoError] = useState('');
  const [cinemaOpen, setCinemaOpen] = useState(false);
  const [cinemaDetails, setCinemaDetails] = useState({
    title: 'Carbon Architectural Walkthrough',
    subtitle: 'Autonomous Multi-Agent Audio-Visual Breakdown',
    videoUrl: null
  });

  const isDev = import.meta.env.DEV;
  const apiUrl = (import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL.trim()) 
    ? import.meta.env.VITE_API_URL.trim().replace(/\/+$/, '') 
    : (isDev ? 'http://localhost:3002' : 'https://carbon-backend-a1sg.onrender.com');

  // Pre-warm Render backend & Python service on page load
  useEffect(() => {
    fetch(`${apiUrl}/health`).catch(() => {});
    fetch('https://carbon-agent-service.onrender.com/').catch(() => {});
  }, [apiUrl]);

  // Global Cmd+K / Ctrl+K keyboard shortcut listener
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Read ?repo= from URL query params (for Chrome Extension & direct links)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const repoParam = params.get('repo');
    if (repoParam && repoParam.trim()) {
      setRepoUrl(repoParam.trim());
      // Trigger analyze automatically
      triggerAnalyzeWithRepo(repoParam.trim());
    }
  }, []);

  const triggerAnalyzeWithRepo = async (targetRepo, retryAttempt = 0) => {
    if (!targetRepo.trim()) return;

    setActiveTab('analyzer');
    setLoading(true);
    setStatusMessage(retryAttempt > 0 ? `Warming up Carbon AI cloud engine (attempt ${retryAttempt + 1})...` : 'Starting analysis...');
    setCurrentStep(1);
    setError('');
    setResult(null);
    setVideoUrl(null);
    setVideoError('');

    try {
      const response = await fetch(`${apiUrl}/api/analyze`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl: targetRepo.trim() })
      });
      
      // If Render is cold-starting (502/503), auto-retry up to 3 times
      if ((response.status === 502 || response.status === 503) && retryAttempt < 3) {
        setStatusMessage('⚡ Carbon AI is booting on Render (~20s on first load). Retrying...');
        await new Promise(r => setTimeout(r, 6000));
        return triggerAnalyzeWithRepo(targetRepo, retryAttempt + 1);
      }

      if (!response.ok) {
        let errData;
        try {
          errData = await response.json();
        } catch {}
        const detailPart1 = errData?.error || '';
        const detailPart2 = errData?.details || '';
        const detail = (detailPart1 && detailPart2) 
          ? `${detailPart1}: ${detailPart2}`
          : (detailPart1 || detailPart2 || `HTTP ${response.status}: Failed to reach Carbon AI backend.`);
        throw new Error(detail);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; 
        
        for (const line of lines) {
          if (line.trim()) {
            const data = JSON.parse(line);
            
            if (data.status === 'error') {
              throw new Error(data.message || 'Analysis stream error (no message provided)');
            } else if (data.status === 'cloning') {
              setStatusMessage('Downloading the repository...');
              setCurrentStep(1);
            } else if (data.status === 'reading_files') {
              setStatusMessage('Reading project files...');
              setCurrentStep(2);
            } else if (data.status === 'analyzing') {
              setStatusMessage('AI is analyzing your code...');
              setCurrentStep(3);
            } else if (data.status === 'node_finished') {
              setStatusMessage(`Step complete: ${data.node}...`);
              setCurrentStep(3);
            } else if (data.status === 'complete') {
              setStatusMessage('Analysis complete!');
              setCurrentStep(4);
              setResult(data);

              // Persist real telemetry for Dashboard
              try {
                const existing = JSON.parse(localStorage.getItem('carbon_recent_analyses') || '[]');
                const repoIdentifier = targetRepo.replace(/^https?:\/\/github\.com\//i, '');
                const entry = {
                  repo: repoIdentifier,
                  url: targetRepo,
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  techStack: (data.architecture?.tech_stack || []).slice(0, 3).join(', ') || 'Codebase',
                  summary: data.architecture?.summary || ''
                };
                const updated = [entry, ...existing.filter(item => item.repo !== repoIdentifier)].slice(0, 15);
                localStorage.setItem('carbon_recent_analyses', JSON.stringify(updated));
              } catch (telemetryErr) {
                console.warn('Telemetry persistence error:', telemetryErr);
              }
            }
          }
        }
      }
    } catch (err) {
      setError(err.message || 'Something went wrong during probe execution.');
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async (e) => {
    if (e) e.preventDefault();
    triggerAnalyzeWithRepo(repoUrl);
  };

  const handleGenerateVideo = async () => {
    if (!result) return;
    setVideoLoading(true);
    setVideoError('');

    try {
      // 1. Hit the new Python media generation endpoint
      const pyUrl = isDev ? 'http://localhost:8000' : 'https://carbon-agent-service.onrender.com';
      const response = await fetch(`${pyUrl}/api/generate-media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo_name: result.workspace_name || 'Codebase',
          architecture_info: result.architecture || {},
          security_info: result.security || {},
          business_info: result.business_logic || {}
        })
      });
      const mediaData = await response.json();
      if (mediaData.status !== 'success') {
        throw new Error(mediaData.message || 'Media engine failed.');
      }
      
      // 2. Launch Native Carbon Cinema (Zero login wall!)
      const projectName = result.workspace_name || (result.repo_url ? result.repo_url.replace(/^https?:\/\/github\.com\//i, '') : 'Codebase');
      setVideoUrl('native_cinema');
      setCinemaDetails({
        title: `${projectName} • AI Architectural Walkthrough`,
        subtitle: 'Synthesized In-App Video Walkthrough',
        videoUrl: 'native_cinema',
        notes: `PPT saved to: ${mediaData.ppt_file}`
      });
      setCinemaOpen(true);
    } catch (err) {
      setVideoError(err.message || 'Failed to synthesize video walkthrough.');
    } finally {
      setVideoLoading(false);
    }
  };

  const launchCustomLesson = ({ title, subtitle, videoUrl: customUrl, chapters, notes }) => {
    setCinemaDetails({
      title,
      subtitle,
      videoUrl: customUrl || videoUrl,
      chapters,
      notes
    });
    setCinemaOpen(true);
  };

  return (
    <div className="carbon-root">
      {/* ── 60 FPS PROCEDURAL STARFIELD BACKGROUND ── */}
      <CosmicCanvas />

      {/* ── NAVIGATION BAR ── */}
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onOpenPalette={() => setPaletteOpen(true)}
      />

      {/* ── MAIN CONTENT CONTAINER ── */}
      <main className="app-container">

        {/* ── HERO SECTION ── */}
        <HeroSection 
          onAnalyzeClick={() => {
            setActiveTab('analyzer');
            const inputEl = document.getElementById('repo-url-input');
            inputEl?.focus();
          }}
          onExploreClick={() => setActiveTab('explore')}
          onSelectSample={(sampleUrl) => {
            setRepoUrl(sampleUrl);
            setActiveTab('analyzer');
          }}
          onOpenPalette={() => setPaletteOpen(true)}
        />

        {/* ── TAB 1: WORKSPACE & REPOSITORY ANALYZER ── */}
        {activeTab === 'analyzer' && (
          <div className="animate-fade-in" style={{ minHeight: '80vh' }}>
            
            {/* Input & Search Box */}
            <div className="glass-panel" style={{ marginBottom: '32px' }}>
              <form onSubmit={handleAnalyze} style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 320px', position: 'relative' }}>
                  <GitBranch style={{ position: 'absolute', left: '16px', top: '18px', color: '#94a3b8' }} size={20} />
                  <input 
                    id="repo-url-input"
                    type="url"
                    aria-label="Repository URL"
                    placeholder="https://github.com/expressjs/express"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    style={{ paddingLeft: '48px' }}
                    disabled={loading}
                    required
                  />
                </div>
                <button type="submit" disabled={loading || !repoUrl.trim()} className="btn-primary-cosmic" aria-label="Analyze Codebase">
                  {loading ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
                  {loading ? statusMessage : 'Analyze Codebase'}
                </button>
              </form>

              {/* Premium Orbital Loading Skeleton */}
              {loading && <LoadingSkeleton message={statusMessage} />}
            </div>

            {/* Error Display */}
            {error && (
              <div className="glass-panel animate-fade-in" style={{ borderLeft: '4px solid #ef4444', marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                <AlertCircle size={24} color="#ef4444" style={{ flexShrink: 0 }} />
                <div>
                  <h3 style={{ color: '#ef4444', margin: 0, fontSize: '16px' }}>Something went wrong</h3>
                  <p style={{ marginTop: '4px', fontSize: '14px', margin: 0 }}>{error}</p>
                </div>
              </div>
            )}

            {/* Next-Gen Interactive Codebase Intelligence Studio */}
            {result && result.architecture && (
              <CodebaseStudio
                result={result}
                videoUrl={videoUrl}
                videoLoading={videoLoading}
                videoError={videoError}
                onGenerateVideo={handleGenerateVideo}
                onOpenCinema={() => {
                  setCinemaDetails({
                    title: `${result.workspace_name || 'Codebase'} • AI Architectural Walkthrough`,
                    subtitle: 'Synthesized In-App Video Walkthrough',
                    videoUrl: videoUrl
                  });
                  setCinemaOpen(true);
                }}
              />
            )}

          </div>
        )}

        {/* ── TAB 4: COMMAND CENTER DASHBOARD ── */}
        {activeTab === 'dashboard' && (
          <CommandCenter 
            onLaunchLesson={launchCustomLesson}
            onSelectSample={(sampleUrl) => {
              if (sampleUrl) {
                setRepoUrl(sampleUrl);
              }
              setActiveTab('analyzer');
            }}
            onOpenAnalyzer={() => setActiveTab('analyzer')}
            onOpenExplore={() => setActiveTab('explore')}
            onOpenQuiz={() => setActiveTab('quiz')}
          />
        )}

      </main>

      {/* ── IN-APP CARBON CINEMA MODAL PLAYER ── */}
      {cinemaOpen && (
        <CarbonPlayer
          videoUrl={cinemaDetails.videoUrl}
          title={cinemaDetails.title}
          subtitle={cinemaDetails.subtitle}
          chapters={cinemaDetails.chapters}
          notes={cinemaDetails.notes}
          onClose={() => setCinemaOpen(false)}
          analysisData={result}
        />
      )}

      {/* ── 21ST.DEV / MOTIONSITES COMMAND PALETTE (⌘K) ── */}
      <CommandPalette 
        isOpen={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onNavigate={(tab) => {
          setActiveTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onAnalyzeRepo={(target) => {
          setRepoUrl(target);
          triggerAnalyzeWithRepo(target);
        }}
      />

      {/* ── VERCEL REAL-TIME WEB ANALYTICS & SPEED INSIGHTS ── */}
      <Analytics />
      <SpeedInsights />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/app" element={<AnalyzerApp />} />
          <Route path="/roast" element={<RoastPage />} />
          <Route path="/roast/:id" element={<RoastPage />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}
