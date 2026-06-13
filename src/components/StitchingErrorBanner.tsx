import React from 'react';

interface StitchingErrorBannerProps {
  error: { description: string; reason: string } | null;
}

export function StitchingErrorBanner({ error }: StitchingErrorBannerProps) {
  if (!error) return null;

  return (
    <div 
      className="stitching-error-banner"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        backgroundColor: '#ef5350',
        color: 'white',
        padding: '8px 12px',
        textAlign: 'center',
        fontWeight: 600,
        fontSize: '14px',
        borderBottom: '1px solid #c62828',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
      }}
    >
      Data Stitching Error: {error.description} - {error.reason}
    </div>
  );
}
