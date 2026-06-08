import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { accountApi } from './account';
import { server } from '../../tests/setup';
import { http, HttpResponse } from 'msw';

// Mock the api client to use an absolute URL in tests
vi.mock('./client', async () => {
  const actual = await vi.importActual('./client') as any;
  return {
    api: actual.api.extend({ prefix: 'http://localhost:3000/api' })
  };
});

describe('Account API', () => {
  it('should fetch accounts list correctly', async () => {
    const mockAccounts = [
      {
        accountId: '12345',
        accountName: 'CFD Demo',
        balance: {
          balance: 10000,
          available: 9000,
          deposit: 1000,
          profitLoss: 500
        }
      }
    ];

    server.use(
      http.get('*/api/accounts/v1/accounts', () => {
        return HttpResponse.json({ accounts: mockAccounts });
      })
    );

    // We need to make sure the api call in accountApi uses the absolute URL
    // Since accountApi uses the imported 'api', we can temporarily modify its prefix if it's mutable
    // or rely on the stubbed location if ky uses it.
    // Ky uses 'new URL(input, prefixUrl)' logic.
    
    const accounts = await accountApi.fetchAccounts();
    expect(accounts).toHaveLength(1);
    expect(accounts[0].accountId).toBe('12345');
    expect(accounts[0].balance.balance).toBe(10000);
  });

  it('should throw error on failed response', async () => {
    server.use(
      http.get('*/api/accounts/v1/accounts', () => {
        return new HttpResponse(null, { status: 500 });
      })
    );

    await expect(accountApi.fetchAccounts()).rejects.toThrow('Failed to fetch accounts: 500');
  });
});
