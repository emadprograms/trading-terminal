import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { useSessionStore } from '../store/useSessionStore';

interface AccountData {
  equity: number;
  margin: number;
  available: number;
  marginLevel: number;
}

export const AccountHeader: React.FC = () => {
  const { isAuthenticated } = useSessionStore();

  const { data, isLoading, error } = useQuery<AccountData>({
    queryKey: ['account'],
    queryFn: async () => {
      const res = await api.get('accounts');
      return res.json();
    },
    enabled: isAuthenticated,
    refetchInterval: 10000, // Poll every 10 seconds
  });

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  if (!isAuthenticated) return null;

  return (
    <div className="account-header">
      <div className="status-indicator">
        <span className="dot" />
        <span className="status-text">ONLINE</span>
      </div>
      
      <div className="metrics">
        <div className="metric">
          <span className="label">EQUITY</span>
          <span className="value">{isLoading ? '...' : formatCurrency(data?.equity || 0)}</span>
        </div>
        <div className="metric">
          <span className="label">MARGIN</span>
          <span className="value">{isLoading ? '...' : formatCurrency(data?.margin || 0)}</span>
        </div>
        <div className="metric">
          <span className="label">AVAILABLE</span>
          <span className="value">{isLoading ? '...' : formatCurrency(data?.available || 0)}</span>
        </div>
        <div className="metric">
          <span className="label">MARGIN LVL</span>
          <span className="value">{isLoading ? '...' : `${data?.marginLevel || 0}%`}</span>
        </div>
      </div>

      <style jsx>{`
        .account-header {
          display: flex;
          align-items: center;
          gap: 24px;
          padding: 0 16px;
          color: #ccc;
          font-family: 'JetBrains Mono', monospace;
        }
        .status-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 10px;
          font-weight: 700;
          color: #00f2ff;
        }
        .dot {
          width: 6px;
          height: 6px;
          background: #00f2ff;
          border-radius: 50%;
          box-shadow: 0 0 8px #00f2ff;
          animation: blink 2s infinite;
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .metrics {
          display: flex;
          gap: 20px;
        }
        .metric {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .label {
          font-size: 9px;
          color: #666;
          letter-spacing: 0.05em;
        }
        .value {
          font-size: 12px;
          font-weight: 500;
          color: #eee;
        }
      `}</style>
    </div>
  );
};
