import React from 'react';
import { Activity, Database, UploadCloud, Calendar as CalendarIcon, RotateCcw, HardDrive, ExternalLink } from 'lucide-react';

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
  onLaunch?: () => void;
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
  setLayoutMode,
  onLaunch
}) => {
  return (
    <aside className="sidebar">
      <div className="logo" title="Trading Terminal">
        <Activity size={24} color="var(--accent-green)" />
      </div>

      <button className="btn-icon" onClick={onLaunch} title="Connect Proxy">
        <ExternalLink size={20} color="var(--accent-green)" />
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
  );
};
