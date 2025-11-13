# backend/services/coinbase_connector.py

import logging
from typing import Dict, List, Optional, Any
import httpx
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

class CoinbaseConnector:
    """
    Coinbase API connector for cryptocurrency trading operations.
    Uses OAuth access tokens for authentication.
    """

    def __init__(self, access_token: str):
        self.access_token = access_token
        self.api_base = "https://api.coinbase.com"
        self.headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }

    async def get_accounts(self) -> List[Dict[str, Any]]:
        """
        Fetch all cryptocurrency accounts and their balances.

        Returns:
            List of account dictionaries with balance information
        """
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                response = await client.get(
                    f"{self.api_base}/v2/accounts",
                    headers=self.headers
                )

                if response.status_code != 200:
                    logger.error(f"[coinbase] Failed to fetch accounts: {response.status_code} {response.text}")
                    return []

                data = response.json()
                accounts = data.get("data", [])

                logger.info(f"[coinbase] Fetched {len(accounts)} accounts")
                return accounts

        except Exception as e:
            logger.error(f"[coinbase] Error fetching accounts: {e}")
            return []

    async def get_account_balance(self, account_id: str) -> Optional[Dict[str, Any]]:
        """
        Get balance for a specific account.

        Args:
            account_id: Coinbase account ID

        Returns:
            Account balance information
        """
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                response = await client.get(
                    f"{self.api_base}/v2/accounts/{account_id}",
                    headers=self.headers
                )

                if response.status_code != 200:
                    logger.error(f"[coinbase] Failed to fetch account balance: {response.status_code}")
                    return None

                data = response.json()
                return data.get("data")

        except Exception as e:
            logger.error(f"[coinbase] Error fetching account balance: {e}")
            return None

    async def get_spot_price(self, currency_pair: str = "BTC-USD") -> Optional[float]:
        """
        Get current spot price for a currency pair.

        Args:
            currency_pair: Trading pair (e.g., "BTC-USD", "ETH-USD")

        Returns:
            Current spot price as float
        """
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{self.api_base}/v2/prices/{currency_pair}/spot",
                    headers=self.headers
                )

                if response.status_code != 200:
                    logger.error(f"[coinbase] Failed to fetch spot price: {response.status_code}")
                    return None

                data = response.json()
                price = data.get("data", {}).get("amount")

                if price:
                    return float(price)
                return None

        except Exception as e:
            logger.error(f"[coinbase] Error fetching spot price: {e}")
            return None

    async def place_buy_order(
        self,
        account_id: str,
        amount: str,
        currency: str = "BTC"
    ) -> Optional[Dict[str, Any]]:
        """
        Place a buy order for cryptocurrency.

        Args:
            account_id: Coinbase account ID
            amount: Amount in fiat currency (e.g., "100.00" USD)
            currency: Cryptocurrency to buy (e.g., "BTC", "ETH")

        Returns:
            Order information dictionary
        """
        try:
            payload = {
                "amount": amount,
                "currency": currency,
                "payment_method": "default"
            }

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.api_base}/v2/accounts/{account_id}/buys",
                    headers=self.headers,
                    json=payload
                )

                if response.status_code not in [200, 201]:
                    logger.error(f"[coinbase] Buy order failed: {response.status_code} {response.text}")
                    return None

                data = response.json()
                order = data.get("data")

                logger.info(f"[coinbase] Buy order placed: {order.get('id')}")
                return order

        except Exception as e:
            logger.error(f"[coinbase] Error placing buy order: {e}")
            return None

    async def place_sell_order(
        self,
        account_id: str,
        amount: str,
        currency: str = "BTC"
    ) -> Optional[Dict[str, Any]]:
        """
        Place a sell order for cryptocurrency.

        Args:
            account_id: Coinbase account ID
            amount: Amount of cryptocurrency to sell (e.g., "0.01" BTC)
            currency: Cryptocurrency to sell (e.g., "BTC", "ETH")

        Returns:
            Order information dictionary
        """
        try:
            payload = {
                "amount": amount,
                "currency": currency
            }

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.api_base}/v2/accounts/{account_id}/sells",
                    headers=self.headers,
                    json=payload
                )

                if response.status_code not in [200, 201]:
                    logger.error(f"[coinbase] Sell order failed: {response.status_code} {response.text}")
                    return None

                data = response.json()
                order = data.get("data")

                logger.info(f"[coinbase] Sell order placed: {order.get('id')}")
                return order

        except Exception as e:
            logger.error(f"[coinbase] Error placing sell order: {e}")
            return None

    async def get_transactions(
        self,
        account_id: str,
        limit: int = 25
    ) -> List[Dict[str, Any]]:
        """
        Get transaction history for an account.

        Args:
            account_id: Coinbase account ID
            limit: Number of transactions to retrieve

        Returns:
            List of transaction dictionaries
        """
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                response = await client.get(
                    f"{self.api_base}/v2/accounts/{account_id}/transactions",
                    headers=self.headers,
                    params={"limit": limit}
                )

                if response.status_code != 200:
                    logger.error(f"[coinbase] Failed to fetch transactions: {response.status_code}")
                    return []

                data = response.json()
                transactions = data.get("data", [])

                logger.info(f"[coinbase] Fetched {len(transactions)} transactions")
                return transactions

        except Exception as e:
            logger.error(f"[coinbase] Error fetching transactions: {e}")
            return []

    async def get_buy_order(self, account_id: str, buy_id: str) -> Optional[Dict[str, Any]]:
        """
        Get details of a specific buy order.

        Args:
            account_id: Coinbase account ID
            buy_id: Buy order ID

        Returns:
            Buy order information
        """
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                response = await client.get(
                    f"{self.api_base}/v2/accounts/{account_id}/buys/{buy_id}",
                    headers=self.headers
                )

                if response.status_code != 200:
                    logger.error(f"[coinbase] Failed to fetch buy order: {response.status_code}")
                    return None

                data = response.json()
                return data.get("data")

        except Exception as e:
            logger.error(f"[coinbase] Error fetching buy order: {e}")
            return None

    async def get_sell_order(self, account_id: str, sell_id: str) -> Optional[Dict[str, Any]]:
        """
        Get details of a specific sell order.

        Args:
            account_id: Coinbase account ID
            sell_id: Sell order ID

        Returns:
            Sell order information
        """
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                response = await client.get(
                    f"{self.api_base}/v2/accounts/{account_id}/sells/{sell_id}",
                    headers=self.headers
                )

                if response.status_code != 200:
                    logger.error(f"[coinbase] Failed to fetch sell order: {response.status_code}")
                    return None

                data = response.json()
                return data.get("data")

        except Exception as e:
            logger.error(f"[coinbase] Error fetching sell order: {e}")
            return None

    async def get_exchange_rates(self, currency: str = "USD") -> Optional[Dict[str, Any]]:
        """
        Get current exchange rates for all cryptocurrencies.

        Args:
            currency: Base currency (default: USD)

        Returns:
            Dictionary of exchange rates
        """
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{self.api_base}/v2/exchange-rates",
                    headers=self.headers,
                    params={"currency": currency}
                )

                if response.status_code != 200:
                    logger.error(f"[coinbase] Failed to fetch exchange rates: {response.status_code}")
                    return None

                data = response.json()
                return data.get("data")

        except Exception as e:
            logger.error(f"[coinbase] Error fetching exchange rates: {e}")
            return None

    async def get_user_info(self) -> Optional[Dict[str, Any]]:
        """
        Get authenticated user information.

        Returns:
            User information dictionary
        """
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{self.api_base}/v2/user",
                    headers=self.headers
                )

                if response.status_code != 200:
                    logger.error(f"[coinbase] Failed to fetch user info: {response.status_code}")
                    return None

                data = response.json()
                return data.get("data")

        except Exception as e:
            logger.error(f"[coinbase] Error fetching user info: {e}")
            return None

    async def get_payment_methods(self) -> List[Dict[str, Any]]:
        """
        Get all available payment methods.

        Returns:
            List of payment method dictionaries
        """
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                response = await client.get(
                    f"{self.api_base}/v2/payment-methods",
                    headers=self.headers
                )

                if response.status_code != 200:
                    logger.error(f"[coinbase] Failed to fetch payment methods: {response.status_code}")
                    return []

                data = response.json()
                payment_methods = data.get("data", [])

                logger.info(f"[coinbase] Fetched {len(payment_methods)} payment methods")
                return payment_methods

        except Exception as e:
            logger.error(f"[coinbase] Error fetching payment methods: {e}")
            return []
