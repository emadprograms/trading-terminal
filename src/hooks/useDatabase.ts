import { useState } from 'react';

export function useDatabase() {
  const [tickers] = useState<string[]>(['SPY', 'AAPL', 'EURUSD', 'BTCUSD', 'ETHUSD']);
  const isLoading = false;
  const dbStatus = 'Live Mode';
  const isDbLoaded = true;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // Disabled: SQLite playback mode has been removed.
  };

  return {
    tickers,
    isLoading,
    dbStatus,
    isDbLoaded,
    handleFileUpload,
    refreshMetadata: async () => {}
  };
}
