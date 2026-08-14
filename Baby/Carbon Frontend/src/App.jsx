import { useState } from 'react';
import axios from 'axios';
import { 
  Search, 
  Loader2, 
  GitBranch, 
  Code2, 
  Server, 
  Database, 
  Layers, 
  Video, 
  ExternalLink, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  Play
} from 'lucide-react';
import ArchitectureDiagram from './components/ArchitectureDiagram';
import ApiEndpoints from './components/ApiEndpoints';
import BusinessLogic from './components/BusinessLogic';
import Chatbox from './components/Chatbox';
import './index.css';

const SAMPLE_REPOS = [
  { name: 'expressjs/express', url: 'https://github.com/expressjs/express' },
  { name: 'fastapi/fastapi', url: 'https://github.com/fastapi/fastapi' },
  { name: 'facebook/react', url: 'https://github.com/facebook/react' },
  { name: 'reduxjs/redux', url: 'https://github.com/reduxjs/redux' }
];

export default function App() {
  const [repoUrl, setRepoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [currentStep, setCurrentStep] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  // Video Explainer state
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState(null);
  const [videoError, setVideoError] = useState('');

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3002';

  const handleAnalyze = async (e) => {
    if (e) e.preventDefault();
    if (!repoUrl.trim()) return;

    setLoading(true);
    setStatusMessage('Connecting to Carbon AI Agent Service...');
    setCurrentStep(1);
    setError('');
    setResult(null);
    setVideoUrl(null);
    setVideoError('');

    try {
      const response = await fetch(`${apiUrl}/api/analyze`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl: repoUrl.trim() })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to reach backend.`);
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
              setStatusMessage('Cloning repository...');
              setCurrentStep(1);
            } else if (data.status === 'reading_files') {
              setStatusMessage('Reading files & folder tree...');
              setCurrentStep(2);
            } else if (data.status === 'analyzing') {
              setStatusMessage('Running collaborative AI agent graph...');
              setCurrentStep(3);
            } else if (data.status === 'node_finished') {
              setStatusMessage(`Completed agent: ${data.node}...`);
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
      setError(err.message || 'Something went wrong during analysis');
    } finally {
      setLoading(false);
    }
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
      } else {
        throw new Error('Backend did not return a valid video URL.');
      }
    } catch (err) {
      setVideoError(err.response?.data?.error || err.message || 'Failed to generate video explainer.');
    } finally {
      setVideoLoading(false);
    }
  };

  return (
    <div className="app-container">
      {/* ── HERO HEADER ── */}
      <header className="header animate-fade-in">
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.25)', borderRadius: '9999px', fontSize: '13px', color: '#a5b4fc', marginBottom: '16px' }}>
          <Sparkles size={14} /> Agentic Codebase Intelligence & Video Synthesizer
        </div>
        <h1 className="text-gradient">Carbon</h1>
        <p>
          Understand any codebase in seconds. Autonomous AI agents analyze your repository, construct interactive architecture flowcharts, and generate interactive video explanations.
        </p>

        <div className="feature-pills">
          <span className="pill">🤖 Multi-Agent Graph</span>
          <span className="pill">🗺️ Mermaid Flowcharts</span>
          <span className="pill">🎥 Scrimba Video Explainer</span>
          <span className="pill">💬 Codebase AI Chat</span>
        </div>
      </header>

      {/* ── SEARCH & INPUT BOX ── */}
      <div className="glass-panel animate-fade-in" style={{ marginBottom: '32px' }}>
        <form onSubmit={handleAnalyze} style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 300px', position: 'relative' }}>
            <GitBranch style={{ position: 'absolute', left: '16px', top: '18px', color: '#94a3b8' }} size={20} />
            <input 
              type="url"
              placeholder="https://github.com/expressjs/express"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              style={{ paddingLeft: '48px' }}
              disabled={loading}
              required
            />
          </div>
          <button type="submit" disabled={loading || !repoUrl.trim()}>
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
            {loading ? statusMessage : 'Analyze Repository'}
          </button>
        </form>

        {/* Quick Sample Repositories */}
        <div className="quick-repos">
          <span>Try an example:</span>
          {SAMPLE_REPOS.map((sample) => (
            <button
              key={sample.name}
              type="button"
              className="quick-repo-btn"
              onClick={() => {
                setRepoUrl(sample.url);
              }}
              disabled={loading}
            >
              {sample.name}
            </button>
          ))}
        </div>

        {/* Live Stepper when Loading */}
        {loading && (
          <div className="progress-stepper animate-fade-in">
            <div className={`step-card ${currentStep === 1 ? 'active' : currentStep > 1 ? 'completed' : ''}`}>
              {currentStep > 1 ? <CheckCircle2 size={18} color="#10b981" /> : <Loader2 size={18} className={currentStep === 1 ? "animate-spin" : ""} color="#6366f1" />}
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>1. Clone Repo</div>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Git clone sandbox</div>
              </div>
            </div>

            <div className={`step-card ${currentStep === 2 ? 'active' : currentStep > 2 ? 'completed' : ''}`}>
              {currentStep > 2 ? <CheckCircle2 size={18} color="#10b981" /> : <Loader2 size={18} className={currentStep === 2 ? "animate-spin" : ""} color="#6366f1" />}
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>2. Read Files</div>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Parse directory AST</div>
              </div>
            </div>

            <div className={`step-card ${currentStep === 3 ? 'active' : currentStep > 3 ? 'completed' : ''}`}>
              {currentStep > 3 ? <CheckCircle2 size={18} color="#10b981" /> : <Loader2 size={18} className={currentStep === 3 ? "animate-spin" : ""} color="#6366f1" />}
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>3. Run Agents</div>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>LangGraph & Gemini</div>
              </div>
            </div>

            <div className={`step-card ${currentStep >= 4 ? 'completed' : ''}`}>
              {currentStep >= 4 ? <CheckCircle2 size={18} color="#10b981" /> : <Loader2 size={18} color="#64748b" />}
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>4. Complete</div>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Flowchart & insights</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── ERROR DISPLAY ── */}
      {error && (
        <div className="glass-panel animate-fade-in" style={{ borderLeft: '4px solid #ef4444', marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <AlertCircle size={24} color="#ef4444" style={{ flexShrink: 0 }} />
          <div>
            <h3 style={{ color: '#ef4444', margin: 0, fontSize: '16px' }}>Analysis Encountered an Error</h3>
            <p style={{ marginTop: '4px', fontSize: '14px', margin: 0 }}>{error}</p>
          </div>
        </div>
      )}

      {/* ── ANALYSIS RESULTS ── */}
      {result && result.architecture && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          
          {/* 🎥 SCRIMBA VIDEO EXPLAINER BAR */}
          <div className="video-card-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontSize: '18px', color: 'var(--text-main)' }}>
                  <Video color="#ec4899" size={22} /> Scrimba Video Explainer
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '14px', color: 'var(--text-muted)' }}>
                  Synthesize an interactive audiovisual video slideshow on Scrimba powered by your architecture analysis.
                </p>
              </div>

              {!videoUrl ? (
                <button
                  type="button"
                  onClick={handleGenerateVideo}
                  disabled={videoLoading}
                  className="btn-video"
                >
                  {videoLoading ? <Loader2 className="animate-spin" size={18} /> : <Play size={18} />}
                  {videoLoading ? 'Synthesizing Video on Scrimba...' : '🎥 Generate Video Explanation'}
                </button>
              ) : (
                <div style={{ display: 'flex', gap: '10px' }}>
                  <a
                    href={videoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-video"
                    style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                  >
                    <ExternalLink size={16} /> Watch Video on Scrimba
                  </a>
                </div>
              )}
            </div>

            {/* Video Success Notification */}
            {videoUrl && (
              <div style={{ marginTop: '16px', padding: '14px 18px', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <CheckCircle2 color="#10b981" size={20} />
                  <span style={{ fontSize: '14px', color: '#6ee7b7', fontWeight: 600 }}>Video explainer created!</span>
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{videoUrl}</span>
                </div>
                <a href={videoUrl} target="_blank" rel="noreferrer" style={{ fontSize: '13px', color: '#a7f3d0', fontWeight: 600, textDecoration: 'underline' }}>
                  Open Link ↗
                </a>
              </div>
            )}

            {/* Video Error Notification */}
            {videoError && (
              <div style={{ marginTop: '14px', padding: '12px 16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#fca5a5', fontSize: '14px' }}>
                ❌ {videoError}
              </div>
            )}
          </div>

          {/* Top Section: Summary & Tech Stack */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
            <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '18px', marginBottom: '14px' }}>
                <Layers className="text-gradient" size={20} /> Architecture Summary
              </h2>
              <p style={{ fontSize: '15px', color: '#cbd5e1', lineHeight: 1.7, margin: 0 }}>
                {result.architecture.summary}
              </p>
            </div>

            <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '18px', marginBottom: '14px' }}>
                <Code2 className="text-gradient" size={20} /> Tech Stack
              </h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {result.architecture.tech_stack && result.architecture.tech_stack.map(tech => (
                  <span key={tech} className="badge">{tech}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Middle Section: Architecture Flowchart */}
          <div className="glass-panel">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '18px', marginBottom: '4px' }}>
              <Server className="text-gradient" size={20} /> System Architecture Flow
            </h2>
            <ArchitectureDiagram chart={result.architecture.diagram} />
          </div>

          {/* Key Components */}
          <div className="glass-panel">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '18px', marginBottom: '20px' }}>
              <Database className="text-gradient" size={20} /> Key Components
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              {result.architecture.key_components && result.architecture.key_components.map(comp => (
                <div key={comp.name} style={{ background: 'rgba(0,0,0,0.25)', padding: '18px', borderRadius: '10px', border: '1px solid var(--panel-border)' }}>
                  <h3 style={{ color: '#fff', fontSize: '15px', marginBottom: '6px' }}>{comp.name}</h3>
                  <div style={{ fontSize: '12px', color: '#818cf8', marginBottom: '10px', fontFamily: 'var(--font-mono)' }}>
                    📁 {comp.location}
                  </div>
                  <p style={{ fontSize: '13px', margin: 0, color: 'var(--text-muted)', lineHeight: '1.5' }}>{comp.purpose}</p>
                </div>
              ))}
            </div>
          </div>

          {/* API Agent Results */}
          {result.api_docs && <ApiEndpoints apiDocs={result.api_docs} />}

          {/* Business Logic Agent Results */}
          {result.business_logic && <BusinessLogic businessLogic={result.business_logic} />}

          {/* Chat Agent */}
          <Chatbox repoUrl={result.repo_url} />

        </div>
      )}
    </div>
  );
}
