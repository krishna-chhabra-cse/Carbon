import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Flame, GitBranch, Share2, Code, Shield, Box, Terminal, Copy, ArrowLeft, Loader2, Info } from 'lucide-react';

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
  const [toastMessage, setToastMessage] = useState('');

  const loadingMessages = [
    'Cloning repository...',
    'Building AST Skeleton...',
    'Mapping architecture...',
    'Scanning for secrets...',
    'Analyzing code smells...',
    'Warming up the grill...'
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
      }, 2000);
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
    setToastMessage('Link copied to clipboard!');
    setTimeout(() => setToastMessage(''), 3000);
  };

  const shareOnX = () => {
    if (!roastData) return;
    const { grade, title } = roastData.roast;
    const tweet = `Carbon AI just roasted my codebase: ${grade} - "${title}" 🔥\n\nThink your code is clean? Prove it.\n${window.location.href}`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}`, '_blank');
  };

  if (loading && !roastData) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 font-sans">
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.8, 1, 0.8] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <Flame size={64} className="text-orange-500" />
        </motion.div>
        <div className="mt-8 h-8 flex items-center justify-center overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.h2 
              key={loadingStep}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              className="text-xl font-medium text-neutral-400 font-mono"
            >
              {'>'} {loadingMessages[loadingStep]}
            </motion.h2>
          </AnimatePresence>
        </div>
      </div>
    );
  }

  if (roastData) {
    const r = roastData.roast;
    const getScoreColor = (score) => {
      if (score > 80) return 'text-emerald-400';
      if (score > 50) return 'text-amber-400';
      return 'text-red-500';
    };

    return (
      <div className="min-h-screen bg-[#050505] text-neutral-200 p-6 md:p-12 font-sans selection:bg-orange-500/30">
        <div className="max-w-4xl mx-auto">
          
          {/* Header */}
          <header className="flex justify-between items-center mb-12">
            <Link to="/" className="flex items-center gap-2 text-sm font-medium text-neutral-400 hover:text-white transition-colors">
              <ArrowLeft size={16} /> Back to Carbon
            </Link>
            <div className="flex items-center gap-2 text-orange-500 font-bold tracking-widest text-sm">
              <Flame size={16} /> ROAST MY CODEBASE
            </div>
          </header>

          {/* Main Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden shadow-2xl shadow-orange-900/10"
          >
            {/* Top Section */}
            <div className="p-8 md:p-12 border-b border-white/5 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 via-red-500 to-rose-600" />
              
              <div className="flex flex-col md:flex-row justify-between items-start gap-8">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="px-3 py-1 bg-neutral-900 border border-white/10 rounded-full text-xs font-mono text-neutral-400 uppercase tracking-wider">
                      Codebase Autopsy
                    </span>
                    <span className="text-sm text-neutral-500 font-mono">{roastData.repo_name}</span>
                  </div>
                  <h1 className="text-4xl md:text-5xl font-black text-white leading-tight tracking-tight mb-2">
                    {r.title}
                  </h1>
                </div>
                
                <div className="flex flex-col items-end shrink-0">
                  <div className={`text-6xl md:text-7xl font-black tracking-tighter ${getScoreColor(r.overall_score)}`}>
                    {r.overall_score}
                  </div>
                  <div className="text-sm font-bold text-neutral-500 tracking-widest mt-1">
                    / 100 SCORE
                  </div>
                </div>
              </div>

              {/* The Roast */}
              <div className="mt-10 p-6 md:p-8 bg-gradient-to-br from-red-500/10 to-orange-500/5 border border-red-500/20 rounded-xl relative">
                <div className="absolute -top-3 -left-3 text-red-500/20">
                  <Flame size={48} />
                </div>
                <p className="relative text-xl md:text-2xl font-medium text-white/90 leading-relaxed italic z-10">
                  "{r.roast}"
                </p>
                <div className="mt-6 flex items-center gap-3">
                  <span className="px-3 py-1 bg-red-500/20 text-red-400 text-xs font-bold rounded uppercase tracking-wider">
                    Grade: {r.grade}
                  </span>
                  <span className="px-3 py-1 bg-orange-500/20 text-orange-400 text-xs font-bold rounded uppercase tracking-wider">
                    {r.severity}
                  </span>
                </div>
              </div>
            </div>

            {/* Evidence Section */}
            <div className="p-8 md:p-12 bg-[#050505]">
              <div className="mb-12">
                <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <Terminal size={16} /> The Worst Offender
                </h3>
                <div className="bg-neutral-950 border border-white/10 rounded-xl p-6 hover:border-red-500/30 transition-colors">
                  <div className="font-mono text-sm text-red-400 mb-3 break-all">
                    {r.worst_offender.file}
                  </div>
                  <p className="text-white text-lg font-medium mb-2">{r.worst_offender.reason}</p>
                  <p className="text-neutral-400 text-sm font-mono bg-white/5 p-2 rounded inline-block">
                    Evidence: {r.worst_offender.metric}
                  </p>
                </div>
              </div>

              {r.top_crimes?.length > 0 && (
                <div className="mb-12">
                  <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-widest mb-6">
                    Other Crimes
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {r.top_crimes.map((crime, idx) => (
                      <div key={idx} className="bg-neutral-900/50 border border-white/5 rounded-xl p-5 hover:bg-neutral-900 transition-colors">
                        <div className="font-bold text-white mb-2">{crime.title || crime.crime || "Coding Sin"}</div>
                        <div className="text-xs font-mono text-neutral-400 mb-3 line-clamp-2">{crime.evidence}</div>
                        <div className="text-sm text-orange-300/80 italic border-l-2 border-orange-500/30 pl-3">
                          "{crime.roast}"
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {r.fixes?.length > 0 && (
                <div className="border-t border-white/10 pt-12">
                  <h3 className="text-sm font-bold text-emerald-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <CheckCircle2 size={16} /> How to fix it
                  </h3>
                  <div className="space-y-4">
                    {r.fixes.map((fix, idx) => (
                      <div key={idx} className="flex gap-4 items-start bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-5">
                        <div className="mt-1">
                          <CheckCircle2 size={20} className="text-emerald-400" />
                        </div>
                        <div>
                          <h4 className="text-white font-medium mb-1">
                            {fix.priority && <span className="text-emerald-400 font-mono text-xs mr-2">[{fix.priority}]</span>}
                            {fix.title}
                          </h4>
                          <p className="text-neutral-400 text-sm">{fix.action}</p>
                          <p className="text-xs font-mono text-neutral-500 mt-2">{fix.file}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Share Actions */}
          <div className="mt-8 flex flex-col md:flex-row gap-4">
            <button 
              onClick={shareOnX}
              className="flex-1 bg-white hover:bg-neutral-200 text-black font-bold py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-2 group"
            >
              <Share2 size={18} className="group-hover:scale-110 transition-transform" /> 
              Share on X
            </button>
            <button 
              onClick={copyToClipboard}
              className="flex-1 bg-neutral-900 hover:bg-neutral-800 border border-white/10 text-white font-medium py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              {toastMessage ? <CheckCircle2 size={18} className="text-emerald-400" /> : <Copy size={18} />}
              {toastMessage ? 'Copied!' : 'Copy Link'}
            </button>
          </div>

          <div className="mt-12 text-center flex flex-col gap-4">
            <Link to="/roast" className="text-neutral-500 hover:text-white text-sm font-medium transition-colors inline-flex items-center justify-center gap-2">
              Roast Another Repository <ArrowLeft size={14} className="rotate-180" />
            </Link>
            <Link to="/app" className="text-orange-500 hover:text-orange-400 text-sm font-bold transition-colors inline-flex items-center justify-center gap-2">
              Fix this with Carbon AI <ArrowLeft size={14} className="rotate-180" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col justify-between p-6 md:p-8 font-sans relative overflow-hidden">
      
      {/* Subtle Background Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-gradient-to-tr from-cyan-500/10 via-purple-500/10 to-orange-500/10 blur-[140px] rounded-full pointer-events-none"></div>

      {/* Top Navbar */}
      <header className="w-full max-w-6xl mx-auto flex items-center justify-between relative z-20 py-2">
        <Link 
          to="/" 
          className="text-neutral-400 hover:text-white transition-all inline-flex items-center gap-2.5 text-sm font-medium px-4 py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 hover:border-white/20"
        >
          <ArrowLeft size={16} /> Back to Carbon
        </Link>
        <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-orange-400 px-3.5 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20">
          <Flame size={14} /> AI Code Roaster
        </div>
      </header>

      {/* Main Centered Content with Generous Breathing Room */}
      <main className="w-full max-w-3xl mx-auto text-center relative z-10 flex flex-col items-center justify-center py-10 md:py-16">
        
        {/* Fire Icon Badge */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-b from-orange-500/20 to-orange-500/5 border border-orange-500/30 flex items-center justify-center shadow-[0_0_35px_rgba(249,115,22,0.35)]">
            <Flame size={44} className="text-orange-500 drop-shadow-[0_0_15px_rgba(249,115,22,0.8)]" />
          </div>
        </motion.div>

        {/* Heading */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="mb-8 w-full"
        >
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight text-white uppercase leading-tight drop-shadow-xl">
            ROAST MY<br />CODEBASE
          </h1>
        </motion.div>

        {/* Subtitle with generous spacing */}
        <motion.p 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="text-lg sm:text-xl md:text-2xl text-neutral-400 leading-relaxed max-w-xl mx-auto mb-12 font-normal"
        >
          Think your code is clean? Prove it. We'll analyze your repository and tell you how bad it really is.
        </motion.p>

        {/* Form with roomy inputs and buttons */}
        <motion.form 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          onSubmit={handleRoast} 
          className="w-full max-w-xl space-y-5"
        >
          {/* Input */}
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
              <GitBranch size={22} className="text-neutral-500 group-focus-within:text-cyan-400 transition-colors" />
            </div>
            <input 
              type="url" 
              placeholder="https://github.com/user/repo"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              required
              className="w-full pl-14 pr-6 py-5 bg-[#0a0f16]/90 border-2 border-cyan-500/60 rounded-2xl text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/25 transition-all font-mono text-base md:text-lg shadow-[0_0_20px_rgba(6,182,212,0.15)] hover:shadow-[0_0_30px_rgba(6,182,212,0.25)]"
            />
          </div>
          
          {error && (
            <div className="flex items-center justify-center gap-3 text-red-400 text-sm font-medium bg-red-500/10 py-4 px-6 rounded-2xl border border-red-500/20">
              <Info size={18} /> {error}
            </div>
          )}

          {/* Button */}
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-gradient-to-r from-[#38bdf8] via-[#818cf8] to-[#c084fc] hover:opacity-95 text-white disabled:opacity-50 disabled:cursor-not-allowed font-bold py-5 px-8 rounded-2xl transition-all flex items-center justify-center gap-3 text-lg md:text-xl shadow-[0_0_30px_rgba(168,85,247,0.35)] hover:shadow-[0_0_40px_rgba(168,85,247,0.5)] hover:scale-[1.01] active:scale-[0.99]"
          >
            {loading ? <Loader2 size={26} className="animate-spin text-white" /> : 'Roast It'}
            {!loading && <Flame size={24} className="text-white" />}
          </button>
        </motion.form>

        {/* Feature Highlights Pills for modern template spacing */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-12 flex flex-wrap items-center justify-center gap-3 text-xs md:text-sm text-neutral-400"
        >
          <span className="px-4 py-2 rounded-xl bg-white/[0.03] border border-white/10 flex items-center gap-2">
            <Terminal size={14} className="text-cyan-400" /> Deep AST Scan
          </span>
          <span className="px-4 py-2 rounded-xl bg-white/[0.03] border border-white/10 flex items-center gap-2">
            <Shield size={14} className="text-purple-400" /> Security & Smells
          </span>
          <span className="px-4 py-2 rounded-xl bg-white/[0.03] border border-white/10 flex items-center gap-2">
            <Code size={14} className="text-emerald-400" /> Actionable Fixes
          </span>
        </motion.div>
      </main>

      {/* Footer pinned at the bottom */}
      <footer className="w-full text-center py-4 text-xs md:text-sm text-neutral-600 relative z-20">
        By roasting your codebase, you agree to let Carbon AI judge your life choices.
      </footer>
    </div>
  );
}
