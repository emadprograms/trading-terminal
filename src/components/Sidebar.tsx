import React, { useState, useEffect } from 'react';
import { Activity, Database, UploadCloud, Calendar as CalendarIcon, RotateCcw, HardDrive, ExternalLink, ClipboardList, ChevronLeft, List, History, RefreshCw, Loader2, Check, Bell } from 'lucide-react';
import { TradeLog } from './TradeLog';
import { Watchlist } from './Watchlist';
import { OrderHistory } from './OrderHistory';
import { useWatchlistStore } from '../store/useWatchlistStore';
import { toast } from 'sonner';
import { AlertsPanel } from './AlertsPanel';

interface SidebarProps {
  dbStatus: string;
  isDbLoaded: boolean;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  layoutMode: string;
  setLayoutMode: (mode: string) => void;
}

const LAYOUTS = [
  { id: '1', class: 'l1' },
  { id: '2v', class: 'l2v' },
  { id: '2h', class: 'l2h' },
  { id: '3', class: 'l3' },
  { id: '3b', class: 'l3b' },
  { id: '3l', class: 'l3l' },
  { id: '3r', class: 'l3r' },
  { id: '3h', class: 'l3h' },
  { id: '3v', class: 'l3v' },
  { id: '4', class: 'l4' }
];

