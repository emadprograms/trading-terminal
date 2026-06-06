import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TradeControls } from './TradeControls';
import { useTradeStore } from '../store/useTradeStore';
import { usePriceStore } from '../store/usePriceStore';

// Mock stores
vi.mock('../store/useTradeStore', () => ({
  useTradeStore: vi.fn(),
}));

vi.mock('../store/usePriceStore', () => ({
  usePriceStore: vi.fn(),
}));

describe('TradeControls', () => {
  const mockPlaceOrder = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useTradeStore as any).mockImplementation((selector: any) => selector({
      isExecuting: false,
      placeOrder: mockPlaceOrder,
    }));
    (usePriceStore as any).mockImplementation((selector: any) => selector({
      prices: {
        'AAPL': { bid: 150, ask: 151 },
      },
    }));
  });

  it('renders BUY and SELL buttons with prices', () => {
    render(<TradeControls ticker="AAPL" />);
    expect(screen.getByText('BUY')).toBeDefined();
    expect(screen.getByText('SELL')).toBeDefined();
    expect(screen.getByText('150.00')).toBeDefined();
    expect(screen.getByText('151.00')).toBeDefined();
  });

  it('calls placeOrder with BUY direction and new defaults', () => {
    render(<TradeControls ticker="AAPL" />);
    fireEvent.click(screen.getByText('BUY'));
    expect(mockPlaceOrder).toHaveBeenCalledWith(expect.objectContaining({
      direction: 'BUY',
      epic: 'AAPL',
      guaranteedStop: true,
      stopDistance: 50,
      bid: 150,
      ofr: 151
    }));
  });

  it('disables buttons when isExecuting is true', () => {
    (useTradeStore as any).mockImplementation((selector: any) => selector({
      isExecuting: true,
      placeOrder: mockPlaceOrder,
    }));

    render(<TradeControls ticker="AAPL" />);
    const buyButton = screen.getByRole('button', { name: /BUY/i });
    expect(buyButton).toBeDisabled();
  });

  it('allows changing size and SL distance', () => {
    render(<TradeControls ticker="AAPL" />);
    
    const sizeInput = screen.getByDisplayValue('1');
    fireEvent.change(sizeInput, { target: { value: '5' } });
    
    const slInput = screen.getByDisplayValue('50');
    fireEvent.change(slInput, { target: { value: '100' } });
    
    fireEvent.click(screen.getByText('BUY'));
    
    expect(mockPlaceOrder).toHaveBeenCalledWith(expect.objectContaining({
      size: 5,
      stopDistance: 100
    }));
  });
});
