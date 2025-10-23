# Price-Based Automatic Grid Order Placement System

## Overview

The Price-Based Grid Order Placement System automatically monitors market prices and places orders at appropriate grid levels based on current price position. This eliminates the need for manual order management and ensures grids maintain full coverage across all levels.

## Architecture

### Core Components

#### 1. GridPriceMonitor (`backend/services/grid_price_monitor.py`)
- **Purpose**: Continuously monitors market prices and automatically places orders at grid levels
- **Polling Interval**: 30 seconds (configurable)
- **Key Features**:
  - Price caching to avoid duplicate API calls
  - Concurrent strategy processing with locks
  - Automatic order placement at missing grid levels
  - Position-aware sell order management
  - Real-time SSE notifications

#### 2. GridStateValidator (`backend/services/grid_state_validator.py`)
- **Purpose**: Validates grid order coverage and detects gaps
- **Key Features**:
  - Coverage analysis (% of grid levels with orders)
  - Gap detection (consecutive missing levels)
  - Health score calculation (0-100)
  - Stale order cleanup
  - Actionable recommendations

#### 3. Enhanced SpotGridExecutor (`backend/strategy_executors/spot_grid.py`)
- **Purpose**: Initial grid setup when strategy is activated
- **Key Features**:
  - Initial market buy to establish position
  - Complete grid initialization with all levels
  - Smart order placement (buy orders below price, sell orders above)
  - Fractional quantity handling
  - Order deduplication

#### 4. Integration with Scheduler (`backend/scheduler.py`)
- **Purpose**: Automatic startup of GridPriceMonitor
- **Integration Points**:
  - Starts on application launch
  - Stops on application shutdown
  - Runs independently from strategy execution loop

## How It Works

### 1. Strategy Activation Flow

```
User activates grid strategy
         ↓
SpotGridExecutor.execute() is called
         ↓
Initial market buy to establish position
         ↓
Place limit orders at ALL grid levels:
  - Buy orders at levels below current price
  - Sell orders at levels above current price (if position exists)
         ↓
Orders are recorded in grid_orders table
```

### 2. Price Monitoring Flow

```
GridPriceMonitor runs every 30 seconds
         ↓
Loads active grid strategies
         ↓
Fetches current prices for all symbols
         ↓
For each strategy:
  - Calculate grid levels
  - Get existing orders
  - Identify missing levels
  - Place orders at gaps (max 5 per cycle)
         ↓
Broadcast SSE notifications to frontend
```

### 3. Order Fill Flow

```
Order fills at grid level X
         ↓
OrderFillMonitor detects fill
         ↓
Updates grid_orders status to "filled"
         ↓
SpotGridExecutor.execute_on_fill() is called
         ↓
Places complementary order:
  - If buy filled: place sell order at X+1
  - If sell filled: place buy order at X-1
         ↓
Grid maintains itself automatically
```

## Database Schema

### grid_orders Table
```sql
- id (uuid)
- strategy_id (uuid, foreign key)
- user_id (uuid, foreign key)
- alpaca_order_id (text)
- symbol (text)
- side (text: 'buy' | 'sell')
- quantity (numeric)
- limit_price (numeric)
- grid_price (numeric)
- grid_level (integer)
- status (text: 'pending' | 'partially_filled' | 'filled' | 'cancelled' | 'rejected')
- time_in_force (text: 'day' | 'gtc')
- is_fractional (boolean)
- is_stale (boolean)
- check_count (integer)
- filled_qty (numeric)
- filled_avg_price (numeric)
- created_at (timestamptz)
- updated_at (timestamptz)
- filled_at (timestamptz)
- last_checked_at (timestamptz)
```

## API Endpoints

### Grid Status Routes (`/api/grid-status`)

#### GET `/{strategy_id}/validation`
Returns detailed validation report including:
- Coverage analysis
- Gap detection
- Missing levels
- Recommendations

#### GET `/{strategy_id}/health`
Returns health score (0-100) with:
- Overall status (excellent/good/fair/poor/critical)
- Score breakdown
- Coverage metrics
- Recommendations

#### GET `/{strategy_id}/coverage`
Returns simple coverage statistics:
- Total grid levels
- Active orders
- Coverage percentage
- Status

#### POST `/{strategy_id}/cleanup-stale`
Cleans up stale orders that are no longer tracked by Alpaca

## Configuration

### Grid Strategy Configuration
```json
{
  "symbol": "AAPL",
  "price_range_lower": 150.00,
  "price_range_upper": 180.00,
  "number_of_grids": 20,
  "allocated_capital": 10000,
  "grid_mode": "arithmetic"  // or "geometric"
}
```

