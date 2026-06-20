import React, { useEffect } from 'react';
import { Activity, Sun, Moon, Monitor } from 'lucide-react';
import { Toaster } from 'sonner';

// Hooks
import { useDatabase } from './hooks/useDatabase';
import { useSession } from './hooks/useSession';
import { useWorkspace } from './hooks/useWorkspace';
import { useDrawings } from './hooks/useDrawings';

// Components
import { Sidebar } from './components/Sidebar';
import { ChartWorkspace } from './components/ChartWorkspace';
import { AccountHeader } from './components/AccountHeader';
import { EnvToggle } from './components/EnvToggle';
import { AccountSelector } from './components/AccountSelector';
import ErrorBoundary from './components/ErrorBoundary';
import { useSessionStore } from './store/useSessionStore';
import { useWorkspaceStore } from './store/useWorkspaceStore';
import { WatchlistManager } from './components/WatchlistManager';
import { Clock } from './components/Clock';

export default function App() {
  const { 
    tickers, 

    isLoading, 
    dbStatus, 
    isDbLoaded, 
    handleFileUpload 
  } = useDatabase();

  const theme = useWorkspaceStore((state) => state.theme);

  useEffect(() => {
    import('./store/useWatchlistStore').then(({ useWatchlistStore }) => {
      useWatchlistStore.getState().syncWithRemote().catch(console.error);
    });
  }, []);

  useEffect(() => {
    document.body.classList.remove('theme-dark', 'theme-light', 'theme-oled', 'theme-hc');
    if (theme === 'light' || theme === 'dark') {
      document.body.classList.add('theme-dark');
    } else {
      document.body.classList.add('theme-oled');
    }
  }, [theme]);

  const {
    sessionTicker,
    setSessionTicker,
    login,
    isAuthenticated,
    isLoggingIn,
    isLoginError,
    loginError,
    resetLogin
  } = useSession(tickers);

  console.log('[StabilityTrace] App Rendering, isLoggingIn:', isLoggingIn, 'isAuthenticated:', isAuthenticated);

  const autoLoginAttempted = React.useRef(false);

  useEffect(() => {
    if (!isAuthenticated && !isLoggingIn && !autoLoginAttempted.current) {
      autoLoginAttempted.current = true;
      login().catch((err) => console.error('[App] Auto-login failed:', err));
    }
  }, [isAuthenticated, isLoggingIn, login]);

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
    drawings,
    handleUpdateDrawings
  } = useDrawings();

  return (
    <div className="app-container">
      <Sidebar 
        dbStatus={dbStatus}
        isDbLoaded={isDbLoaded}
        handleFileUpload={handleFileUpload}
        layoutMode={layoutMode}
        setLayoutMode={setLayoutMode}
      />

      <div className="main-content" style={{ position: 'relative' }}>
        <ErrorBoundary>
          {isLoggingIn && !isAuthenticated ? (
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
                drawings={drawings}
              chartGroups={chartGroups}
              groupTickers={groupTickers}
              workspaceRef={workspaceRef}
              selectedChartId={selectedChartId}
              onSelectChart={handleSelectChart}
              onToggleMaximize={toggleMaximize}
              onUpdateDrawings={handleUpdateDrawings}
              onTickerChange={handleTickerChange}
              onTimeframeChange={handleTimeframeChange}
              onGroupChange={handleGroupChange}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerEnd={handlePointerEnd}
            />
          )}
        </ErrorBoundary>

        <header className="terminal-header">
          <ErrorBoundary fallback={<div style={{ color: 'var(--accent-red)', fontSize: '10px' }}>Header Error</div>}>
            <AccountHeader />
          </ErrorBoundary>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock />
            <button 
              className="btn-icon" 
              onClick={() => useWorkspaceStore.getState().cycleTheme()}
              title={`Theme: ${theme} (Click to toggle)`}
            >
              {theme === 'light' ? <Sun size={16} /> : 
               theme === 'dark' ? <Moon size={16} /> : 
               <Monitor size={16} />}
            </button>
            <ErrorBoundary fallback={null}>
              <AccountSelector />
            </ErrorBoundary>
            <EnvToggle login={login} isLoggingIn={isLoggingIn} />
          </div>
        </header>
      </div>
      <Toaster theme="dark" position="top-right" richColors />
      <WatchlistManager />
    </div>
  );
}
