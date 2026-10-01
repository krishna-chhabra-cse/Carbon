import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Flame, GitBranch, Share2, Code, Shield, Box, Terminal, Copy, ArrowRight, Loader2 } from 'lucide-react';

const isDev = import.meta.env.DEV;
const apiUrl = (import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL.trim()) 
  ? import.meta.env.VITE_API_URL.trim().replace(/\/+$/, '') 
  : (isDev ? 'http://localhost:3002' : 'https://carbon-backend-a1sg.onrender.com');

export default function RoastPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [repoUrl, setRepoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [roastData, setRoastData] = useState(null);
  const [error, setError] = useState('');

  const loadingMessages = [
    'Cloning repository... hope it\'s not 10GB.',
    'Building AST Skeleton... cracking some bones.',
    'Mapping architecture... looking for spaghetti.',
    'Scanning for secrets... checking under the rug.',
    'Analyzing code smells... sniffing around.',
    'Warming up the grill... preparing the roast.'
  ];

  useEffect(() => {
    if (id) {
      fetchRoast(id);
    }
  }, [id]);

  useEffect(() => {
    if (loading) {
      const interval = setInterval(() => {
        setLoadingStep(s => Math.min(s + 1, loadingMessages.length - 1));
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [loading]);

  const fetchRoast = async (roastId) => {
    try {
      setLoading(true);
      const res = await axios.get(`${apiUrl}/api/roast/${roastId}`);
      if (res.data.status === 'success') {
        setRoastData(res.data);
      } else {
        setError('Roast not found.');
      }
    } catch (err) {
      setError('Failed to fetch roast.');
    } finally {
      setLoading(false);
    }
  };

  const handleRoast = async (e) => {
    e.preventDefault();
    if (!repoUrl) return;
    
    setError('');
    setLoading(true);
    setLoadingStep(0);
    setRoastData(null);

    try {
      const res = await axios.post(`${apiUrl}/api/roast`, {
        repo_url: repoUrl,
        architecture_info: {},
        security_info: {}
      });

      if (res.data.status === 'success') {
        navigate(`/roast/${res.data.id}`);
      } else {
        setError(res.data.error || 'Failed to generate roast.');
        setLoading(false);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Server error occurred while roasting.');
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(window.location.href);
    alert('Link copied to clipboard!');
  };

  const shareOnX = () => {
    if (!roastData) return;
    const { grade, title } = roastData.roast;
    const tweet = `Carbon AI just roasted my codebase: ${grade} - "${title}" 🔥\n\nThink your code is clean? Prove it.\n${window.location.href}`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}`, '_blank');
  };

  // ── UI Helpers ──
  const colors = {
    bg: '#0a0a0a',
    card: '#121212',
    border: '#262626',
    primary: '#ef4444', // Red-500 for flame
    primaryHover: '#dc2626',
    textMain: '#f5f5f5',
    textMuted: '#a3a3a3'
  };

  if (loading && !roastData) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: colors.bg, color: colors.textMain, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <Flame size={64} color={colors.primary} style={{ animation: 'pulse 1.5s infinite' }} />
        <h2 style={{ marginTop: '24px', fontSize: '24px', fontWeight: 'bold' }}>
          {loadingMessages[loadingStep]}
        </h2>
        <style>
          {`
            @keyframes pulse {
              0% { transform: scale(1); opacity: 1; }
              50% { transform: scale(1.2); opacity: 0.8; }
              100% { transform: scale(1); opacity: 1; }
            }
          `}
        </style>
      </div>
    );
  }

  if (roastData) {
    const r = roastData.roast;
    return (
      <div style={{ minHeight: '100vh', backgroundColor: colors.bg, color: colors.textMain, padding: '40px 20px', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
            <Link to="/" style={{ color: colors.textMuted, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
              <ArrowRight size={20} style={{ transform: 'rotate(180deg)' }} /> Back to Carbon
            </Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: colors.primary, fontWeight: '900', fontSize: '20px' }}>
              <Flame size={24} /> ROAST MY CODEBASE
            </div>
          </div>

          {/* The Viral Card */}
          <div style={{ 
            backgroundColor: colors.card, 
            border: `1px solid ${colors.border}`, 
            borderRadius: '16px', 
            overflow: 'hidden',
            boxShadow: '0 20px 40px rgba(239, 68, 68, 0.1)'
          }}>
            <div style={{ padding: '40px', borderBottom: `1px solid ${colors.border}`, backgroundColor: '#171717' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ margin: '0 0 8px 0', color: colors.textMuted, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Codebase Autopsy • {roastData.repo_name}
                  </h3>
                  <h1 style={{ margin: 0, fontSize: '42px', fontWeight: '900', lineHeight: 1.1 }}>
                    {r.title}
                  </h1>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '48px', fontWeight: '900', color: r.overall_score > 70 ? '#10b981' : r.overall_score > 40 ? '#f59e0b' : '#ef4444' }}>
                    {r.overall_score}
                  </div>
                  <div style={{ color: colors.textMuted, fontSize: '14px', fontWeight: 'bold' }}>
                    / 100 SCORE
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '32px', padding: '24px', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderLeft: `4px solid ${colors.primary}`, borderRadius: '0 8px 8px 0' }}>
                <p style={{ margin: 0, fontSize: '20px', lineHeight: 1.5, fontStyle: 'italic', fontWeight: '500' }}>
                  "{r.roast}"
                </p>
                <div style={{ marginTop: '12px', fontSize: '14px', color: colors.primary, fontWeight: 'bold' }}>
                  GRADE: {r.grade} • {r.severity}
                </div>
              </div>
            </div>

            <div style={{ padding: '40px' }}>
              
              <h4 style={{ margin: '0 0 20px 0', fontSize: '18px', color: colors.textMuted }}>THE WORST OFFENDER</h4>
              <div style={{ border: `1px solid ${colors.border}`, borderRadius: '8px', padding: '20px', marginBottom: '40px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', color: '#f87171', marginBottom: '8px' }}>
                  <Terminal size={18} /> {r.worst_offender.file}
                </div>
                <div style={{ color: colors.textMain, fontSize: '16px', marginBottom: '4px' }}>
                  {r.worst_offender.reason}
                </div>
                <div style={{ color: colors.textMuted, fontSize: '14px' }}>
                  Evidence: {r.worst_offender.metric}
                </div>
              </div>

              {r.top_crimes?.length > 0 && (
                <>
                  <h4 style={{ margin: '0 0 20px 0', fontSize: '18px', color: colors.textMuted }}>OTHER CRIMES</h4>
                  {r.top_crimes.map((crime, idx) => (
                    <div key={idx} style={{ marginBottom: '24px' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '4px' }}>{crime.title}</div>
                      <div style={{ color: colors.textMuted, fontSize: '14px', marginBottom: '4px' }}>{crime.evidence}</div>
                      <div style={{ color: '#f87171', fontSize: '14px', fontStyle: 'italic' }}>"{crime.roast}"</div>
                    </div>
                  ))}
                </>
              )}

              {r.fixes?.length > 0 && (
                <div style={{ marginTop: '40px', paddingTop: '40px', borderTop: `1px solid ${colors.border}` }}>
                  <h4 style={{ margin: '0 0 20px 0', fontSize: '18px', color: '#10b981' }}>HOW TO FIX IT</h4>
                  {r.fixes.map((fix, idx) => (
                    <div key={idx} style={{ marginBottom: '16px', display: 'flex', gap: '12px' }}>
                      <CheckCircle2 size={20} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <div>
                        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>[{fix.priority}] {fix.title}</div>
                        <div style={{ color: colors.textMuted, fontSize: '14px' }}>{fix.action} ({fix.file})</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
            </div>
          </div>

          {/* Share Actions */}
          <div style={{ display: 'flex', gap: '16px', marginTop: '32px' }}>
            <button onClick={shareOnX} style={{ flex: 1, backgroundColor: '#1da1f2', color: '#fff', border: 'none', padding: '16px', borderRadius: '8px', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '16px' }}>
              <Share2 size={20} /> Share on X
            </button>
            <button onClick={copyToClipboard} style={{ flex: 1, backgroundColor: 'transparent', color: colors.textMain, border: `1px solid ${colors.border}`, padding: '16px', borderRadius: '8px', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '16px' }}>
              <Copy size={20} /> Copy Link
            </button>
          </div>
          
          <div style={{ marginTop: '48px', textAlign: 'center' }}>
            <Link to="/roast" style={{ color: colors.textMuted, fontWeight: 'bold', textDecoration: 'none' }}>
              Roast Another Repository →
            </Link>
          </div>
          <div style={{ marginTop: '24px', textAlign: 'center' }}>
            <Link to="/app" style={{ color: '#10b981', fontWeight: 'bold', textDecoration: 'none' }}>
              Fix this with Carbon AI →
            </Link>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.bg, color: colors.textMain, padding: '40px 20px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: '600px', margin: '80px auto', textAlign: 'center' }}>
        
        <Flame size={64} color={colors.primary} style={{ margin: '0 auto 24px auto' }} />
        <h1 style={{ fontSize: '48px', fontWeight: '900', margin: '0 0 16px 0' }}>
          ROAST MY CODEBASE
        </h1>
        <p style={{ fontSize: '20px', color: colors.textMuted, margin: '0 0 48px 0', lineHeight: 1.5 }}>
          Think your code is clean? Prove it. We'll analyze your repository and tell you how bad it really is.
        </p>

        <form onSubmit={handleRoast} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <input 
            type="text" 
            placeholder="Paste GitHub Repository URL (e.g. https://github.com/user/repo)"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            required
            style={{ 
              width: '100%', 
              padding: '20px', 
              fontSize: '18px', 
              backgroundColor: colors.card, 
              border: `2px solid ${colors.border}`, 
              borderRadius: '12px', 
              color: '#fff',
              outline: 'none'
            }}
          />
          {error && <div style={{ color: colors.primary, fontWeight: 'bold' }}>{error}</div>}
          <button 
            type="submit" 
            style={{ 
              backgroundColor: colors.primary, 
              color: '#fff', 
              border: 'none', 
              padding: '20px', 
              fontSize: '20px', 
              fontWeight: 'bold', 
              borderRadius: '12px',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '12px'
            }}
          >
            Roast It 🔥
          </button>
        </form>

        <div style={{ marginTop: '48px', color: colors.textMuted, fontSize: '14px' }}>
          By roasting your codebase, you agree to let Carbon AI judge your life choices.
        </div>
        
        <div style={{ marginTop: '32px' }}>
          <Link to="/" style={{ color: colors.textMuted, textDecoration: 'none' }}>
            ← Back to Carbon
          </Link>
        </div>

      </div>
    </div>
  );
}

// Need to define a small dummy CheckCircle2 component in lucide-react if missing, 
// but it should exist. If it throws, we can replace it later.
