# Coinbase Advanced Trade API Integration Guide

## Overview

This integration enables professional cryptocurrency trading through the Coinbase Advanced Trade API using Cloud Developer Platform (CDP) API keys. The system supports:

- Real-time WebSocket data feeds for price monitoring
- Automated trading strategies including grid trading
- Market and limit order execution
- Portfolio tracking and balance synchronization
- Multi-account management

## Prerequisites

### 1. Coinbase Account Setup

1. Create a Coinbase account at https://www.coinbase.com
2. Complete identity verification (KYC)
3. Enable Coinbase Advanced Trade features in your account settings

### 2. Obtain CDP API Keys

1. Visit https://portal.cdp.coinbase.com/projects
2. Create a new project or select an existing one
3. Navigate to API Keys section
4. Click "Create API Key"
5. Set the following permissions:
   - **View** - To read account and market data
   - **Trade** - To execute buy/sell orders
   - **Transfer** - Optional, for withdrawal operations
6. Download the JSON file containing your key credentials
7. Save the following information securely:
   - **API Key Name**: Format `organizations/{org_id}/apiKeys/{key_id}`
   - **Private Key**: PEM-formatted EC private key

## Backend Configuration

### Environment Variables

Add the following to your `.env` file:

```bash
# Coinbase Advanced Trade API Configuration
COINBASE_ADVANCED_DEFAULT_KEY=organizations/YOUR_ORG_ID/apiKeys/YOUR_KEY_ID
COINBASE_ADVANCED_DEFAULT_SECRET=-----BEGIN EC PRIVATE KEY-----
YOUR_PRIVATE_KEY_HERE
-----END EC PRIVATE KEY-----

# WebSocket configuration
COINBASE_WS_ENABLED=true
COINBASE_WS_RECONNECT_ATTEMPTS=5
COINBASE_WS_TIMEOUT=30
```

### Database Migration

Run the Supabase migration to add required tables and columns:

```bash
# Migration file: supabase/migrations/20251113000000_add_coinbase_advanced_trade_support.sql
# This adds:
# - CDP API key storage columns to brokerage_accounts table
# - coinbase_websocket_subscriptions table for WebSocket state tracking
# - Crypto trading metadata fields in trades table
```

The migration will automatically execute when you restart your backend or deploy to production.

## User Setup Flow

### 1. Connect Account via UI

1. Log into brokernomex
2. Navigate to **Accounts** page
3. Click **Connect Brokerage Account**
4. Select **Coinbase Advanced Trade** from the list
5. Enter the following information:
   - **Account Nickname**: Friendly name for this connection
   - **CDP API Key**: Your organizations/.../apiKeys/... key
   - **Private Key**: Complete PEM-formatted private key
6. Click **Connect Account**
7. System will verify the connection and display account balance

### 2. Enable WebSocket Real-Time Data

WebSocket connections are established automatically when:
- Creating a grid trading strategy with Coinbase Advanced account
- Manually connecting via API endpoint `/api/coinbase-advanced/websocket/connect`

Supported WebSocket channels:
- **ticker**: Real-time price updates
- **level2**: Order book depth data
- **user**: Personal order updates and fills
- **market_trades**: Recent market trades
- **heartbeats**: Connection health monitoring

## API Endpoints

### Account Management

#### Connect Account
```
POST /api/coinbase-advanced/connect
Authorization: Bearer {supabase_token}
Content-Type: application/json

{
  "api_key": "organizations/{org_id}/apiKeys/{key_id}",
  "private_key": "-----BEGIN EC PRIVATE KEY-----\n...\n-----END EC PRIVATE KEY-----",
  "account_name": "My Trading Account"
}
```

#### List Accounts
```
GET /api/coinbase-advanced/accounts
Authorization: Bearer {supabase_token}
```

#### Disconnect Account
```
DELETE /api/coinbase-advanced/accounts/{account_id}
Authorization: Bearer {supabase_token}
```

### Market Data

#### List Products
```
GET /api/coinbase-advanced/products?limit=100&product_type=SPOT
Authorization: Bearer {supabase_token}
```

#### Get Product Details
```
GET /api/coinbase-advanced/products/BTC-USD
Authorization: Bearer {supabase_token}
```

### Trading

#### Place Market Order
```
POST /api/coinbase-advanced/orders?account_id={account_id}
Authorization: Bearer {supabase_token}
Content-Type: application/json

{
  "product_id": "BTC-USD",
  "side": "buy",
  "order_type": "market",
  "quote_size": "100.00"
}
```

#### Place Limit Order
```
POST /api/coinbase-advanced/orders?account_id={account_id}
Authorization: Bearer {supabase_token}
Content-Type: application/json

{
  "product_id": "ETH-USD",
  "side": "sell",
  "order_type": "limit",
  "size": "0.5",
  "limit_price": "2500.00",
  "post_only": true
}
```

#### List Orders
```
GET /api/coinbase-advanced/orders?account_id={account_id}&product_id=BTC-USD&status=OPEN
Authorization: Bearer {supabase_token}
```

### WebSocket

#### Connect WebSocket
```
POST /api/coinbase-advanced/websocket/connect?account_id={account_id}
Authorization: Bearer {supabase_token}
```

