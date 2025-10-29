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
from services.risk_validator import RiskValidator

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
        self.risk_validator = RiskValidator(supabase)
    
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

    async def execute_on_fill(self, strategy_data: Dict[str, Any], order_fill_event: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute strategy logic when an order is filled (for event-driven strategies like grids)

        Args:
            strategy_data: Dictionary containing strategy configuration and metadata
            order_fill_event: Dictionary containing filled order details

        Returns:
            Dictionary with execution result (same format as execute)
        """
        self.logger.warning(f"⚠️ execute_on_fill not implemented for {self.__class__.__name__}, defaulting to hold")
        configuration = strategy_data.get("configuration", {})
        return {
            "action": "hold",
            "symbol": configuration.get("symbol", "UNKNOWN"),
            "quantity": 0,
            "price": 0,
            "reason": f"execute_on_fill not implemented for {self.__class__.__name__}"
        }
    
    def get_current_price(self, symbol: str) -> Optional[float]:
        """Get current market price for a symbol"""
        try:
            self.logger.info(f"💰 Fetching price for symbol: {symbol}")
            # This is a simplified implementation
            # In production, you'd use the appropriate data client based on asset type
            if '/' in symbol or symbol.upper() in ['BTC', 'ETH', 'BTCUSD', 'ETHUSD']:
                # Crypto symbol
                self.logger.info(f"💰 Treating {symbol} as crypto")
                from alpaca.data.requests import CryptoLatestQuoteRequest
                normalized_symbol = self.normalize_crypto_symbol(symbol)
                self.logger.info(f"💰 Normalized crypto symbol: {normalized_symbol}")
                if normalized_symbol:
                    req = CryptoLatestQuoteRequest(symbol_or_symbols=[normalized_symbol])
                    resp = self.crypto_client.get_crypto_latest_quote(req)
                    quote = resp.get(normalized_symbol)
                    if quote:
                        price = float(quote.ask_price or quote.bid_price or 0)
                        self.logger.info(f"💰 Crypto price for {symbol}: ${price}")
                        return price
            else:
                # Stock symbol
                self.logger.info(f"💰 Treating {symbol} as stock")
                from alpaca.data.requests import StockLatestQuoteRequest
                from alpaca.data.enums import DataFeed
                req = StockLatestQuoteRequest(symbol_or_symbols=[symbol.upper()], feed=DataFeed.IEX)
                resp = self.stock_client.get_stock_latest_quote(req)
                quote = resp.get(symbol.upper())
                if quote:
                    price = float(quote.ask_price or quote.bid_price or 0)
                    self.logger.info(f"💰 Stock price for {symbol}: ${price}")
                    return price
        except Exception as e:
            self.logger.error(f"Error fetching price for {symbol}: {e}")
        
        self.logger.warning(f"💰 No price found for {symbol}, returning None")
        return None
    
    def is_market_open(self, symbol: str) -> bool:
        """Check if the market is currently open for trading"""
        try:
            # For crypto symbols, market is always open
            if self.normalize_crypto_symbol(symbol):
                self.logger.info(f"🕐 {symbol} is crypto - market always open")
                return True
            
            clock = self.trading_client.get_clock()
            self.logger.info(f"🕐 Market clock for {symbol}: is_open={clock.is_open}, current_time={clock.timestamp}")
            
            # For stocks, check if market is open
            return clock.is_open
            
        except Exception as e:
            self.logger.error(f"Error checking market status for {symbol}: {e}")
    
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

    def calculate_take_profit_price(
        self,
        entry_price: float,
        take_profit_percent: float,
        side: str = "long"
    ) -> float:
        """Calculate take profit price based on entry and percentage"""
        if side == "long":
            return entry_price * (1 + take_profit_percent / 100)
        else:  # short
            return entry_price * (1 - take_profit_percent / 100)

    def calculate_stop_loss_price(
        self,
        entry_price: float,
        stop_loss_percent: float,
        side: str = "long"
    ) -> float:
        """Calculate stop loss price based on entry and percentage"""
        if side == "long":
            return entry_price * (1 - stop_loss_percent / 100)
        else:  # short
            return entry_price * (1 + stop_loss_percent / 100)

    def calculate_trailing_stop_price(
        self,
        current_price: float,
        trailing_distance_percent: float,
        side: str = "long"
    ) -> float:
        """Calculate initial trailing stop price"""
        if side == "long":
            return current_price * (1 - trailing_distance_percent / 100)
        else:  # short
            return current_price * (1 + trailing_distance_percent / 100)

    def create_position_with_tp_sl(
        self,
        strategy_id: str,
        user_id: str,
        symbol: str,
        quantity: float,
        entry_price: float,
        side: str,
        strategy_data: Dict[str, Any],
        alpaca_order_id: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """Create a position record with take profit and stop loss configured"""
        try:
            # Extract TP/SL configuration from strategy
            stop_loss_percent = float(strategy_data.get("stop_loss_percent", 0))
            take_profit_levels = strategy_data.get("take_profit_levels", [])
            trailing_stop_percent = float(strategy_data.get("trailing_stop_loss_percent", 0))
            stop_loss_type = strategy_data.get("stop_loss_type", "fixed")

            # Calculate prices
            take_profit_price = None
            stop_loss_price = None
            trailing_stop_price = None

            # Set primary take profit if configured
            if take_profit_levels and len(take_profit_levels) > 0:
                first_level = take_profit_levels[0]
                tp_percent = float(first_level.get("percent", 0))
                if tp_percent > 0:
                    take_profit_price = self.calculate_take_profit_price(
                        entry_price, tp_percent, side
                    )

            # Set stop loss based on type
            if stop_loss_percent > 0:
                if stop_loss_type == "trailing" or trailing_stop_percent > 0:
                    trailing_stop_price = self.calculate_trailing_stop_price(
                        entry_price,
                        trailing_stop_percent or stop_loss_percent,
                        side
                    )
                else:
                    stop_loss_price = self.calculate_stop_loss_price(
                        entry_price, stop_loss_percent, side
                    )

            # Prepare take profit levels for storage
            tp_levels_jsonb = []
            for level in take_profit_levels:
                tp_levels_jsonb.append({
                    "percent": float(level.get("percent", 0)),
                    "quantity_percent": float(level.get("quantity_percent", 100)),
                    "price": self.calculate_take_profit_price(
                        entry_price,
                        float(level.get("percent", 0)),
                        side
                    ),
                    "status": "pending"
                })

            # Create position record
            position_data = {
                "strategy_id": strategy_id,
                "user_id": user_id,
                "symbol": symbol,
                "quantity": quantity,
                "entry_price": entry_price,
                "current_price": entry_price,
                "side": side,
                "is_closed": False,
                "opened_at": datetime.now(timezone.utc).isoformat(),
                "alpaca_order_id": alpaca_order_id,
                "take_profit_price": take_profit_price,
                "stop_loss_price": stop_loss_price,
                "trailing_stop_price": trailing_stop_price,
                "highest_price_reached": entry_price,
                "lowest_price_reached": entry_price,
                "take_profit_levels": tp_levels_jsonb,
                "unrealized_pnl": 0,
                "unrealized_pnl_percent": 0,
                "realized_pnl": 0
            }

            resp = self.supabase.table("bot_positions").insert(position_data).execute()

            if resp.data:
                self.logger.info(
                    f"✅ Position created: {symbol} | "
                    f"Entry: ${entry_price:.2f} | "
                    f"TP: ${take_profit_price:.2f if take_profit_price else 'None'} | "
                    f"SL: ${stop_loss_price:.2f if stop_loss_price else 'None'}"
                )
                return resp.data[0]

            return None

        except Exception as e:
            self.logger.error(f"❌ Error creating position with TP/SL: {e}", exc_info=True)
            return None

    async def validate_trade_risk(
        self,
        user_id: str,
        strategy_id: str,
        symbol: str,
        side: str,
        quantity: float,
        price: float
    ) -> tuple[bool, Optional[str]]:
        """
        Validate trade against risk management rules before execution.

        Returns:
            Tuple of (is_valid, error_message)
            - (True, None) if trade passes all risk checks
            - (False, error_message) if trade fails any risk check
        """
        try:
            # Get account information
            account = self.trading_client.get_account()
            account_balance = float(account.equity)
            buying_power = float(account.buying_power)

            # Validate with risk validator
            is_valid, error_msg = await self.risk_validator.validate_trade(
                user_id=user_id,
                strategy_id=strategy_id,
                symbol=symbol,
                side=side,
                quantity=quantity,
                price=price,
                account_balance=account_balance,
                buying_power=buying_power
            )

            if not is_valid:
                self.logger.warning(f"❌ Risk validation failed: {error_msg}")
                # Record risk event
                try:
                    self.supabase.table("bot_risk_events").insert({
                        "user_id": user_id,
                        "strategy_id": strategy_id,
                        "event_type": "trade_rejected",
                        "severity": "warning",
                        "description": f"Trade rejected by risk validator: {error_msg}",
                        "symbol": symbol,
                        "proposed_quantity": quantity,
                        "proposed_price": price,
                        "account_balance": account_balance,
                        "buying_power": buying_power
                    }).execute()
                except Exception as log_error:
                    self.logger.error(f"Failed to log risk event: {log_error}")

            return is_valid, error_msg

        except Exception as e:
            self.logger.error(f"❌ Error in risk validation: {e}", exc_info=True)
            # Fail closed - reject trade if validation fails
            return False, f"Risk validation system error: {str(e)}"