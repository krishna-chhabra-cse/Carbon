// ============================================================
//  src/components/Navbar.jsx
//
//  Cinematic Space Navigation Bar for Carbon.
//  Features: Carbon Atom brand mark, smooth section routing,
//  AI Mesh status pill, and responsive mobile navigation drawer.
// ============================================================

import { useState, useEffect } from 'react';
import { 
  Compass, 
  Orbit, 
  Terminal, 
  Layers, 
  Sparkles, 
  Menu, 
  X, 
  Tv, 
  Cpu,
  Film,
  Search
} from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, onOpenPalette }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Cpu },
    { id: 'analyzer', label: 'Analyzer', icon: Terminal },
    { id: 'explore', label: 'Explore', icon: Film },
    { id: 'quiz', label: 'Space Quiz', icon: Sparkles },
  ];

  const handleNavClick = (id) => {
    setActiveTab(id);
    setMobileOpen(false);
    // Smooth scroll to top when changing views
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <nav className={`carbon-navbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="nav-container">
        
        {/* ── BRAND LOGO ── */}
        <div 
          className="brand-logo" 
          onClick={() => handleNavClick('analyzer')} 
          role="button" 
          tabIndex={0}
        >
          <div className="carbon-atom-icon">
            <div className="atom-core"></div>
            <div className="atom-ring ring-1"></div>
            <div className="atom-ring ring-2"></div>
          </div>
          <div className="brand-text-group">
            <span className="brand-name">CARBON</span>
            <span className="brand-tagline">AI CODE INTELLIGENCE</span>
          </div>
        </div>

        {/* ── DESKTOP NAV LINKS ── */}
        <div className="desktop-nav-links">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={`nav-link-btn ${isActive ? 'active' : ''}`}
                onClick={() => handleNavClick(item.id)}
              >
                <Icon size={16} />
                <span>{item.label}</span>
                {isActive && <div className="active-dot-glow" />}
              </button>
            );
          })}
        </div>

        {/* ── RIGHT ACTION GROUP ── */}
        <div className="nav-actions">
          {/* ⌘K Spotlight Trigger Button */}
          {onOpenPalette && (
            <button
              type="button"
              className="nav-search-btn"
              onClick={onOpenPalette}
              title="Open Command Palette (Ctrl+K or ⌘K)"
              aria-label="Open Command Menu"
            >
              <Search size={14} color="#94a3b8" />
              <span className="nav-search-label">Quick search...</span>
              <kbd className="nav-kbd">⌘K</kbd>
            </button>
          )}

          {/* Live AI Mesh Badge */}
          <div className="ai-mesh-pill">
            <span className="live-pulse-dot"></span>
            <span className="mesh-text">AI Online</span>
          </div>

          {/* Mobile Menu Toggle */}
          <button 
            type="button" 
            className="mobile-menu-toggle"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle Navigation Menu"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

      </div>

      {/* ── MOBILE MENU DRAWER ── */}
      {mobileOpen && (
        <div className="mobile-nav-drawer animate-fade-in">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={`mobile-nav-item ${isActive ? 'active' : ''}`}
                onClick={() => handleNavClick(item.id)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </nav>
  );
}
