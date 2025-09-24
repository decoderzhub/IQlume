"""
Base strategy executor with common functionality
"""

import logging
from typing import Dict, Any, Optional, Union
from datetime import datetime, timezone
from uuid import uuid4

from alpaca.trading.client import TradingClient
from alpaca.trading.requests import MarketOrderRequest, LimitOrderRequest, GetOrdersRequest
from alpaca.trading.enums import OrderSide, TimeInForce, OrderStatus
from alpaca.common.exceptions import APIError as AlpacaAPIError
from alpaca.data.requests import StockLatestQuoteRequest, CryptoLatestQuoteRequest
from alpaca.data.enums import DataFeed

from supabase import Client
from technical_indicators import TechnicalIndicators as TI

logger = logging.getLogger(__name__)

class BaseStrategyExecutor:
    """Base class for all strategy executors"""
    
    def __init__(self, strategy: Dict[str, Any], trading_client: TradingClient, 
                 stock_client: Any, crypto_client: Any, supabase: Client):
        self.strategy = strategy
        self.trading_client = trading_client
        self.stock_client = stock_client
        self.crypto_client = crypto_client
        self.supabase = supabase
        self.logger = logging.getLogger(f"{__name__}.{self.__class__.__name__}")
        
    async def execute(self) -> Dict[str, Any]:
        """Execute the strategy - to be implemented by subclasses"""
        raise NotImplementedError("Subclasses must implement execute method")
    
    def get_current_price(self, symbol: str) -> Optional[float]:
        """Get current market price for a symbol"""
        try:
            is_crypto = "/" in symbol or symbol in ["BTC", "ETH", "SOL", "ADA"]
            
            if is_crypto:
                market_data_resp = self.crypto_client.get_crypto_latest_quote(
                    CryptoLatestQuoteRequest(symbol_or_symbols=[symbol])
                )
                current_price = float(market_data_resp[symbol].ask_price) if market_data_resp and market_data_resp.get(symbol) else None
            else:
                market_data_resp = self.stock_client.get_stock_latest_quote(
                    StockLatestQuoteRequest(symbol_or_symbols=[symbol], feed=DataFeed.IEX)
                )
                current_price = float(market_data_resp[symbol].ask_price) if market_data_resp and market_data_resp.get(symbol) else None

            if not current_price:
                self.logger.warning(f"⚠️ Could not get current price for {symbol}, using mock price.")
                # Fallback to mock price for demo purposes
                current_price = 50000 if "BTC" in symbol else 150
                
            self.logger.info(f"Current price for {symbol}: {current_price}")
            return current_price
            
        except Exception as e:
            self.logger.error(f"❌ Error fetching market data for {symbol}: {e}")
            return 50000 if "BTC" in symbol else 150  # Fallback
    
    def get_open_orders(self, strategy_id: str):
        """Get open orders for this strategy"""
        try:
            from alpaca.trading.enums import QueryOrderStatus
            open_orders_request = GetOrdersRequest(status=QueryOrderStatus.OPEN)
            open_orders = self.trading_client.get_orders(open_orders_request)
            return [o for o in open_orders if o.client_order_id and strategy_id in o.client_order_id]
        except Exception as e:
            self.logger.error(f"Error fetching open orders: {e}")
            return []
    
    def get_current_position(self, symbol: str):
        """Get current position for a symbol"""
        try:
            positions = self.trading_client.get_all_positions()
            return next((p for p in positions if p.symbol == symbol), None)
        except Exception as e:
            self.logger.error(f"Error fetching positions: {e}")
            return None
    
    def check_technical_indicators(self, symbol: str, indicators_config: Dict[str, Any]) -> Dict[str, bool]:
        """Check technical indicators for buy/sell signals"""
        if not indicators_config:
            return {"buy_signal": False, "sell_signal": False}
        
        try:
            # Fetch recent prices for TI calculation (mock for now)
            current_price = self.get_current_price(symbol) or 100
            recent_prices = [current_price * (1 + (i - 20)/1000) for i in range(40)]
            
            ti_signals = TI.check_indicator_signals(recent_prices, indicators_config)
            return {
                "buy_signal": ti_signals["buy_signal"],
                "sell_signal": ti_signals["sell_signal"]
            }
        except Exception as e:
            self.logger.error(f"Error checking technical indicators: {e}")
            return {"buy_signal": False, "sell_signal": False}
    
    def place_order(self, symbol: str, side: OrderSide, quantity: float, 
                   order_type: str = "market", limit_price: Optional[float] = None,
                   strategy_id: str = "", order_prefix: str = "order") -> Dict[str, Any]:
        """Place a trading order"""
        try:
            client_order_id = f"{order_prefix}-{strategy_id}-{uuid4().hex[:8]}"
            
            if order_type == "limit" and limit_price:
                order_request = LimitOrderRequest(
                    symbol=symbol,
                    qty=quantity,
                    side=side,
                    limit_price=limit_price,
                    time_in_force=TimeInForce.GTC,
                    client_order_id=client_order_id
                )
            else:
                order_request = MarketOrderRequest(
                    symbol=symbol,
                    qty=quantity,
                    side=side,
                    time_in_force=TimeInForce.Day,
                    client_order_id=client_order_id
                )
            
            order = self.trading_client.submit_order(order_request)
            
            return {
                "success": True,
                "order_id": str(order.id),
                "symbol": order.symbol,
                "quantity": float(order.qty),
                "price": float(getattr(order, 'limit_price', 0) or 0),
                "side": side.value.lower()
            }
            
        except AlpacaAPIError as e:
            self.logger.error(f"❌ Alpaca API error placing {side.value} order: {e}")
            return {
                "success": False,
                "error": f"Alpaca API error: {e}"
            }
        except Exception as e:
            self.logger.error(f"❌ Error placing {side.value} order: {e}")
            return {
                "success": False,
                "error": f"Order placement error: {e}"
            }
    
    def update_strategy_telemetry(self, strategy_id: str, telemetry_data: Dict[str, Any]):
        """Update strategy telemetry data in database"""
        try:
            self.supabase.table("trading_strategies").update({
                "telemetry_data": telemetry_data,
                "last_execution": datetime.now(timezone.utc).isoformat(),
                "execution_count": self.strategy.get("execution_count", 0) + 1,
                "total_profit_loss": telemetry_data.get("current_profit_loss_usd", 0),
                "active_orders_count": telemetry_data.get("active_orders_count", 0),
                "grid_utilization_percent": telemetry_data.get("grid_utilization_percent", 0),
            }).eq("id", strategy_id).execute()
            
            self.logger.info(f"✅ Updated telemetry for strategy {strategy_id}")
        except Exception as e:
            self.logger.error(f"❌ Error updating telemetry: {e}")