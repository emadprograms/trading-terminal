import { describe, it, expect, beforeEach, vi } from 'vitest';
import { wsManager } from '../../lib/ws-manager';
import { useSessionStore } from '../../store/useSessionStore';
import { usePriceStore } from '../../store/usePriceStore';

vi.mock('../../store/useSessionStore');
vi.mock('../../store/usePriceStore');

describe('WebSocketManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useSessionStore.getState as any).mockReturnValue({
      cst: 'test-cst',
      securityToken: 'test-token',
      environment: 'DEMO',
    });
  });

  it('should initialize and connect to the correct URL', () => {
    const connectSpy = vi.spyOn(global, 'WebSocket').mockImplementation(() => ({
      send: vi.fn(),
      close: vi.fn(),
      readyState: 1,
      set onopen(fn: any) { fn(); },
      set onmessage(fn: any) { },
      set onclose(fn: any) { },
      set onerror(fn: any) { },
    } as any));

    wsManager.connect();
    expect(connectSpy).toHaveBeenCalledWith('wss://api.capital.com/ws/demo/connect');
  });

  it('should send authentication payload on open', () => {
    const mockSocket = {
      send: vi.fn(),
      close: vi.fn(),
      readyState: 1,
      set onopen(fn: any) { fn(); },
      set onmessage(fn: any) { },
      set onclose(fn: any) { },
      set onerror(fn: any) { },
    };
    vi.spyOn(global, 'WebSocket').mockImplementation(() => mockSocket as any);

    wsManager.connect();
    expect(mockSocket.send).toHaveBeenCalledWith(expect.stringContaining('"type":"auth"'));
    expect(mockSocket.send).toHaveBeenCalledWith(expect.stringContaining('"cst":"test-cst"'));
  });

  it('should update usePriceStore on marketData.update message', () => {
    const updatePriceSpy = vi.fn();
    (usePriceStore.getState as any).mockReturnValue({
      updatePrice: updatePriceSpy,
    });

    const mockSocket = {
      send: vi.fn(),
      close: vi.fn(),
      readyState: 1,
      set onopen(fn: any) { fn(); },
      set onmessage(fn: any) { this._onmessage = fn; },
      set onclose(fn: any) { },
      set onerror(fn: any) { },
      get _onmessage() { return this._onmessage; },
    };
    vi.spyOn(global, 'WebSocket').mockImplementation(() => mockSocket as any);

    wsManager.connect();
    
    const mockPayload = JSON.stringify({
      type: 'marketData.update',
      epic: 'AAPL',
      bid: 150.00,
      ask: 150.10,
      timestamp: Date.now(),
    });
    
    (mockSocket as any)._onmessage( { data: mockPayload } );
    
    expect(updatePriceSpy).toHaveBeenCalledWith('AAPL', 150.00, 150.10, expect.any(Number));
  });
});
