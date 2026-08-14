import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

// Initialize mermaid settings with Nord (arctic blues and grays)
mermaid.initialize({
  startOnLoad: false,
  theme: 'base',
  securityLevel: 'loose',
  fontFamily: 'Inter, sans-serif',
  themeVariables: {
    primaryColor: '#3b4252',
    primaryTextColor: '#eceff4',
    primaryBorderColor: '#88c0d0',
    lineColor: '#81a1c1',
    textColor: '#eceff4',
    mainBkg: '#3b4252',
    nodeBorder: '#88c0d0',
    clusterBkg: 'rgba(67, 76, 94, 0.4)',
    clusterBorder: '#81a1c1'
  }
});

/**
 * Split a string containing multiple --> connections into individual lines.
 * 
 * Uses [\w.-]+ for node IDs (not \S+ which breaks at spaces inside brackets)
 * and \[[^\]]*\] for optional bracket labels (correctly handles spaces inside).
 */
function splitConnections(str) {
  if (!str.trim()) return [];

  // A node is: word-chars (plus dots/hyphens), optionally followed by [any text until ]
  const nodePattern = '[\\w.-]+(?:\\[[^\\]]*\\])?';
  // An arrow is: --> optionally followed by |label text|
  const arrowPattern = '-->(?:\\|[^|]*\\|)?';

  const fullPattern = new RegExp(
    `(${nodePattern})\\s*(${arrowPattern})\\s*(${nodePattern})`, 'g'
  );

  const matches = [];
  let m;
  while ((m = fullPattern.exec(str)) !== null) {
    matches.push(`    ${m[1]} ${m[2]} ${m[3]}`);
  }

  // If no connections found, return the original line (might be a standalone node)
  if (matches.length === 0) {
    const standaloneNode = str.trim().match(/^[\w.-]+(?:\[[^\]]*\])?$/);
    if (standaloneNode) return [`    ${str.trim()}`];

    // Handle multiple standalone nodes on the same line like "E[Routes] F[Middleware]"
    if (!str.includes('-->')) {
      const multipleNodesPattern = new RegExp(`(${nodePattern})`, 'g');
      const nodes = str.match(multipleNodesPattern);
      if (nodes && nodes.length > 0) {
        return nodes.map(n => `    ${n}`);
      }
    }

    return [str.trim()];
  }

  return matches;
}

/**
 * Sanitize Mermaid diagram string from Gemini.
 */
