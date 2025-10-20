# Developer Guide: Production Trading Platform

## Quick Start

### Database Schema
All database tables are managed through Supabase migrations in `/supabase/migrations/`.

**Key Tables:**
- `user_profiles` - User settings and preferences
- `trading_strategies` - Strategy configurations (30+ fields)
- `community_strategies` - Public strategy marketplace
- `backtests` - Historical simulation results
- `user_notifications` - Alert system
- `bot_positions`, `bot_orders` - Trade execution tracking

### Backend Services

#### Risk Validator
```python
from services.risk_validator import RiskValidator

risk_validator = RiskValidator(supabase)

# Validate trade before execution
is_valid, error_msg = await risk_validator.validate_trade(
    user_id=user_id,
    strategy_id=strategy_id,
    symbol="AAPL",
    side="buy",
    quantity=10,
    price=150.00,
    account_balance=10000.00,
    buying_power=5000.00
)

if not is_valid:
    print(f"Trade blocked: {error_msg}")
    return

# Calculate risk score for strategy
risk_score = await risk_validator.calculate_risk_score(
    strategy_config=strategy_data,
    backtest_results=backtest_data
)
```

#### Backtest Engine
```python
from services.backtest_engine import BacktestEngine

backtest_engine = BacktestEngine(supabase, market_data_client)

# Run backtest
results = await backtest_engine.run_backtest(
    user_id=user_id,
    strategy_config=strategy_config,
    start_date=datetime(2022, 1, 1),
    end_date=datetime(2024, 12, 31),
    initial_capital=10000.00
)

print(f"Risk Score: {results['risk_score']}")
print(f"Total Return: {results['total_return_percent']}%")
print(f"Max Drawdown: {results['max_drawdown_percent']}%")
print(f"Sharpe Ratio: {results['sharpe_ratio']}")
```

#### Notification Service
```python
from services.notification_service import NotificationService

notification_service = NotificationService(supabase)

# Notify trade execution
await notification_service.notify_trade_executed(
    user_id=user_id,
    trade=trade_data,
    strategy_name="My DCA Strategy"
)

# Notify risk event
await notification_service.notify_risk_event(
    user_id=user_id,
    strategy_id=strategy_id,
    strategy_name="Spot Grid BTC",
    event_type="stop_loss_triggered",
    event_data={
        "symbol": "BTCUSD",
        "current_loss": 250.00,
        "limit": 200.00
    },
    action_taken="Strategy paused automatically"
)

# Get unread notifications
unread_count = await notification_service.get_unread_count(user_id)
notifications = await notification_service.get_recent_notifications(
    user_id=user_id,
    limit=20
)
```

### Strategy Executor Integration

#### Before (Old Way)
```python
# Direct trade execution without validation
def execute_strategy(strategy):
    order = submit_order(...)  # ❌ No safety checks!
    return order
```

#### After (New Way)
```python
from services.risk_validator import RiskValidator
from services.notification_service import NotificationService

async def execute_strategy(strategy):
    # 1. Validate trade
    is_valid, error = await risk_validator.validate_trade(...)

    if not is_valid:
        # Log risk event
        await notification_service.notify_risk_event(...)
        return {"action": "blocked", "reason": error}

    # 2. Execute trade
    order = submit_order(...)

    # 3. Notify user
    await notification_service.notify_trade_executed(...)

    return {"action": "buy", "order_id": order.id}
```

## Database Queries

### Get Strategy with Risk Score
```python
# Use the materialized view for performance
result = supabase.table('strategy_performance_summary').select(
    '*'
).eq('user_id', user_id).eq('id', strategy_id).single().execute()

strategy = result.data
print(f"Risk Score: {strategy['risk_score']}")
print(f"Open Positions: {strategy['open_positions_count']}")
print(f"Unrealized P&L: ${strategy['total_unrealized_pnl']}")
```

