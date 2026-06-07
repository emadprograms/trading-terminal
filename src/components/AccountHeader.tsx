import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { useSessionStore } from '../store/useSessionStore';

interface AccountData {
  balance: number;
  margin?: number;
  available?: number;
  marginLevel?: number;
  profitLoss?: number;
}

export const AccountHeader: React.FC = () => {
  const isAuthenticated = useSessionStore(state => state.isAuthenticated);
  const selectedAccountId = useSessionStore(state => state.selectedAccountId);
  const environment = useSessionStore(state => state.environment);

  const [showPnl, setShowPnl] = useState(true);

  console.log(`[AccountHeader] Rendering. isAuthenticated: ${isAuthenticated}`);

  const { data, isLoading, error } = useQuery<AccountData>({
    queryKey: ['account', selectedAccountId, environment],
    queryFn: async () => {
      console.log('[AccountHeader] queryFn triggered! Fetching accounts...');
      const res = await api.get('accounts');
      const rawData = await res.json();
      
      console.log('[AccountHeader] Raw API Response:', rawData);
      
      if (rawData && typeof rawData === 'object') {
        if (Array.isArray(rawData.accounts) && rawData.accounts.length > 0) {
          // Use selected account or fallback to first
          const account = rawData.accounts.find((a: any) => a.accountId === selectedAccountId) || rawData.accounts[0];
          const bal = account.balance;
          
          if (bal && typeof bal === 'object') {
            console.log(`[AccountHeader] Mapping nested balance data for account ${account.accountId}`);
            return {
              balance: bal.balance,
              available: bal.available,
              margin: bal.deposit,
              marginLevel: 100,
              profitLoss: bal.profitLoss,
            } as AccountData;
          }
        }
        
        if (rawData.accountInfo) {
          console.log('[AccountHeader] Mapping from accountInfo');
          return {
            balance: rawData.accountInfo.balance,
            available: rawData.accountInfo.available,
            margin: rawData.accountInfo.deposit,
            marginLevel: 100,
            profitLoss: rawData.accountInfo.profitLoss,
            } as AccountData;
        }
      }
      
      return {} as AccountData;
    },
    enabled: isAuthenticated,
    refetchInterval: 10000,
  });

  const formatCurrency = (val: any) => {
    const numericVal = Number(val);
    if (isNaN(numericVal)) return '$0.00';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(numericVal);
  };

  return (
    <div className="account-header">
      <div className="status-indicator">
        <span className={`dot ${isAuthenticated ? 'status-online' : ''}`} data-testid="online-indicator" />
        <span className="status-text">{isAuthenticated ? 'ONLINE' : 'DISCONNECTED'}</span>
      </div>
      
      <div className="metrics">
        {isAuthenticated ? (
          <>
            <div className="metric">
              <span className="label">EQUITY</span>
              <span className="value">{isLoading ? '...' : formatCurrency(data?.balance)}</span>
            </div>
            <div className="metric">
              <span className="label">MARGIN</span>
              <span className="value">{isLoading ? '...' : formatCurrency(data?.margin)}</span>
            </div>
            <div className="metric">
              <span className="label">AVAILABLE</span>
              <span className="value">{isLoading ? '...' : formatCurrency(data?.available)}</span>
            </div>
            <div className="metric">
              <span className="label">MARGIN LVL</span>
              <span className="value">{isLoading ? '...' : `${data?.marginLevel || 0}%`}</span>
            </div>
            
            <button 
              className={`pnl-toggle ${showPnl ? 'active' : ''}`} 
              onClick={() => setShowPnl(!showPnl)}
            >
              PnL {showPnl ? 'ON' : 'OFF'}
            </button>

            {showPnl && (
              <div className="metric">
                <span className="label">PnL</span>
                <span className={`value pnl-value ${ (data?.profitLoss || 0) >= 0 ? 'pos' : 'neg'}`}>
                  {isLoading ? '...' : formatCurrency(data?.profitLoss)}
                </span>
              </div>
            )}
          </>
        ) : (
          <div className="metric">
            <span className="label">STATUS</span>
            <span className="value" style={{ color: '#ef5350' }}>No Active Session</span>
          </div>
        )}
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
        .status-text {
          font-size: 10px;
          font-weight: 700;
          color: #00f2ff;
          white-space: nowrap;
        }
        .dot {
          width: 6px;
          height: 6px;
          background: #666;
          border-radius: 50%;
        }
        .dot.status-online {
          background: #00f2ff;
          box-shadow: 0 0 8px #00f2ff;
          animation: blink 2s infinite;
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .metrics {
          display: flex;
          align-items: center;
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
        .pnl-value.pos {
          color: #00e676;
        }
        .pnl-value.neg {
          color: #ff5252;
        }
        .pnl-toggle {
          background: #222;
          border: 1px solid #444;
          color: #888;
          font-size: 9px;
          padding: 2px 6px;
          cursor: pointer;
          font-family: 'JetBrains Mono', monospace;
          transition: all 0.2s ease;
          border-radius: 2px;
          height: fit-content;
          align-self: center;
          margin-top: 8px;
        }
        .pnl-toggle:hover {
          border-color: #666;
          color: #ccc;
        }
        .pnl-toggle.active {
          border-color: #00f2ff;
          color: #00f2ff;
          box-shadow: 0 0 4px rgba(0, 242, 255, 0.2);
        }
      `}</style>
    </div>
  );
};
