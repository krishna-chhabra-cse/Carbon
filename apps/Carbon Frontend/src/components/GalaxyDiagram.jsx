import { useEffect, useRef, useState, useMemo } from 'react';
import ForceGraph3D from 'react-force-graph-3d';

export default function GalaxyDiagram({ chart }) {
  const containerRef = useRef();
  
  // Parse the Mermaid syntax into nodes and links for the 3D graph
  const graphData = useMemo(() => {
    if (!chart) return { nodes: [], links: [] };
    
    const nodes = new Map();
    const links = [];
    
    const lines = chart.split('\n');
    
    // Regex to match: A[Label] or A --> B or A -->|Label| B
    const nodeRegex = /([a-zA-Z0-9_-]+)\[(.*?)\]/g;
    const linkRegex = /([a-zA-Z0-9_-]+)\s*-->\s*(?:\|(.*?)\|\s*)?([a-zA-Z0-9_-]+)/;
    
    // First pass: extract all defined nodes with labels
    let match;
    while ((match = nodeRegex.exec(chart)) !== null) {
      if (!nodes.has(match[1])) {
        nodes.set(match[1], { id: match[1], name: match[2], val: 1.5 });
      }
    }
    
    // Second pass: extract links and implicitly defined nodes
    for (const line of lines) {
      const linkMatch = line.match(linkRegex);
      if (linkMatch) {
        const source = linkMatch[1];
        const label = linkMatch[2] || '';
        const target = linkMatch[3];
        
        // Ensure source and target exist
        if (!nodes.has(source)) nodes.set(source, { id: source, name: source, val: 1 });
        if (!nodes.has(target)) nodes.set(target, { id: target, name: target, val: 1 });
        
        links.push({
          source,
          target,
          name: label
        });
      }
    }
    
    return {
      nodes: Array.from(nodes.values()),
      links
    };
  }, [chart]);

  return (
    <div style={{ height: '600px', width: '100%', borderRadius: '8px', overflow: 'hidden', background: '#090d16', border: '1px solid #1e293b' }}>
      <ForceGraph3D
        graphData={graphData}
        nodeLabel="name"
        nodeAutoColorBy="id"
        linkDirectionalArrowLength={3.5}
        linkDirectionalArrowRelPos={1}
        nodeResolution={16}
        linkResolution={6}
        backgroundColor="#090d16"
        enableNodeDrag={true}
        enableNavigationControls={true}
        showNavInfo={true}
      />
    </div>
  );
}
