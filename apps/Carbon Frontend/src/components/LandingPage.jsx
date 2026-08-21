import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function LandingPage() {
  const [terminalLines, setTerminalLines] = useState([]);
  const fullTerminalLines = [
    '$ carbon scan github.com/your-org/backend',
    '🔍 Scanning 124 files...',
    '🔑 Checking for leaked credentials...',
    '🛡️ Running OWASP taint analysis...',
    '✅ Security Grade: A+ | 0 vulnerabilities | 0 leaked secrets',
    '⚡ Completed in 39.78ms'
  ];

  useEffect(() => {
    let currentLine = 0;
    const interval = setInterval(() => {
      if (currentLine < fullTerminalLines.length) {
        setTerminalLines(prev => [...prev, fullTerminalLines[currentLine]]);
        currentLine++;
      } else {
        clearInterval(interval);
      }
    }, 800);
    return () => clearInterval(interval);
  }, []);

  const [hoveredCard, setHoveredCard] = useState(null);

  const colors = {
    bg: '#0d1117',
    cardBg: '#161b22',
    border: '#30363d',
    primary: '#10B981',
    textMain: '#e6edf3',
    textMuted: '#8b949e'
  };

  const styles = {
    container: {
      backgroundColor: colors.bg,
      color: colors.textMain,
      minHeight: '100vh',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    },
    section: {
      padding: '80px 20px',
      maxWidth: '1200px',
      margin: '0 auto'
    },
    buttonPrimary: {
      backgroundColor: colors.primary,
      color: '#fff',
      padding: '12px 24px',
      borderRadius: '8px',
      textDecoration: 'none',
      fontWeight: 'bold',
      display: 'inline-block',
      border: 'none',
      cursor: 'pointer'
    },
    buttonSecondary: {
      backgroundColor: 'transparent',
      color: colors.textMain,
      padding: '12px 24px',
      borderRadius: '8px',
      textDecoration: 'none',
      fontWeight: 'bold',
      display: 'inline-block',
      border: `1px solid ${colors.border}`,
      cursor: 'pointer'
    },
    card: (isHovered) => ({
      backgroundColor: colors.cardBg,
      border: `1px solid ${isHovered ? colors.primary : colors.border}`,
      borderRadius: '12px',
      padding: '24px',
      transition: 'all 0.2s ease',
      transform: isHovered ? 'translateY(-2px)' : 'none'
    })
  };

  return (
    <div style={styles.container}>
      {/* 1. HERO */}
      <section style={{ ...styles.section, textAlign: 'center', paddingTop: '120px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '24px' }}>
          <span style={{ fontSize: '32px' }}>🛡️</span>
          <h1 style={{ margin: 0, fontSize: '32px', fontWeight: 'bold' }}>Carbon AI</h1>
        </div>
        <h2 style={{ fontSize: '48px', fontWeight: '800', margin: '0 0 24px 0', lineHeight: 1.2 }}>
          Catch what's leaking before it ships.
        </h2>
        <p style={{ fontSize: '20px', color: colors.textMuted, maxWidth: '800px', margin: '0 auto 40px auto', lineHeight: 1.6 }}>
          Multi-agent DevSecOps intelligence — security scorecards, architecture maps, and blast-radius Q&A for any codebase. Works offline.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '60px' }}>
          <Link to="/app" style={styles.buttonPrimary}>Analyze Your Repo →</Link>
          <a href="https://github.com/krishna-chhabra-cse/Carbon" target="_blank" rel="noreferrer" style={styles.buttonSecondary}>
            View on GitHub
          </a>
        </div>

        {/* Terminal Window */}
        <div style={{
          backgroundColor: '#000',
          border: `1px solid ${colors.border}`,
          borderRadius: '12px',
          maxWidth: '600px',
          margin: '0 auto',
          textAlign: 'left',
          overflow: 'hidden'
        }}>
          <div style={{ backgroundColor: colors.cardBg, padding: '12px 16px', borderBottom: `1px solid ${colors.border}`, display: 'flex', gap: '8px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#ff5f56' }} />
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#ffbd2e' }} />
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#27c93f' }} />
          </div>
          <div style={{ padding: '24px', fontFamily: 'monospace', color: colors.primary, fontSize: '14px', lineHeight: 1.6, minHeight: '180px' }}>
            {terminalLines.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
            <div style={{ display: 'inline-block', width: '8px', height: '16px', backgroundColor: colors.primary, animation: 'blink 1s step-end infinite', marginTop: '4px' }} />
          </div>
        </div>
      </section>

      {/* 2. STATS BAR */}
      <div style={{ borderTop: `1px solid ${colors.border}`, borderBottom: `1px solid ${colors.border}`, backgroundColor: colors.cardBg }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 20px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '24px' }}>
          {[
            "99% Token Reduction",
            "Grade A+",
            "< 40ms Scan",
            "100% Offline Mode"
          ].map((stat, i) => (
            <div key={i} style={{ fontSize: '18px', fontWeight: 'bold', color: colors.textMain }}>{stat}</div>
          ))}
        </div>
      </div>

      {/* 3. PROBLEM */}
      <section style={styles.section}>
        <h2 style={{ fontSize: '36px', textAlign: 'center', marginBottom: '48px' }}>
          Your codebase is a black box. And it might be leaking.
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
          {[
            { icon: '🔑', text: 'A hardcoded AWS key committed at 2am survives 47 commits before anyone notices.' },
            { icon: '🤯', text: 'New engineers spend weeks reverse-engineering architecture that should take hours.' },
            { icon: '🔄', text: 'Every code review misses blast-radius — until production breaks.' }
          ].map((item, i) => (
            <div key={i} style={styles.card(false)}>
              <div style={{ fontSize: '32px', marginBottom: '16px' }}>{item.icon}</div>
              <p style={{ fontSize: '16px', lineHeight: 1.5, margin: 0 }}>{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 4. FEATURES */}
      <section style={styles.section}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
          {[
            { icon: '🛡️', title: 'DevSecOps Security Scanner', text: 'Static taint analysis catches leaked AWS/JWT/Stripe secrets and OWASP Top 10 vulnerabilities before they merge. Outputs a Grade A+ to F scorecard with 1-click remediation diffs.' },
            { icon: '⚡', title: 'AST Token Sieve', text: 'Deterministic code skeletonizer reduces LLM context by 99% (1.15M → 11K tokens) while preserving 100% of architectural signatures. Runs in 39.78ms.' },
            { icon: '🧠', title: 'GraphRAG Blast Radius Q&A', text: "In-memory dependency graph answers 'If I rename the User schema, what routes break?' with citation-backed impact maps." },
            { icon: '🔒', title: 'Air-Gapped Offline Mode', text: 'Run 100% private security audits with Ollama (Qwen2.5/DeepSeek-Coder). Zero internet, zero token cost, enterprise-ready.' }
          ].map((item, i) => (
            <div 
              key={i} 
              style={styles.card(hoveredCard === `feat-${i}`)}
              onMouseEnter={() => setHoveredCard(`feat-${i}`)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <span style={{ fontSize: '24px' }}>{item.icon}</span>
                <h3 style={{ margin: 0, fontSize: '20px' }}>{item.title}</h3>
              </div>
              <p style={{ color: colors.textMuted, lineHeight: 1.6, margin: 0 }}>{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 5. HOW IT WORKS */}
      <section style={styles.section}>
        <h2 style={{ fontSize: '36px', textAlign: 'center', marginBottom: '48px' }}>How it works</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', maxWidth: '800px', margin: '0 auto' }}>
          {[
            { num: '1', icon: '🔗', title: 'Connect', text: 'Paste any GitHub URL or point to a local workspace. Carbon clones and indexes in seconds.' },
            { num: '2', icon: '🤖', title: 'Scan', text: 'LangGraph multi-agent mesh runs Security Auditor, Architecture Mapper, API Analyzer, and Business Logic agents in parallel.' },
            { num: '3', icon: '🛡️', title: 'Fix', text: 'Get your Security Scorecard, interactive architecture diagram, and unified remediation diffs — all in one report.' }
          ].map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: colors.cardBg, border: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 'bold', flexShrink: 0 }}>
                {step.num}
              </div>
              <div>
                <h3 style={{ fontSize: '24px', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {step.icon} {step.title}
                </h3>
                <p style={{ color: colors.textMuted, fontSize: '18px', lineHeight: 1.6, margin: 0 }}>{step.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 6. INTEGRATIONS */}
      <section style={{ ...styles.section, textAlign: 'center' }}>
        <h2 style={{ fontSize: '36px', marginBottom: '48px' }}>Works where your team already works</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px' }}>
          {[
            { title: 'VS Code Extension', text: 'v1.1.0 available now', cta: 'Install' },
            { title: 'GitHub Action', text: 'Zero-install PR reviewer', cta: 'Add to Workflow' },
            { title: 'Chrome Extension', text: 'Side panel intelligence', cta: 'Install' }
          ].map((item, i) => (
            <div key={i} style={{ ...styles.card(false), display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '20px' }}>{item.title}</h3>
              <p style={{ color: colors.textMuted, margin: '0 0 24px 0' }}>{item.text}</p>
              <button style={styles.buttonSecondary}>{item.cta}</button>
            </div>
          ))}
        </div>
      </section>

      {/* 7. PRICING */}
      <section style={styles.section}>
        <h2 style={{ fontSize: '36px', textAlign: 'center', marginBottom: '48px' }}>Pricing</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', alignItems: 'flex-start' }}>
          
          {/* Free Tier */}
          <div style={styles.card(hoveredCard === 'price-free')} onMouseEnter={() => setHoveredCard('price-free')} onMouseLeave={() => setHoveredCard(null)}>
            <h3 style={{ fontSize: '24px', margin: '0 0 8px 0' }}>Free</h3>
            <div style={{ fontSize: '36px', fontWeight: 'bold', marginBottom: '16px' }}>$0<span style={{ fontSize: '16px', color: colors.textMuted }}>/mo</span></div>
            <p style={{ color: colors.textMuted, marginBottom: '24px', minHeight: '60px' }}>Local offline scanning with Ollama. Unlimited repos. VS Code extension. Community support.</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px 0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <li>✅ Ollama offline mode</li>
              <li>✅ VS Code extension</li>
              <li>✅ Security scanner</li>
              <li>✅ Architecture maps</li>
              <li style={{ opacity: 0.5 }}>❌ Cloud AI fleet</li>
              <li style={{ opacity: 0.5 }}>❌ Priority support</li>
            </ul>
            <button style={{ ...styles.buttonSecondary, width: '100%', boxSizing: 'border-box' }}>Start Free</button>
          </div>

          {/* Pro Tier */}
          <div style={{ ...styles.card(true), border: `2px solid ${colors.primary}` }}>
            <div style={{ backgroundColor: colors.primary, color: '#000', fontSize: '12px', fontWeight: 'bold', padding: '4px 8px', borderRadius: '12px', display: 'inline-block', marginBottom: '16px' }}>MOST POPULAR</div>
            <h3 style={{ fontSize: '24px', margin: '0 0 8px 0' }}>Pro</h3>
            <div style={{ fontSize: '36px', fontWeight: 'bold', marginBottom: '16px' }}>$19<span style={{ fontSize: '16px', color: colors.textMuted }}>/mo</span></div>
            <p style={{ color: colors.textMuted, marginBottom: '24px', minHeight: '60px' }}>Full cloud AI fleet with Gemini. Unlimited scans. Priority support.</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px 0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <li>✅ Everything in Free</li>
              <li>✅ Cloud Gemini AI</li>
              <li>✅ GraphRAG Q&A</li>
              <li>✅ Cinema narration</li>
              <li>✅ API access</li>
              <li>✅ Priority support</li>
            </ul>
            <button style={{ ...styles.buttonPrimary, width: '100%', boxSizing: 'border-box' }}>Start Pro Trial</button>
          </div>

          {/* Enterprise Tier */}
          <div style={styles.card(hoveredCard === 'price-ent')} onMouseEnter={() => setHoveredCard('price-ent')} onMouseLeave={() => setHoveredCard(null)}>
            <h3 style={{ fontSize: '24px', margin: '0 0 8px 0' }}>Enterprise</h3>
            <div style={{ fontSize: '36px', fontWeight: 'bold', marginBottom: '16px' }}>Custom</div>
            <p style={{ color: colors.textMuted, marginBottom: '24px', minHeight: '60px' }}>Air-gapped deployment, SSO, audit logs, SLA.</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px 0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <li>✅ Everything in Pro</li>
              <li>✅ Self-hosted deployment</li>
              <li>✅ SSO & SAML</li>
              <li>✅ Audit logging</li>
              <li>✅ Dedicated SLA</li>
              <li>✅ Custom integrations</li>
            </ul>
            <button style={{ ...styles.buttonSecondary, width: '100%', boxSizing: 'border-box' }}>Contact Us</button>
          </div>

        </div>
      </section>

      {/* 8. CTA STRIP */}
      <section style={{ background: 'linear-gradient(to right, #064e3b, #065f46)', padding: '64px 20px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '36px', margin: '0 0 32px 0' }}>Ready to secure your codebase?</h2>
        <Link to="/app" style={styles.buttonPrimary}>Analyze Your First Repo — Free →</Link>
      </section>

      {/* 9. FOOTER */}
      <footer style={{ borderTop: `1px solid ${colors.border}`, padding: '48px 20px 24px 20px', backgroundColor: colors.cardBg }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '24px', marginBottom: '48px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <span style={{ fontSize: '24px' }}>🛡️</span>
              <span style={{ fontSize: '20px', fontWeight: 'bold' }}>Carbon AI</span>
            </div>
            <div style={{ color: colors.textMuted }}>Built by Krishna Chhabra</div>
            <div style={{ color: colors.textMuted }}>MIT License 2026</div>
          </div>
          <div style={{ display: 'flex', gap: '24px' }}>
            <a href="#" style={{ color: colors.textMuted, textDecoration: 'none' }}>GitHub</a>
            <a href="#" style={{ color: colors.textMuted, textDecoration: 'none' }}>VS Code Marketplace</a>
            <a href="#" style={{ color: colors.textMuted, textDecoration: 'none' }}>LinkedIn</a>
          </div>
        </div>
        <div style={{ textAlign: 'center', color: colors.textMuted, fontSize: '14px', paddingTop: '24px', borderTop: `1px solid ${colors.border}` }}>
          Carbon AI — Multi-Agent DevSecOps & Codebase Intelligence Platform
        </div>
      </footer>
    </div>
  );
}
