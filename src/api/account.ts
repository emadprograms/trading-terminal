import { api } from './client';

export interface AccountBalance {
  balance: number;
  available: number;
  deposit: number;
  profitLoss: number;
}

export interface Account {
  accountId: string;
  accountName: string;
  accountAlias: string | null;
  status: string;
  accountType: string;
  balance: AccountBalance;
  currency: string;
  canTransferFrom: boolean;
  canTransferTo: boolean;
}

export interface AccountsResponse {
  accounts: Account[];
}

/**
 * Account Management Client for Capital.com
 */
export const accountApi = {
  /**
   * Fetches the list of accounts with their current balances.
   */
  async fetchAccounts(): Promise<Account[]> {
    const response = await api.get('v1/accounts', {
      throwHttpErrors: false,
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch accounts: ${response.status}`);
    }
    const data = await response.json();
    
    // Handle both bare array and wrapped object responses
    if (Array.isArray(data)) {
      return data as Account[];
    }
    if (data && typeof data === 'object' && 'accounts' in data) {
      return (data as AccountsResponse).accounts || [];
    }
    
    return [];
  },
};
