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

export default function ArchitectureDiagram({ chart }) {
  const containerRef = useRef(null);
  const [error, setError] = useState(null);
  const [rawChart, setRawChart] = useState(null);

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
          console.error("Sanitized chart:\n", cleanChart);
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

  if (!chart) return null;

  return (
    <div className="mermaid-container animate-fade-in" style={{ marginTop: '20px' }}>
      {error ? (
        <div style={{ padding: '20px', background: 'rgba(239, 68, 68, 0.1)', color: '#fca5a5', borderRadius: '8px', overflowX: 'auto', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
          <h4 style={{ margin: '0 0 10px 0' }}>⚠️ Could not render diagram</h4>
          <p style={{ margin: '0 0 15px 0', fontSize: '14px', color: '#94a3b8' }}>
            The AI generated diagram syntax the renderer could not parse. Raw output:
          </p>
          <pre style={{ fontSize: '13px', margin: 0, whiteSpace: 'pre-wrap', color: '#e2e8f0' }}>{rawChart || chart}</pre>
        </div>
      ) : (
        <div ref={containerRef} style={{ display: 'flex', justifyContent: 'center' }} />
      )}
    </div>
  );
}
