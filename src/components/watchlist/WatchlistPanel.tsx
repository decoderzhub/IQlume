import React, { useState, useEffect } from 'react';
import { Star, Plus, Trash2, TrendingUp, TrendingDown, RefreshCw, Search } from 'lucide-react';
import { Card } from '../ui/Card';
import { supabase } from '../../lib/supabase';
import { useMarketDataStream } from '../../hooks/useMarketDataStream';

interface WatchlistItem {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
}

interface Watchlist {
  id: string;
  name: string;
  symbols: string[];
}

export function WatchlistPanel() {
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [activeWatchlistId, setActiveWatchlistId] = useState<string | null>(null);
  const [watchlistItems, setWatchlistItems] = useState<Map<string, WatchlistItem>>(new Map());
  const [showAddSymbol, setShowAddSymbol] = useState(false);
  const [newSymbol, setNewSymbol] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadWatchlists();
  }, []);

  useEffect(() => {
    if (activeWatchlistId) {
      const activeWatchlist = watchlists.find(w => w.id === activeWatchlistId);
      if (activeWatchlist) {
        fetchWatchlistData(activeWatchlist.symbols);
      }
    }
  }, [activeWatchlistId, watchlists]);

  const loadWatchlists = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('watchlists')
        .select('*')
        .eq('user_id', session.user.id)
        .order('order_index');

      if (error) throw error;

      if (data && data.length > 0) {
        setWatchlists(data);
        setActiveWatchlistId(data[0].id);
      } else {
        const defaultWatchlist = await createDefaultWatchlist(session.user.id);
        if (defaultWatchlist) {
          setWatchlists([defaultWatchlist]);
          setActiveWatchlistId(defaultWatchlist.id);
        }
      }
    } catch (error) {
      console.error('Error loading watchlists:', error);
    } finally {
      setLoading(false);
    }
  };

  const createDefaultWatchlist = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('watchlists')
        .insert({
          user_id: userId,
          name: 'My Watchlist',
          symbols: ['AAPL', 'TSLA', 'MSFT', 'GOOGL', 'AMZN'],
          order_index: 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating default watchlist:', error);
      return null;
    }
  };

  const fetchWatchlistData = async (symbols: string[]) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const symbolsQuery = symbols.join(',');

      const response = await fetch(`${API_BASE}/api/market-data/quotes?symbols=${symbolsQuery}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch watchlist data');

      const data = await response.json();
      const newItems = new Map<string, WatchlistItem>();

      data.forEach((item: any) => {
        newItems.set(item.symbol, {
          symbol: item.symbol,
          price: item.price || 0,
          change: item.change || 0,
          changePercent: item.change_percent || 0,
          volume: item.volume || 0,
        });
      });

      setWatchlistItems(newItems);
    } catch (error) {
      console.error('Error fetching watchlist data:', error);
    }
  };

  const handleAddSymbol = async () => {
    if (!newSymbol || !activeWatchlistId) return;

    try {
      const activeWatchlist = watchlists.find(w => w.id === activeWatchlistId);
      if (!activeWatchlist) return;

      const upperSymbol = newSymbol.toUpperCase();
      if (activeWatchlist.symbols.includes(upperSymbol)) {
        alert('Symbol already in watchlist');
        return;
      }

      const updatedSymbols = [...activeWatchlist.symbols, upperSymbol];

      const { error } = await supabase
        .from('watchlists')
        .update({ symbols: updatedSymbols })
        .eq('id', activeWatchlistId);

      if (error) throw error;

      setWatchlists(prev =>
        prev.map(w =>
          w.id === activeWatchlistId ? { ...w, symbols: updatedSymbols } : w
        )
      );

      setNewSymbol('');
      setShowAddSymbol(false);
    } catch (error) {
      console.error('Error adding symbol:', error);
    }
  };

  const handleRemoveSymbol = async (symbol: string) => {
    if (!activeWatchlistId) return;

    try {
      const activeWatchlist = watchlists.find(w => w.id === activeWatchlistId);
      if (!activeWatchlist) return;

      const updatedSymbols = activeWatchlist.symbols.filter(s => s !== symbol);

      const { error } = await supabase
        .from('watchlists')
        .update({ symbols: updatedSymbols })
        .eq('id', activeWatchlistId);

      if (error) throw error;

      setWatchlists(prev =>
        prev.map(w =>
          w.id === activeWatchlistId ? { ...w, symbols: updatedSymbols } : w
        )
      );

      setWatchlistItems(prev => {
        const newMap = new Map(prev);
        newMap.delete(symbol);
        return newMap;
      });
    } catch (error) {
      console.error('Error removing symbol:', error);
    }
  };

  const handleRefresh = () => {
    const activeWatchlist = watchlists.find(w => w.id === activeWatchlistId);
    if (activeWatchlist) {
      fetchWatchlistData(activeWatchlist.symbols);
    }
  };

  const activeWatchlist = watchlists.find(w => w.id === activeWatchlistId);
  const filteredItems = searchQuery
    ? Array.from(watchlistItems.values()).filter(item =>
        item.symbol.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : Array.from(watchlistItems.values());

  const sortedItems = [...filteredItems].sort((a, b) => {
    return Math.abs(b.changePercent) - Math.abs(a.changePercent);
  });

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 text-gray-400">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Loading watchlist...</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Star className="w-5 h-5 text-yellow-400" />
          <h3 className="text-lg font-semibold text-white">
            {activeWatchlist?.name || 'Watchlist'}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4 text-gray-400" />
          </button>
          <button
            onClick={() => setShowAddSymbol(!showAddSymbol)}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            title="Add symbol"
          >
            <Plus className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      {showAddSymbol && (
        <div className="mb-4 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
          <div className="flex gap-2">
            <input
              type="text"
              value={newSymbol}
              onChange={(e) => setNewSymbol(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddSymbol()}
              placeholder="Enter symbol (e.g., AAPL)"
              className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={handleAddSymbol}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
            >
              Add
            </button>
          </div>
        </div>
      )}

      {sortedItems.length > 5 && (
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search symbols..."
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      )}

      <div className="space-y-2 max-h-[600px] overflow-y-auto">
        {sortedItems.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Star className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No symbols in watchlist</p>
            <p className="text-sm mt-1">Click the + button to add symbols</p>
          </div>
        ) : (
          sortedItems.map((item) => (
            <div
              key={item.symbol}
              className="flex items-center justify-between p-3 bg-gray-800/50 hover:bg-gray-800 rounded-lg transition-colors group"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <span className="text-white font-semibold">{item.symbol}</span>
                  <span className="text-gray-400 text-sm">
                    Vol: {(item.volume / 1000000).toFixed(1)}M
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-white font-medium">
                    ${item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className={`flex items-center gap-1 text-sm ${item.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {item.change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    <span>
                      {item.change >= 0 ? '+' : ''}{item.changePercent.toFixed(2)}%
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleRemoveSymbol(item.symbol)}
                  className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-500/20 rounded-lg transition-all"
                  title="Remove"
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
