type SubscriptionCallback = (data: any) => void;

interface Subscription {
  symbol: string;
  callbacks: Set<SubscriptionCallback>;
}

export class WebSocketManager {
  private ws: WebSocket | null = null;
  private subscriptions: Map<string, Subscription> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnecting = false;
  private authToken: string | null = null;
  private environment: 'paper' | 'live' = 'paper';

  constructor() {
    this.connect = this.connect.bind(this);
    this.handleMessage = this.handleMessage.bind(this);
    this.handleClose = this.handleClose.bind(this);
    this.handleError = this.handleError.bind(this);
  }

  setAuthToken(token: string) {
    this.authToken = token;
  }

  setEnvironment(env: 'paper' | 'live') {
    this.environment = env;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.disconnect();
      this.connect();
    }
  }

  private getWebSocketUrl(): string {
    const isPaper = this.environment === 'paper';
    return isPaper
      ? 'wss://stream.data.alpaca.markets/v2/iex'
      : 'wss://stream.data.alpaca.markets/v2/iex';
  }

  async connect(): Promise<void> {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.isConnecting = true;

    try {
      const wsUrl = this.getWebSocketUrl();
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[WebSocketManager] Connected to Alpaca WebSocket');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.authenticate();
      };

      this.ws.onmessage = this.handleMessage;
      this.ws.onclose = this.handleClose;
      this.ws.onerror = this.handleError;
    } catch (error) {
      console.error('[WebSocketManager] Connection error:', error);
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  private authenticate() {
    if (!this.ws || !this.authToken) return;

    const authMessage = {
      action: 'auth',
      key: this.authToken,
      secret: ''
    };

    this.ws.send(JSON.stringify(authMessage));

    this.subscriptions.forEach((subscription, symbol) => {
      this.sendSubscription('subscribe', [symbol]);
    });
  }

  private handleMessage(event: MessageEvent) {
    try {
      const data = JSON.parse(event.data);

      if (Array.isArray(data)) {
        data.forEach(message => this.processMessage(message));
      } else {
        this.processMessage(data);
      }
    } catch (error) {
      console.error('[WebSocketManager] Message parsing error:', error);
    }
  }

  private processMessage(message: any) {
    if (message.T === 'success' || message.T === 'subscription') {
      console.log('[WebSocketManager] Server message:', message.msg);
      return;
    }

    if (message.T === 'error') {
      console.error('[WebSocketManager] Server error:', message.msg);
      return;
    }

    if (message.T === 't' || message.T === 'q' || message.T === 'b') {
      const symbol = message.S;
      const subscription = this.subscriptions.get(symbol);

      if (subscription) {
        const normalizedData = this.normalizeData(message);
        subscription.callbacks.forEach(callback => {
          try {
            callback(normalizedData);
          } catch (error) {
            console.error('[WebSocketManager] Callback error:', error);
          }
        });
      }
    }
  }

  private normalizeData(message: any) {
    switch (message.T) {
      case 't':
        return {
          type: 'trade',
          symbol: message.S,
          price: message.p,
          size: message.s,
          timestamp: message.t,
          exchange: message.x,
        };
      case 'q':
        return {
          type: 'quote',
          symbol: message.S,
          bidPrice: message.bp,
          bidSize: message.bs,
          askPrice: message.ap,
          askSize: message.as,
          timestamp: message.t,
        };
      case 'b':
        return {
          type: 'bar',
          symbol: message.S,
          open: message.o,
          high: message.h,
          low: message.l,
          close: message.c,
          volume: message.v,
          timestamp: message.t,
        };
      default:
        return message;
    }
  }

  private handleClose(event: CloseEvent) {
    console.log('[WebSocketManager] Connection closed:', event.code, event.reason);
    this.ws = null;
    this.isConnecting = false;

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.scheduleReconnect();
    } else {
      console.error('[WebSocketManager] Max reconnection attempts reached');
    }
  }

  private handleError(event: Event) {
    console.error('[WebSocketManager] WebSocket error:', event);
  }

  private scheduleReconnect() {
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts),
      30000
    );

    console.log(`[WebSocketManager] Reconnecting in ${delay}ms...`);
    this.reconnectAttempts++;

    setTimeout(() => {
      this.connect();
    }, delay);
  }

  subscribe(symbol: string, callback: SubscriptionCallback): () => void {
    if (!this.subscriptions.has(symbol)) {
      this.subscriptions.set(symbol, {
        symbol,
        callbacks: new Set([callback]),
      });

      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.sendSubscription('subscribe', [symbol]);
      }
    } else {
      this.subscriptions.get(symbol)!.callbacks.add(callback);
    }

    return () => this.unsubscribe(symbol, callback);
  }

  private unsubscribe(symbol: string, callback: SubscriptionCallback) {
    const subscription = this.subscriptions.get(symbol);
    if (!subscription) return;

    subscription.callbacks.delete(callback);

    if (subscription.callbacks.size === 0) {
      this.subscriptions.delete(symbol);

      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.sendSubscription('unsubscribe', [symbol]);
      }
    }
  }

  private sendSubscription(action: 'subscribe' | 'unsubscribe', symbols: string[]) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const message = {
      action,
      trades: symbols,
      quotes: symbols,
      bars: symbols,
    };

    this.ws.send(JSON.stringify(message));
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.subscriptions.clear();
    this.reconnectAttempts = 0;
    this.isConnecting = false;
  }

  getConnectionState(): string {
    if (!this.ws) return 'DISCONNECTED';

    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return 'CONNECTING';
      case WebSocket.OPEN:
        return 'CONNECTED';
      case WebSocket.CLOSING:
        return 'CLOSING';
      case WebSocket.CLOSED:
        return 'DISCONNECTED';
      default:
        return 'UNKNOWN';
    }
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

export const wsManager = new WebSocketManager();
