# Strategy Auto-Trading Debugging Guide

**Date:** October 29, 2025
**Purpose:** Diagnose and fix why strategies are not auto-trading

---

## 🔍 How Auto-Trading Works

### The Complete Flow:

1. **Strategy Creation** → Strategy inserted with `is_active = true` (default)
2. **Initial Execution** → Strategy executes once if `auto_start = true` or is a grid strategy
3. **Scheduler Pickup** → Scheduler reloads strategies every 5 minutes and schedules active ones
4. **Scheduled Execution** → Strategy runs at configured intervals based on type
5. **Order Fills** → Grid strategies continue via Order Fill Monitor (event-driven)
6. **TP/SL Monitoring** → Position Exit Monitor checks for take profit/stop loss

---

## 📊 Strategy Execution Intervals

Different strategy types have different execution frequencies:

### High Frequency (< 5 minutes)
- **Scalping:** 30 seconds
- **Arbitrage:** 60 seconds

### Grid Strategies (Event-Driven)
- **Spot Grid:** 24 hours (only setup, then order fill monitor takes over)
- **Futures Grid:** 24 hours
- **Infinity Grid:** 24 hours
- **Reverse Grid:** 24 hours

**Important:** Grid strategies run ONCE to place initial buy order, then the **Order Fill Monitor** handles all subsequent orders when fills occur.

### Medium Frequency (5-30 minutes)
- **Momentum Breakout:** 5 minutes
- **News Based Trading:** 5 minutes
- **Mean Reversion:** 30 minutes
- **Pairs Trading:** 30 minutes
- **Swing Trading:** 30 minutes

### Lower Frequency (1+ hours)
- **Covered Calls:** 1 hour
- **Wheel Strategy:** 1 hour
- **Iron Condor:** 1 hour
- **Short Put:** 1 hour

### Very Low Frequency (Daily/Weekly)
- **DCA (Dollar Cost Averaging):** 24 hours (daily)
- **Smart Rebalance:** 7 days (weekly)

---

## 🛠️ Debugging Steps

### Step 1: Check Strategy is Active

**Via API:**
```bash
# Get all strategies for your user
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.handler.brokernomex.com/api/strategies

# Look for "is_active": true
```

**Via Database:**
```sql
SELECT id, name, type, is_active, created_at
FROM trading_strategies
WHERE user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC;
```

**Expected:** Strategy should have `is_active = true`

### Step 2: Check Scheduler Status

**Via New Endpoint:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.handler.brokernomex.com/api/strategies/scheduler/status
```

**Expected Response:**
```json
{
  "scheduler_running": true,
  "active_strategies": 2,
  "scheduled_jobs": 2,
  "total_scheduler_jobs": 5,
  "jobs": [
    {
      "job_id": "strategy_abc123",
      "strategy_id": "abc123",
      "strategy_name": "My Spot Grid",
      "strategy_type": "spot_grid",
      "next_run_time": "2025-10-30T19:00:00Z",
      "interval_seconds": 86400
    }
  ],
  "next_reload": "2025-10-29T19:25:00Z"
}
```

**What to Check:**
- ✅ `scheduler_running` should be `true`
- ✅ `active_strategies` should match your active strategy count
- ✅ `scheduled_jobs` should match active strategies
- ✅ Each strategy should have a `next_run_time`

### Step 3: Check Backend Logs

**SSH into server and check logs:**
```bash
docker logs -f $(docker compose ps -q backend) | grep -E "SCHEDULER|Executing|Strategy"
```

**Look for these log patterns:**

**✅ Good Signs:**
```
🚀 Starting autonomous trading scheduler...
✅ Trading scheduler started successfully
📊 Found 2 active strategies
⏰ Scheduled My Spot Grid (spot_grid) to run every 86400s
🤖 [SCHEDULER] Executing My Spot Grid (spot_grid) for user abc123
```

**❌ Bad Signs:**
```
📭 No active strategies found
❌ Error loading active strategies: [error message]
⚠️ No executor available for strategy type: [type]
```

### Step 4: Manually Execute Strategy

**Test if strategy CAN execute:**
```bash
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.handler.brokernomex.com/api/strategies/STRATEGY_ID/execute
```

**Expected:** Should return execution result showing what the strategy did

### Step 5: Check Alpaca Credentials

**Via Health Endpoint:**
```bash
curl https://api.handler.brokernomex.com/health/detailed
```

**Look for:**
```json
{
  "services": {
    "database": {"status": "connected"}
  }
}
```

**Check User's OAuth Tokens:**
```sql
SELECT user_id, access_token, expires_at, environment
FROM alpaca_oauth_tokens
WHERE user_id = 'YOUR_USER_ID';
```

**Expected:**
- Token should exist
- `expires_at` should be in the future
- `environment` should match (paper/live)

---

## 🐛 Common Issues & Solutions

### Issue 1: Strategy Created But Never Executes

**Symptoms:**
- Strategy shows `is_active = true`
- No logs showing execution
- Scheduler status shows 0 jobs

**Causes:**
1. Scheduler not started (backend crashed)
2. Strategy created after last scheduler reload (wait 5 minutes)
3. Database connection lost

**Solutions:**
```bash
# Restart backend to restart scheduler
docker compose restart backend

