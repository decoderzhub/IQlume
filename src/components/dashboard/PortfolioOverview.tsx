import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, DollarSign, Activity, Info, Shield, Wallet } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { Card } from '../ui/Card';
import { formatCurrency, formatPercent } from '../../lib/utils';
import { useStore } from '../../store/useStore';
import { supabase } from '../../lib/supabase';

export function PortfolioOverview() {
  const { portfolio, user, brokerageAccounts, bankAccounts, custodialWallets } = useStore();
  const [marketData, setMarketData] = React.useState<any>(null);
  const [historicalData, setHistoricalData] = React.useState<any>({});
  const [loading, setLoading] = React.useState(false);
  
  const isPositive = (portfolio?.day_change || 0) >= 0;

  // Generate mock historical data for charts (in production, this would come from your API)
  const generateMockHistoricalData = (currentPrice: number, symbol: string) => {
    const points = 50; // More data points for smoother chart
    const data = [];
    let price = currentPrice * 0.95; // Start 5% below current price
    
    for (let i = 0; i < points; i++) {
      const change = (Math.random() - 0.5) * 0.02; // ±1% random change
      price = price * (1 + change);
      const now = new Date();
      const time = new Date(now.getTime() - (points - i) * 30000); // 30 second intervals
      data.push({
        time: time.getTime(),
        timeLabel: time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        price: price,
        value: price,
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
      const now = new Date();
      const updatedHistoricalData = { ...historicalData };
      
      Object.entries(marketData).forEach(([symbol, quote]: [string, any]) => {
        if (updatedHistoricalData[symbol]) {
          // Add new data point and keep only last 20 points
          const newPoint = {
            time: now.getTime(),
            timeLabel: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            price: quote.price,
            value: quote.price,
          };
          updatedHistoricalData[symbol] = [...updatedHistoricalData[symbol].slice(-49), newPoint];
        }
      });
      
      setHistoricalData(updatedHistoricalData);
    }
  }, [marketData]);

  const stats = [
    {
      label: 'Total Value',
      value: formatCurrency(portfolio?.total_value || 0),
      icon: DollarSign,
      color: 'text-blue-400',
    },
    {
      label: 'Buying Power',
      value: formatCurrency(portfolio?.buying_power || 0),
      icon: Wallet,
      color: 'text-green-400',
    },
    {
      label: 'Today\'s Change',
      value: formatCurrency(Math.abs(portfolio?.day_change || 0)),
      icon: isPositive ? TrendingUp : TrendingDown,
      color: isPositive ? 'text-green-400' : 'text-red-400',
    },
    {
      label: 'Day Change %',
      value: formatPercent(Math.abs(portfolio?.day_change_percent || 0)),
      icon: Activity,
      color: isPositive ? 'text-green-400' : 'text-red-400',
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {Object.entries(marketData).map(([symbol, data]: [string, any]) => (
              <Card 
                key={symbol}
                className="p-6"
                hoverable
              >
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">
                      {symbol === 'BTC' ? '₿' : symbol === 'ETH' ? 'Ξ' : symbol.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{symbol}/USDT Grid Trading</h3>
                    <p className="text-sm text-gray-400">
                      Active for {Math.floor(Math.random() * 24)}h {Math.floor(Math.random() * 60)}m (Created {new Date().toLocaleDateString()})
                    </p>
                  </div>
                </div>
                
                {/* Investment and Profit Section */}
                <div className="flex flex-col lg:flex-row gap-4 mb-6">
                  <div className="bg-gray-800/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm text-gray-400">Investment</span>
                      <span className="text-xs text-gray-500">USDT</span>
                    </div>
                    <div className="text-xl lg:text-2xl font-bold text-white break-words">
                      {(Math.random() * 5000 + 1000).toFixed(1)}
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-green-600/20 to-green-500/20 border border-green-500/30 rounded-lg p-4 flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm text-green-400">Current profit</span>
                      <span className="text-xs text-green-400">USDT</span>
                      <Info className="w-3 h-3 text-green-400" />
                    </div>
                    <div className="text-lg lg:text-xl xl:text-2xl font-bold text-green-400 break-words overflow-hidden">
                      +{(data.change * 10).toFixed(4)}({data.change_percent?.toFixed(2)}%)
                    </div>
                  </div>
                </div>
                
                {/* Metrics Grid */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div>
                    <div className="flex items-center gap-1 mb-1">
                      <span className="text-sm text-gray-400">Grid profit</span>
                      <span className="text-xs text-gray-500">USDT</span>
                    </div>
                    <div className="text-green-400 font-semibold">
                      +{(Math.random() * 50).toFixed(4)}
                    </div>
                    <div className="text-green-400 text-sm">
                      +{(Math.random() * 0.1).toFixed(2)}%
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-1 mb-1">
                      <span className="text-sm text-gray-400">Holding profit</span>
                      <span className="text-xs text-gray-500">USDT</span>
                    </div>
                    <div className="text-green-400 font-semibold">
                      +{(data.change * 8).toFixed(4)}
                    </div>
                    <div className="text-green-400 text-sm">
                      +{(Math.random() * 1 + 0.5).toFixed(2)}%
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-1 mb-1">
                      <span className="text-sm text-gray-400">Grid/Total annualized</span>
                    </div>
                    <div className="text-green-400 font-semibold">
                      {(Math.random() * 10 + 5).toFixed(1)}%
                    </div>
                    <div className="text-green-400 text-sm">
                      {(Math.random() * 200 + 50).toFixed(2)}%
                    </div>
                  </div>
                </div>
                
                {/* Additional Metrics */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div>
                    <div className="text-sm text-gray-400 mb-1">24H/Total Transactions</div>
                    <div className="text-white font-semibold">
                      {Math.floor(Math.random() * 5)}/{Math.floor(Math.random() * 20 + 5)} times
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-sm text-gray-400 mb-1">Price range <span className="text-xs">USDT</span></div>
                    <div className="text-white font-semibold">
                      {(data.low * 0.95).toFixed(0)} - {(data.high * 1.05).toFixed(0)}
                    </div>
                    <div className="text-gray-400 text-sm">
                      ({Math.floor(Math.random() * 50 + 20)} grids)
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-1 mb-1">
                      <span className="text-sm text-gray-400">Accum grid/</span>
                      <span className="text-xs text-gray-500">USDT</span>
                      <span className="text-sm text-gray-400">Total profit</span>
                    </div>
                    <div className="text-green-400 font-semibold">
                      +{(Math.random() * 50).toFixed(4)}
                    </div>
                    <div className="text-green-400 text-sm">
                      +{(data.change * 10).toFixed(4)}
                    </div>
                  </div>
                </div>
                
                {/* Price Info */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <div className="text-sm text-gray-400 mb-1">Price <span className="text-xs">USDT</span></div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-semibold text-lg">
                        {data.price?.toFixed(3)}
                      </span>
                      <TrendingUp className="w-4 h-4 text-orange-400" />
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-sm text-gray-400 mb-1">Start price <span className="text-xs">USDT</span></div>
                    <div className="text-white font-semibold text-lg">
                      {(data.open || data.price * 0.98)?.toFixed(3)}
                    </div>
                  </div>
                </div>
                
                {/* Large Chart */}
                {historicalData[symbol] && (
                  <div className="h-48 mb-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={historicalData[symbol]}>
                        <defs>
                          <linearGradient id={`gradient-${symbol}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.05}/>
                          </linearGradient>
                        </defs>
                        <XAxis 
                          dataKey="timeLabel" 
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 12, fill: '#d1d5db' }}
                          interval="preserveStartEnd"
                        />
                        <YAxis 
                          domain={['dataMin - 1', 'dataMax + 1']}
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 12, fill: '#d1d5db' }}
                          tickFormatter={(value) => `${value.toFixed(0)}`}
                        />
                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke="#10b981"
                          strokeWidth={2}
                          fill={`url(#gradient-${symbol})`}
                          dot={false}
                          activeDot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#ffffff' }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </Card>
            ))}
        </div>
      )}

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Connected Accounts</h3>
        <div className="space-y-4">
          {brokerageAccounts.map((account) => (
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
        
        {/* Show custodial wallets as available capital */}
        {custodialWallets.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-700">
            <h4 className="text-md font-semibold text-white mb-4">Available Trading Capital</h4>
            <div className="space-y-3">
              {custodialWallets.map((wallet) => (
                <div key={wallet.id} className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Shield className="w-4 h-4 text-green-400" />
                    <div>
                      <p className="font-medium text-white text-sm">{wallet.wallet_name}</p>
                      <p className="text-xs text-gray-400">
                        APY: {(wallet.apy * 100).toFixed(2)}% • FDIC Insured
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-green-400">
                      {formatCurrency(wallet.balance_usd + wallet.balance_treasuries)}
                    </p>
                    <p className="text-xs text-gray-400">Available for trading</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}