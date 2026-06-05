import React, { useEffect } from 'react';
import { Activity } from 'lucide-react';
import { Toaster } from 'sonner';

// Hooks
import { useDatabase } from './hooks/useDatabase';
import { useSession } from './hooks/useSession';
import { useWorkspace } from './hooks/useWorkspace';
import { usePortfolio } from './hooks/usePortfolio';
import { useDrawings } from './hooks/useDrawings';

// Components
import { Sidebar } from './components/Sidebar';
import { ChartWorkspace } from './components/ChartWorkspace';
import { AccountHeader } from './components/AccountHeader';
import { EnvToggle } from './components/EnvToggle';
import { AccountSelector } from './components/AccountSelector';
import { useSessionStore } from './store/useSessionStore';

export default function App() {
  const { 
    tickers, 
    isLoading, 
    dbStatus, 
    isDbLoaded, 
    handleFileUpload 
  } = useDatabase();

  const {
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
    isAuthenticated,
    isLoggingIn
  } = useSession(tickers);

  const proxyUrl = useSessionStore(state => state.proxyUrl);
  const setProxyUrl = useSessionStore(state => state.setProxyUrl);

  const {
    layoutMode,
    setLayoutMode,
    maximizedId,
    toggleMaximize,
    panelSizes,
    activeGutter,
    groupTickers,
    chartGroups,
    workspaceRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerEnd,
    handleTickerChange,
    handleGroupChange,
    handleTimeframeChange,
    handleSelectChart,
    selectedChartId
  } = useWorkspace();

  const {
    totalRealized,
    totalUnrealized,
    handlePnLUpdate
  } = usePortfolio();

  const {
    drawings,
    handleUpdateDrawings
  } = useDrawings();

  useEffect(() => {
    if (proxyUrl && !isAuthenticated && !isLoggingIn) {
      console.log('[StabilityTrace] Auto-initiating login handshake...');
      login();
    }
  }, [proxyUrl, isAuthenticated, isLoggingIn, login]);

  const handleLaunch = async () => {
    const url = prompt('Enter Proxy URL (e.g., https://my-proxy.workers.dev):');
    if (url) {
      setProxyUrl(url);
    }
  };

  return (
    <div className="app-container">
      <Sidebar 
        dbStatus={dbStatus}
        isDbLoaded={isDbLoaded}
        handleFileUpload={handleFileUpload}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        isSessionStarted={isSessionStarted}
        onEndSession={endSession}
        layoutMode={layoutMode}
        setLayoutMode={setLayoutMode}
        onLaunch={handleLaunch}
      />

      <div className="main-content" style={{ position: 'relative' }}>
        <header className="terminal-header">
          <AccountHeader />
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <AccountSelector />
            <EnvToggle login={login} isLoggingIn={isLoggingIn} />
          </div>
        </header>

        {isLoggingIn ? (
          <main className="workspace" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
             <Activity className="animate-pulse" size={48} />
          </main>
        ) : (
          <ChartWorkspace 
            layoutMode={layoutMode}
            maximizedId={maximizedId}
            panelSizes={panelSizes}
            activeGutter={activeGutter}
            tickers={tickers}
            sessionTicker={sessionTicker}
            selectedDate={selectedDate}
            isSessionStarted={true}
            drawings={drawings}
            chartGroups={chartGroups}
            groupTickers={groupTickers}
            workspaceRef={workspaceRef}
            selectedChartId={selectedChartId}
            onSelectChart={handleSelectChart}
            onToggleMaximize={toggleMaximize}
            onUpdateDrawings={handleUpdateDrawings}
            onPnLUpdate={handlePnLUpdate}
            onTickerChange={handleTickerChange}
            onTimeframeChange={handleTimeframeChange}
            onGroupChange={handleGroupChange}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerEnd={handlePointerEnd}
          />
        )}

      </div>
      <Toaster theme="dark" position="top-right" richColors />
    </div>
  );
}