# Check scheduler started
docker logs $(docker compose ps -q backend) | grep "Trading scheduler started"

# Wait 5 minutes for next reload, or manually trigger
# (Future: Add manual reload endpoint)
```

### Issue 2: Grid Strategy Only Executes Once

**Symptoms:**
- Grid strategy executed on creation
- Initial buy order placed
- No subsequent orders

**This is CORRECT behavior!**

Grid strategies are **event-driven**:
1. Initial execution places first buy order
2. **Order Fill Monitor** (running every 120s) detects when buy fills
3. When buy fills, Order Fill Monitor places sell order at next grid level
4. When sell fills, Order Fill Monitor places buy order at previous level
5. This continues automatically

**Check Order Fill Monitor:**
```bash
docker logs $(docker compose ps -q backend) | grep "Order fill monitor"

# Should see:
# ✅ Order fill monitor started with 120s interval
# 🔍 Checking pending orders for fills...
```

**Check Pending Orders:**
```sql
SELECT id, symbol, side, status, grid_level, created_at
FROM bot_orders
WHERE strategy_id = 'YOUR_STRATEGY_ID'
  AND status IN ('pending', 'submitted')
ORDER BY grid_level;
```

### Issue 3: Non-Grid Strategy Not Executing at Interval

**Symptoms:**
- Strategy type is momentum/DCA/etc (not grid)
- Shows in scheduler status with long `next_run_time`
- Interval seems wrong

**Diagnosis:**
```bash
# Check scheduler status
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.handler.brokernomex.com/api/strategies/scheduler/status

# Look at interval_seconds for your strategy
```

**Expected Intervals:**
- Scalping: 30s
- Momentum: 300s (5 min)
- Mean Reversion: 1800s (30 min)
- Covered Calls: 3600s (1 hour)
- DCA: 86400s (24 hours)

**If interval is wrong:**
This is a bug in `scheduler.py` `get_execution_interval()` method. Check the strategy type matches exactly.

### Issue 4: Strategy Executes But No Orders Placed

**Symptoms:**
- Logs show "🤖 [SCHEDULER] Executing..."
- Execution result shows `"action": "hold"`
- No orders in Alpaca or database

**Causes:**
1. **Risk Validator Rejected Trade** - Check `bot_risk_events` table
2. **Market Conditions** - Strategy conditions not met (e.g., no momentum signal)
3. **Insufficient Buying Power** - Not enough capital
4. **Market Closed** - Some strategies check market hours

**Check Risk Events:**
```sql
SELECT * FROM bot_risk_events
WHERE user_id = 'YOUR_USER_ID'
  AND strategy_id = 'YOUR_STRATEGY_ID'
ORDER BY created_at DESC
LIMIT 10;
```

**Check Execution Logs:**
```bash
docker logs $(docker compose ps -q backend) | grep "SCHEDULER.*STRATEGY_NAME"
```

Look for:
- ✅ `BUY executed` or `SELL executed` (trade placed)
- ⚠️ `HOLD - waiting for signal` (conditions not met)
- ❌ `Risk validation failed` (rejected by risk validator)

### Issue 5: Alpaca Account Not Connected

**Symptoms:**
- Error: "Alpaca credentials not found"
- Strategy execution fails immediately

**Solutions:**
1. **Connect Alpaca via OAuth:**
   - Go to frontend → Accounts → Connect Alpaca
   - Complete OAuth flow
   - Verify token saved in `alpaca_oauth_tokens` table

2. **Check Environment:**
   ```sql
   SELECT environment FROM alpaca_oauth_tokens
   WHERE user_id = 'YOUR_USER_ID';
   ```
   - Should be `paper` for testing
   - Should be `live` for real trading

3. **Refresh Token if Expired:**
   - Tokens expire after 1 year
   - Re-authenticate via frontend

---

## 🔧 Manual Testing Workflow

### Test Complete Auto-Trading Flow:

**1. Create Strategy:**
```bash
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Momentum Strategy",
    "type": "momentum_breakout",
    "is_active": true,
    "auto_start": true,
    "configuration": {
      "symbol": "AAPL",
      "allocated_capital": 1000
    }
  }' \
  https://api.handler.brokernomex.com/api/strategies
