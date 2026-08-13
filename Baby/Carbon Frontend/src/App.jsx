import { useState } from 'react';
import axios from 'axios';
import { Search, Loader2, GitBranch, Code2, Server, Database, Layers } from 'lucide-react';
import ArchitectureDiagram from './components/ArchitectureDiagram';
import ApiEndpoints from './components/ApiEndpoints';
import BusinessLogic from './components/BusinessLogic';
import Chatbox from './components/Chatbox';
import './index.css'; // our gorgeous CSS

export default function App() {
  const [repoUrl, setRepoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Starting...');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!repoUrl) return;

    setLoading(true);
    setStatusMessage('Starting...');
    setError('');
    setResult(null);

    try {
      // 🚀 Use fetch instead of axios to process the stream
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/analyze`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        // Keep the last line in the buffer because it might be incomplete
        buffer = lines.pop(); 
        
        for (const line of lines) {
          if (line.trim()) {
            const data = JSON.parse(line);
            
            if (data.status === 'error') {
              throw new Error(data.message || 'Analysis failed');
            } else if (data.status === 'cloning') {
              setStatusMessage('Cloning repository...');
            } else if (data.status === 'reading_files') {
              setStatusMessage('Reading files & structure...');
            } else if (data.status === 'analyzing') {
              setStatusMessage('Running collaborative agents...');
            } else if (data.status === 'node_finished') {
              setStatusMessage(`Finished agent: ${data.node}...`);
            } else if (data.status === 'complete') {
              setStatusMessage('Complete!');
              // ✅ Save the final result in React state to show it on screen
              setResult(data);
            }
          }
        }
      }
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
      setStatusMessage('Starting...');
    }
  };

  return (
    <div className="app-container">
      {/* ── HEADER ── */}
      <div className="header animate-fade-in">
        <h1 className="text-gradient">Carbon</h1>
        <p>Paste any GitHub repository URL. Our AI agents will clone it, read the code, and map out the entire architecture in seconds.</p>
      </div>

      {/* ── SEARCH BOX ── */}
      <form onSubmit={handleAnalyze} className="glass-panel animate-fade-in" style={{ marginBottom: '40px', display: 'flex', gap: '16px' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <GitBranch style={{ position: 'absolute', left: '16px', top: '14px', color: '#94a3b8' }} size={20} />
          <input 
            type="url"
            placeholder="https://github.com/expressjs/express"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            style={{ paddingLeft: '48px' }}
            disabled={loading}
          />
        </div>
        <button type="submit" disabled={loading || !repoUrl}>
          {loading ? <Loader2 className="animate-spin" /> : <Search size={20} />}
          {loading ? statusMessage : 'Analyze Repo'}
        </button>
      </form>

      {/* ── ERRORS ── */}
      {error && (
        <div className="glass-panel animate-fade-in" style={{ borderLeft: '4px solid #ef4444', marginBottom: '40px' }}>
          <h3 style={{ color: '#ef4444', margin: 0 }}>Analysis Failed</h3>
          <p style={{ marginTop: '8px' }}>{error}</p>
        </div>
      )}

      {/* ── RESULTS ── */}
      {result && result.architecture && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* Top Section: Summary & Tech Stack */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
            
            <div className="glass-panel">
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Layers className="text-gradient" /> AI Architecture Summary
              </h2>
              <p style={{ fontSize: '1.1rem', color: '#e2e8f0', lineHeight: 1.7 }}>
                {result.architecture.summary}
              </p>
            </div>

            <div className="glass-panel">
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Code2 className="text-gradient" /> Tech Stack
              </h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {result.architecture.tech_stack.map(tech => (
                  <span key={tech} className="badge">{tech}</span>
                ))}
              </div>
            </div>

          </div>

          {/* Middle Section: The Mermaid Diagram! */}
          <div className="glass-panel">
             <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Server className="text-gradient" /> System Architecture Flow
              </h2>
              <ArchitectureDiagram chart={result.architecture.diagram} />
          </div>

          {/* Bottom Section: Key Components */}
          <div className="glass-panel">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                <Database className="text-gradient" /> Key Components
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {result.architecture.key_components.map(comp => (
                <div key={comp.name} style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '8px' }}>{comp.name}</h3>
                  <div style={{ fontSize: '13px', color: '#6366f1', marginBottom: '12px', fontFamily: 'monospace' }}>
                    📁 {comp.location}
                  </div>
                  <p style={{ fontSize: '14px', margin: 0 }}>{comp.purpose}</p>
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
