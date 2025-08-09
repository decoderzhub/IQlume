import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, DollarSign, Activity } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { Card } from '../ui/Card';
import { formatCurrency, formatPercent } from '../../lib/utils';
import { useStore } from '../../store/useStore';
import { supabase } from '../../lib/supabase';

// Mock data - replace with real data from your API
const mockPortfolio = {
  total_value: 125420.50,
  day_change: 1247.82,
  day_change_percent: 1.01,
  accounts: [
    {
      id: '1',
      user_id: '1',
      brokerage: 'alpaca' as const,
      account_name: 'Main Trading',
      account_type: 'stocks' as const,
      balance: 85420.50,
      is_connected: true,
      last_sync: '2024-01-15T10:30:00Z',
    },
    {
      id: '2',
      user_id: '1',
      brokerage: 'binance' as const,
      account_name: 'Crypto Portfolio',
      account_type: 'crypto' as const,
      balance: 40000.00,
      is_connected: true,
      last_sync: '2024-01-15T10:25:00Z',
    },
  ],
};

export function PortfolioOverview() {
  const { portfolio: storePortfolio, user } = useStore();
  const [marketData, setMarketData] = React.useState<any>(null);
  const [historicalData, setHistoricalData] = React.useState<any>({});
  const [loading, setLoading] = React.useState(false);
  
  const portfolio = storePortfolio ?? mockPortfolio;
  const isPositive = portfolio.day_change >= 0;

  // Generate mock historical data for charts (in production, this would come from your API)
  const generateMockHistoricalData = (currentPrice: number, symbol: string) => {
    const points = 20;
    const data = [];
    let price = currentPrice * 0.95; // Start 5% below current price
    
    for (let i = 0; i < points; i++) {
      const change = (Math.random() - 0.5) * 0.02; // ±1% random change
      price = price * (1 + change);
      data.push({
        time: Date.now() - (points - i) * 60000, // 1 minute intervals
        price: price,
        value: price
      });
    }
    
    // Ensure the last point matches current price
    data[data.length - 1].price = currentPrice;
    data[data.length - 1].value = currentPrice;
    
    return data;
  };

  // Fetch real-time market data for portfolio symbols
  React.useEffect(() => {
    const fetchMarketData = async () => {
      if (!user) return;
      
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.access_token) return;

        // Get symbols from portfolio accounts (simplified example)
        const symbols = ['AAPL', 'MSFT', 'BTC', 'ETH'].join(',');
        
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/market-data/live-prices?symbols=${symbols}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setMarketData(data);
          
          // Generate historical data for charts
          const newHistoricalData: any = {};
          Object.entries(data).forEach(([symbol, quote]: [string, any]) => {
            if (!historicalData[symbol]) {
              newHistoricalData[symbol] = generateMockHistoricalData(quote.price, symbol);
            }
          });
          setHistoricalData(prev => ({ ...prev, ...newHistoricalData }));
        }
      } catch (error) {
        console.error('Error fetching market data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMarketData();
    
    // Refresh market data every 30 seconds
    const interval = setInterval(fetchMarketData, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // Update historical data with new prices
  React.useEffect(() => {
    if (marketData) {
      const updatedHistoricalData = { ...historicalData };
      
      Object.entries(marketData).forEach(([symbol, quote]: [string, any]) => {
        if (updatedHistoricalData[symbol]) {
          // Add new data point and keep only last 20 points
          const newPoint = {
            time: Date.now(),
            price: quote.price,
            value: quote.price
          };
          updatedHistoricalData[symbol] = [...updatedHistoricalData[symbol].slice(1), newPoint];
        }
      });
      
      setHistoricalData(updatedHistoricalData);
    }
  }, [marketData]);

  const stats = [
    {
      label: 'Total Value',
      value: formatCurrency(portfolio.total_value),
      icon: DollarSign,
      color: 'text-blue-400',
    },
    {
      label: 'Today\'s Change',
      value: formatCurrency(Math.abs(portfolio.day_change)),
      icon: isPositive ? TrendingUp : TrendingDown,
      color: isPositive ? 'text-green-400' : 'text-red-400',
    },
    {
      label: 'Day Change %',
      value: formatPercent(Math.abs(portfolio.day_change_percent)),
      icon: Activity,
      color: isPositive ? 'text-green-400' : 'text-red-400',
    },
    {
      label: 'Connected Accounts',
      value: portfolio.accounts.filter(acc => acc.is_connected).length.toString(),
      icon: Activity,
      color: 'text-purple-400',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card hoverable className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-400">{stat.label}</p>
                    <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                    {loading && stat.label === 'Total Value' && (
                      <p className="text-xs text-gray-500 mt-1">Updating...</p>
                    )}
                  </div>
                  <Icon className={`w-8 h-8 ${stat.color}`} />
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Real-time Market Data Display */}
      {marketData && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Live Market Data</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(marketData).map(([symbol, data]: [string, any]) => (
              <motion.div 
                key={symbol} 
                className="bg-gray-800/30 rounded-lg p-4"
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="font-medium text-white text-sm">{symbol}</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-lg font-bold text-white">
                        ${data.price?.toFixed(2)}
                      </span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        data.change >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {data.change >= 0 ? '+' : ''}{data.change_percent?.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Mini Chart */}
                {historicalData[symbol] && (
                  <div className="h-16 mb-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={historicalData[symbol]}>
                        <Line 
                          type="monotone" 
                          dataKey="value" 
                          stroke={data.change >= 0 ? '#10b981' : '#ef4444'}
                          strokeWidth={1.5}
                          dot={false}
                          activeDot={{ r: 2, fill: data.change >= 0 ? '#10b981' : '#ef4444' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
                
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>Vol: {data.volume?.toLocaleString()}</span>
                  <span>H: ${data.high?.toFixed(2)}</span>
                  <span>L: ${data.low?.toFixed(2)}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Connected Accounts</h3>
        <div className="space-y-4">
          {portfolio.accounts.map((account) => (
            <div key={account.id} className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
              <div className="flex items-center gap-4">
                <div className={`w-3 h-3 rounded-full ${account.is_connected ? 'bg-green-500' : 'bg-red-500'}`} />
                <div>
                  <p className="font-medium text-white">{account.account_name}</p>
                  <p className="text-sm text-gray-400 capitalize">
                    {account.brokerage} • {account.account_type}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium text-white">{formatCurrency(account.balance)}</p>
                <p className="text-sm text-gray-400">Last sync: just now</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}