### Get User Profile with Preferences
```python
result = supabase.table('user_profiles').select(
    '*'
).eq('user_id', user_id).single().execute()

profile = result.data
tier = profile['subscription_tier']  # starter, pro, elite
risk_tolerance = profile['risk_tolerance']  # conservative, medium, aggressive
paper_trading = profile['paper_trading_mode']  # true/false
```

### Get Community Strategies by Rating
```python
result = supabase.table('community_strategies').select(
    '*'
).eq('is_public', True).eq('is_verified', True).gte(
    'avg_rating', 4.0
).order('avg_rating', desc=True).limit(10).execute()

top_strategies = result.data
```

### Get Recent Backtests
```python
result = supabase.table('backtests').select(
    '*'
).eq('user_id', user_id).eq('status', 'completed').order(
    'created_at', desc=True
).limit(5).execute()

recent_backtests = result.data
for backtest in recent_backtests:
    print(f"Risk Score: {backtest['risk_score']}")
    print(f"Return: {backtest['total_return_percent']}%")
```

## Configuration Management

### Platform Config
```python
# Get platform-wide configuration
result = supabase.table('platform_config').select(
    'value'
).eq('key', 'default_risk_limits').single().execute()

risk_limits = result.data['value']
max_position_size = risk_limits['max_position_size_percent']
max_daily_loss = risk_limits['max_daily_loss_percent']
```

### Strategy Configuration Structure
```python
strategy_config = {
    # Basic info
    "name": "My Strategy",
    "type": "spot_grid",
    "risk_level": "medium",

    # Universal bot fields
    "base_symbol": "BTCUSD",
    "asset_class": "crypto",
    "time_horizon": "swing",
    "automation_level": "fully_auto",

    # Capital allocation
    "capital_allocation": {
        "mode": "fixed_amount_usd",
        "value": 1000.00,
        "max_positions": 5
    },

    # Position sizing
    "position_sizing": {
        "mode": "percent_equity",
        "value": 10  # 10% per position
    },

    # Risk controls
    "risk_controls": {
        "stop_loss_percent": 5.0,
        "take_profit_percent": 10.0,
        "max_daily_loss_usd": 100.00
    },

    # Trade window
    "trade_window": {
        "enabled": True,
        "start_time": "09:30",
        "end_time": "16:00",
        "days_of_week": [1, 2, 3, 4, 5]  # Mon-Fri
    },

    # Grid-specific (if grid strategy)
    "grid_mode": "arithmetic",
    "quantity_per_grid": 0.01,
    "technical_indicators": {
        "rsi": {
            "enabled": True,
            "period": 14,
            "buy_threshold": 30,
            "sell_threshold": 70
        }
    }
}
```

## Testing Examples

### Unit Test for Risk Validator
```python
import pytest
from services.risk_validator import RiskValidator

@pytest.mark.asyncio
async def test_validate_buying_power():
    validator = RiskValidator(mock_supabase)

    # Should pass - sufficient buying power
    is_valid, error = await validator.validate_trade(
        user_id="test-user",
        strategy_id="test-strategy",
        symbol="AAPL",
        side="buy",
        quantity=10,
        price=150.00,  # $1,500 total
        account_balance=10000.00,
        buying_power=5000.00  # Sufficient
    )

    assert is_valid == True
    assert error is None

    # Should fail - insufficient buying power
    is_valid, error = await validator.validate_trade(
        user_id="test-user",
        strategy_id="test-strategy",
        symbol="AAPL",
        side="buy",
        quantity=100,
        price=150.00,  # $15,000 total
        account_balance=10000.00,
        buying_power=5000.00  # Insufficient
    )

    assert is_valid == False
    assert "Insufficient buying power" in error
```

## Error Handling

### Service Layer Errors
```python
from services.risk_validator import RiskValidationError

try:
    is_valid, error = await risk_validator.validate_trade(...)

    if not is_valid:
        # Handle validation failure
        await notification_service.notify_risk_event(...)
        return {"status": "blocked", "reason": error}

except RiskValidationError as e:
    logger.error(f"Risk validation error: {e}")
    return {"status": "error", "message": str(e)}

except Exception as e:
    logger.error(f"Unexpected error: {e}", exc_info=True)
    return {"status": "error", "message": "Internal server error"}
```

