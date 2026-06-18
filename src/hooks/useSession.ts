import { useState, useEffect, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '../services/client';
import { useSessionStore } from '../store/useSessionStore';
import { wsManager } from '../lib/ws-manager';
import { useTradeStore } from '../store/useTradeStore';

export function useSession(tickers: string[]) {
  const { cst, securityToken, isAuthenticated, setTokens, clearTokens, environment } = useSessionStore();
  
  const [sessionTicker, setSessionTicker] = useState<string>(() => localStorage.getItem('lastUsedTicker') || 'SPY');

  // Initialize WebSocket and Sync State on authentication
  useEffect(() => {
    if (isAuthenticated && cst && securityToken) {
      console.log('[StabilityTrace] Initializing WebSocket connection and syncing positions...');
      wsManager.connect();
      useTradeStore.getState().syncPositions();
      useTradeStore.getState().syncExecutions(7);
    }
    return () => {
      wsManager.disconnect();
    };
  }, [isAuthenticated, cst, securityToken]);

  // Sync WebSocket on environment change
  useEffect(() => {
    if (isAuthenticated) {
      wsManager.syncEnvironment();
    }
  }, [environment, isAuthenticated]);

  // Auth Mutation
  const loginMutation = useMutation({
    mutationFn: async (params?: { credentials?: { identifier: string; password: string }, environment?: 'DEMO' | 'LIVE' }) => {
      const { setEnvironment, clearTokens, environment } = useSessionStore.getState();
      const targetEnv = params?.environment || environment;
      
      if (params?.environment) {
        setEnvironment(params.environment);
        clearTokens();
      }

      try {
        console.log('[StabilityTrace] Awaiting api.post session...');
        const response = await api.post('session', { 
          json: params?.credentials || { 
            identifier: import.meta.env.VITE_CAPITAL_USER, 
            password: import.meta.env.VITE_CAPITAL_PASSWORD 
          },
          headers: {
            'X-Environment': targetEnv
          }
        });
        console.log('[StabilityTrace] api.post session returned! Awaiting response.json()...');
        const data = await response.json();
        console.log('[StabilityTrace] response.json() returned!');
        return data;
      } catch (e) {
        if (params?.environment) {
          // Revert environment if login failed
          setEnvironment(environment);
        }
        throw e;
      }
    },
    onSuccess: () => {
      console.log('[StabilityTrace] Login handshake successful.');
    },
    onError: (error) => {
      console.error('[StabilityTrace] Login handshake failed:', error);
    }
  });

  const login = useCallback(async (params?: { credentials?: { identifier: string; password: string }, environment?: 'DEMO' | 'LIVE' }) => {
    await loginMutation.mutateAsync(params);
  }, [loginMutation]);

  const logout = useCallback(() => {
    console.log('[StabilityTrace] Logging out and clearing session.');
    clearTokens();
  }, [clearTokens]);

  // Keep-alive ping (heartbeat)
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(async () => {
      try {
        await api.get(`ping?_t=${Date.now()}`);
        console.log('[StabilityTrace] Session keep-alive ping successful.');
      } catch (error) {
        console.error('[StabilityTrace] Session keep-alive ping failed:', error);
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Periodic position sync — catches external changes (Capital.com app, other tabs, etc.)
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      useTradeStore.getState().syncPositions();
      useTradeStore.getState().syncExecutions();
    }, 10_000); // every 10 seconds

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Sync sessionTicker with available tickers
  useEffect(() => {
    if (tickers.length > 0) {
      setSessionTicker(prev => {
        if (tickers.includes(prev)) return prev;
        return tickers.includes('SPY') ? 'SPY' : tickers[0];
      });
    }
  }, [tickers]);

  useEffect(() => {
    localStorage.setItem('lastUsedTicker', sessionTicker);
  }, [sessionTicker]);

  return {
    sessionTicker,
    setSessionTicker,
    login,
    logout,
    isAuthenticated,
    isLoggingIn: loginMutation.isPending,
    isLoginError: loginMutation.isError,
    loginError: loginMutation.error,
    resetLogin: loginMutation.reset
  };
}
