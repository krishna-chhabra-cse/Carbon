import { Brain } from 'lucide-react';

export default function BusinessLogic({ businessLogic }) {
  if (!businessLogic || !businessLogic.business_flows || businessLogic.business_flows.length === 0) return null;

  return (
    <div className="glass-panel" style={{ marginTop: '32px' }}>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
        <Brain className="text-gradient" /> Business Logic Breakdown
      </h2>
      <p style={{ marginBottom: '24px', color: '#94a3b8', fontSize: '15px', lineHeight: '1.6' }}>
        {businessLogic.app_purpose}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {businessLogic.business_flows.map((flow, idx) => (
          <div key={idx} style={{
            padding: '20px',
            background: 'rgba(0,0,0,0.2)',
            border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: '12px'
          }}>
            {/* Feature Name Header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              marginBottom: '16px'
            }}>
              <div style={{
                background: 'var(--gradient-btn-primary)',
                color: '#fff', width: '32px', height: '32px',
                borderRadius: '8px', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontWeight: 'bold', fontSize: '14px',
                flexShrink: 0,
                boxShadow: '0 0 12px rgba(56, 189, 248, 0.3)'
              }}>
                {idx + 1}
              </div>
              <h3 style={{ margin: 0, fontSize: '18px', color: '#f1f5f9' }}>
                {flow.feature}
              </h3>
            </div>

            {/* Steps Timeline */}
            <div style={{ paddingLeft: '16px', borderLeft: '2px solid rgba(56, 189, 248, 0.3)' }}>
              {flow.steps.map((step, stepIdx) => (
                <div key={stepIdx} style={{
                  display: 'flex', alignItems: 'flex-start', gap: '12px',
                  paddingLeft: '16px', paddingBottom: stepIdx < flow.steps.length - 1 ? '16px' : '0',
                  position: 'relative'
                }}>
                  {/* Timeline dot */}
                  <div style={{
                    position: 'absolute', left: '-7px', top: '6px',
                    width: '12px', height: '12px', borderRadius: '50%',
                    background: stepIdx === flow.steps.length - 1
                      ? '#10b981'
                      : '#38bdf8',
                    boxShadow: stepIdx === flow.steps.length - 1 ? '0 0 8px #10b981' : '0 0 8px #38bdf8',
                    border: '2px solid rgba(5, 7, 15, 0.8)',
                    flexShrink: 0
                  }} />
                  {/* Step text */}
                  <p style={{
                    margin: 0, fontSize: '14px', color: '#cbd5e1',
                    lineHeight: '1.6'
                  }}>
                    {step}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
