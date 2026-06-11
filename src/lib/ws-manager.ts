import { useSessionStore } from '../store/useSessionStore';
import { usePriceStore } from '../store/usePriceStore';
import { useTradeStore } from '../store/useTradeStore';

class WebSocketManager {
  private static instance: WebSocketManager;
  private socket: WebSocket | null = null;
  private activeEpics: Set<string> = new Set();
  private bufferedTicks: Map<string, any[]> = new Map();
  private bufferingEpics: Set<string> = new Set();
  private reconnectAttempts: number = 0;
  private maxReconnectDelay = 30000;
  private baseReconnectDelay = 1000;

  private constructor() {}

  public static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  public connect(): void {
    const { cst, securityToken, environment } = useSessionStore.getState();

    if (!cst || !securityToken) {
      console.warn('[WSManager] Missing tokens, skipping connection');
      return;
    }

    this.isExplicitlyDisconnected = false;

    const url = environment === 'LIVE'
      ? 'wss://api-streaming-capital.backend-capital.com/connect'
      : 'wss://demo-api-streaming-capital.backend-capital.com/connect';

    console.log(`[WSManager] Connecting to ${url}...`);
    this.socket = new WebSocket(url);

    this.socket.onopen = () => {
      console.log('[WSManager] Connection established');
      this.reconnectAttempts = 0;
      this.authenticate(cst, securityToken);
      
      // Subscribe to confirmations
      this.subscribeToConfirmations();

      // Auto-resubscribe to active epics upon reconnection
      this.activeEpics.forEach(epic => {
        console.log(`[WSManager] Auto-resubscribing to ${epic}`);
        this.subscribe(epic);
      });
    };

    this.socket.onmessage = (event) => {
      this.handleMessage(event.data);
    };

    this.socket.onclose = (event) => {
      console.log(`[WSManager] Connection closed. Code: ${event.code}, Reason: ${event.reason || 'No reason provided'}`);
      if (!this.isExplicitlyDisconnected) {
        this.scheduleReconnect();
      }
    };

    this.socket.onerror = (error) => {
      console.error('[WSManager] WebSocket error occurred. Checking network state...');
      console.error('[WSManager] Error details:', error);
    };
  }

  private getTokens() {
    const { cst, securityToken } = useSessionStore.getState();
    return { cst, securityToken };
  }

  private authenticate(cst: string, securityToken: string): void {
    const authPayload = {
      destination: 'ping',
      correlationId: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(),
      cst,
      securityToken,
    };
    this.send(authPayload);
  }

  private subscribeToConfirmations(): void {
    const { cst, securityToken } = this.getTokens();
    if (!cst || !securityToken) return;

    console.log('[WSManager] Subscribing to trade confirmations');
    this.send({
      destination: 'confirms.subscribe',
      correlationId: crypto.randomUUID(),
      cst,
      securityToken,
      payload: {}
    });
  }

  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data);
      
      if (message.destination === 'quote' && message.payload) {
        const { epic, bid, ofr, timestamp } = message.payload;
        
        if (this.bufferingEpics.has(epic)) {
          const buffer = this.bufferedTicks.get(epic) || [];
          buffer.push({ bid, ofr, timestamp });
          this.bufferedTicks.set(epic, buffer);
          console.log(`[WSManager] Buffered tick for ${epic}: ${bid} @ ${timestamp}`);
        } else {
          usePriceStore.getState().updatePrice(epic, bid, ofr, timestamp);
        }
      }

      if (message.destination === 'confirms' && message.payload) {
        console.log('[WSManager] Trade confirmation received:', message.payload.dealReference);
        useTradeStore.getState().handleConfirmation(message.payload);
      }
      
      if (message.status === 'ERROR' || message.type === 'error') {
        console.error('[WSManager] API Error:', message.errorCode || message.message);
      }
    } catch (e) {
      console.error('[WSManager] Failed to parse message:', e);
    }
  }

  public setBuffering(epic: string, enabled: boolean): void {
    if (enabled) {
      this.bufferingEpics.add(epic);
      this.bufferedTicks.set(epic, []);
      console.log(`[WSManager] Buffering enabled for ${epic}`);
    } else {
      this.bufferingEpics.delete(epic);
      console.log(`[WSManager] Buffering disabled for ${epic}`);
    }
  }

  public getAndClearBuffer(epic: string): any[] {
    const buffer = this.bufferedTicks.get(epic) || [];
    this.bufferedTicks.delete(epic);
    return buffer;
  }

  public subscribe(epic: string, bufferFirst = false): void {
    if (bufferFirst) {
      this.setBuffering(epic, true);
    }
    this.activeEpics.add(epic);
    if (this.socket?.readyState === WebSocket.OPEN) {
      const { cst, securityToken } = this.getTokens();
      if (!cst || !securityToken) return;
      this.send({
        destination: 'marketData.subscribe',
        correlationId: crypto.randomUUID(),
        cst,
        securityToken,
        payload: {
          epics: [epic]
        }
      });
    }
  }

  public unsubscribe(epic: string): void {
    this.activeEpics.delete(epic);
    if (this.socket?.readyState === WebSocket.OPEN) {
      const { cst, securityToken } = this.getTokens();
      if (!cst || !securityToken) return;
      this.send({
        destination: 'marketData.unsubscribe',
        correlationId: crypto.randomUUID(),
        cst,
        securityToken,
        payload: {
          epics: [epic]
        }
      });
    }
  }

  private send(payload: any): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(payload));
    }
  }

  private scheduleReconnect(): void {
    const delay = Math.min(
      this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts),
      this.maxReconnectDelay
    );
    console.log(`[WSManager] Reconnecting in ${delay}ms...`);
    setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }

  private isExplicitlyDisconnected: boolean = false;

  public disconnect(): void {
    this.isExplicitlyDisconnected = true;
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  /**
   * Re-establishes connection and resubscribes to all active epics.
   * Called when environment changes.
   */
  public syncEnvironment(): void {
    console.log('[WSManager] Syncing environment...');
    this.disconnect();
    this.connect();
  }
}

export const wsManager = WebSocketManager.getInstance();
