#!/bin/bash

# Test script for Market Data API
# Usage: ./test-market-data-api.sh <YOUR_SUPABASE_JWT_TOKEN>

if [ -z "$1" ]; then
  echo "Error: No auth token provided"
  echo "Usage: $0 <USER_SESSION_TOKEN>"
  echo ""
  echo "IMPORTANT: You need a USER SESSION TOKEN, not the Supabase anon/service_role keys!"
  echo ""
  echo "To get your USER session token:"
  echo "1. Open your IQlume app in browser and LOG IN with your account"
  echo "2. Open browser console (F12 or Cmd+Option+I)"
  echo "3. Go to the Console tab"
  echo "4. Run this command:"
  echo "   (await supabase.auth.getSession()).data.session.access_token"
  echo "5. Copy the token (it will be a long JWT starting with 'eyJ...')"
  echo "6. Run: $0 \"<paste-the-token-here>\""
  echo ""
  echo "Note: The token should have role='authenticated' and contain your user ID"
  echo "      Don't use SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY!"
  exit 1
fi

TOKEN="$1"
API_BASE="${2:-https://api.handler.brokernomex.com}"

echo "Testing Market Data API endpoints..."
echo "API Base: $API_BASE"
echo ""

# Test 1: BTCUSD historical data (format without slash)
echo "=== Test 1: BTCUSD Historical (format without slash) ==="
curl -s -H "Authorization: Bearer $TOKEN" \
  "$API_BASE/api/market-data/BTCUSD/historical?timeframe=1Day&limit=10" | jq '.' || echo "Failed"
echo ""
echo ""

# Test 2: BTC/USD historical data (URL-encoded slash)
echo "=== Test 2: BTC/USD Historical (URL-encoded) ==="
curl -s -H "Authorization: Bearer $TOKEN" \
  "$API_BASE/api/market-data/BTC%2FUSD/historical?timeframe=1Day&limit=10" | jq '.' || echo "Failed"
echo ""
echo ""

# Test 3: Stock symbol (AAPL)
echo "=== Test 3: AAPL Historical ==="
curl -s -H "Authorization: Bearer $TOKEN" \
  "$API_BASE/api/market-data/AAPL/historical?timeframe=1Day&limit=10" | jq '.' || echo "Failed"
echo ""
echo ""

# Test 4: Live prices
echo "=== Test 4: Live Prices (BTC/USD, ETH/USD, AAPL) ==="
curl -s -H "Authorization: Bearer $TOKEN" \
  "$API_BASE/api/market-data/live-prices?symbols=BTCUSD,ETHUSD,AAPL" | jq '.' || echo "Failed"
echo ""

echo "Tests complete!"
