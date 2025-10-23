import { apiClient } from '../lib/api-client';
import { wsManager } from './WebSocketManager';

export interface MarketDataPoint {
  symbol: string;
  price: number;
  change: number;
  change_percent: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  timestamp: number;
}

type SubscriptionCallback = (data: MarketDataPoint) => void;

interface Subscription {
  symbol: string;
  callbacks: Set<SubscriptionCallback>;
}

interface PollingConfig {
  marketOpenInterval: number;
  marketClosedInterval: number;
  inactiveTabInterval: number;
}

export class MarketDataManager {
  private static instance: MarketDataManager;
  private subscriptions: Map<string, Subscription> = new Map();
  private cache: Map<string, MarketDataPoint> = new Map();
  private pollingInterval: NodeJS.Timeout | null = null;
  private isPolling: boolean = false;
  private lastFetchTime: number = 0;
  private isTabActive: boolean = true;
  private errorCount: number = 0;
  private maxErrors: number = 5;
  private useWebSocket: boolean = false;
  private wsUnsubscribers: Map<string, () => void> = new Map();

  private config: PollingConfig = {
    marketOpenInterval: 30000,
    marketClosedInterval: 300000,
    inactiveTabInterval: 120000,
  };

  private constructor() {
    this.setupVisibilityListener();
    this.setupMarketHoursMonitoring();
    this.setupWebSocketIntegration();
  }

  private setupWebSocketIntegration() {
    if (wsManager.isConnected()) {
      this.useWebSocket = true;
      console.log('[MarketDataManager] WebSocket available, using real-time data');
    }
  }

  static getInstance(): MarketDataManager {
    if (!MarketDataManager.instance) {
      MarketDataManager.instance = new MarketDataManager();
    }
    return MarketDataManager.instance;
  }

  private setupVisibilityListener() {
    if (typeof document === 'undefined') return;

    document.addEventListener('visibilitychange', () => {
      const wasActive = this.isTabActive;
      this.isTabActive = !document.hidden;

      if (!wasActive && this.isTabActive) {
        console.log('[MarketDataManager] Tab became active, fetching fresh data');
        this.fetchMarketData();
      }

      if (this.isPolling) {
        this.restartPolling();
      }
    });
  }

  private setupMarketHoursMonitoring() {
    setInterval(() => {
      if (this.isPolling) {
        this.restartPolling();
      }
    }, 60000);
  }

  private isMarketOpen(): boolean {
    const now = new Date();
    const day = now.getDay();
    const hours = now.getHours();
    const minutes = now.getMinutes();

    if (day === 0 || day === 6) return false;

    const currentMinutes = hours * 60 + minutes;
    const marketOpen = 9 * 60 + 30;
    const marketClose = 16 * 60;

    return currentMinutes >= marketOpen && currentMinutes < marketClose;
  }

  private getCurrentPollingInterval(): number {
    if (!this.isTabActive) {
      return this.config.inactiveTabInterval;
    }

    return this.isMarketOpen()
      ? this.config.marketOpenInterval
      : this.config.marketClosedInterval;
  }

  subscribe(symbol: string, callback: SubscriptionCallback): () => void {
    console.log(`[MarketDataManager] Subscribing to ${symbol}`);

    if (!this.subscriptions.has(symbol)) {
      this.subscriptions.set(symbol, {
        symbol,
        callbacks: new Set([callback]),
      });

      const cached = this.cache.get(symbol);
      if (cached) {
        callback(cached);
      }

      if (wsManager.isConnected()) {
        const wsUnsub = wsManager.subscribe(symbol, (wsData: any) => {
          const marketDataPoint: MarketDataPoint = {
            symbol: wsData.symbol,
            price: wsData.price || wsData.close || 0,
            change: 0,
            change_percent: 0,
            volume: wsData.volume || wsData.size || 0,
            high: wsData.high || wsData.price || 0,
            low: wsData.low || wsData.price || 0,
            open: wsData.open || wsData.price || 0,
            timestamp: Date.now(),
          };

          this.cache.set(symbol, marketDataPoint);

          const subscription = this.subscriptions.get(symbol);
          if (subscription) {
            subscription.callbacks.forEach(cb => {
              try {
                cb(marketDataPoint);
              } catch (error) {
                console.error(`[MarketDataManager] Error in WS callback for ${symbol}:`, error);
              }
            });
          }
        });

        this.wsUnsubscribers.set(symbol, wsUnsub);
        console.log(`[MarketDataManager] Using WebSocket for ${symbol}`);
      }
    } else {
      this.subscriptions.get(symbol)!.callbacks.add(callback);

      const cached = this.cache.get(symbol);
      if (cached) {
        callback(cached);
      }
    }

    if (!this.isPolling) {
      this.startPolling();
    }

    return () => this.unsubscribe(symbol, callback);
  }

  private unsubscribe(symbol: string, callback: SubscriptionCallback) {
    const subscription = this.subscriptions.get(symbol);
    if (!subscription) return;

    subscription.callbacks.delete(callback);

    if (subscription.callbacks.size === 0) {
      console.log(`[MarketDataManager] No more subscribers for ${symbol}, removing subscription`);
      this.subscriptions.delete(symbol);

      const wsUnsub = this.wsUnsubscribers.get(symbol);
      if (wsUnsub) {
        wsUnsub();
        this.wsUnsubscribers.delete(symbol);
        console.log(`[MarketDataManager] Unsubscribed from WebSocket for ${symbol}`);
      }
    }

    if (this.subscriptions.size === 0) {
      console.log('[MarketDataManager] No active subscriptions, stopping polling');
      this.stopPolling();
    }
  }

