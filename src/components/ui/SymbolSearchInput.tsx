import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, TrendingUp, Coins, Building } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface SymbolOption {
  symbol: string;
  name: string;
  type: 'stock' | 'etf' | 'crypto';
  score?: number;
}

interface SymbolSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  excludeSymbols?: string[];
}

export function SymbolSearchInput({ 
  value, 
  onChange, 
  placeholder = "Search symbols...", 
  className = "",
  disabled = false,
  excludeSymbols = []
}: SymbolSearchInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(value);
  const [symbols, setSymbols] = useState<SymbolOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load popular symbols on mount
  useEffect(() => {
    const loadPopularSymbols = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;

        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/market-data/symbols/popular?limit=20`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setSymbols(data.symbols || []);
        }
      } catch (error) {
        console.error('Error loading popular symbols:', error);
        // Fallback to basic symbols
        setSymbols([
          { symbol: 'AAPL', name: 'Apple Inc.', type: 'stock' },
          { symbol: 'MSFT', name: 'Microsoft Corporation', type: 'stock' },
          { symbol: 'GOOGL', name: 'Alphabet Inc.', type: 'stock' },
          { symbol: 'AMZN', name: 'Amazon.com Inc.', type: 'stock' },
          { symbol: 'TSLA', name: 'Tesla Inc.', type: 'stock' },
          { symbol: 'BTC/USD', name: 'Bitcoin', type: 'crypto' },
          { symbol: 'ETH/USD', name: 'Ethereum', type: 'crypto' },
          { symbol: 'SPY', name: 'SPDR S&P 500 ETF', type: 'etf' },
        ]);
      }
    };

    loadPopularSymbols();
  }, []);

  // Search symbols when query changes
  useEffect(() => {
    const searchSymbols = async () => {
      if (!searchQuery.trim() || searchQuery.length < 1) {
        // Load popular symbols when no query
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session?.access_token) return;

          const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/market-data/symbols/popular?limit=20`, {
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
            },
          });

          if (response.ok) {
            const data = await response.json();
            // Filter out excluded symbols
            const filteredSymbols = (data.symbols || []).filter((symbol: SymbolOption) => 
              !excludeSymbols.includes(symbol.symbol)
            );
            setSymbols(filteredSymbols);
          }
        } catch (error) {
          console.error('Error loading popular symbols:', error);
        }
        return;
      }

      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;

        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/api/market-data/symbols/search?query=${encodeURIComponent(searchQuery)}&limit=20`,
          {
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          // Filter out excluded symbols
          const filteredSymbols = (data.symbols || []).filter((symbol: SymbolOption) => 
            !excludeSymbols.includes(symbol.symbol)
          );
          setSymbols(filteredSymbols);
          setSelectedIndex(-1); // Reset selection
        }
      } catch (error) {
        console.error('Error searching symbols:', error);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchSymbols, 200);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.toUpperCase();
    setSearchQuery(newValue);
    onChange(newValue);
    setIsOpen(true);
    setSelectedIndex(-1);
  };

  // Handle input focus
  const handleFocus = () => {
    setIsOpen(true);
    setSearchQuery(value);
  };

  // Handle input blur
  const handleBlur = (e: React.FocusEvent) => {
    // Delay closing to allow for option clicks
    setTimeout(() => {
      if (!dropdownRef.current?.contains(e.relatedTarget as Node)) {
        setIsOpen(false);
      }
    }, 150);
  };

  // Handle option selection
  const handleOptionSelect = (symbol: string) => {
    onChange(symbol);
    setSearchQuery(symbol);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, symbols.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && symbols[selectedIndex]) {
          handleOptionSelect(symbols[selectedIndex].symbol);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        inputRef.current?.blur();
        break;
    }
  };

  // Get icon for symbol type
  const getSymbolIcon = (type: string) => {
    switch (type) {
      case 'crypto':
        return <Coins className="w-4 h-4 text-yellow-400" />;
      case 'etf':
        return <TrendingUp className="w-4 h-4 text-purple-400" />;
      default:
        return <Building className="w-4 h-4 text-blue-400" />;
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 ${className}`}
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-gray-400 border-t-blue-500 rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && symbols.length > 0 && (
          <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-2xl z-50 max-h-64 overflow-y-auto custom-scrollbar"
          >
            {!searchQuery.trim() && (
              <div className="px-3 py-2 text-xs text-gray-400 border-b border-gray-700 bg-gray-800/50">
                Popular Symbols
              </div>
            )}
            
            <div className="py-1">
              {symbols.map((symbolOption, index) => (
                <motion.button
                  key={symbolOption.symbol}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.02 }}
                  onClick={() => handleOptionSelect(symbolOption.symbol)}
                  className={`w-full px-3 py-2 text-left hover:bg-gray-700 transition-colors flex items-center justify-between ${
                    selectedIndex === index ? 'bg-gray-700' : ''
                  } ${
                    excludeSymbols.includes(symbolOption.symbol) ? 'opacity-50 cursor-not-allowed bg-gray-800' : ''
                  }`}
                  disabled={excludeSymbols.includes(symbolOption.symbol)}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {getSymbolIcon(symbolOption.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white text-sm">
                          {symbolOption.symbol}
                        </span>
                        <span className={`px-1.5 py-0.5 text-xs rounded border ${
                          symbolOption.type === 'crypto' 
                            ? 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20'
                            : symbolOption.type === 'etf'
                            ? 'text-purple-400 bg-purple-400/10 border-purple-400/20'
                            : 'text-blue-400 bg-blue-400/10 border-blue-400/20'
                        }`}>
                          {symbolOption.type.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 truncate">
                        {symbolOption.name}
                      </p>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
            
            {symbols.length === 0 && searchQuery.trim() && (
              <div className="px-3 py-4 text-center text-gray-400">
                <Search className="w-6 h-6 mx-auto mb-2 text-gray-600" />
                <p className="text-sm">No symbols found for "{searchQuery}"</p>
                <p className="text-xs text-gray-500 mt-1">Try a different search term</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}