#### Subscribe to Channel
```
POST /api/coinbase-advanced/websocket/subscribe
Authorization: Bearer {supabase_token}
Content-Type: application/json

{
  "channel": "ticker",
  "product_ids": ["BTC-USD", "ETH-USD"]
}
```

## Grid Trading with Coinbase

### Creating a Spot Grid Strategy

1. Navigate to **Strategies** page
2. Click **Create Strategy**
3. Select **Spot Grid** strategy type
4. Configure parameters:
   - **Symbol**: Trading pair (e.g., BTC-USD)
   - **Account**: Select your Coinbase Advanced account
   - **Price Range**: Upper and lower price bounds
   - **Grid Levels**: Number of orders (recommended: 10-50)
   - **Investment Amount**: Total capital to allocate
5. Enable **Real-Time Execution** for WebSocket-driven trading
6. Click **Create Strategy**

The system will:
- Establish WebSocket connection for real-time price updates
- Place initial grid orders at calculated price levels
- Monitor fills and automatically rebalance grid
- Update positions and P&L in real-time

## Security Best Practices

### API Key Management

- **Never share** your private key with anyone
- **Never commit** API keys to version control
- **Rotate keys** regularly (every 90 days recommended)
- **Use separate keys** for development and production
- **Revoke unused keys** immediately from CDP portal

### Key Storage

- Keys are encrypted at rest in Supabase database
- Private keys are never logged or exposed in API responses
- Use environment variables for system-level keys
- Implement key rotation workflow for production

### Permission Scoping

- Grant minimum required permissions (View + Trade)
- Avoid granting Transfer permission unless necessary
- Monitor API key usage in CDP portal
- Set up alerts for suspicious activity

## Troubleshooting

### Connection Errors

**Problem**: "Invalid CDP API keys or connection failed"
- **Solution**: Verify API key format starts with `organizations/`
- **Solution**: Ensure private key includes BEGIN and END markers
- **Solution**: Check that key has not been revoked in CDP portal

**Problem**: "Failed to fetch account data"
- **Solution**: Verify API key has View permission
- **Solution**: Check Coinbase API status page
- **Solution**: Ensure account has completed KYC verification

### WebSocket Issues

**Problem**: WebSocket connection drops frequently
- **Solution**: Check network stability
- **Solution**: Increase `COINBASE_WS_TIMEOUT` in environment
- **Solution**: Monitor WebSocket subscription health in database

**Problem**: Real-time data not updating
- **Solution**: Verify WebSocket subscription is active
- **Solution**: Check `coinbase_websocket_subscriptions` table
- **Solution**: Reconnect WebSocket via API endpoint

### Trading Errors

**Problem**: "Insufficient funds" when placing order
- **Solution**: Verify account balance covers order amount plus fees
- **Solution**: Check minimum order sizes for the product
- **Solution**: Ensure quote_size (for market buys) or size (for sells) is valid

**Problem**: "Order rejected by exchange"
- **Solution**: Verify product is trading (not halted)
- **Solution**: Check limit price is within acceptable range
- **Solution**: Ensure account has trading permission enabled

## Rate Limits

Coinbase Advanced Trade API rate limits:
- **REST API**: 15 requests per second per API key
- **WebSocket**: 100 subscriptions per connection
- **Order placement**: 10 orders per second

The system automatically handles rate limiting with exponential backoff.

## Support Resources

- **Coinbase API Documentation**: https://docs.cloud.coinbase.com/advanced-trade-api
- **CDP Portal**: https://portal.cdp.coinbase.com
- **WebSocket Channels**: https://docs.cloud.coinbase.com/advanced-trade-api/docs/ws-overview
- **Python SDK**: https://github.com/coinbase/coinbase-advanced-py

## Monitoring and Logs

### Backend Logs

Monitor backend logs for Coinbase-related events:
```bash
# Filter logs for Coinbase operations
grep "coinbase_advanced" backend/logs/app.log
grep "coinbase_ws" backend/logs/app.log
```

### Database Monitoring

Query WebSocket subscription health:
```sql
SELECT * FROM coinbase_websocket_subscriptions
WHERE is_active = true
AND last_message_at < NOW() - INTERVAL '5 minutes';
```

Query recent Coinbase trades:
```sql
SELECT * FROM trades
WHERE coinbase_order_id IS NOT NULL
ORDER BY executed_at DESC
LIMIT 100;
```

## FAQ

**Q: Can I use the same CDP keys for multiple brokernomex accounts?**
A: No, each user should have their own CDP API keys. Do not share keys between users.

**Q: What's the difference between Coinbase and Coinbase Advanced Trade?**
A: Coinbase Advanced Trade uses CDP API keys and provides professional trading features, lower fees, and real-time WebSocket data. Regular Coinbase uses OAuth and has limited API capabilities.

**Q: How do I enable WebSocket real-time trading?**
A: WebSocket connections are established automatically when you create a strategy with execution_interval set to 0 or when you manually connect via the API.

**Q: Can I trade futures with Coinbase Advanced Trade?**
A: The integration currently supports SPOT products. Futures support can be added by extending the connector with futures-specific order types.

**Q: How are trading fees calculated?**
A: Coinbase Advanced Trade uses a tiered maker/taker fee schedule based on 30-day trading volume. Fees are included in order fill responses.

---

**Last Updated**: November 13, 2025
**Version**: 1.0.0
