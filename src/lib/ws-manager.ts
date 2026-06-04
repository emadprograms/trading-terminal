import { useSessionStore } from '../store/useSessionStore';
import { usePriceStore } from '../store/usePriceStore';

class WebSocketManager {
  private static instance: WebSocketManager;
  private socket: WebSocket | null = null;
  private activeEpics: Set<string> = new Set();
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

    const url = environment === 'LIVE' 
      ? 'wss://api.capital.com/ws/live/connect' 
      : 'wss://api.capital.com/ws/demo/connect';

    console.log(`[WSManager] Connecting to ${url}...`);
    this.socket = new WebSocket(url);

    this.socket.onopen = () => {
      console.log('[WSManager] Connection established');
      this.reconnectAttempts = 0;
      this.authenticate(cst, securityToken);
      
      // Auto-resubscribe to active epics upon reconnection
      this.activeEpics.forEach(epic => {
        console.log(`[WSManager] Auto-resubscribing to ${epic}`);
        this.send({
          type: 'marketData.subscribe',
          epic,
        });
      });
    };

    this.socket.onmessage = (event) => {
      this.handleMessage(event.data);
    };

    this.socket.onclose = () => {
      console.log('[WSManager] Connection closed');
      this.scheduleReconnect();
    };

    this.socket.onerror = (error) => {
      console.error('[WSManager] WebSocket error:', error);
    };
  }

  private authenticate(cst: string, securityToken: string): void {
    const authPayload = {
      type: 'auth',
      cst,
      securityToken,
    };
    this.send(authPayload);
  }

  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data);
      
      if (message.type === 'marketData.update') {
        const { epic, bid, ask, timestamp } = message;
        usePriceStore.getState().updatePrice(epic, bid, ask, timestamp);
      }
      
      if (message.type === 'error') {
        console.error('[WSManager] API Error:', message.message);
      }
    } catch (e) {
      console.error('[WSManager] Failed to parse message:', e);
    }
  }

  public subscribe(epic: string): void {
    this.activeEpics.add(epic);
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.send({
        type: 'marketData.subscribe',
        epic,
      });
    }
  }

  public unsubscribe(epic: string): void {
    this.activeEpics.delete(epic);
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.send({
        type: 'marketData.unsubscribe',
        epic,
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

  public disconnect(): void {
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
