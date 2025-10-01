import { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';

interface TradingUpdate {
  type: 'connected' | 'heartbeat' | 'trade_executed' | 'strategy_updated';
  strategy_id?: string;
  strategy_name?: string;
  action?: string;
  symbol?: string;
  quantity?: number;
  price?: number;
  timestamp?: string;
  message?: string;
}

export function useRealTimeUpdates() {
  const { user, strategies, setStrategies } = useStore();
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!user) return;

    const connectSSE = () => {
      try {
        // Close existing connection
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
        }

        // Create new SSE connection
        const eventSource = new EventSource(
          `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/sse/trading-updates?user_id=${user.id}`
        );

        eventSource.onopen = () => {
          console.log('🔗 Real-time trading updates connected');
        };

        eventSource.onmessage = (event) => {
          try {
            const update: TradingUpdate = JSON.parse(event.data);
            console.log('📡 Received trading update:', update);

            switch (update.type) {
              case 'connected':
                console.log('✅ SSE connection established');
                break;

              case 'trade_executed':
                console.log(`🤖 Autonomous trade: ${update.action?.toUpperCase()} ${update.symbol} x${update.quantity} @ $${update.price}`);
                
                // Show notification
                if (update.strategy_name && update.action && update.symbol) {
                  const notification = `🤖 ${update.strategy_name}: ${update.action.toUpperCase()} ${update.symbol} x${update.quantity} @ $${update.price?.toFixed(2)}`;
                  
                  // You could use a toast library here instead of alert
                  if (Notification.permission === 'granted') {
                    new Notification('Autonomous Trade Executed', {
                      body: notification,
                      icon: '/logo.png'
                    });
                  }
                }

                // Refresh strategies to get updated performance
                refreshStrategies();
                break;

              case 'strategy_updated':
                console.log(`📊 Strategy updated: ${update.strategy_name}`);
                refreshStrategies();
                break;

              case 'heartbeat':
                // Silent heartbeat
                break;

              default:
                console.log('📡 Unknown update type:', update.type);
            }
          } catch (error) {
            console.error('Error parsing SSE message:', error);
          }
        };

        eventSource.onerror = (error) => {
          console.error('❌ SSE connection error:', error);
          eventSource.close();
          
          // Reconnect after 5 seconds
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('🔄 Reconnecting SSE...');
            connectSSE();
          }, 5000);
        };

        eventSourceRef.current = eventSource;
      } catch (error) {
        console.error('Error creating SSE connection:', error);
      }
    };

    const refreshStrategies = async () => {
      try {
        const { data: { session } } = await import('../lib/supabase').then(m => m.supabase.auth.getSession());
        if (!session?.access_token) return;

        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/strategies`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setStrategies(Array.isArray(data) ? data : []);
          console.log('🔄 Strategies refreshed from autonomous trade');
        }
      } catch (error) {
        console.error('Error refreshing strategies:', error);
      }
    };

    // Request notification permission
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Connect SSE
    connectSSE();

    // Cleanup
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [user, setStrategies]);

  return {
    isConnected: eventSourceRef.current?.readyState === EventSource.OPEN,
  };
}