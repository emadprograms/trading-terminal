import { describe, it, expect, beforeEach, vi } from 'vitest';
import { wsManager } from '../../src/lib/ws-manager';
import { useSessionStore } from '../../src/store/useSessionStore';
import { usePriceStore } from '../../src/store/usePriceStore';

vi.mock('../../src/store/useSessionStore');
vi.mock('../../src/store/usePriceStore');

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
    const mockSocket = {
      send: vi.fn(),
      close: vi.fn(),
      readyState: 1,
      set onopen(fn: any) { fn(); },
      set onmessage(fn: any) { },
      set onclose(fn: any) { },
      set onerror(fn: any) { },
    };
    
    class MockWebSocket {
      constructor(public url: string) {
        // We return the mockSocket object instead of the class instance
        return mockSocket;
      }
    }
    vi.stubGlobal('WebSocket', MockWebSocket);

    const connectSpy = vi.spyOn(global, 'WebSocket');
    wsManager.connect();
    expect(connectSpy).toHaveBeenCalledWith('wss://api.capital.com/ws/demo/connect');
    vi.unstubAllGlobals();
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
    
    class MockWebSocket {
      constructor(public url: string) {
        return mockSocket;
      }
    }
    vi.stubGlobal('WebSocket', MockWebSocket);

    wsManager.connect();
    expect(mockSocket.send).toHaveBeenCalledWith(expect.stringContaining('"type":"auth"'));
    expect(mockSocket.send).toHaveBeenCalledWith(expect.stringContaining('"cst":"test-cst"'));
    vi.unstubAllGlobals();
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
    
    class MockWebSocket {
      constructor(public url: string) {
        return mockSocket;
      }
    }
    vi.stubGlobal('WebSocket', MockWebSocket);

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
    vi.unstubAllGlobals();
  });
});
