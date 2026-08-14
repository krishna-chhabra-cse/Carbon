import { Webhook } from 'lucide-react';

export default function ApiEndpoints({ apiDocs }) {
  if (!apiDocs || !apiDocs.endpoints || apiDocs.endpoints.length === 0) return null;

  // Function to color-code HTTP methods nicely
  const getMethodStyle = (method) => {
    switch (method.toUpperCase()) {
      case 'GET': return { bg: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', border: '#166534' };
      case 'POST': return { bg: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '#1e3a8a' };
      case 'PUT': return { bg: 'rgba(234, 179, 8, 0.1)', color: '#eab308', border: '#854d0e' };
      case 'DELETE': return { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '#7f1d1d' };
      case 'PATCH': return { bg: 'rgba(168, 85, 247, 0.1)', color: '#a855f7', border: '#581c87' };
      default: return { bg: 'rgba(148, 163, 184, 0.1)', color: '#94a3b8', border: '#334155' };
    }
  };

  return (
    <div className="glass-panel" style={{ marginTop: '32px' }}>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
        <Webhook className="text-gradient" /> Discovered API Endpoints
      </h2>
      <p style={{ marginBottom: '24px', color: '#94a3b8' }}>
        Detected Style: <strong>{apiDocs.api_type}</strong>
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {apiDocs.endpoints.map((ep, idx) => {
          const style = getMethodStyle(ep.method);
          return (
            <div key={idx} style={{
              display: 'flex', alignItems: 'center', gap: '16px',
              padding: '16px', background: 'rgba(0,0,0,0.2)',
              border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: '8px'
            }}>
              {/* HTTP Method Badge */}
              <div style={{
                background: style.bg, color: style.color, border: `1px solid ${style.border}`,
                padding: '6px 12px', borderRadius: '6px', fontWeight: 'bold', fontSize: '13px',
                minWidth: '70px', textAlign: 'center', letterSpacing: '1px'
              }}>
                {ep.method.toUpperCase()}
              </div>
              
              {/* Route Path */}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '16px', color: '#f1f5f9', fontFamily: 'monospace', fontWeight: 600 }}>
                  {ep.path}
                </div>
                <div style={{ fontSize: '14px', color: '#94a3b8', marginTop: '4px' }}>
                  {ep.description}
                </div>
              </div>

              {/* File Location */}
              <div style={{ fontSize: '12px', color: '#38bdf8', fontFamily: 'var(--font-mono)', background: 'rgba(56, 189, 248, 0.1)', padding: '4px 8px', borderRadius: '4px', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                {ep.file}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
