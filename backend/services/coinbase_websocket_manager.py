import asyncio
import json
import logging
import os
from typing import Dict, List, Optional, Callable, Any
from datetime import datetime, timezone
from coinbase.websocket import WSClient, WSClientException, WSClientConnectionClosedException
from supabase import Client

logger = logging.getLogger(__name__)

class CoinbaseWebSocketManager:
    """
    Manages WebSocket connections to Coinbase Advanced Trade API.
    Handles subscriptions, message routing, and automatic reconnection.
    """

    def __init__(
        self,
        api_key: str,
        private_key: str,
        supabase: Client,
        user_id: str,
        account_id: str,
        on_message_callback: Optional[Callable] = None
    ):
        """
        Initialize the WebSocket manager.

        Args:
            api_key: CDP API key
            private_key: CDP private key
            supabase: Supabase client instance
            user_id: User ID for subscription tracking
            account_id: Brokerage account ID
            on_message_callback: Callback function for message handling
        """
        self.api_key = api_key
        self.private_key = private_key
        self.supabase = supabase
        self.user_id = user_id
        self.account_id = account_id
        self.on_message_callback = on_message_callback

        self.ws_client: Optional[WSClient] = None
        self.is_connected = False
        self.subscriptions: Dict[str, List[str]] = {}
        self.reconnect_attempts = int(os.getenv("COINBASE_WS_RECONNECT_ATTEMPTS", "5"))
        self.timeout = int(os.getenv("COINBASE_WS_TIMEOUT", "30"))

        self._message_handler = self._default_message_handler
        if on_message_callback:
            self._message_handler = on_message_callback

    def _default_message_handler(self, msg: str):
        """
        Default message handler that logs and processes WebSocket messages.

        Args:
            msg: WebSocket message string
        """
        try:
            data = json.loads(msg)
            channel = data.get("channel")
            event_type = data.get("type")

            logger.debug(f"[coinbase_ws] Received message: channel={channel}, type={event_type}")

            if event_type == "subscriptions":
                logger.info(f"[coinbase_ws] Subscription confirmed: {data}")
                self._update_subscription_status(channel, True)
            elif event_type == "error":
                logger.error(f"[coinbase_ws] Error message: {data.get('message', 'Unknown error')}")
                self._update_subscription_error(channel, data.get('message', 'Unknown error'))
            else:
                self._update_last_message_time(channel)

        except json.JSONDecodeError as e:
            logger.error(f"[coinbase_ws] Failed to parse message: {e}")
        except Exception as e:
            logger.error(f"[coinbase_ws] Error in message handler: {e}")

    def _on_open(self):
        """Called when WebSocket connection is opened."""
        self.is_connected = True
        logger.info(f"[coinbase_ws] WebSocket connection opened for user {self.user_id}")

        try:
            self.supabase.table("brokerage_accounts").update({
                "websocket_enabled": True,
                "last_websocket_connection": datetime.now(timezone.utc).isoformat()
            }).eq("id", self.account_id).execute()
        except Exception as e:
            logger.error(f"[coinbase_ws] Failed to update connection status: {e}")

    def _on_close(self):
        """Called when WebSocket connection is closed."""
        self.is_connected = False
        logger.info(f"[coinbase_ws] WebSocket connection closed for user {self.user_id}")

        try:
            self.supabase.table("coinbase_websocket_subscriptions").update({
                "is_active": False
            }).eq("user_id", self.user_id).eq("account_id", self.account_id).execute()
        except Exception as e:
            logger.error(f"[coinbase_ws] Failed to update subscription status: {e}")

    async def connect(self) -> bool:
        """
        Establish WebSocket connection.

        Returns:
            True if connection successful, False otherwise
        """
        try:
            self.ws_client = WSClient(
                api_key=self.api_key,
                api_secret=self.private_key,
                on_message=self._message_handler,
                on_open=self._on_open,
                on_close=self._on_close,
                timeout=self.timeout,
                retry=True
            )

            self.ws_client.open()
            logger.info(f"[coinbase_ws] WebSocket client created for user {self.user_id}")
            return True

        except Exception as e:
            logger.error(f"[coinbase_ws] Failed to connect WebSocket: {e}")
            return False

    async def disconnect(self):
        """Close WebSocket connection."""
        if self.ws_client:
            try:
                self.ws_client.close()
                self.is_connected = False
                logger.info(f"[coinbase_ws] WebSocket disconnected for user {self.user_id}")
            except Exception as e:
                logger.error(f"[coinbase_ws] Error disconnecting WebSocket: {e}")

    async def subscribe(self, channel: str, product_ids: List[str]):
        """
        Subscribe to a WebSocket channel.

        Args:
            channel: Channel name (ticker, level2, user, market_trades, etc.)
            product_ids: List of product IDs to subscribe to
        """
        if not self.ws_client or not self.is_connected:
            logger.error("[coinbase_ws] Cannot subscribe: not connected")
            return

        try:
            if channel == "ticker":
                self.ws_client.ticker(product_ids=product_ids)
            elif channel == "level2":
                self.ws_client.level2(product_ids=product_ids)
            elif channel == "market_trades":
                self.ws_client.market_trades(product_ids=product_ids)
            elif channel == "candles":
                self.ws_client.candles(product_ids=product_ids)
            elif channel == "heartbeats":
                self.ws_client.heartbeats()
            elif channel == "user":
                self.ws_client.user()
            else:
                logger.warning(f"[coinbase_ws] Unknown channel: {channel}")
                return

            self.subscriptions[channel] = product_ids
            logger.info(f"[coinbase_ws] Subscribed to {channel} for products: {product_ids}")

            await self._save_subscription(channel, product_ids)

        except Exception as e:
            logger.error(f"[coinbase_ws] Error subscribing to {channel}: {e}")

    async def unsubscribe(self, channel: str, product_ids: List[str]):
        """
        Unsubscribe from a WebSocket channel.

        Args:
            channel: Channel name
            product_ids: List of product IDs to unsubscribe from
        """
        if not self.ws_client or not self.is_connected:
            logger.error("[coinbase_ws] Cannot unsubscribe: not connected")
            return

        try:
            if channel == "ticker":
                self.ws_client.ticker_unsubscribe(product_ids=product_ids)
            elif channel == "level2":
                self.ws_client.level2_unsubscribe(product_ids=product_ids)
            elif channel == "market_trades":
                self.ws_client.market_trades_unsubscribe(product_ids=product_ids)
            elif channel == "candles":
                self.ws_client.candles_unsubscribe(product_ids=product_ids)
            elif channel == "heartbeats":
                self.ws_client.heartbeats_unsubscribe()
            elif channel == "user":
                self.ws_client.user_unsubscribe()

            if channel in self.subscriptions:
                del self.subscriptions[channel]

            logger.info(f"[coinbase_ws] Unsubscribed from {channel} for products: {product_ids}")

            await self._remove_subscription(channel)

        except Exception as e:
            logger.error(f"[coinbase_ws] Error unsubscribing from {channel}: {e}")

    async def _save_subscription(self, channel: str, product_ids: List[str]):
        """Save subscription to database."""
        try:
            self.supabase.table("coinbase_websocket_subscriptions").upsert({
                "user_id": self.user_id,
                "account_id": self.account_id,
                "channel_name": channel,
                "product_ids": product_ids,
                "is_active": True,
                "last_message_at": datetime.now(timezone.utc).isoformat()
            }, on_conflict="user_id,account_id,channel_name").execute()
        except Exception as e:
            logger.error(f"[coinbase_ws] Failed to save subscription: {e}")

    async def _remove_subscription(self, channel: str):
        """Remove subscription from database."""
        try:
            self.supabase.table("coinbase_websocket_subscriptions").delete().eq(
                "user_id", self.user_id
            ).eq("account_id", self.account_id).eq("channel_name", channel).execute()
        except Exception as e:
            logger.error(f"[coinbase_ws] Failed to remove subscription: {e}")

    def _update_subscription_status(self, channel: str, is_active: bool):
        """Update subscription active status."""
        try:
            self.supabase.table("coinbase_websocket_subscriptions").update({
                "is_active": is_active,
                "last_message_at": datetime.now(timezone.utc).isoformat(),
                "error_count": 0
            }).eq("user_id", self.user_id).eq("account_id", self.account_id).eq(
                "channel_name", channel
            ).execute()
        except Exception as e:
            logger.error(f"[coinbase_ws] Failed to update subscription status: {e}")

    def _update_last_message_time(self, channel: str):
        """Update last message timestamp."""
        try:
            self.supabase.table("coinbase_websocket_subscriptions").update({
                "last_message_at": datetime.now(timezone.utc).isoformat()
            }).eq("user_id", self.user_id).eq("account_id", self.account_id).eq(
                "channel_name", channel
            ).execute()
        except Exception as e:
            logger.error(f"[coinbase_ws] Failed to update last message time: {e}")

    def _update_subscription_error(self, channel: str, error_message: str):
        """Update subscription error information."""
        try:
            result = self.supabase.table("coinbase_websocket_subscriptions").select(
                "error_count"
            ).eq("user_id", self.user_id).eq("account_id", self.account_id).eq(
                "channel_name", channel
            ).execute()

            error_count = (result.data[0]["error_count"] + 1) if result.data else 1

            self.supabase.table("coinbase_websocket_subscriptions").update({
                "error_count": error_count,
                "last_error": error_message
            }).eq("user_id", self.user_id).eq("account_id", self.account_id).eq(
                "channel_name", channel
            ).execute()
        except Exception as e:
            logger.error(f"[coinbase_ws] Failed to update subscription error: {e}")

    async def run_forever(self):
        """
        Run the WebSocket client indefinitely with exception handling.
        """
        if not self.ws_client:
            logger.error("[coinbase_ws] WebSocket client not initialized")
            return

        try:
            self.ws_client.run_forever_with_exception_check()
        except WSClientConnectionClosedException:
            logger.error("[coinbase_ws] Connection closed, retry attempts exhausted")
            await self._on_close()
        except WSClientException as e:
            logger.error(f"[coinbase_ws] WebSocket error: {e}")
            await self._on_close()
        except Exception as e:
            logger.error(f"[coinbase_ws] Unexpected error: {e}")
            await self._on_close()


