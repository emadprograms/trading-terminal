import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TradeControls } from './TradeControls';
import { usePriceStore } from '../store/usePriceStore';
import { useTradeStore } from '../store/useTradeStore';

// Mock the stores
vi.mock('../store/usePriceStore');
vi.mock('../store/useTradeStore');

describe('TradeControls', () => {
  const mockPlaceOrder = vi.fn().mockResolvedValue({ dealReference: 'ref123' });

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementation for usePriceStore
    (usePriceStore as unknown as any).mockImplementation((selector: any) => 
      selector({
        prices: {
          'IX.D.DOW.IFS.IP': { bid: 34000.5, ask: 34001.5 }
        }
      })
    );

    // Default mock implementation for useTradeStore
    (useTradeStore as unknown as any).mockImplementation((selector: any) => 
      selector({
        placeOrder: mockPlaceOrder
      })
    );
  });

  it('renders Buy and Sell buttons with current prices', () => {
    render(<TradeControls ticker="IX.D.DOW.IFS.IP" />);
    
    expect(screen.getByText('34,000.50')).toBeDefined();
    expect(screen.getByText('34,001.50')).toBeDefined();
    expect(screen.getByText('BUY')).toBeDefined();
    expect(screen.getByText('SELL')).toBeDefined();
  });

  it('calls placeOrder with MARKET type by default', async () => {
    render(<TradeControls ticker="IX.D.DOW.IFS.IP" />);
    
    const buyButton = screen.getByText('BUY').closest('button')!;
    fireEvent.click(buyButton);

    expect(mockPlaceOrder).toHaveBeenCalledWith({
      epic: 'IX.D.DOW.IFS.IP',
      size: 1,
      direction: 'BUY',
      type: 'MARKET',
      level: undefined
    });
  });

  it('changes order type and updates level', () => {
    render(<TradeControls ticker="IX.D.DOW.IFS.IP" />);
    
    const typeSelect = screen.getByRole('combobox');
    fireEvent.change(typeSelect, { target: { value: 'LIMIT' } });

    expect(screen.getByText('@')).toBeDefined();
    const levelInput = screen.getByDisplayValue('34001.5');
    expect(levelInput).toBeDefined();
  });

  it('calls placeOrder with LIMIT type and level', () => {
    render(<TradeControls ticker="IX.D.DOW.IFS.IP" />);
    
    const typeSelect = screen.getByRole('combobox');
    fireEvent.change(typeSelect, { target: { value: 'LIMIT' } });

    const sellButton = screen.getByText('SELL').closest('button')!;
    fireEvent.click(sellButton);

    expect(mockPlaceOrder).toHaveBeenCalledWith({
      epic: 'IX.D.DOW.IFS.IP',
      size: 1,
      direction: 'SELL',
      type: 'LIMIT',
      level: 34001.5 // Initial sync with ask
    });
  });
});
