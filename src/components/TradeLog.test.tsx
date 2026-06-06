import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TradeLog } from './TradeLog';
import { useTradeStore } from '../store/useTradeStore';

// Mock store
vi.mock('../store/useTradeStore', () => ({
  useTradeStore: vi.fn(),
}));

describe('TradeLog', () => {
  const mockFlatten = vi.fn();
  const mockFlattenAll = vi.fn();
  const mockCancel = vi.fn();
  const mockCancelAll = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders active positions and working orders', () => {
    (useTradeStore as any).mockImplementation((selector: any) => selector({
      positions: [{ dealId: 'd1', epic: 'AAPL', size: 1, direction: 'BUY', entryPrice: 150, timestamp: Date.now() }],
      pendingOrders: {
        'ref1': { dealReference: 'ref1', epic: 'EURUSD', size: 1000, direction: 'SELL', type: 'LIMIT', level: 1.12, status: 'PENDING', timestamp: Date.now() }
      },
      isExecuting: false,
      closingDealIds: new Set(),
      flattenPosition: mockFlatten,
      flattenAll: mockFlattenAll,
      cancelWorkingOrder: mockCancel,
      cancelAllWorkingOrders: mockCancelAll,
    }));

    render(<TradeLog />);
    expect(screen.getByText('Active Positions (1)')).toBeDefined();
    expect(screen.getByText('Working Orders (1)')).toBeDefined();
    expect(screen.getByText('AAPL')).toBeDefined();
    expect(screen.getByText('EURUSD')).toBeDefined();
    expect(screen.getByText('FLATTEN')).toBeDefined();
  });

  it('calls flattenPosition when FLATTEN is clicked', () => {
    (useTradeStore as any).mockImplementation((selector: any) => selector({
      positions: [{ dealId: 'd1', epic: 'AAPL', size: 1, direction: 'BUY', entryPrice: 150, timestamp: Date.now() }],
      pendingOrders: {},
      isExecuting: false,
      closingDealIds: new Set(),
      flattenPosition: mockFlatten,
      flattenAll: mockFlattenAll,
      cancelWorkingOrder: mockCancel,
      cancelAllWorkingOrders: mockCancelAll,
    }));

    render(<TradeLog />);
    fireEvent.click(screen.getByText('FLATTEN'));
    expect(mockFlatten).toHaveBeenCalledWith('d1');
  });

  it('disables buttons when isExecuting is true', () => {
    (useTradeStore as any).mockImplementation((selector: any) => selector({
      positions: [{ dealId: 'd1', epic: 'AAPL', size: 1, direction: 'BUY', entryPrice: 150, timestamp: Date.now() }],
      pendingOrders: {},
      isExecuting: true,
      closingDealIds: new Set(),
      flattenPosition: mockFlatten,
      flattenAll: mockFlattenAll,
      cancelWorkingOrder: mockCancel,
      cancelAllWorkingOrders: mockCancelAll,
    }));

    render(<TradeLog />);
    const flattenButton = screen.getByText('FLATTEN');
    expect(flattenButton).toBeDisabled();
  });

  it('shows row-level loading when dealId is in closingDealIds', () => {
    (useTradeStore as any).mockImplementation((selector: any) => selector({
      positions: [{ dealId: 'd1', epic: 'AAPL', size: 1, direction: 'BUY', entryPrice: 150, timestamp: Date.now() }],
      pendingOrders: {},
      isExecuting: true,
      closingDealIds: new Set(['d1']),
      flattenPosition: mockFlatten,
      flattenAll: mockFlattenAll,
      cancelWorkingOrder: mockCancel,
      cancelAllWorkingOrders: mockCancelAll,
    }));

    render(<TradeLog />);
    expect(screen.getByText('...')).toBeDefined();
  });
});
