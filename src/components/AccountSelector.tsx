import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { accountApi } from '../services/account';
import { useSessionStore } from '../store/useSessionStore';
import { ChevronDown } from 'lucide-react';

export const AccountSelector: React.FC = () => {
  const { isAuthenticated, environment, selectedAccountId, setSelectedAccountId } = useSessionStore();

  const { data, isLoading } = useQuery({
    queryKey: ['accounts-list', environment],
    queryFn: async () => {
      console.log('[AccountSelector] Fetching accounts list...');
      return await accountApi.fetchAccounts();
    },
    enabled: isAuthenticated,
  });

  const accounts = data || [];

  // Auto-select first account if none selected
  React.useEffect(() => {
    if (accounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(accounts[0].accountId);
    }
  }, [accounts, selectedAccountId, setSelectedAccountId]);

  if (!isAuthenticated) return null;

  return (
    <div className="account-selector-container">
      <div className="selector-wrapper">
        <select 
          className="account-dropdown"
          value={selectedAccountId || ''}
          onChange={(e) => setSelectedAccountId(e.target.value)}
        >
          {accounts.map((acc) => (
            <option key={acc.accountId} value={acc.accountId}>
              {acc.accountName || `Account ${acc.accountId}`}
            </option>
          ))}
        </select>
        <ChevronDown size={12} className="chevron-icon" />
      </div>

      <style jsx>{`
        .account-selector-container {
          display: inline-flex;
          align-items: center;
          margin-right: 12px;
        }
        .selector-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }
        .account-dropdown {
          appearance: none;
          background: #1a1a1a;
          border: 1px solid #333;
          border-radius: 20px;
          color: #ccc;
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          font-weight: 600;
          padding: 4px 28px 4px 12px;
          cursor: pointer;
          outline: none;
          transition: all 0.2s ease;
          padding-right: 30px;
        }
        .account-dropdown:hover {
          border-color: #444;
          color: #fff;
        }
        .account-dropdown:focus {
          border-color: #00f2ff;
        }
        .chevron-icon {
          position: absolute;
          right: 10px;
          pointer-events: none;
          color: #666;
        }
      `}</style>
    </div>
  );
};
