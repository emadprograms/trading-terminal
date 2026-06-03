import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { useSessionStore } from '../store/useSessionStore';

const formatCurrency = (value: number, currency: string = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

export const AccountHeader: React.FC = () => {
  const { isAuthenticated, proxyUrl } = useSessionStore();
  
  const { data } = useQuery({
    queryKey: ['accounts', proxyUrl],
    queryFn: async () => {
      const response = await api.get(`${proxyUrl}/accounts`);
      return response.json() as Promise<{ accounts: any[] }>;
    },
    enabled: !!isAuthenticated && !!proxyUrl,
    refetchInterval: 30000,
  });

  const account = data?.accounts?.[0];
  const balance = account?.balance;
  const currency = account?.currency || 'USD';

  return (
    <div className="account-header">
      <div className="account-metrics">
        <div className="metric">
          <span className="label">Equity</span>
          <span className="value">
            {balance ? formatCurrency(balance.equity, currency) : '---'}
          </span>
        </div>
        <div className="metric">
          <span className="label">Margin</span>
          <span className="value">
            {balance ? `Margin: ${balance ? formatCurrency(balance.margin, currency) : '---'}` : 'Margin: ---'}
          </span>
        </div>
        <div className="metric">
          <span className="label">Available</span>
          <span className="value">
            {balance ? `Avail: ${balance ? formatCurrency(balance.available, currency) : '---'}` : 'Avail: ---'}
          </span>
        </div>
      </div>
      <div className="status-indicator">
        <div 
          data-testid="online-indicator"
          className={`dot ${isAuthenticated ? 'status-online' : ''}`} 
        />
        <span className="status-text">{isAuthenticated ? 'Online' : 'Offline'}</span>
      </div>
    </div>
  );
};