export const Sidebar: React.FC<SidebarProps> = ({
  dbStatus,
  isDbLoaded,
  handleFileUpload,
  layoutMode,
  setLayoutMode
}) => {
  const [activePanel, setActivePanel] = useState<'tradeLog' | 'watchlist' | 'orderHistory' | 'alerts' | null>('orderHistory');
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSyncedLabel, setShowSyncedLabel] = useState(false);
  const syncWithRemote = useWatchlistStore((state) => state.syncWithRemote);
  const availableWatchlists = useWatchlistStore((state) => state.availableWatchlists);
  const remoteWatchlistId = useWatchlistStore((state) => state.remoteWatchlistId);
  const setActiveWatchlist = useWatchlistStore((state) => state.setActiveWatchlist);

  const handleSyncWatchlist = async (showToast = false) => {
    setIsSyncing(true);
    setShowSyncedLabel(false);
    try {
      await syncWithRemote();
      setShowSyncedLabel(true);
      setTimeout(() => setShowSyncedLabel(false), 3000);
      if (showToast) {
        toast.success('Watchlist synced successfully');
      }
    } catch (error: any) {
      if (showToast) {
        toast.error(error.message || 'Sync Failed');
      }
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <>
      <aside className="sidebar">
        <div className="logo" title="Trading Terminal">
          <Activity size={24} color="var(--accent-green)" />
        </div>

        <button 
          className={`btn-icon ${activePanel === 'tradeLog' ? 'active' : ''}`} 
          onClick={() => setActivePanel(activePanel === 'tradeLog' ? null : 'tradeLog')} 
          title="Trade Log"
          style={{ 
            color: activePanel === 'tradeLog' ? 'var(--accent-green)' : 'var(--text-secondary)',
            background: activePanel === 'tradeLog' ? 'rgba(38, 166, 154, 0.1)' : 'transparent'
          }}
        >
          <ClipboardList size={20} />
        </button>

        <button 
          className={`btn-icon ${activePanel === 'watchlist' ? 'active' : ''}`} 
          onClick={() => {
            const nextPanel = activePanel === 'watchlist' ? null : 'watchlist';
            setActivePanel(nextPanel);
            if (nextPanel === 'watchlist') {
              handleSyncWatchlist(false);
            }
          }} 
          title="Watchlist"
          style={{ 
            color: activePanel === 'watchlist' ? 'var(--accent-green)' : 'var(--text-secondary)',
            background: activePanel === 'watchlist' ? 'rgba(38, 166, 154, 0.1)' : 'transparent',
            marginTop: '8px'
          }}
        >
          <List size={20} />
        </button>

        <button 
          className={`btn-icon ${activePanel === 'orderHistory' ? 'active' : ''}`} 
          onClick={() => setActivePanel(activePanel === 'orderHistory' ? null : 'orderHistory')} 
          title="Order History"
          style={{ 
            color: activePanel === 'orderHistory' ? 'var(--accent-green)' : 'var(--text-secondary)',
            background: activePanel === 'orderHistory' ? 'rgba(38, 166, 154, 0.1)' : 'transparent',
            marginTop: '8px'
          }}
        >
          <History size={20} />
        </button>

        
        <button 
          className={`btn-icon ${activePanel === 'alerts' ? 'active' : ''}`} 
          onClick={() => setActivePanel(activePanel === 'alerts' ? null : 'alerts')} 
          title="Alerts"
          style={{ 
            color: activePanel === 'alerts' ? 'var(--accent-green)' : 'var(--text-secondary)',
            background: activePanel === 'alerts' ? 'rgba(38, 166, 154, 0.1)' : 'transparent',
            marginTop: '8px'
          }}
        >
          <Bell size={20} />
        </button>

        <div style={{ flex: 1 }}></div>

        <div className="layout-selector" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '0 4px', marginBottom: 'auto', alignItems: 'center' }}>
          {LAYOUTS.map(l => (
            <div 
              key={l.id} 
              className={`layout-icon ${l.class} ${layoutMode === l.id ? 'active' : ''}`}
              onClick={() => setLayoutMode(l.id)}
              title={`Layout ${l.id.toUpperCase()}`}
            >
              {l.id === '1' && <div />}
              {l.id === '2v' && <><div/><div/></>}
              {l.id === '2h' && <><div/><div/></>}
              {l.id.startsWith('3') && <><div/><div/><div/></>}
              {l.id === '4' && <><div/><div/><div/><div/></>}
            </div>
          ))}
        </div>
      </aside>

      {activePanel === 'tradeLog' && (
        <div className="sidebar-panel" style={{
          width: '320px',
          background: 'rgba(0, 0, 0, 0.9)',
          backdropFilter: 'var(--glass-blur)',
          borderRight: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 90
        }}>
          <div style={{ 
            padding: '16px', 
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Execution Log</h3>
            <button className="btn-icon" onClick={() => setActivePanel(null)}>
              <ChevronLeft size={18} />
            </button>
          </div>
          <TradeLog />
        </div>
      )}

      {activePanel === 'orderHistory' && (
        <div className="sidebar-panel" style={{
          width: '320px',
          background: 'rgba(0, 0, 0, 0.9)',
          backdropFilter: 'var(--glass-blur)',
          borderRight: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 90
        }}>
          <div style={{ 
            padding: '16px', 
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Order History</h3>
            <button className="btn-icon" onClick={() => setActivePanel(null)}>
              <ChevronLeft size={18} />
            </button>
          </div>
          <OrderHistory />
        </div>
      )}

      {activePanel === 'watchlist' && (
        <div className="sidebar-panel" style={{
          width: '280px',
          background: 'rgba(0, 0, 0, 0.9)',
          backdropFilter: 'var(--glass-blur)',
          borderRight: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 90
        }}>
          <div style={{ 
            padding: '16px', 
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Watchlist</h3>
              {availableWatchlists && availableWatchlists.length > 0 && (
                <select 
                  value={remoteWatchlistId || ''}
                  onChange={(e) => setActiveWatchlist(e.target.value)}
                  style={{
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    padding: '2px 4px',
                    fontSize: '12px',
                    maxWidth: '160px',
                    outline: 'none'
                  }}
                  title="Select Watchlist"
                >
                  {availableWatchlists.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              )}
            </div>
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              {!isSyncing && showSyncedLabel && (
                <span style={{ fontSize: '10px', color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: '2px', marginRight: '4px' }}>
                  <Check size={12} /> Synced
                </span>
              )}
              <button 
                className="btn-icon" 
                onClick={() => handleSyncWatchlist(true)}
                disabled={isSyncing}
                title="Sync Watchlist"
                style={{ opacity: isSyncing ? 0.5 : 1 }}
              >
                {isSyncing ? <Loader2 size={18} className="spin" /> : <RefreshCw size={18} />}
              </button>
              <button className="btn-icon" onClick={() => setActivePanel(null)}>
                <ChevronLeft size={18} />
              </button>
            </div>
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <Watchlist />
          </div>
        </div>
      )}
    
      {activePanel === 'alerts' && (
        <div className="sidebar-panel watchlist-panel" style={{
          width: '320px',
          background: 'rgba(0, 0, 0, 0.9)',
          backdropFilter: 'var(--glass-blur)',
          borderRight: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 90
        }}>
          <div style={{ 
            padding: '16px', 
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Price Alerts</h3>
            <button className="btn-icon" onClick={() => setActivePanel(null)}>
              <ChevronLeft size={18} />
            </button>
          </div>
          <AlertsPanel />
        </div>
      )}

    </>
  );
};
