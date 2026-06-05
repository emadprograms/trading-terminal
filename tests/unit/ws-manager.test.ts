import { describe, it, expect, beforeEach, vi } from 'vitest';
import { wsManager } from '../../src/lib/ws-manager';
import { useSessionStore } from '../../src/store/useSessionStore';
import { usePriceStore } from '../../src/store/usePriceStore';

vi.mock('../../src/store/useSessionStore');
vi.mock('../../src/store/usePriceStore');

describe('WebSocketManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    wsManager.disconnect();
    (useSessionStore.getState as any).mockReturnValue({
      cst: 'test-cst',
      securityToken: 'test-token',
      environment: 'DEMO',
    });
  });

  const createMockSocket = () => {
    let onMessageHandler: any;
    return {
      send: vi.fn(),
      close: vi.fn(),
      readyState: 1,
      set onopen(fn: any) { fn(); },
      set onmessage(fn: any) { onMessageHandler = fn; },
      set onclose(fn: any) { },
      set onerror(fn: any) { },
      triggerMessage(data: any) { if (onMessageHandler) onMessageHandler({ data }); }
    };
  };

  it('should initialize and connect to the correct URL', () => {
    const mockSocket = createMockSocket();
    
    class MockWebSocket {
      static OPEN = 1;
      constructor(public url: string) {
        return mockSocket;
      }
    }
    vi.stubGlobal('WebSocket', MockWebSocket);

    const connectSpy = vi.spyOn(global, 'WebSocket');
    wsManager.connect();
    expect(connectSpy).toHaveBeenCalledWith('wss://api-streaming-capital.backend-capital.com/connect');
    vi.unstubAllGlobals();
  });

  it('should send authentication payload on open', () => {
    const mockSocket = createMockSocket();
    
    class MockWebSocket {
      static OPEN = 1;
      constructor(public url: string) {
        return mockSocket;
      }
    }
    vi.stubGlobal('WebSocket', MockWebSocket);

    wsManager.connect();
    expect(mockSocket.send).toHaveBeenCalledWith(expect.stringContaining('"destination":"ping"'));
    expect(mockSocket.send).toHaveBeenCalledWith(expect.stringContaining('"cst":"test-cst"'));
    vi.unstubAllGlobals();
  });

  it('should update usePriceStore on quote message', () => {
    const updatePriceSpy = vi.fn();
    (usePriceStore.getState as any).mockReturnValue({
      updatePrice: updatePriceSpy,
    });

    const mockSocket = createMockSocket();
    
    class MockWebSocket {
      static OPEN = 1;
      constructor(public url: string) {
        return mockSocket;
      }
    }
    vi.stubGlobal('WebSocket', MockWebSocket);

    wsManager.connect();
    
    const mockPayload = JSON.stringify({
      destination: 'quote',
      payload: {
        epic: 'AAPL',
        bid: 150.00,
        ofr: 150.10,
        timestamp: 1660297190627,
      }
    });
    
    mockSocket.triggerMessage(mockPayload);
    
    expect(updatePriceSpy).toHaveBeenCalledWith('AAPL', 150.00, 150.10, 1660297190627);
    vi.unstubAllGlobals();
  });
});
