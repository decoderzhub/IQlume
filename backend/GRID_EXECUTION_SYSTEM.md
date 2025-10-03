# Grid Strategy Event-Based Execution System

## Overview

Grid trading strategies now execute based on **order fills (grid events)** rather than fixed time intervals. This provides faster response to market movements and more efficient capital utilization.

## Architecture

### 1. Order Fill Monitor (`order_fill_monitor.py`)
- Continuously polls Alpaca API every 15 seconds for order status updates
- Detects when grid orders transition from `pending` → `filled`
- Triggers immediate strategy execution when fills are detected
- Broadcasts real-time updates via Server-Sent Events (SSE)

### 2. Grid Orders Tracking (`grid_orders` table)
- New database table tracks all active grid orders
- Stores: order_id, strategy_id, grid_level, side (buy/sell), status, prices
- Enables fast querying of pending orders by strategy
- Maintains grid state across system restarts

### 3. Event-Based Strategy Executors

#### SpotGridExecutor
- **Initial Setup**: Places initial market buy based on price position in grid range
- **Initial Grid Placement**: Places limit orders at all grid levels below/above current price
- **Event-Driven Execution**: When a buy order fills → places sell order at next level above
- **Event-Driven Execution**: When a sell order fills → places buy order at next level below
- Records all grid orders in `grid_orders` table for monitoring

#### ReverseGridExecutor
- Similar to SpotGrid but optimized for bearish markets
- **Initial Setup**: Places initial short position
- **Event-Driven Execution**: When sell fills → places buy at next level below
- **Event-Driven Execution**: When buy fills → places sell at next level above

### 4. Scheduler Integration
- Grid strategies now run every **1 hour** (reduced from 30 minutes)
- Periodic executions only for:
  - Grid health checks
  - Order rebalancing
  - Telemetry updates
- Primary execution is **event-driven** via order fill monitor

## Execution Flow

```
1. User creates grid strategy
   ↓
2. Initial execution places market buy + limit orders at all grid levels
   ↓
3. Orders recorded in grid_orders table with pending status
   ↓
4. Order Fill Monitor checks every 15 seconds
   ↓
5. When order fills detected:
   - Update grid_order status to 'filled'
   - Trigger execute_on_fill() for that strategy
   - Place complementary order at adjacent grid level
   - Broadcast real-time update to frontend
   ↓
6. Cycle continues as price crosses grid levels
```

## Key Benefits

1. **Faster Execution**: Orders placed within 15 seconds of fills (vs 30 minutes)
2. **Better Grid Adherence**: Immediate response to price crossing grid levels
3. **Efficient Capital**: Orders placed only when needed, not on fixed schedule
4. **Real-Time Updates**: Frontend receives immediate notifications of grid activity
5. **Scalability**: Handles multiple strategies/users efficiently

## Database Schema

### grid_orders table
```sql
- id (uuid)
- user_id (uuid)
- strategy_id (uuid)
- alpaca_order_id (text)
- symbol (text)
- side (buy/sell)
- quantity (numeric)
- limit_price (numeric)
- grid_level (integer)
- status (pending/filled/cancelled)
- filled_at (timestamptz)
- created_at (timestamptz)
```

## Monitoring & Debugging

### Check Active Grid Orders
```sql
SELECT * FROM grid_orders
WHERE status IN ('pending', 'partially_filled')
ORDER BY created_at DESC;
```

### Check Filled Orders
```sql
SELECT * FROM grid_orders
WHERE status = 'filled'
ORDER BY filled_at DESC
LIMIT 100;
```

### Monitor Fill Rate
```sql
SELECT strategy_id,
       COUNT(*) FILTER (WHERE status = 'filled') as filled,
       COUNT(*) FILTER (WHERE status = 'pending') as pending
FROM grid_orders
GROUP BY strategy_id;
```

## Configuration

### Order Fill Monitor Settings
- **Check Interval**: 15 seconds (configurable in `order_fill_monitor.py`)
- **Batch Processing**: Groups orders by user for efficient API usage
- **Error Handling**: Continues operation even if individual checks fail

### Grid Strategy Settings
- **Time-Based Interval**: 1 hour (for health checks only)
- **Grid Placement**: All levels placed on initial execution
- **Order Type**: Limit orders with GTC (Good Till Cancelled)

## Error Handling

1. **Order Placement Failures**: Logged but don't stop monitor
2. **API Rate Limits**: Monitor sleeps between checks to avoid limits
3. **Missing Orders**: Gracefully skipped with warning logged
4. **Strategy Not Found**: Execution skipped, error logged

## Future Enhancements

- [ ] Webhook integration for instant order fill notifications
- [ ] Advanced grid rebalancing based on volatility
- [ ] Multi-level order placement on fills
- [ ] Grid compression/expansion based on market conditions
- [ ] Performance analytics dashboard for grid strategies
