// ============================================================
//  src/App.jsx — Carbon Deep-Space Developer Learning Platform
// ============================================================

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
import VideoGallery from './components/VideoGallery';
import SpaceQuiz from './components/SpaceQuiz';
import CarbonPlayer from './components/CarbonPlayer';
import ArchitectureDiagram from './components/ArchitectureDiagram';
import ApiEndpoints from './components/ApiEndpoints';
import BusinessLogic from './components/BusinessLogic';
import CodebaseStudio from './components/CodebaseStudio';
import './index.css';

export default function App() {
  const [activeTab, setActiveTab] = useState('analyzer'); // 'analyzer' | 'explore' | 'quiz' | 'dashboard'
  const [repoUrl, setRepoUrl] = useState('');
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

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3002';

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

  const triggerAnalyzeWithRepo = async (targetRepo) => {
    if (!targetRepo.trim()) return;

    setActiveTab('analyzer');
    setLoading(true);
    setStatusMessage('Starting analysis...');
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
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to reach Carbon AI backend.`);
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
              throw new Error(data.message || 'Analysis failed');
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
      const response = await axios.post(`${apiUrl}/api/explain-video`, {
        architecture: result.architecture,
        apiDocs: result.api_docs,
        businessLogic: result.business_logic
      });

      if (response.data?.url) {
        setVideoUrl(response.data.url);
        // Automatically open the in-app Carbon Cinema
        setCinemaDetails({
          title: `${result.workspace_name || 'Codebase'} • AI Architectural Walkthrough`,
          subtitle: 'Synthesized In-App Video Walkthrough',
          videoUrl: response.data.url
        });
        setCinemaOpen(true);
      } else {
        throw new Error('Backend did not return a valid video stream URL.');
      }
    } catch (err) {
      setVideoError(err.response?.data?.error || err.message || 'Failed to synthesize video walkthrough.');
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
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

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
        />

        {/* ── TAB 1: WORKSPACE & REPOSITORY ANALYZER ── */}
        {activeTab === 'analyzer' && (
          <div className="animate-fade-in">
            
            {/* Input & Search Box */}
            <div className="glass-panel" style={{ marginBottom: '32px' }}>
              <form onSubmit={handleAnalyze} style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 320px', position: 'relative' }}>
                  <GitBranch style={{ position: 'absolute', left: '16px', top: '18px', color: '#94a3b8' }} size={20} />
                  <input 
                    id="repo-url-input"
                    type="url"
                    placeholder="https://github.com/expressjs/express"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    style={{ paddingLeft: '48px' }}
                    disabled={loading}
                    required
                  />
                </div>
                <button type="submit" disabled={loading || !repoUrl.trim()} className="btn-primary-cosmic">
                  {loading ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
                  {loading ? statusMessage : 'Analyze Codebase'}
                </button>
              </form>

              {/* Orbital Progress Stepper */}
              {loading && (
                <div className="progress-stepper animate-fade-in">
                  <div className={`step-card ${currentStep === 1 ? 'active' : currentStep > 1 ? 'completed' : ''}`}>
                    {currentStep > 1 ? <CheckCircle2 size={18} color="#10b981" /> : <Loader2 size={18} className={currentStep === 1 ? "animate-spin" : ""} color="#38bdf8" />}
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>1. Download</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Clone repository</div>
                    </div>
                  </div>

                  <div className={`step-card ${currentStep === 2 ? 'active' : currentStep > 2 ? 'completed' : ''}`}>
                    {currentStep > 2 ? <CheckCircle2 size={18} color="#10b981" /> : <Loader2 size={18} className={currentStep === 2 ? "animate-spin" : ""} color="#38bdf8" />}
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>2. Read Files</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Scan project structure</div>
                    </div>
                  </div>

                  <div className={`step-card ${currentStep === 3 ? 'active' : currentStep > 3 ? 'completed' : ''}`}>
                    {currentStep > 3 ? <CheckCircle2 size={18} color="#10b981" /> : <Loader2 size={18} className={currentStep === 3 ? "animate-spin" : ""} color="#38bdf8" />}
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>3. AI Analysis</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Powered by AI</div>
                    </div>
                  </div>

                  <div className={`step-card ${currentStep >= 4 ? 'completed' : ''}`}>
                    {currentStep >= 4 ? <CheckCircle2 size={18} color="#10b981" /> : <Loader2 size={18} color="#64748b" />}
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>4. Results</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Flowcharts & insights</div>
                    </div>
                  </div>
                </div>
              )}
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

        {/* ── TAB 2: EXPLORE ── */}
        {activeTab === 'explore' && (
          <VideoGallery onPlayVideo={launchCustomLesson} />
        )}

        {/* ── TAB 3: SPACE QUIZ ── */}
        {activeTab === 'quiz' && (
          <SpaceQuiz />
        )}

        {/* ── TAB 4: COMMAND CENTER DASHBOARD ── */}
        {activeTab === 'dashboard' && (
          <CommandCenter 
            onLaunchLesson={launchCustomLesson}
            onSelectSample={(sampleUrl) => {
              setRepoUrl(sampleUrl);
              setActiveTab('analyzer');
            }}
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
    </div>
  );
}