## Performance Best Practices

### Use Indexes
```python
# ✅ Good - uses index on user_id and is_active
strategies = supabase.table('trading_strategies').select('*').eq(
    'user_id', user_id
).eq('is_active', True).execute()

# ❌ Bad - filters in Python after fetching all rows
all_strategies = supabase.table('trading_strategies').select('*').execute()
active_strategies = [s for s in all_strategies.data if s['is_active']]
```

### Use Views for Complex Queries
```python
# ✅ Good - uses pre-calculated view
result = supabase.table('strategy_performance_summary').select('*').execute()

# ❌ Bad - manual joins and calculations
strategies = supabase.table('trading_strategies').select('*').execute()
positions = supabase.table('bot_positions').select('*').execute()
# ... complex Python joins and calculations
```

### Batch Operations
```python
# ✅ Good - single query
notifications = await notification_service.get_recent_notifications(
    user_id=user_id,
    limit=20
)

# ❌ Bad - multiple queries in loop
notifications = []
for notification_id in notification_ids:
    notif = supabase.table('user_notifications').select('*').eq(
        'id', notification_id
    ).single().execute()
    notifications.append(notif.data)
```

## Security Checklist

- [ ] Always validate user_id matches auth.uid() in queries
- [ ] Use RLS policies instead of application-level filtering
- [ ] Never expose sensitive data (API keys, tokens) in responses
- [ ] Validate all user inputs before database operations
- [ ] Use parameterized queries to prevent SQL injection
- [ ] Implement rate limiting on expensive operations
- [ ] Log all security-relevant events
- [ ] Encrypt sensitive data at rest

## Deployment Checklist

- [ ] All migrations applied successfully
- [ ] Environment variables configured
- [ ] RLS policies enabled on all tables
- [ ] Indexes created for performance
- [ ] Logging configured
- [ ] Error tracking enabled
- [ ] Health check endpoints working
- [ ] Database backups configured
- [ ] Monitoring alerts set up
- [ ] Load testing completed

## Common Issues & Solutions

### Issue: Notification not appearing
**Solution:** Check user preferences first
```python
profile = supabase.table('user_profiles').select(
    'notifications_enabled'
).eq('user_id', user_id).single().execute()

if not profile.data['notifications_enabled']:
    print("User has notifications disabled")
```

### Issue: Risk validation always failing
**Solution:** Check platform config and strategy limits
```python
# Get platform limits
config = supabase.table('platform_config').select('*').execute()

# Get user profile
profile = supabase.table('user_profiles').select('*').eq(
    'user_id', user_id
).single().execute()

print(f"Subscription tier: {profile.data['subscription_tier']}")
print(f"Paper trading mode: {profile.data['paper_trading_mode']}")
```

### Issue: Backtest taking too long
**Solution:** Limit date range and use sampling
```python
# Instead of 5 years daily
start_date = datetime(2020, 1, 1)
end_date = datetime(2024, 12, 31)

# Use 2 years weekly sampling
start_date = datetime(2023, 1, 1)
end_date = datetime(2024, 12, 31)
# Sample every 7th day in data fetching
```

## Next Steps

1. **Integrate Services in Strategy Executors**
   - Update all executors to use RiskValidator
   - Add NotificationService calls
   - Implement telemetry tracking

2. **Build Frontend Components**
   - Risk score visualization
   - Notification center
   - Backtest results display
   - Community marketplace UI

3. **Add Bronomics AI**
   - Integrate Claude API
   - Build conversation system
   - Add strategy recommendations

4. **Integrate TradingView**
   - Add charting library
   - Real-time data streaming
   - Technical indicators

5. **Testing**
   - Write unit tests for all services
   - Integration tests for workflows
   - Performance testing
   - Security testing

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Risk Management Best Practices](https://www.investopedia.com/terms/r/riskmanagement.asp)
- [Backtesting Guidelines](https://www.quantstart.com/articles/Backtesting-Systematic-Trading-Strategies-in-Python/)