function sanitizeMermaid(raw) {
  let chart = raw.trim();

  // 1. Strip markdown code fences
  chart = chart.replace(/^```mermaid\s*/i, '');
  chart = chart.replace(/^```\s*/i, '');
  chart = chart.replace(/```\s*$/i, '');

  // 2. Convert literal \n to real newlines
  chart = chart.replace(/\\n/g, '\n');

  // 3. Flatten into one string for re-parsing
  let flat = chart.split('\n').map(l => l.trim()).filter(l => l.length > 0).join(' ');

  // 4. Insert newlines before/after Mermaid keywords
  flat = flat.replace(/\s+(subgraph\s)/gi, '\n$1');
  flat = flat.replace(/\s+(end)\b/gi, '\n$1');

  // 5. Process line by line
  let lines = flat.split('\n');
  const result = [];
  let openSubgraphs = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // "graph TD" — keep as is
    if (/^graph\s/i.test(trimmed)) {
      result.push(trimmed);
      continue;
    }

    // "end" — close subgraph
    if (/^end$/i.test(trimmed)) {
      if (openSubgraphs > 0) openSubgraphs--;
      result.push('end');
      continue;
    }

    // "subgraph Name ..." — extract name, process remaining content
    const subMatch = trimmed.match(/^(subgraph\s+[\w.-]+)\s*(.*)/i);
    if (subMatch) {
      openSubgraphs++;
      result.push(subMatch[1]);
      if (subMatch[2] && subMatch[2].trim()) {
        result.push(...splitConnections(subMatch[2]));
      }
      continue;
    }

    // Regular line — split connections
    result.push(...splitConnections(trimmed));
  }

  // 6. Close any unclosed subgraphs
  while (openSubgraphs > 0) {
    result.push('end');
    openSubgraphs--;
  }

  // 7. Remove parentheses/curly braces from inside bracket labels
  const cleaned = result.map(line => {
    return line.replace(/\[([^\]]*)\]/g, (_match, label) => {
      const safe = label.replace(/[(){}]/g, '');
      return `[${safe}]`;
    });
  });

  const final = cleaned.join('\n');
  console.log("Sanitized Mermaid:\n", final);
  return final;
}

import { Copy, Check, Code, ExternalLink } from 'lucide-react';

export default function ArchitectureDiagram({ chart }) {
  const containerRef = useRef(null);
  const [error, setError] = useState(null);
  const [rawChart, setRawChart] = useState(null);
  const [showRaw, setShowRaw] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (chart && containerRef.current) {
      setError(null);
      setRawChart(null);

      const cleanChart = sanitizeMermaid(chart);
      const id = `mermaid-svg-${Math.round(Math.random() * 10000000)}`;

      try {
        mermaid.render(id, cleanChart).then((result) => {
          if (containerRef.current) {
            containerRef.current.innerHTML = result.svg;
          }
        }).catch((err) => {
          console.error("Mermaid render error:", err);
          setError(err.message || "Invalid Mermaid syntax");
          setRawChart(cleanChart);
        });
      } catch (err) {
        console.error("Mermaid exception:", err);
        setError(err.message || "Exception while rendering");
        setRawChart(cleanChart);
      }
    }
  }, [chart]);

  const handleCopy = () => {
    if (!chart) return;
    navigator.clipboard.writeText(sanitizeMermaid(chart));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!chart) return null;

  return (
    <div className="mermaid-container animate-fade-in" style={{ marginTop: '16px' }}>
      {/* Diagram Toolbar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
        paddingBottom: '12px',
        borderBottom: '1px solid var(--panel-border)',
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          Interactive Flowchart Visualization
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={handleCopy}
            className="btn-outline"
            style={{ padding: '6px 12px', fontSize: '12px', height: 'auto' }}
          >
            {copied ? <Check size={14} color="#22c55e" /> : <Copy size={14} />}
            {copied ? 'Copied!' : 'Copy Code'}
          </button>
          <button
            type="button"
            onClick={() => setShowRaw(!showRaw)}
            className="btn-outline"
            style={{ padding: '6px 12px', fontSize: '12px', height: 'auto' }}
          >
            <Code size={14} />
            {showRaw ? 'Hide Source' : 'View Source'}
          </button>
          <a
            href={`https://mermaid.live/edit#pako:${btoa(unescape(encodeURIComponent(JSON.stringify({ code: sanitizeMermaid(chart), mermaid: { theme: 'dark' } }))))}`}
            target="_blank"
            rel="noreferrer"
            className="btn-outline"
            style={{ padding: '6px 12px', fontSize: '12px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-main)' }}
          >
            <ExternalLink size={14} />
            Mermaid Live
          </a>
        </div>
      </div>

      {/* Rendered SVG or Error */}
      {error ? (
        <div style={{ padding: '20px', background: 'rgba(239, 68, 68, 0.1)', color: '#fca5a5', borderRadius: '8px', overflowX: 'auto', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
          <h4 style={{ margin: '0 0 10px 0' }}>⚠️ Could not render diagram</h4>
          <p style={{ margin: '0 0 15px 0', fontSize: '14px', color: '#94a3b8' }}>
            The diagram syntax could not be rendered as SVG. Raw source code:
          </p>
          <pre style={{ fontSize: '13px', margin: 0, whiteSpace: 'pre-wrap', color: '#e2e8f0' }}>{rawChart || chart}</pre>
        </div>
      ) : (
        <div ref={containerRef} style={{ display: 'flex', justifyContent: 'center', overflowX: 'auto', padding: '16px 0' }} />
      )}

      {/* Raw Source Toggle */}
      {showRaw && (
        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--panel-border)' }}>
          <pre style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '8px', fontSize: '13px', color: '#818cf8', whiteSpace: 'pre-wrap' }}>
            {sanitizeMermaid(chart)}
          </pre>
        </div>
      )}
    </div>
  );
}
