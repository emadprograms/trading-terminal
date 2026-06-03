import React from 'react';
import { Globe, FlaskConical, Activity } from 'lucide-react';
import { useSession } from '../hooks/useSession';
import { useSessionStore } from '../store/useSessionStore';

export const EnvToggle: React.FC = () => {
  const { environment } = useSessionStore();
  const { login, isLoggingIn } = useSession([]); // tickers not needed for login actions

  const handleToggle = (env: 'DEMO' | 'LIVE') => {
    if (env === environment || isLoggingIn) return;
    login({ environment: env });
  };

  return (
    <div className="env-toggle">
      <button
        className={`toggle-btn ${environment === 'DEMO' ? 'active' : ''}`}
        data-active={environment === 'DEMO'}
        onClick={() => handleToggle('DEMO')}
        disabled={isLoggingIn}
      >
        <FlaskConical size={14} />
        <span>DEMO</span>
      </button>
      <button
        className={`toggle-btn ${environment === 'LIVE' ? 'active' : ''}`}
        data-active={environment === 'LIVE'}
        onClick={() => handleToggle('LIVE')}
        disabled={isLoggingIn}
      >
        <Globe size={14} />
        <span>LIVE</span>
      </button>
      {isLoggingIn && (
        <div className="loading-overlay" data-testid="loading-spinner">
          <Activity className="animate-spin" size={16} />
        </div>
      )}
    </div>
  );
};
