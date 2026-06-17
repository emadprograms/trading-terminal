import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useTradeStore } from '../store/useTradeStore';

vi.mock('../store/useTradeStore', () => ({
  useTradeStore: {
    getState: vi.fn()
  }
}));

vi.mock('../store/useSettingsStore', () => ({
  useSettingsStore: {
    getState: () => ({
      getOrderSettings: () => ({ tradeSize: 1, guaranteedStop: false })
    })
  }
}));

vi.mock('../store/usePriceStore', () => ({
  usePriceStore: {
    getState: () => ({ prices: {} })
  }
}));

describe('Phase 4: Keyboard Shortcut Isolation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('blocks shortcut execution if chart is not active/hovered (ORDER-01)', () => {
    const placeOrderMock = vi.fn().mockResolvedValue('deal-1');
    (useTradeStore.getState as any).mockReturnValue({
      placeOrder: placeOrderMock
    });

    const mockContainer = {
      matches: vi.fn().mockReturnValue(false),
      contains: vi.fn().mockReturnValue(false)
    };

    const { result, rerender } = renderHook((props: any) => useKeyboardShortcuts({
      chartContainerRef: { current: props.container } as any,
      onUpdateDrawings: vi.fn(),
      ticker: 'AAPL',
      setShowEth: vi.fn(),
      isSelected: props.isSelected,
      onNavigateWatchlist: vi.fn()
    }), {
      initialProps: {
        container: mockContainer,
        isSelected: false
      }
    });

    // Fire event while NOT selected
    const event = new KeyboardEvent('keydown', { key: 'q', code: 'KeyQ', altKey: true });
    window.dispatchEvent(event);

    expect(placeOrderMock).not.toHaveBeenCalled();
    
    // Now make it selected
    rerender({ container: mockContainer, isSelected: true });

    // Fire event while selected
    const event2 = new KeyboardEvent('keydown', { key: 'q', code: 'KeyQ', altKey: true });
    window.dispatchEvent(event2);

    expect(placeOrderMock).toHaveBeenCalled();
  });
});
