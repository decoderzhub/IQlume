"""
Base Strategy Executor

This module contains the base class and common functionality for all strategy executors.
Each strategy type will inherit from BaseStrategyExecutor and implement its specific logic.
"""

import logging
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone
from alpaca.trading.client import TradingClient
from alpaca.data.historical import StockHistoricalDataClient, CryptoHistoricalDataClient
from alpaca.common.exceptions import APIError as AlpacaAPIError
from supabase import Client

logger = logging.getLogger(__name__)

class BaseStrategyExecutor(ABC):
    """Base class for all strategy executors"""
    
    def __init__(
        self,
        trading_client: TradingClient,
        stock_client: StockHistoricalDataClient,
        crypto_client: CryptoHistoricalDataClient,
        supabase: Client
    ):
        self.trading_client = trading_client
        self.stock_client = stock_client
        self.crypto_client = crypto_client
        self.supabase = supabase
        self.logger = logging.getLogger(f"{__name__}.{self.__class__.__name__}")
    
    @abstractmethod
    async def execute(self, strategy_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute the strategy logic
        
        Args:
            strategy_data: Dictionary containing strategy configuration and metadata
            
        Returns:
            Dictionary with execution result containing:
            - action: 'buy', 'sell', 'hold', or 'error'
            - symbol: Trading symbol
            - quantity: Number of shares/units
            - price: Execution price
            - reason: Human-readable explanation
            - order_id: Optional order ID if trade was placed
        """
        pass
    
    def get_current_price(self, symbol: str) -> Optional[float]:
        """Get current market price for a symbol"""
        try:
            # This is a simplified implementation
            # In production, you'd use the appropriate data client based on asset type
            if '/' in symbol or symbol.upper() in ['BTC', 'ETH', 'BTCUSD', 'ETHUSD']:
                # Crypto symbol
                from alpaca.data.requests import CryptoLatestQuoteRequest
                normalized_symbol = self.normalize_crypto_symbol(symbol)
                if normalized_symbol:
                    req = CryptoLatestQuoteRequest(symbol_or_symbols=[normalized_symbol])
                    resp = self.crypto_client.get_crypto_latest_quote(req)
                    quote = resp.get(normalized_symbol)
                    if quote:
                        return float(quote.ask_price or quote.bid_price or 0)
            else:
                # Stock symbol
                from alpaca.data.requests import StockLatestQuoteRequest
                from alpaca.data.enums import DataFeed
                req = StockLatestQuoteRequest(symbol_or_symbols=[symbol.upper()], feed=DataFeed.IEX)
                resp = self.stock_client.get_stock_latest_quote(req)
                quote = resp.get(symbol.upper())
                if quote:
                    return float(quote.ask_price or quote.bid_price or 0)
        except Exception as e:
            self.logger.error(f"Error fetching price for {symbol}: {e}")
        
        return None
    
    def is_market_open(self, symbol: str) -> bool:
        """Check if the market is currently open for trading"""
        try:
            clock = self.trading_client.get_clock()
            
            # For crypto symbols, market is always open
            if self.normalize_crypto_symbol(symbol):
                return True
            
            # For stocks, check if market is open
            return clock.is_open
            
        except Exception as e:
            self.logger.error(f"Error checking market status for {symbol}: {e}")
            # Default to closed if we can't determine status
            return False
    
    def get_market_status_message(self, symbol: str) -> str:
        """Get a descriptive message about market status"""
        try:
            clock = self.trading_client.get_clock()
            
            # For crypto symbols, market is always open
            if self.normalize_crypto_symbol(symbol):
                return "Crypto market is open 24/7"
            
            if clock.is_open:
                return f"Stock market is open until {clock.next_close.strftime('%I:%M %p ET')}"
            else:
                return f"Stock market is closed. Opens at {clock.next_open.strftime('%I:%M %p ET on %A')}"
                
        except Exception as e:
            self.logger.error(f"Error getting market status for {symbol}: {e}")
            return "Unable to determine market status"
    
    def normalize_crypto_symbol(self, symbol: str) -> Optional[str]:
        """Normalize crypto symbol to Alpaca format"""
        s = symbol.upper().replace("USDT", "USD")
        
        if s in {"BTC", "BITCOIN"}:
            return "BTC/USD"
        if s in {"ETH", "ETHEREUM"}:
            return "ETH/USD"
        if s in {"BTCUSD", "BTC/USD"}:
            return "BTC/USD"
        if s in {"ETHUSD", "ETH/USD"}:
            return "ETH/USD"
        
        # Generic: ABCUSD -> ABC/USD
        if s.endswith("USD") and len(s) <= 7:
            base = s[:-3]
            if base.isalpha() and 2 <= len(base) <= 5:
                return f"{base}/USD"
        
        if "/" in s and s.endswith("/USD"):
            return s
            
        return None
    
    def update_strategy_telemetry(
        self, 
        strategy_id: str, 
        telemetry_data: Dict[str, Any]
    ) -> None:
        """Update strategy telemetry data in database"""
        try:
            telemetry_data['last_updated'] = datetime.now(timezone.utc).isoformat()
            
            self.supabase.table("trading_strategies").update({
                "telemetry_data": telemetry_data,
                "last_execution": datetime.now(timezone.utc).isoformat(),
                "execution_count": telemetry_data.get('execution_count', 0) + 1,
            }).eq("id", strategy_id).execute()
            
            self.logger.info(f"✅ Updated telemetry for strategy {strategy_id}")
        except Exception as e:
            self.logger.error(f"❌ Error updating telemetry for strategy {strategy_id}: {e}")