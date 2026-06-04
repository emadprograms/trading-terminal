import React, { useEffect } from 'react';
import { Activity } from 'lucide-react';

// Hooks
import { useDatabase } from './hooks/useDatabase';
import { useSession } from './hooks/useSession';
import { useWorkspace } from './hooks/useWorkspace';
import { usePortfolio } from './hooks/usePortfolio';
import { useDrawings } from './hooks/useDrawings';
import { useMarketSimulator } from './hooks/useMarketSimulator';
import { usePlaybackStore } from './store/usePlaybackStore';

// Components
import { Sidebar } from './components/Sidebar';
import { SessionConfig } from './components/SessionConfig';
import { ChartWorkspace } from './components/ChartWorkspace';
import { PlaybackBar } from './components/PlaybackBar';
import { PlaybackManager } from './components/PlaybackManager';
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
    minStepMinutes,
    activeStepMinutes,
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

  const { handleResetToOpen } = useMarketSimulator(
    isSessionStarted,
    sessionTicker,
    selectedDate,
    entryTime,
    getUtcTimeFromEt
  );

  const setStepMinutes = usePlaybackStore((state) => state.setStepMinutes);

  useEffect(() => {
    setStepMinutes(activeStepMinutes);
  }, [activeStepMinutes, setStepMinutes]);

  const handleLaunch = async () => {
    const url = prompt('Enter Proxy URL (e.g., https://my-proxy.workers.dev):');
    if (url) {
      setProxyUrl(url);
      try {
        await login();
      } catch (err) {
        console.error('Failed to login during launch:', err);
      }
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
        ) : !proxyUrl ? (
          <main className="workspace splash-screen">
            <div className="splash-content">
              <Activity size={64} className="splash-logo" />
              <h1>Awaiting Handshake...</h1>
              <p>Connecting to ephemeral backend proxy via GitHub Actions.</p>
              <div className="proxy-setup">
                <p>Ensure GHA Tunnel is active and provide the Proxy URL to begin.</p>
                <button className="btn-primary" onClick={handleLaunch}>
                  Launch Terminal
                </button>
              </div>
            </div>
          </main>
        ) : !isDbLoaded ? (
          <main className="workspace" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
             {isLoading ? (
               <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                 <Activity className="animate-pulse" size={48} />
                 <p>{dbStatus}</p>
               </div>
             ) : (
               "Please upload your database file on the left to begin."
             )}
          </main>
        ) : !isSessionStarted ? (
          <SessionConfig 
            tickers={tickers}
            sessionTicker={sessionTicker}
            setSessionTicker={setSessionTicker}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            entryTime={entryTime}
            setEntryTime={setEntryTime}
            onStartSession={startSession}
          />
        ) : (
          <ChartWorkspace 
            layoutMode={layoutMode}
            maximizedId={maximizedId}
            panelSizes={panelSizes}
            activeGutter={activeGutter}
            tickers={tickers}
            sessionTicker={sessionTicker}
            selectedDate={selectedDate}
            isSessionStarted={isSessionStarted}
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

        <PlaybackBar
          totalRealized={totalRealized}
          totalUnrealized={totalUnrealized}
          isDbLoaded={isDbLoaded}
          sessionTicker={sessionTicker}
          onResetToOpen={handleResetToOpen}
          minStepMinutes={minStepMinutes}
        />
        <PlaybackManager />
      </div>
    </div>
  );
}