  private startPolling() {
    if (this.isPolling) return;

    console.log('[MarketDataManager] Starting polling');
    this.isPolling = true;
    this.fetchMarketData();
    this.scheduleNextPoll();
  }

  private stopPolling() {
    if (!this.isPolling) return;

    console.log('[MarketDataManager] Stopping polling');
    this.isPolling = false;

    if (this.pollingInterval) {
      clearTimeout(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  private restartPolling() {
    if (!this.isPolling) return;

    if (this.pollingInterval) {
      clearTimeout(this.pollingInterval);
      this.pollingInterval = null;
    }

    this.scheduleNextPoll();
  }

  private scheduleNextPoll() {
    if (!this.isPolling) return;

    const interval = this.getCurrentPollingInterval();

    this.pollingInterval = setTimeout(() => {
      this.fetchMarketData();
      this.scheduleNextPoll();
    }, interval);

    console.log(`[MarketDataManager] Next poll scheduled in ${interval / 1000}s (market ${this.isMarketOpen() ? 'open' : 'closed'}, tab ${this.isTabActive ? 'active' : 'inactive'})`);
  }

  private async fetchMarketData() {
    if (this.subscriptions.size === 0) {
      return;
    }

    const symbols = Array.from(this.subscriptions.keys());
    console.log(`[MarketDataManager] Fetching data for ${symbols.length} symbols: ${symbols.join(', ')}`);

    try {
      const symbolsQuery = symbols.join(',');
      const data = await apiClient.get<{ [symbol: string]: any }>(`/market_data/prices?symbols=${symbolsQuery}`);

      this.errorCount = 0;
      this.lastFetchTime = Date.now();

      Object.entries(data).forEach(([symbol, quote]) => {
        const marketDataPoint: MarketDataPoint = {
          symbol,
          price: quote.price || 0,
          change: quote.change || 0,
          change_percent: quote.change_percent || 0,
          volume: quote.volume || 0,
          high: quote.high || quote.price || 0,
          low: quote.low || quote.price || 0,
          open: quote.open || quote.price || 0,
          timestamp: Date.now(),
        };

        this.cache.set(symbol, marketDataPoint);

        const subscription = this.subscriptions.get(symbol);
        if (subscription) {
          subscription.callbacks.forEach(callback => {
            try {
              callback(marketDataPoint);
            } catch (error) {
              console.error(`[MarketDataManager] Error in callback for ${symbol}:`, error);
            }
          });
        }
      });

      console.log(`[MarketDataManager] ✅ Successfully fetched and distributed data for ${Object.keys(data).length} symbols`);
    } catch (error) {
      this.errorCount++;
      console.error(`[MarketDataManager] ❌ Error fetching market data (${this.errorCount}/${this.maxErrors}):`, error);

      if (this.errorCount >= this.maxErrors) {
        console.error('[MarketDataManager] Max errors reached, stopping polling');
        this.stopPolling();
      }
    }
  }

  getCached(symbol: string): MarketDataPoint | null {
    return this.cache.get(symbol) || null;
  }

  getCachedBatch(symbols: string[]): Map<string, MarketDataPoint> {
    const result = new Map<string, MarketDataPoint>();
    symbols.forEach(symbol => {
      const cached = this.cache.get(symbol);
      if (cached) {
        result.set(symbol, cached);
      }
    });
    return result;
  }

  async fetchOnce(symbols: string[]): Promise<Map<string, MarketDataPoint>> {
    try {
      const symbolsQuery = symbols.join(',');
      const data = await apiClient.get<{ [symbol: string]: any }>(`/market_data/prices?symbols=${symbolsQuery}`);

      const result = new Map<string, MarketDataPoint>();

      Object.entries(data).forEach(([symbol, quote]) => {
        const marketDataPoint: MarketDataPoint = {
          symbol,
          price: quote.price || 0,
          change: quote.change || 0,
          change_percent: quote.change_percent || 0,
          volume: quote.volume || 0,
          high: quote.high || quote.price || 0,
          low: quote.low || quote.price || 0,
          open: quote.open || quote.price || 0,
          timestamp: Date.now(),
        };

        this.cache.set(symbol, marketDataPoint);
        result.set(symbol, marketDataPoint);
      });

      return result;
    } catch (error) {
      console.error('[MarketDataManager] Error in fetchOnce:', error);
      return new Map();
    }
  }

  getStats() {
    return {
      activeSubscriptions: this.subscriptions.size,
      cachedSymbols: this.cache.size,
      isPolling: this.isPolling,
      lastFetchTime: this.lastFetchTime,
      timeSinceLastFetch: this.lastFetchTime ? Date.now() - this.lastFetchTime : null,
      errorCount: this.errorCount,
      isMarketOpen: this.isMarketOpen(),
      isTabActive: this.isTabActive,
      currentInterval: this.getCurrentPollingInterval(),
    };
  }

  clearCache() {
    this.cache.clear();
    console.log('[MarketDataManager] Cache cleared');
  }

  reset() {
    this.stopPolling();
    this.subscriptions.clear();
    this.cache.clear();
    this.errorCount = 0;
    console.log('[MarketDataManager] Reset complete');
  }
}

export const marketDataManager = MarketDataManager.getInstance();
