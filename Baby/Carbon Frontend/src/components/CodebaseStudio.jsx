// ============================================================
//  src/components/CodebaseStudio.jsx
//
//  Next-Gen Interactive Codebase Intelligence Studio.
//  Replaces standard generic dashboard layouts with a 
//  multi-view cockpit: Architecture, API Explorer, Business Logic,
//  and AI Co-Pilot with real-time filters and video cinema integration.
// ============================================================

import { useState } from 'react';
import { 
  Layers, 
  Server, 
  Webhook, 
  Brain, 
  MessageSquare, 
  Play, 
  Film, 
  ExternalLink, 
  Copy, 
  Check, 
  Search, 
  Filter, 
  Sparkles, 
  ArrowRight, 
  Maximize2, 
  Folder, 
  Code2, 
  CheckCircle2, 
  Compass, 
  ShieldAlert, 
  Clock,
  Terminal,
  Grid,
  ChevronRight,
  Presentation
} from 'lucide-react';
import ArchitectureDiagram from './ArchitectureDiagram';
import Chatbox from './Chatbox';
import PresentationDeck from './PresentationDeck';

export default function CodebaseStudio({ 
  result, 
  videoUrl, 
  videoLoading, 
  videoError, 
  onGenerateVideo, 
  onOpenCinema 
}) {
  const [activeStudioTab, setActiveStudioTab] = useState('overview'); // 'overview' | 'architecture' | 'endpoints' | 'logic' | 'chat'
  const [componentSearch, setComponentSearch] = useState('');
  const [endpointMethodFilter, setEndpointMethodFilter] = useState('ALL');
  const [endpointSearch, setEndpointSearch] = useState('');
  const [activeFlowIndex, setActiveFlowIndex] = useState(0);
  const [copiedEndpointIdx, setCopiedEndpointIdx] = useState(null);

  if (!result || !result.architecture) return null;

  const { architecture, api_docs, business_logic, repo_url, workspace_name } = result;

  // Extract repo short name
  const displayRepoName = workspace_name || (repo_url ? repo_url.replace(/^https?:\/\/github\.com\//i, '') : 'Analyzed Codebase');

  // Filtered components
  const componentsList = architecture.key_components || [];
  const filteredComponents = componentsList.filter(c => 
    c.name.toLowerCase().includes(componentSearch.toLowerCase()) ||
    c.purpose.toLowerCase().includes(componentSearch.toLowerCase()) ||
    (c.location && c.location.toLowerCase().includes(componentSearch.toLowerCase()))
  );

  // Filtered endpoints
  const endpointsList = api_docs?.endpoints || [];
  const filteredEndpoints = endpointsList.filter(ep => {
    const matchesMethod = endpointMethodFilter === 'ALL' || ep.method.toUpperCase() === endpointMethodFilter;
    const matchesSearch = ep.path.toLowerCase().includes(endpointSearch.toLowerCase()) ||
                          ep.description.toLowerCase().includes(endpointSearch.toLowerCase()) ||
                          (ep.file && ep.file.toLowerCase().includes(endpointSearch.toLowerCase()));
    return matchesMethod && matchesSearch;
  });

  const getMethodStyle = (method) => {
    switch (method.toUpperCase()) {
      case 'GET': return { bg: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', border: 'rgba(34, 197, 94, 0.35)' };
      case 'POST': return { bg: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: 'rgba(56, 189, 248, 0.35)' };
      case 'PUT': return { bg: 'rgba(234, 179, 8, 0.15)', color: '#facc15', border: 'rgba(234, 179, 8, 0.35)' };
      case 'DELETE': return { bg: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: 'rgba(239, 68, 68, 0.35)' };
      case 'PATCH': return { bg: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', border: 'rgba(168, 85, 247, 0.35)' };
      default: return { bg: 'rgba(148, 163, 184, 0.15)', color: '#cbd5e1', border: 'rgba(148, 163, 184, 0.35)' };
    }
  };

  const copyPath = (path, idx) => {
    navigator.clipboard.writeText(path);
    setCopiedEndpointIdx(idx);
    setTimeout(() => setCopiedEndpointIdx(null), 2000);
  };

  const flows = business_logic?.business_flows || [];
  const activeFlow = flows[activeFlowIndex] || flows[0];

  return (
    <div className="codebase-studio-container animate-fade-in">
      
      {/* ── 1. STUDIO MASTER HEADER / HUD ── */}
      <div className="studio-hud-header glass-panel">
        <div className="hud-left">
          <div className="hud-repo-badge">
            <span className="live-status-dot" />
            <Terminal size={14} color="#38bdf8" />
            <span className="repo-title">{displayRepoName}</span>
            {repo_url && (
              <a 
                href={repo_url} 
                target="_blank" 
                rel="noreferrer" 
                className="hud-external-link"
                title="Open GitHub Repository"
              >
                <ExternalLink size={13} />
              </a>
            )}
          </div>
          <h1 className="studio-headline">System Intelligence & Architecture</h1>
          <p className="studio-subtext">
            Multi-agent synthesized analysis: structural components, communication flowcharts, and operational logic.
          </p>
        </div>

        {/* Quick Stats Grid */}
        <div className="hud-stats-row">
          <div className="hud-stat-box">
            <span className="hud-stat-value">{componentsList.length}</span>
            <span className="hud-stat-label">Components</span>
          </div>
          <div className="hud-stat-box">
            <span className="hud-stat-value">{endpointsList.length}</span>
            <span className="hud-stat-label">Endpoints</span>
          </div>
          <div className="hud-stat-box">
            <span className="hud-stat-value">{flows.length}</span>
            <span className="hud-stat-label">Workflows</span>
          </div>
          <div className="hud-stat-box">
            <span className="hud-stat-value">{architecture.tech_stack?.length || 0}</span>
            <span className="hud-stat-label">Tech Stack</span>
          </div>
        </div>
      </div>

      {/* ── 2. AI VIDEO CINEMA BANNER ── */}
      <div className="studio-video-banner">
        <div className="video-banner-info">
          <div className="video-tag">
            <Sparkles size={13} /> AI Video Walkthrough
          </div>
          <h3 className="video-banner-title">
            {videoUrl ? "Architectural Video Walkthrough is Ready!" : "Generate 3-Minute Audiovisual Walkthrough"}
          </h3>
          <p className="video-banner-desc">
            {videoUrl 
              ? "Watch the narrated, synchronized slides and interactive flowcharts directly inside Carbon."
              : "Let our video agent synthesize an interactive presentation with narrated slides and diagrams."}
          </p>
        </div>

        <div className="video-banner-actions" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setActiveStudioTab('slides')}
            className="btn-video-hero"
            style={{ background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)' }}
            title="Open AI Slide Deck with 1-click Gamma AI and PowerPoint PPTX export"
          >
            <Presentation size={18} />
            <span>AI Slide Deck & PPT</span>
          </button>

          {!videoUrl ? (
            <button
              type="button"
              onClick={onGenerateVideo}
              disabled={videoLoading}
              className="btn-video-hero"
            >
              {videoLoading ? <div className="spinner-dots"><span>.</span><span>.</span><span>.</span></div> : <Play size={18} fill="currentColor" />}
              <span>{videoLoading ? 'Synthesizing Video...' : 'Generate AI Video'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenCinema}
              className="btn-video-hero ready"
            >
              <Play size={18} fill="currentColor" />
              <span>Watch in Carbon Cinema</span>
            </button>
          )}
        </div>
      </div>

      {videoError && (
        <div className="studio-error-banner">
          <ShieldAlert size={18} color="#ef4444" />
          <span>{videoError}</span>
        </div>
      )}

      {/* ── 3. STUDIO NAVIGATION TABS ── */}
      <div className="studio-tabs-bar">
        <button
          type="button"
          className={`studio-tab-btn ${activeStudioTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveStudioTab('overview')}
        >
          <Grid size={16} />
          <span>Overview</span>
        </button>

        <button
          type="button"
          className={`studio-tab-btn ${activeStudioTab === 'slides' ? 'active' : ''}`}
          onClick={() => setActiveStudioTab('slides')}
        >
          <Presentation size={16} color="#ec4899" />
          <span>Slide Deck & PPT</span>
        </button>

        <button
          type="button"
          className={`studio-tab-btn ${activeStudioTab === 'architecture' ? 'active' : ''}`}
          onClick={() => setActiveStudioTab('architecture')}
        >
          <Server size={16} />
          <span>Architecture & Graph</span>
        </button>

        <button
          type="button"
          className={`studio-tab-btn ${activeStudioTab === 'endpoints' ? 'active' : ''}`}
          onClick={() => setActiveStudioTab('endpoints')}
        >
          <Webhook size={16} />
          <span>API Explorer ({endpointsList.length})</span>
        </button>

        <button
          type="button"
          className={`studio-tab-btn ${activeStudioTab === 'logic' ? 'active' : ''}`}
          onClick={() => setActiveStudioTab('logic')}
        >
          <Brain size={16} />
          <span>Business Logic ({flows.length})</span>
        </button>

        <button
          type="button"
          className={`studio-tab-btn ${activeStudioTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveStudioTab('chat')}
        >
          <MessageSquare size={16} />
          <span>AI Carbon</span>
        </button>
      </div>

      {/* ── 4. STUDIO CONTENT PANELS ── */}
      
      {/* ── TAB: OVERVIEW ── */}
      {activeStudioTab === 'overview' && (
        <div className="studio-grid-layout animate-fade-in">
          
          {/* Summary Card */}
          <div className="glass-panel studio-summary-card">
            <div className="panel-header-row">
              <h3 className="studio-panel-title">
                <Layers size={18} color="#38bdf8" /> System Architecture Summary
              </h3>
              <span className="pill-badge-blue">Core Design</span>
            </div>
            <p className="summary-paragraph">
              {architecture.summary}
            </p>

            <div className="tech-stack-section">
              <h4 className="subheading-dim">Detected Technologies & Libraries</h4>
              <div className="tech-pills-wrap">
                {architecture.tech_stack?.map((tech) => (
                  <span key={tech} className="tech-pill-badge">
                    <Code2 size={12} color="#38bdf8" />
                    <span>{tech}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Flowchart Preview */}
          <div className="glass-panel studio-flowchart-card">
            <div className="panel-header-row">
              <h3 className="studio-panel-title">
                <Server size={18} color="#a855f7" /> High-Level Topology
              </h3>
              <button 
                type="button"
                className="btn-text-action"
                onClick={() => setActiveStudioTab('architecture')}
              >
                <span>Full Diagram View</span>
                <ArrowRight size={14} />
              </button>
            </div>
            <ArchitectureDiagram chart={architecture.diagram} />
          </div>

          {/* Key Components Preview */}
          <div className="glass-panel" style={{ gridColumn: '1 / -1' }}>
            <div className="panel-header-row">
              <h3 className="studio-panel-title">
                <Folder size={18} color="#10b981" /> Discovered Core Components ({componentsList.length})
              </h3>
              <div className="search-input-wrap">
                <Search size={14} color="#94a3b8" />
                <input
                  type="text"
                  placeholder="Filter components..."
                  value={componentSearch}
                  onChange={(e) => setComponentSearch(e.target.value)}
                  className="studio-search-input"
                />
              </div>
            </div>

            <div className="components-matrix-grid">
              {filteredComponents.map((comp) => (
                <div key={comp.name} className="component-matrix-card">
                  <div className="component-card-top">
                    <div className="comp-icon-box">
                      <Code2 size={16} color="#38bdf8" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h4 className="comp-name" title={comp.name}>{comp.name}</h4>
                      <span className="comp-path" title={comp.location}>
                        {comp.location || 'Root Workspace'}
                      </span>
                    </div>
                  </div>
                  <p className="comp-purpose">{comp.purpose}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* ── TAB: ARCHITECTURE & GRAPH ── */}
      {activeStudioTab === 'architecture' && (
        <div className="studio-single-panel glass-panel animate-fade-in">
          <div className="panel-header-row">
            <div>
              <h3 className="studio-panel-title">
                <Server size={18} color="#38bdf8" /> Interactive Architectural Flowchart
              </h3>
              <p className="panel-sub-desc">
                Visual communication channels, service boundaries, and request-response pathways synthesized from AST graph.
              </p>
            </div>
          </div>
          <ArchitectureDiagram chart={architecture.diagram} />
        </div>
      )}

      {/* ── TAB: API EXPLORER ── */}
      {activeStudioTab === 'endpoints' && (
        <div className="studio-single-panel glass-panel animate-fade-in">
          <div className="panel-header-row" style={{ flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h3 className="studio-panel-title">
                <Webhook size={18} color="#38bdf8" /> API Route & Endpoint Explorer
              </h3>
              <p className="panel-sub-desc">
                Detected Architecture: <strong style={{ color: '#f8fafc' }}>{api_docs?.api_type || 'REST API / Express'}</strong> • {endpointsList.length} route endpoints discovered.
              </p>
            </div>

            {/* Filter Buttons & Search */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <div className="method-filter-pills">
                {['ALL', 'GET', 'POST', 'PUT', 'DELETE'].map((m) => (
                  <button
                    key={m}
                    type="button"
                    className={`method-filter-btn ${endpointMethodFilter === m ? 'active' : ''}`}
                    onClick={() => setEndpointMethodFilter(m)}
                  >
                    {m}
                  </button>
                ))}
              </div>

              <div className="search-input-wrap">
                <Search size={14} color="#94a3b8" />
                <input
                  type="text"
                  placeholder="Search endpoint paths..."
                  value={endpointSearch}
                  onChange={(e) => setEndpointSearch(e.target.value)}
                  className="studio-search-input"
                />
              </div>
            </div>
          </div>

          {/* Endpoints Table/Cards */}
          <div className="endpoints-matrix-list">
            {filteredEndpoints.length === 0 ? (
              <div className="empty-state-card">
                <Filter size={32} color="#64748b" />
                <p>No endpoints match the selected filter criteria.</p>
              </div>
            ) : (
              filteredEndpoints.map((ep, idx) => {
                const style = getMethodStyle(ep.method);
                const isCopied = copiedEndpointIdx === idx;

                return (
                  <div key={idx} className="endpoint-row-card">
                    <div 
                      className="method-badge-styled"
                      style={{ 
                        backgroundColor: style.bg, 
                        color: style.color, 
                        borderColor: style.border 
                      }}
                    >
                      {ep.method.toUpperCase()}
                    </div>

                    <div className="endpoint-details-col">
                      <div className="endpoint-path-row">
                        <span className="endpoint-path-code">{ep.path}</span>
                        <button
                          type="button"
                          onClick={() => copyPath(ep.path, idx)}
                          className="btn-icon-copy"
                          title="Copy path"
                        >
                          {isCopied ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
                        </button>
                      </div>
                      <p className="endpoint-desc">{ep.description}</p>
                    </div>

                    {ep.file && (
                      <div className="endpoint-file-tag">
                        <Folder size={11} />
                        <span>{ep.file}</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ── TAB: BUSINESS LOGIC WORKFLOWS ── */}
      {activeStudioTab === 'logic' && (
        <div className="studio-logic-cockpit animate-fade-in">
          
          {/* Left: Workflow Selector */}
          <div className="glass-panel logic-sidebar">
            <h4 className="logic-sidebar-title">
              <Brain size={16} color="#a855f7" /> Business Flows ({flows.length})
            </h4>
            <p className="logic-sidebar-desc">
              {business_logic?.app_purpose || "Core business journeys extracted from codebase routing."}
            </p>

            <div className="flows-nav-list">
              {flows.map((flow, fIdx) => (
                <button
                  key={fIdx}
                  type="button"
                  className={`flow-nav-item ${activeFlowIndex === fIdx ? 'active' : ''}`}
                  onClick={() => setActiveFlowIndex(fIdx)}
                >
                  <div className="flow-num-badge">{fIdx + 1}</div>
                  <div className="flow-nav-text">
                    <span className="flow-nav-title">{flow.feature}</span>
                    <span className="flow-step-count">{flow.steps?.length || 0} Stages</span>
                  </div>
                  <ChevronRight size={14} className="flow-arrow" />
                </button>
              ))}
            </div>
          </div>

          {/* Right: Active Workflow Stepper */}
          <div className="glass-panel logic-content-panel">
            {activeFlow ? (
              <div>
                <div className="active-flow-header">
                  <div className="flow-index-tag">Workflow #{activeFlowIndex + 1}</div>
                  <h2 className="active-flow-title">{activeFlow.feature}</h2>
                  <p className="active-flow-subtitle">
                    Step-by-step transaction execution journey through codebase layers.
                  </p>
                </div>

                <div className="flow-timeline-steps">
                  {activeFlow.steps?.map((step, sIdx) => {
                    const isLast = sIdx === (activeFlow.steps.length - 1);

                    return (
                      <div key={sIdx} className="timeline-step-row">
                        <div className="timeline-node-rail">
                          <div className={`timeline-step-orb ${isLast ? 'terminal' : ''}`}>
                            {sIdx + 1}
                          </div>
                          {!isLast && <div className="timeline-step-line" />}
                        </div>

                        <div className="timeline-step-body">
                          <div className="step-number-tag">Stage {sIdx + 1} of {activeFlow.steps.length}</div>
                          <p className="step-explanation-text">{step}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="empty-state-card">
                <Brain size={32} color="#64748b" />
                <p>No business workflows found in analysis data.</p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ── TAB: AI PRESENTATION & GAMMA PPT DECK ── */}
      {activeStudioTab === 'slides' && (
        <PresentationDeck result={result} />
      )}

      {/* ── TAB: AI CO-PILOT CHAT ── */}
      {activeStudioTab === 'chat' && (
        <div className="studio-single-panel animate-fade-in">
          <Chatbox repoUrl={repo_url} />
        </div>
      )}

    </div>
  );
}
