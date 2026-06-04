import React from 'react';
import { Globe, FlaskConical, Loader2 } from 'lucide-react';
import { useSessionStore } from '../store/useSessionStore';

interface EnvToggleProps {
  login: (params?: { environment: 'DEMO' | 'LIVE' }) => Promise<void>;
  isLoggingIn: boolean;
}

export const EnvToggle: React.FC<EnvToggleProps> = ({ login, isLoggingIn }) => {
  const { environment } = useSessionStore();

  const handleToggle = async (env: 'DEMO' | 'LIVE') => {
    if (env === environment) return;
    console.log(`[UAT] Switching environment to: ${env}`);
    try {
      await login({ environment: env });
    } catch (error) {
      console.error('[UAT] Failed to switch environment:', error);
    }
  };

  return (
    <div className="env-toggle-container">
      <button 
        className={`env-btn ${environment === 'DEMO' ? 'active' : ''} ${isLoggingIn ? 'loading' : ''}`}
        onClick={() => handleToggle('DEMO')}
        disabled={isLoggingIn}
      >
        {isLoggingIn && environment === 'DEMO' ? <Loader2 size={14} className="spin" /> : <FlaskConical size={14} />}
        <span>DEMO</span>
      </button>
      <button 
        className={`env-btn ${environment === 'LIVE' ? 'active' : ''} ${isLoggingIn ? 'loading' : ''}`}
        onClick={() => handleToggle('LIVE')}
        disabled={isLoggingIn}
      >
        {isLoggingIn && environment === 'LIVE' ? <Loader2 size={14} className="spin" /> : <Globe size={14} />}
        <span>LIVE</span>
      </button>
      <style jsx>{`
        .env-toggle-container {
          display: inline-flex;
          background: #1a1a1a;
          border: 1px solid #333;
          border-radius: 20px;
          padding: 2px;
          gap: 2px;
        }
        .env-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 12px;
          border-radius: 18px;
          border: none;
          background: transparent;
          color: #888;
          cursor: pointer;
          font-size: 11px;
          font-weight: 600;
          transition: all 0.2s ease;
        }
        .env-btn.active {
          background: #333;
          color: #fff;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        .env-btn:hover:not(.active):not(.loading) {
          color: #bbb;
        }
        .env-btn.loading {
          opacity: 0.6;
          cursor: wait;
        }
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