### Polling Configuration
Located in `GridPriceMonitor.__init__()`:
```python
self.check_interval = 30  # Check every 30 seconds
```

### Rate Limiting
```python
max_orders_per_cycle = 5  # Place max 5 orders per cycle
```
This prevents API throttling while ensuring gradual grid coverage.

## Safety Mechanisms

### 1. Position Checking for Sell Orders
- System verifies sufficient position exists before placing sell orders
- Prevents "insufficient shares" errors from Alpaca
- Sell orders only placed if position >= 10% of required quantity

### 2. Duplicate Order Prevention
- Checks existing grid orders in database before placing
- Prevents multiple orders at same grid level
- Uses strategy-level locks to prevent concurrent processing

### 3. Stale Order Detection
- Tracks orders that no longer exist in Alpaca
- After 5 failed checks, marks order as stale
- Stale orders excluded from coverage calculations

### 4. Fractional Order Handling
- Automatically detects fractional quantities
- Uses DAY orders for fractional quantities on stocks
- Uses GTC orders for whole shares and crypto

## Frontend Integration

### GridOrdersDisplay Component
Enhanced to show:
- Real-time order coverage (X of Y levels covered)
- Auto-placement indicator when gaps detected
- Live order status updates via SSE
- Price range visualization

### Real-Time Updates
SSE events broadcast when:
- New grid order placed
- Order status changes
- Grid setup completes
- Order fills occur

## Monitoring & Debugging

### Log Messages
```
🔍 Starting Grid Price Monitor...
📊 Monitoring N active grid strategies
✅ Placed M new grid orders for strategy X
⚠️ Insufficient position for sell order at level Y
📡 Broadcasted grid order placed to user Z
```

### Health Metrics
- Coverage percentage: % of grid levels with active orders
- Gap count: Number of consecutive missing level ranges
- Health score: 0-100 composite score
- Stale order count: Orders no longer in Alpaca

## Best Practices

### For Users
1. **Set Appropriate Grid Range**: Ensure price range encompasses expected price movement
2. **Adequate Capital**: Allocate sufficient capital for all grid levels
3. **Monitor Coverage**: Check grid health dashboard regularly
4. **Clean Stale Orders**: Periodically cleanup stale orders

### For Developers
1. **Test with Small Grids**: Start with 5-10 levels for testing
2. **Monitor Logs**: Watch for order placement failures
3. **Check Rate Limits**: Ensure API usage stays within limits
4. **Validate Calculations**: Test grid level calculations with different modes

## Troubleshooting

### No Orders Being Placed
- Check if GridPriceMonitor is running (logs show startup)
- Verify strategy is active (`is_active = true`)
- Confirm price is within grid range
- Check for authentication errors in logs

### Insufficient Position Errors
- Strategy needs initial buy to complete first
- Wait for buy orders to fill before sells placed
- Check actual position in Alpaca account

### Stale Orders Accumulating
- Run cleanup endpoint periodically
- Check Alpaca API connectivity
- Verify order IDs are being recorded correctly

### Low Coverage Percentage
- GridPriceMonitor automatically fills gaps
- Wait for multiple polling cycles
- Check if orders are being rejected by Alpaca
- Review error logs for placement failures

## Performance Considerations

### Polling Frequency
- Default: 30 seconds per cycle
- Lower = more responsive but higher API usage
- Higher = less API usage but slower gap filling

### Order Placement Rate
- Max 5 orders per strategy per cycle
- Prevents API throttling
- Ensures gradual grid establishment

### Price Data Caching
- Prices cached per symbol
- Reduces duplicate API calls
- Shared across multiple strategies on same symbol

## Future Enhancements

1. **Dynamic Grid Adjustment**: Auto-adjust range based on price movement
2. **Machine Learning**: Predict optimal grid spacing
3. **Multi-Asset Grids**: Grid across correlated assets
4. **Advanced Gap Filling**: Prioritize important levels
5. **Performance Optimization**: Batch order placement API calls

## Summary

The Price-Based Grid Order Placement System transforms grid trading from passive to active by:
- ✅ Automatically monitoring prices every 30 seconds
- ✅ Placing orders at all missing grid levels
- ✅ Maintaining full grid coverage continuously
- ✅ Providing real-time health monitoring
- ✅ Ensuring position-safe order placement
- ✅ Broadcasting updates to frontend via SSE

Users now see their grids actively trading with orders at every level, automatically adjusting as the market moves, without any manual intervention required.
