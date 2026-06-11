import React, { useState } from 'react';
import { Activity, Database, UploadCloud, Calendar as CalendarIcon, RotateCcw, HardDrive, ExternalLink, ClipboardList, ChevronLeft, List } from 'lucide-react';
import { TradeLog } from './TradeLog';
import { Watchlist } from './Watchlist';

interface SidebarProps {
  dbStatus: string;
  isDbLoaded: boolean;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  isSessionStarted: boolean;
  onEndSession: () => void;
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
  selectedDate,
  setSelectedDate,
  isSessionStarted,
  onEndSession,
  layoutMode,
  setLayoutMode
}) => {
  const [activePanel, setActivePanel] = useState<'tradeLog' | 'watchlist' | null>(null);

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
          onClick={() => setActivePanel(activePanel === 'watchlist' ? null : 'watchlist')} 
          title="Watchlist"
          style={{ 
            color: activePanel === 'watchlist' ? 'var(--accent-green)' : 'var(--text-secondary)',
            background: activePanel === 'watchlist' ? 'rgba(38, 166, 154, 0.1)' : 'transparent',
            marginTop: '8px'
          }}
        >
          <List size={20} />
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
            <h3 style={{ fontSize: '14px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Watchlist</h3>
            <button className="btn-icon" onClick={() => setActivePanel(null)}>
              <ChevronLeft size={18} />
            </button>
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <Watchlist />
          </div>
        </div>
      )}
    </>
  );
};
