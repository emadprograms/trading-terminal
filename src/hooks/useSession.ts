import { useState, useEffect, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '../api/client';
import { useSessionStore } from '../store/useSessionStore';
import { wsManager } from '../lib/ws-manager';
import { useTradeStore } from '../store/useTradeStore';

const TODAY = new Date().toISOString().split('T')[0];

export function useSession(tickers: string[]) {
  const { cst, securityToken, isAuthenticated, setTokens, clearTokens, environment } = useSessionStore();
  
  const [selectedDate, setSelectedDate] = useState<string>(() => localStorage.getItem('lastUsedDate') || TODAY);
  const [sessionTicker, setSessionTicker] = useState<string>(() => localStorage.getItem('lastUsedTicker') || 'SPY');
  const [entryTime, setEntryTime] = useState('09:20');
  const [isSessionStarted, setIsSessionStarted] = useState(false);

  // Initialize WebSocket and Sync State on authentication
  useEffect(() => {
    if (isAuthenticated && cst && securityToken) {
      console.log('[StabilityTrace] Initializing WebSocket connection and syncing positions...');
      wsManager.connect();
      useTradeStore.getState().syncPositions();
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
        const response = await api.post('session', { 
          json: params?.credentials || { 
            identifier: import.meta.env.VITE_CAPITAL_USER, 
            password: import.meta.env.VITE_CAPITAL_PASSWORD 
          },
          headers: {
            'X-Environment': targetEnv
          }
        });
        return response.json();
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
    return loginMutation.mutateAsync(params);
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
        await api.get('ping');
        console.log('[StabilityTrace] Session keep-alive ping successful.');
      } catch (error) {
        console.error('[StabilityTrace] Session keep-alive ping failed:', error);
      }
    }, 5 * 60 * 1000); // 5 minutes

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

  // Persistence
  useEffect(() => {
    localStorage.setItem('lastUsedDate', selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    localStorage.setItem('lastUsedTicker', sessionTicker);
  }, [sessionTicker]);

  const getUtcTimeFromEt = useCallback((dateStr: string, etTimeStr: string) => {
    const probeDate = new Date(`${dateStr}T14:00:00Z`);
    const nyHour = new Intl.DateTimeFormat('en-US', { 
      timeZone: 'America/New_York', hour: 'numeric', hourCycle: 'h23' 
    }).format(probeDate);
    const offsetHours = 14 - parseInt(nyHour, 10);
    const [hh, mm] = etTimeStr.split(':');
    const localMs = new Date(`${dateStr}T${hh}:${mm}:00Z`).getTime();
    const targetUtcDate = new Date(localMs + (offsetHours * 3600000));
    return targetUtcDate.toISOString().replace('T', ' ').substring(0, 19);
  }, []);

  const startSession = useCallback(() => setIsSessionStarted(true), []);
  const endSession = useCallback(() => setIsSessionStarted(false), []);

  return {
    selectedDate,
    setSelectedDate,
    sessionTicker,
    setSessionTicker,
    entryTime,
    setEntryTime,
    isSessionStarted,
    startSession,
    endSession,
    getUtcTimeFromEt,
    login,
    logout,
    isAuthenticated,
    isLoggingIn: loginMutation.isPending,
    isLoginError: loginMutation.isError,
    loginError: loginMutation.error,
    resetLogin: loginMutation.reset
  };
}
