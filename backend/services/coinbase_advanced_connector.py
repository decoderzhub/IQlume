import logging
import os
from typing import Dict, List, Optional, Any
from datetime import datetime, timezone
from coinbase.rest import RESTClient
from coinbase import jwt_generator

logger = logging.getLogger(__name__)

class CoinbaseAdvancedConnector:
    """
    Coinbase Advanced Trade API connector using CDP API keys.
    Provides trading operations and market data access using the official Python SDK.
    """

    def __init__(self, api_key: str, private_key: str, verbose: bool = False):
        """
        Initialize the Coinbase Advanced Trade connector.

        Args:
            api_key: CDP API key in format "organizations/{org_id}/apiKeys/{key_id}"
            private_key: CDP private key (PEM format)
            verbose: Enable verbose logging for debugging
        """
        self.api_key = api_key
        self.private_key = private_key
        self.verbose = verbose

        try:
            self.client = RESTClient(
                api_key=api_key,
                api_secret=private_key,
                verbose=verbose
            )
            logger.info("[coinbase_advanced] REST client initialized successfully")
        except Exception as e:
            logger.error(f"[coinbase_advanced] Failed to initialize REST client: {e}")
            raise

    @classmethod
    def from_credentials(cls, api_key: str, private_key: str, verbose: bool = False):
        """Factory method to create connector from credentials."""
        return cls(api_key, private_key, verbose)

    def test_connection(self) -> bool:
        """
        Test the connection to Coinbase Advanced Trade API.

        Returns:
            True if connection is successful, False otherwise
        """
        try:
            accounts = self.client.get_accounts()
            logger.info("[coinbase_advanced] Connection test successful")
            return True
        except Exception as e:
            logger.error(f"[coinbase_advanced] Connection test failed: {e}")
            return False

    def get_accounts(self) -> Optional[Dict[str, Any]]:
        """
        Get all accounts with their balances.

        Returns:
            Dictionary containing account information
        """
        try:
            accounts = self.client.get_accounts()
            return accounts.to_dict() if accounts else None
        except Exception as e:
            logger.error(f"[coinbase_advanced] Error fetching accounts: {e}")
            return None

    def get_account(self, account_uuid: str) -> Optional[Dict[str, Any]]:
        """
        Get a specific account by UUID.

        Args:
            account_uuid: Account UUID

        Returns:
            Account information dictionary
        """
        try:
            account = self.client.get_account(account_uuid)
            return account.to_dict() if account else None
        except Exception as e:
            logger.error(f"[coinbase_advanced] Error fetching account {account_uuid}: {e}")
            return None

    def list_products(self, limit: int = 100, product_type: str = "SPOT") -> Optional[List[Dict[str, Any]]]:
        """
        List available trading products.

        Args:
            limit: Maximum number of products to return
            product_type: Type of products (SPOT, FUTURE)

        Returns:
            List of product dictionaries
        """
        try:
            products = self.client.get_products(limit=limit, product_type=product_type)
            return products.to_dict() if products else None
        except Exception as e:
            logger.error(f"[coinbase_advanced] Error listing products: {e}")
            return None

    def get_product(self, product_id: str) -> Optional[Dict[str, Any]]:
        """
        Get details for a specific product.

        Args:
            product_id: Product ID (e.g., "BTC-USD")

        Returns:
            Product information dictionary
        """
        try:
            product = self.client.get_product(product_id)
            return product.to_dict() if product else None
        except Exception as e:
            logger.error(f"[coinbase_advanced] Error fetching product {product_id}: {e}")
            return None

    def get_market_trades(self, product_id: str, limit: int = 100) -> Optional[List[Dict[str, Any]]]:
        """
        Get recent market trades for a product.

        Args:
            product_id: Product ID (e.g., "BTC-USD")
            limit: Maximum number of trades to return

        Returns:
            List of trade dictionaries
        """
        try:
            trades = self.client.get_market_trades(product_id=product_id, limit=limit)
            trades_dict = trades.to_dict() if trades else None
            if trades_dict and 'trades' in trades_dict:
                return trades_dict['trades']
            return None
        except Exception as e:
            logger.error(f"[coinbase_advanced] Error fetching market trades for {product_id}: {e}")
            return None

    def market_order_buy(
        self,
        product_id: str,
        quote_size: str,
        client_order_id: str = ""
    ) -> Optional[Dict[str, Any]]:
        """
        Place a market buy order.

        Args:
            product_id: Product ID (e.g., "BTC-USD")
            quote_size: Amount in quote currency (e.g., "100.00" for $100)
            client_order_id: Custom order ID (auto-generated if empty)

        Returns:
            Order information dictionary
        """
        try:
            order = self.client.market_order_buy(
                client_order_id=client_order_id,
                product_id=product_id,
                quote_size=quote_size
            )
            logger.info(f"[coinbase_advanced] Market buy order placed: {product_id} quote_size={quote_size}")
            return order.to_dict() if order else None
        except Exception as e:
            logger.error(f"[coinbase_advanced] Error placing market buy order: {e}")
            return None

    def market_order_sell(
        self,
        product_id: str,
        base_size: str,
        client_order_id: str = ""
    ) -> Optional[Dict[str, Any]]:
        """
        Place a market sell order.

        Args:
            product_id: Product ID (e.g., "BTC-USD")
            base_size: Amount in base currency (e.g., "0.01" for 0.01 BTC)
            client_order_id: Custom order ID (auto-generated if empty)

        Returns:
            Order information dictionary
        """
        try:
            order = self.client.market_order_sell(
                client_order_id=client_order_id,
                product_id=product_id,
                base_size=base_size
            )
            logger.info(f"[coinbase_advanced] Market sell order placed: {product_id} base_size={base_size}")
            return order.to_dict() if order else None
        except Exception as e:
            logger.error(f"[coinbase_advanced] Error placing market sell order: {e}")
            return None

    def limit_order_buy(
        self,
        product_id: str,
        base_size: str,
        limit_price: str,
        client_order_id: str = "",
        post_only: bool = False
    ) -> Optional[Dict[str, Any]]:
        """
        Place a limit buy order.

        Args:
            product_id: Product ID (e.g., "BTC-USD")
            base_size: Amount in base currency
            limit_price: Limit price
            client_order_id: Custom order ID
            post_only: Post-only flag (maker only)

        Returns:
            Order information dictionary
        """
        try:
            order = self.client.limit_order_gtc_buy(
                client_order_id=client_order_id,
                product_id=product_id,
                base_size=base_size,
                limit_price=limit_price,
                post_only=post_only
            )
            logger.info(f"[coinbase_advanced] Limit buy order placed: {product_id} size={base_size} price={limit_price}")
            return order.to_dict() if order else None
        except Exception as e:
            logger.error(f"[coinbase_advanced] Error placing limit buy order: {e}")
            return None

    def limit_order_sell(
        self,
        product_id: str,
        base_size: str,
        limit_price: str,
        client_order_id: str = "",
        post_only: bool = False
    ) -> Optional[Dict[str, Any]]:
        """
        Place a limit sell order.

        Args:
            product_id: Product ID (e.g., "BTC-USD")
            base_size: Amount in base currency
            limit_price: Limit price
            client_order_id: Custom order ID
            post_only: Post-only flag (maker only)

        Returns:
            Order information dictionary
        """
        try:
            order = self.client.limit_order_gtc_sell(
                client_order_id=client_order_id,
                product_id=product_id,
                base_size=base_size,
                limit_price=limit_price,
                post_only=post_only
            )
            logger.info(f"[coinbase_advanced] Limit sell order placed: {product_id} size={base_size} price={limit_price}")
            return order.to_dict() if order else None
        except Exception as e:
            logger.error(f"[coinbase_advanced] Error placing limit sell order: {e}")
            return None

    def cancel_orders(self, order_ids: List[str]) -> Optional[Dict[str, Any]]:
        """
        Cancel one or more orders.

        Args:
            order_ids: List of order IDs to cancel

        Returns:
            Cancellation result dictionary
        """
        try:
            result = self.client.cancel_orders(order_ids=order_ids)
            logger.info(f"[coinbase_advanced] Cancelled {len(order_ids)} orders")
            return result.to_dict() if result else None
        except Exception as e:
            logger.error(f"[coinbase_advanced] Error cancelling orders: {e}")
            return None

    def list_orders(
        self,
        product_id: Optional[str] = None,
        order_status: Optional[List[str]] = None,
        limit: int = 100
    ) -> Optional[Dict[str, Any]]:
        """
        List orders with optional filtering.

        Args:
            product_id: Filter by product ID
            order_status: Filter by status (OPEN, FILLED, CANCELLED, etc.)
            limit: Maximum number of orders to return

        Returns:
            Dictionary containing orders list
        """
        try:
            kwargs = {"limit": limit}
            if product_id:
                kwargs["product_id"] = product_id
            if order_status:
                kwargs["order_status"] = order_status

            orders = self.client.list_orders(**kwargs)
            return orders.to_dict() if orders else None
        except Exception as e:
            logger.error(f"[coinbase_advanced] Error listing orders: {e}")
            return None

    def get_order(self, order_id: str) -> Optional[Dict[str, Any]]:
        """
        Get details for a specific order.

        Args:
            order_id: Order ID

        Returns:
            Order information dictionary
        """
        try:
            order = self.client.get_order(order_id=order_id)
            return order.to_dict() if order else None
        except Exception as e:
            logger.error(f"[coinbase_advanced] Error fetching order {order_id}: {e}")
            return None

    def list_fills(
        self,
        order_id: Optional[str] = None,
        product_id: Optional[str] = None,
        limit: int = 100
    ) -> Optional[Dict[str, Any]]:
        """
        List fills (executed trades).

        Args:
            order_id: Filter by order ID
            product_id: Filter by product ID
            limit: Maximum number of fills to return

        Returns:
            Dictionary containing fills list
        """
        try:
            kwargs = {"limit": limit}
            if order_id:
                kwargs["order_id"] = order_id
            if product_id:
                kwargs["product_id"] = product_id

            fills = self.client.list_fills(**kwargs)
            return fills.to_dict() if fills else None
        except Exception as e:
            logger.error(f"[coinbase_advanced] Error listing fills: {e}")
            return None

    def get_candles(
        self,
        product_id: str,
        start: str,
        end: str,
        granularity: str = "ONE_HOUR"
    ) -> Optional[Dict[str, Any]]:
        """
        Get historical candlestick data.

        Args:
            product_id: Product ID (e.g., "BTC-USD")
            start: Start time (Unix timestamp)
            end: End time (Unix timestamp)
            granularity: Candle granularity (ONE_MINUTE, FIVE_MINUTE, FIFTEEN_MINUTE,
                        THIRTY_MINUTE, ONE_HOUR, TWO_HOUR, SIX_HOUR, ONE_DAY)

        Returns:
            Dictionary containing candles data
        """
        try:
            candles = self.client.get_candles(
                product_id=product_id,
                start=start,
                end=end,
                granularity=granularity
            )
            return candles.to_dict() if candles else None
        except Exception as e:
            logger.error(f"[coinbase_advanced] Error fetching candles for {product_id}: {e}")
            return None

    def generate_websocket_jwt(self) -> Optional[str]:
        """
        Generate a JWT token for WebSocket authentication.

        Returns:
            JWT token string
        """
        try:
            jwt_token = jwt_generator.build_ws_jwt(self.api_key, self.private_key)
            logger.info("[coinbase_advanced] WebSocket JWT generated successfully")
            return jwt_token
        except Exception as e:
            logger.error(f"[coinbase_advanced] Error generating WebSocket JWT: {e}")
            return None
