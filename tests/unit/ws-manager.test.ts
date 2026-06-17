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
      setIsWsConnected: vi.fn(),
    });
  });

  const createMockSocket = () => {
    let onMessageHandler: any;
    let onCloseHandler: any;
    let onOpenHandler: any;
    return {
      send: vi.fn(),
      close: vi.fn(),
      readyState: 1,
      set onopen(fn: any) { onOpenHandler = fn; fn(); },
      set onmessage(fn: any) { onMessageHandler = fn; },
      set onclose(fn: any) { onCloseHandler = fn; },
      set onerror(fn: any) { },
      triggerMessage(data: any) { if (onMessageHandler) onMessageHandler({ data }); },
      triggerClose(event: any) { if (onCloseHandler) onCloseHandler(event); },
      triggerOpen() { if (onOpenHandler) onOpenHandler(); }
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
    expect(connectSpy).toHaveBeenCalledWith('wss://demo-api-streaming-capital.backend-capital.com/connect');
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

  it('should trigger onDisconnect and onReconnect listeners', () => {
    const onDisconnectSpy = vi.fn();
    const onReconnectSpy = vi.fn();

    wsManager.onDisconnect(onDisconnectSpy);
    wsManager.onReconnect(onReconnectSpy);

    const mockSocket = createMockSocket();
    class MockWebSocket {
      static OPEN = 1;
      constructor(public url: string) {
        return mockSocket;
      }
    }
    vi.stubGlobal('WebSocket', MockWebSocket);

    wsManager.connect();
    expect(mockSocket.readyState).toBe(1);

    // Trigger close
    mockSocket.triggerClose({ code: 1006 });
    expect(onDisconnectSpy).toHaveBeenCalledTimes(1);

    // Trigger reconnect open (since it schedules reconnect, we need to manually trigger open to simulate successful reconnect)
    (wsManager as any).reconnectAttempts = 1;
    mockSocket.triggerOpen();
    expect(onReconnectSpy).toHaveBeenCalledTimes(1);

    vi.unstubAllGlobals();
  });
});