class CoinbaseWebSocketManagerPool:
    """
    Manages multiple WebSocket connections for different users/accounts.
    """

    def __init__(self, supabase: Client):
        self.supabase = supabase
        self.managers: Dict[str, CoinbaseWebSocketManager] = {}
        self.is_running = False

    async def create_manager(
        self,
        user_id: str,
        account_id: str,
        api_key: str,
        private_key: str,
        on_message_callback: Optional[Callable] = None
    ) -> Optional[CoinbaseWebSocketManager]:
        """
        Create a new WebSocket manager for a user account.

        Args:
            user_id: User ID
            account_id: Brokerage account ID
            api_key: CDP API key
            private_key: CDP private key
            on_message_callback: Message handler callback

        Returns:
            CoinbaseWebSocketManager instance or None
        """
        manager_key = f"{user_id}:{account_id}"

        if manager_key in self.managers:
            logger.info(f"[coinbase_ws_pool] Manager already exists for {manager_key}")
            return self.managers[manager_key]

        try:
            manager = CoinbaseWebSocketManager(
                api_key=api_key,
                private_key=private_key,
                supabase=self.supabase,
                user_id=user_id,
                account_id=account_id,
                on_message_callback=on_message_callback
            )

            if await manager.connect():
                self.managers[manager_key] = manager
                logger.info(f"[coinbase_ws_pool] Created manager for {manager_key}")
                return manager
            else:
                logger.error(f"[coinbase_ws_pool] Failed to connect manager for {manager_key}")
                return None

        except Exception as e:
            logger.error(f"[coinbase_ws_pool] Error creating manager for {manager_key}: {e}")
            return None

    async def remove_manager(self, user_id: str, account_id: str):
        """
        Remove and disconnect a WebSocket manager.

        Args:
            user_id: User ID
            account_id: Brokerage account ID
        """
        manager_key = f"{user_id}:{account_id}"

        if manager_key in self.managers:
            manager = self.managers[manager_key]
            await manager.disconnect()
            del self.managers[manager_key]
            logger.info(f"[coinbase_ws_pool] Removed manager for {manager_key}")

    def get_manager(self, user_id: str, account_id: str) -> Optional[CoinbaseWebSocketManager]:
        """
        Get an existing WebSocket manager.

        Args:
            user_id: User ID
            account_id: Brokerage account ID

        Returns:
            CoinbaseWebSocketManager instance or None
        """
        manager_key = f"{user_id}:{account_id}"
        return self.managers.get(manager_key)

    async def cleanup_stale_managers(self):
        """Remove managers for inactive connections."""
        try:
            result = self.supabase.rpc("cleanup_stale_websocket_subscriptions").execute()
            logger.info("[coinbase_ws_pool] Cleaned up stale subscriptions")
        except Exception as e:
            logger.error(f"[coinbase_ws_pool] Error cleaning up stale managers: {e}")