```

**2. Verify Immediate Execution (auto_start=true):**
Check response includes `initial_execution_result`

**3. Check Scheduler Picked It Up (wait 5 minutes max):**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.handler.brokernomex.com/api/strategies/scheduler/status
```

**4. Wait for Next Scheduled Execution:**
- Momentum strategies run every 5 minutes
- Check logs at next interval

**5. Verify Order Placement:**
```sql
SELECT * FROM bot_orders
WHERE strategy_id = 'YOUR_STRATEGY_ID'
ORDER BY created_at DESC;
```

**6. Verify Trade Recording:**
```sql
SELECT * FROM trades
WHERE strategy_id = 'YOUR_STRATEGY_ID'
ORDER BY created_at DESC;
```

---

## 📈 Monitoring Auto-Trading

### Real-Time Monitoring:

**1. Backend Logs (shows all executions):**
```bash
docker logs -f $(docker compose ps -q backend) | grep -E "SCHEDULER|BUY|SELL"
```

**2. Scheduler Status (shows what's scheduled):**
```bash
watch -n 30 'curl -s -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.handler.brokernomex.com/api/strategies/scheduler/status | jq'
```

**3. Database Activity (shows orders/trades):**
```sql
-- Recent orders
SELECT * FROM bot_orders
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;

-- Recent trades
SELECT * FROM trades
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

### Health Metrics:

**Scheduler Health:**
- ✅ Scheduler running
- ✅ Active strategies count matches database
- ✅ Jobs have valid next_run_time
- ✅ No errors in logs

**Execution Health:**
- ✅ Strategies executing at correct intervals
- ✅ Some executions result in trades (when conditions met)
- ✅ No risk validator rejections (unless intentional)
- ✅ Orders filling in Alpaca

---

## 🎯 Expected Behavior Summary

### Grid Strategies:
1. ✅ Execute once on creation
2. ✅ Place initial buy order
3. ✅ Order Fill Monitor detects fill
4. ✅ Places next grid order (sell if buy filled)
5. ✅ Continues indefinitely via Order Fill Monitor
6. ❌ Does NOT re-execute via scheduler (24-hour interval is intentional)

### Non-Grid Strategies (Momentum, DCA, etc):
1. ✅ Execute on creation if auto_start=true
2. ✅ Scheduler picks up within 5 minutes
3. ✅ Executes at regular intervals (5 min - 7 days)
4. ✅ Places orders when conditions met
5. ✅ Logs "HOLD" when conditions not met
6. ✅ Continues indefinitely until deactivated

### Position Exit Automation:
1. ✅ Position Exit Monitor checks every 90 seconds
2. ✅ Detects take profit triggers
3. ✅ Detects stop loss triggers
4. ✅ Places exit orders automatically
5. ✅ Logs to `exit_events` table

---

## 🚨 Emergency Commands

### Stop All Auto-Trading:
```bash
# Via environment variable
echo "DISABLE_BACKGROUND_SERVICES=true" >> /srv/brokernomex/backend/.env
docker compose restart backend
```

### Stop Specific Service:
```bash
# Stop only scheduler
echo "ENABLE_TRADING_SCHEDULER=false" >> /srv/brokernomex/backend/.env
docker compose restart backend
```

### Deactivate All Strategies:
```sql
UPDATE trading_strategies
SET is_active = false
WHERE user_id = 'YOUR_USER_ID';
```

### Cancel All Pending Orders:
```bash
# Via Alpaca API (requires Alpaca CLI or script)
# Or via frontend: Accounts → View in Alpaca → Cancel All
```

---

## 📞 Support Checklist

When reporting auto-trading issues, provide:

1. ✅ Strategy ID and type
2. ✅ User ID
3. ✅ Scheduler status endpoint output
4. ✅ Recent backend logs (last 100 lines with SCHEDULER)
5. ✅ Database queries:
   - Active strategies count
   - Recent bot_orders
   - Recent trades
   - Risk events (if any)
6. ✅ Expected behavior vs actual behavior
7. ✅ Alpaca environment (paper/live)

---

## 🎉 Success Indicators

Your auto-trading is working correctly when:

✅ Scheduler status shows `scheduler_running: true`
✅ Active strategies count matches your active strategies
✅ Each strategy has a `next_run_time`
✅ Backend logs show strategy executions at correct intervals
✅ Orders appear in `bot_orders` table when conditions met
✅ Orders fill in Alpaca (paper or live)
✅ Trades recorded in `trades` table
✅ Grid strategies continue via Order Fill Monitor
✅ TP/SL triggers working via Position Exit Monitor
✅ No errors in `bot_risk_events` (unless expected rejections)

---

**Last Updated:** October 29, 2025
**Author:** Claude Code Agent
**Status:** Production Debugging Guide
