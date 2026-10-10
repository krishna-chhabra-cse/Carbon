import React from 'react';

interface LoadingSkeletonProps {
  message?: string;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ message = "Analyzing Codebase..." }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: '32px', textAlign: 'center' }}>
      
      <div style={{ position: 'relative', width: '96px', height: '96px', marginBottom: '32px' }}>
        <div style={{ 
          position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, 
          border: '4px solid transparent', borderTopColor: '#10B981', borderRightColor: '#10B981', 
          borderRadius: '50%', animation: 'skel-spin 1s linear infinite' 
        }}></div>
        <div style={{ 
          position: 'absolute', top: '8px', right: '8px', bottom: '8px', left: '8px', 
          border: '4px solid transparent', borderBottomColor: '#3b82f6', borderLeftColor: '#3b82f6', 
          borderRadius: '50%', animation: 'skel-spin 1.5s linear infinite reverse' 
        }}></div>
        <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '30px' }}>
          <span style={{ animation: 'skel-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}>🛡️</span>
        </div>
      </div>

      <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#e6edf3', marginBottom: '8px', marginTop: 0 }}>{message}</h3>
      <p style={{ color: '#8b949e', margin: 0, animation: 'skel-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}>This might take a few moments</p>
      
      <div style={{ marginTop: '48px', width: '100%', maxWidth: '672px' }}>
        <div style={{ height: '16px', backgroundColor: '#161b22', borderRadius: '9999px', overflow: 'hidden', marginBottom: '16px' }}>
          <div style={{ 
            height: '100%', 
            background: 'linear-gradient(to right, #10B981, #3b82f6, #10B981)', 
            width: '200%', 
            backgroundSize: '50% 100%', 
            animation: 'skel-slide 2s linear infinite' 
          }}></div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#8b949e', gap: '8px', flexWrap: 'wrap' }}>
          <span>Parsing AST</span>
          <span>Generating Graph</span>
          <span>Scanning Secrets</span>
        </div>
      </div>
      
      <style>{`
        @keyframes skel-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes skel-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: .5; }
        }
        @keyframes skel-slide {
          0% { transform: translateX(-50%) }
          100% { transform: translateX(0%) }
        }
      `}</style>
    </div>
  );
};
