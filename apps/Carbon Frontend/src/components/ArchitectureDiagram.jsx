import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { Copy, Check, Code, ExternalLink, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

// Initialize mermaid settings with Nord / Deep Space theme
mermaid.initialize({
  startOnLoad: false,
  theme: 'base',
  securityLevel: 'loose',
  fontFamily: 'Inter, system-ui, sans-serif',
  themeVariables: {
    primaryColor: '#0f172a',
    primaryTextColor: '#f8fafc',
    primaryBorderColor: '#38bdf8',
    lineColor: '#38bdf8',
    textColor: '#f8fafc',
    mainBkg: '#090d16',
    nodeBorder: '#38bdf8',
    clusterBkg: 'rgba(15, 23, 42, 0.75)',
    clusterBorder: '#818cf8',
    edgeLabelBackground: '#0b1120',
    tertiaryColor: '#1e293b'
  }
});

function splitConnections(str) {
  if (!str.trim()) return [];

  const nodePattern = '[\\w.-]+(?:\\[[^\\]]*\\])?';
  const arrowPattern = '-->(?:\\|[^|]*\\|)?';

  const fullPattern = new RegExp(
    `(${nodePattern})\\s*(${arrowPattern})\\s*(${nodePattern})`, 'g'
  );

  const matches = [];
  let m;
  while ((m = fullPattern.exec(str)) !== null) {
    matches.push(`    ${m[1]} ${m[2]} ${m[3]}`);
  }

  if (matches.length === 0) {
    const standaloneNode = str.trim().match(/^[\w.-]+(?:\[[^\]]*\])?$/);
    if (standaloneNode) return [`    ${str.trim()}`];

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

function sanitizeMermaid(raw) {
  let chart = raw.trim();

  chart = chart.replace(/^```mermaid\s*/i, '');
  chart = chart.replace(/^```\s*/i, '');
  chart = chart.replace(/```\s*$/i, '');
  chart = chart.replace(/\\n/g, '\n');

  let flat = chart.split('\n').map(l => l.trim()).filter(l => l.length > 0).join(' ');
  flat = flat.replace(/\s+(subgraph\s)/gi, '\n$1');
  flat = flat.replace(/\s+(end)\b/gi, '\n$1');

  let lines = flat.split('\n');
  const result = [];
  let openSubgraphs = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (/^graph\s/i.test(trimmed)) {
      result.push(trimmed);
      continue;
    }

    if (/^end$/i.test(trimmed)) {
      if (openSubgraphs > 0) openSubgraphs--;
      result.push('end');
      continue;
    }

    const subMatch = trimmed.match(/^(subgraph\s+[\w.-]+)\s*(.*)/i);
    if (subMatch) {
      openSubgraphs++;
      result.push(subMatch[1]);
      if (subMatch[2] && subMatch[2].trim()) {
        result.push(...splitConnections(subMatch[2]));
      }
      continue;
    }

    result.push(...splitConnections(trimmed));
  }

  while (openSubgraphs > 0) {
    result.push('end');
    openSubgraphs--;
  }

  const cleaned = result.map(line => {
    return line.replace(/\[([^\]]*)\]/g, (_match, label) => {
      const safe = label.replace(/[(){}]/g, '');
      return `[${safe}]`;
    });
  });

  return cleaned.join('\n');
}

export default function ArchitectureDiagram({ chart }) {
  const containerRef = useRef(null);
  const [error, setError] = useState(null);
  const [rawChart, setRawChart] = useState(null);
  const [showRaw, setShowRaw] = useState(false);
  const [copied, setCopied] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);

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
    <div className="mermaid-studio-wrapper animate-fade-in">
      {/* Diagram Action Bar */}
      <div className="diagram-action-bar">
        <div className="diagram-badge">
          <span className="live-dot" /> Interactive System Topology
        </div>
        
        <div className="diagram-btn-group">
          {/* Zoom controls */}
          <button
            type="button"
            onClick={() => setZoomLevel(prev => Math.min(prev + 0.15, 1.8))}
            className="btn-diagram-tool"
            title="Zoom in"
          >
            <ZoomIn size={13} />
          </button>
          <button
            type="button"
            onClick={() => setZoomLevel(prev => Math.max(prev - 0.15, 0.6))}
            className="btn-diagram-tool"
            title="Zoom out"
          >
            <ZoomOut size={13} />
          </button>
          {zoomLevel !== 1 && (
            <button
              type="button"
              onClick={() => setZoomLevel(1)}
              className="btn-diagram-tool"
              title="Reset zoom"
            >
              <RotateCcw size={13} />
            </button>
          )}

          <div className="tool-divider" />

          <button
            type="button"
            onClick={handleCopy}
            className="btn-diagram-tool"
          >
            {copied ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowRaw(!showRaw)}
            className="btn-diagram-tool"
          >
            <Code size={13} />
            <span>{showRaw ? 'Hide' : 'Source'}</span>
          </button>

          <a
            href={`https://mermaid.live/edit#pako:${btoa(unescape(encodeURIComponent(JSON.stringify({ code: sanitizeMermaid(chart), mermaid: { theme: 'dark' } }))))}`}
            target="_blank"
            rel="noreferrer"
            className="btn-diagram-tool"
            title="Open in Mermaid Live Editor"
          >
            <ExternalLink size={13} />
            <span>Live Editor</span>
          </a>
        </div>
      </div>

      {/* Rendered SVG or Error */}
      {error ? (
        <div className="diagram-error-box">
          <h4>⚠️ Could not render SVG diagram</h4>
          <pre>{rawChart || chart}</pre>
        </div>
      ) : (
        <div className="diagram-canvas-viewport">
          <div 
            ref={containerRef} 
            className="diagram-rendered-content"
            style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top center' }}
          />
        </div>
      )}

      {/* Raw Source Toggle */}
      {showRaw && (
        <div className="diagram-raw-source">
          <pre>{sanitizeMermaid(chart)}</pre>
        </div>
      )}
    </div>
  );
}
