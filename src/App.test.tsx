import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';

const queryClient = new QueryClient();

// Mock the hooks used in App to avoid initialization errors during render
vi.mock('./hooks/useDatabase', () => ({
  useDatabase: () => ({
    tickers: [],
    isLoading: false,
    dbStatus: 'connected',
    isDbLoaded: true,
    handleFileUpload: vi.fn(),
  }),
}));

vi.mock('./lib/db', () => ({
  DatabaseWorkerProxy: vi.fn().mockImplementation(() => ({
    query: vi.fn().mockResolvedValue([]),
    close: vi.fn(),
  })),
}));

vi.mock('./hooks/useSession', () => ({
  useSession: () => ({
    selectedDate: '2024-01-01',
    setSelectedDate: vi.fn(),
    sessionTicker: 'AAPL',
    setSessionTicker: vi.fn(),
    entryTime: '09:30',
    setEntryTime: vi.fn(),
    isSessionStarted: false,
    startSession: vi.fn(),
    endSession: vi.fn(),
    getUtcTimeFromEt: vi.fn(),
    login: vi.fn(),
    isAuthenticated: true,
    isLoggingIn: false,
  }),
}));

vi.mock('./hooks/useWorkspace', () => ({
  useWorkspace: () => ({
    layoutMode: 'default',
    setLayoutMode: vi.fn(),
    maximizedId: null,
    toggleMaximize: vi.fn(),
    panelSizes: {},
    activeGutter: null,
    groupTickers: [],
    chartGroups: [],
    workspaceRef: { current: null },
    handlePointerDown: vi.fn(),
    handlePointerMove: vi.fn(),
    handlePointerEnd: vi.fn(),
    handleTickerChange: vi.fn(),
    handleGroupChange: vi.fn(),
    handleTimeframeChange: vi.fn(),
    handleSelectChart: vi.fn(),
    selectedChartId: null,
  }),
}));

vi.mock('./hooks/usePortfolio', () => ({
  usePortfolio: () => ({
    totalRealized: 0,
    totalUnrealized: 0,
    handlePnLUpdate: vi.fn(),
  }),
}));

vi.mock('./hooks/useDrawings', () => ({
  useDrawings: () => ({
    drawings: [],
    handleUpdateDrawings: vi.fn(),
  }),
}));

vi.mock('./store/useSessionStore', () => {
  const state = {
    environment: 'DEMO',
  };
  
  const useSessionStore = (selector?: any) => {
    if (typeof selector === 'function') {
      return selector(state);
    }
    return state;
  };
  
  useSessionStore.getState = vi.fn().mockReturnValue(state);
  
  return {
    useSessionStore,
  };
});

// Mock sonner's Toaster
vi.mock('sonner', () => {
  return {
    Toaster: (props: any) => (
      <div data-testid="sonner-toaster" data-theme={props.theme} data-position={props.position}>
        Toaster
      </div>
    ),
  };
});

describe('App', () => {
  it('renders the Toaster component with dark theme and top-right position', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    );
    const toaster = screen.getByTestId('sonner-toaster');
    expect(toaster).toBeInTheDocument();
    expect(toaster).toHaveAttribute('data-theme', 'dark');
    expect(toaster).toHaveAttribute('data-position', 'top-right');
  });
});
