// ============================================================
//  src/components/CommandPalette.jsx
//  21st.dev & Motionsites.ai Inspired Cosmic Command Palette (⌘K)
// ============================================================

import { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Terminal, 
  Film, 
  Sparkles, 
  Cpu, 
  Code2, 
  Bug, 
  BookOpen, 
  Orbit, 
  ExternalLink, 
  ArrowRight, 
  CornerDownLeft,
  X,
  Laptop,
  CheckCircle2,
  Clock
} from 'lucide-react';

export default function CommandPalette({ 
  isOpen, 
  onClose, 
  onNavigate, 
  onAnalyzeRepo,
  recentAnalyses = []
}) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Focus input automatically when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Global Esc and Arrow key navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredItems.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          filteredItems[selectedIndex].action();
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const ALL_ITEMS = [
    // ── Navigation ──
    {
      id: 'nav-dashboard',
      category: 'Navigation',
      label: 'Go to Command Center Dashboard',
      shortcut: 'G D',
      icon: Cpu,
      color: '#38bdf8',
      action: () => onNavigate('dashboard')
    },
    {
      id: 'nav-analyzer',
      category: 'Navigation',
      label: 'Go to Codebase Analyzer',
      shortcut: 'G A',
      icon: Terminal,
      color: '#10b981',
      action: () => onNavigate('analyzer')
    },
    {
      id: 'nav-explore',
      category: 'Navigation',
      label: 'Go to Explore & Video Gallery',
      shortcut: 'G E',
      icon: Film,
      color: '#ec4899',
      action: () => onNavigate('explore')
    },
    {
      id: 'nav-quiz',
      category: 'Navigation',
      label: 'Go to Space Quiz Challenge',
      shortcut: 'G Q',
      icon: Sparkles,
      color: '#818cf8',
      action: () => onNavigate('quiz')
    },

    // ── Quick AI Actions ──
    {
      id: 'act-express',
      category: 'Sample Codebases',
      label: 'Analyze expressjs/express (Node.js REST API)',
      shortcut: 'Repo',
      icon: Code2,
      color: '#38bdf8',
      action: () => onAnalyzeRepo('https://github.com/expressjs/express')
    },
    {
      id: 'act-fastapi',
      category: 'Sample Codebases',
      label: 'Analyze fastapi/fastapi (Python Async Architecture)',
      shortcut: 'Repo',
      icon: Bug,
      color: '#f43f5e',
      action: () => onAnalyzeRepo('https://github.com/fastapi/fastapi')
    },
    {
      id: 'act-react',
      category: 'Sample Codebases',
      label: 'Analyze facebook/react (Concurrent UI Engine)',
      shortcut: 'Repo',
      icon: Orbit,
      color: '#38bdf8',
      action: () => onAnalyzeRepo('https://github.com/facebook/react')
    },
    {
      id: 'act-redux',
      category: 'Sample Codebases',
      label: 'Analyze reduxjs/redux (Predictable State Container)',
      shortcut: 'Repo',
      icon: BookOpen,
      color: '#818cf8',
      action: () => onAnalyzeRepo('https://github.com/reduxjs/redux')
    }
  ];

  // Include recent analyses if available
  const recentItems = recentAnalyses.map((item, idx) => ({
    id: `recent-${idx}`,
    category: 'Recent Activity',
    label: `Resume ${item.repo || item.title || 'Codebase'}`,
    shortcut: item.timestamp || 'Recent',
    icon: Clock,
    color: '#38bdf8',
    action: () => onAnalyzeRepo(item.url || `https://github.com/${item.repo}`)
  }));

  const combinedItems = [...recentItems, ...ALL_ITEMS];

  const filteredItems = combinedItems.filter(item => 
    item.label.toLowerCase().includes(query.toLowerCase()) ||
    item.category.toLowerCase().includes(query.toLowerCase())
  );

  // Group by category
  const categories = Array.from(new Set(filteredItems.map(i => i.category)));

  if (!isOpen) return null;

  return (
    <div className="command-palette-backdrop animate-fade-in" onClick={onClose}>
      <div 
        className="command-palette-modal glass-panel animate-scale-in"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Carbon Command Menu"
      >
        {/* Search Input Bar */}
        <div className="palette-input-wrapper">
          <Search size={18} className="palette-search-icon" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search actions... (e.g. 'Analyze', 'Quiz', 'Dashboard')"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="palette-input"
            aria-label="Search commands"
          />
          <button 
            type="button" 
            className="palette-close-btn" 
            onClick={onClose}
            aria-label="Close command palette"
          >
            <kbd className="palette-kbd">ESC</kbd>
          </button>
        </div>

        {/* Results List */}
        <div ref={listRef} className="palette-list-container">
          {filteredItems.length > 0 ? (
            categories.map((cat) => {
              const itemsInCat = filteredItems.filter(i => i.category === cat);
              return (
                <div key={cat} className="palette-category-group">
                  <div className="palette-category-header">{cat}</div>
                  {itemsInCat.map((item) => {
                    const globalIdx = filteredItems.indexOf(item);
                    const isSelected = globalIdx === selectedIndex;
                    const Icon = item.icon;

                    return (
                      <div
                        key={item.id}
                        className={`palette-item-row ${isSelected ? 'selected' : ''}`}
                        onClick={() => {
                          item.action();
                          onClose();
                        }}
                        onMouseEnter={() => setSelectedIndex(globalIdx)}
                        role="option"
                        aria-selected={isSelected}
                      >
                        <div className="palette-item-icon-box" style={{ color: item.color, backgroundColor: `${item.color}15` }}>
                          <Icon size={16} />
                        </div>
                        <span className="palette-item-label">{item.label}</span>
                        {item.shortcut && (
                          <span className="palette-item-shortcut">{item.shortcut}</span>
                        )}
                        {isSelected && (
                          <CornerDownLeft size={13} className="palette-enter-hint" />
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })
          ) : (
            <div className="palette-empty-state">
              <Sparkles size={24} color="#64748b" />
              <p>No matching commands found for &ldquo;{query}&rdquo;</p>
              <span>Try typing &ldquo;analyze&rdquo;, &ldquo;dashboard&rdquo;, or &ldquo;quiz&rdquo;</span>
            </div>
          )}
        </div>

        {/* Footer Navigation Hints */}
        <div className="palette-footer">
          <div className="palette-footer-hint">
            <kbd className="palette-kbd">↑</kbd>
            <kbd className="palette-kbd">↓</kbd>
            <span>to navigate</span>
          </div>
          <div className="palette-footer-hint">
            <kbd className="palette-kbd">↵</kbd>
            <span>to select</span>
          </div>
          <div className="palette-footer-hint">
            <kbd className="palette-kbd">ESC</kbd>
            <span>to close</span>
          </div>
        </div>
      </div>
    </div>
  );
}
