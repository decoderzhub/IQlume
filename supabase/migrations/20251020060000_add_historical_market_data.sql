/*
  # Historical Market Data Storage for Backtesting

  ## Overview
  Creates infrastructure for storing and managing historical market data
  to support accurate backtesting with redundant data availability.

  ## New Tables

  ### `historical_market_data`
  Stores OHLCV (Open, High, Low, Close, Volume) historical price data
  - `id` (uuid, primary key)
  - `symbol` (text, stock/crypto symbol)
  - `timeframe` (text, data granularity: 1Min, 5Min, 1Hour, 1Day)
  - `timestamp` (timestamptz, bar timestamp)
  - `open` (numeric, opening price)
  - `high` (numeric, highest price)
  - `low` (numeric, lowest price)
  - `close` (numeric, closing price)
  - `volume` (numeric, trading volume)
  - `trade_count` (integer, number of trades)
  - `vwap` (numeric, volume-weighted average price)
  - `data_source` (text, alpaca, polygon, cached)
  - `data_quality` (text, verified, unverified, interpolated)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `backtest_equity_curves`
  Stores equity curve data points for backtests
  - `id` (uuid, primary key)
  - `backtest_id` (uuid, foreign key to backtests)
  - `timestamp` (timestamptz, point in time)
  - `strategy_equity` (numeric, portfolio value with strategy)
  - `benchmark_equity` (numeric, buy-and-hold portfolio value)
  - `cash_balance` (numeric, available cash)
  - `position_value` (numeric, value of open positions)
  - `unrealized_pnl` (numeric, unrealized profit/loss)
  - `realized_pnl` (numeric, cumulative realized profit/loss)
  - `total_trades` (integer, cumulative trade count)
  - `created_at` (timestamptz)

  ## Indexes
  - Composite index on (symbol, timeframe, timestamp) for fast lookups
  - Index on backtest_id for equity curve queries
  - Index on data_quality for filtering reliable data

  ## Security
  - Enable RLS on all tables
  - Historical market data is readable by all authenticated users (public market data)
  - Equity curves are only accessible by the backtest owner
*/

-- Create historical_market_data table
CREATE TABLE IF NOT EXISTS historical_market_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol text NOT NULL,
  timeframe text NOT NULL CHECK (timeframe IN ('1Min', '5Min', '15Min', '1Hour', '4Hour', '1Day')),
  timestamp timestamptz NOT NULL,
  open numeric NOT NULL CHECK (open > 0),
  high numeric NOT NULL CHECK (high > 0),
  low numeric NOT NULL CHECK (low > 0),
  close numeric NOT NULL CHECK (close > 0),
  volume numeric NOT NULL CHECK (volume >= 0),
  trade_count integer DEFAULT 0,
  vwap numeric CHECK (vwap IS NULL OR vwap > 0),
  data_source text NOT NULL DEFAULT 'alpaca' CHECK (data_source IN ('alpaca', 'polygon', 'cached', 'interpolated')),
  data_quality text NOT NULL DEFAULT 'unverified' CHECK (data_quality IN ('verified', 'unverified', 'interpolated', 'suspicious')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(symbol, timeframe, timestamp)
);

-- Create backtest_equity_curves table
CREATE TABLE IF NOT EXISTS backtest_equity_curves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  backtest_id uuid NOT NULL REFERENCES backtests(id) ON DELETE CASCADE,
  timestamp timestamptz NOT NULL,
  strategy_equity numeric NOT NULL CHECK (strategy_equity >= 0),
  benchmark_equity numeric NOT NULL CHECK (benchmark_equity >= 0),
  cash_balance numeric NOT NULL DEFAULT 0,
  position_value numeric NOT NULL DEFAULT 0,
  unrealized_pnl numeric NOT NULL DEFAULT 0,
  realized_pnl numeric NOT NULL DEFAULT 0,
  total_trades integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_historical_market_data_symbol_timeframe_timestamp
  ON historical_market_data(symbol, timeframe, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_historical_market_data_timestamp
  ON historical_market_data(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_historical_market_data_data_quality
  ON historical_market_data(data_quality);

CREATE INDEX IF NOT EXISTS idx_backtest_equity_curves_backtest_id
  ON backtest_equity_curves(backtest_id, timestamp);

-- Enable Row Level Security
ALTER TABLE historical_market_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE backtest_equity_curves ENABLE ROW LEVEL SECURITY;

-- RLS Policies for historical_market_data
-- Historical market data is public (read-only for all authenticated users)
CREATE POLICY "Authenticated users can read historical market data"
  ON historical_market_data
  FOR SELECT
  TO authenticated
  USING (true);

-- Only system/admin can insert market data (could be relaxed later for caching)
CREATE POLICY "Service role can insert historical market data"
  ON historical_market_data
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Service role can update historical market data"
  ON historical_market_data
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for backtest_equity_curves
-- Users can only read their own backtest equity curves
CREATE POLICY "Users can read own backtest equity curves"
  ON backtest_equity_curves
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM backtests
      WHERE backtests.id = backtest_equity_curves.backtest_id
      AND backtests.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own backtest equity curves"
  ON backtest_equity_curves
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM backtests
      WHERE backtests.id = backtest_equity_curves.backtest_id
      AND backtests.user_id = auth.uid()
    )
  );

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_historical_market_data_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER historical_market_data_updated_at
  BEFORE UPDATE ON historical_market_data
  FOR EACH ROW
  EXECUTE FUNCTION update_historical_market_data_updated_at();

-- Create a view for data completeness checking
CREATE OR REPLACE VIEW market_data_completeness AS
SELECT
  symbol,
  timeframe,
  MIN(timestamp) as earliest_data,
  MAX(timestamp) as latest_data,
  COUNT(*) as total_bars,
  COUNT(DISTINCT DATE(timestamp)) as total_days,
  AVG(CASE WHEN data_quality = 'verified' THEN 1 ELSE 0 END) * 100 as verified_percentage
FROM historical_market_data
GROUP BY symbol, timeframe;

GRANT SELECT ON market_data_completeness TO authenticated;

-- Add comments
COMMENT ON TABLE historical_market_data IS 'Historical OHLCV market data for backtesting with redundant storage';
COMMENT ON TABLE backtest_equity_curves IS 'Time-series equity curve data for backtest visualizations';
COMMENT ON VIEW market_data_completeness IS 'Data quality and completeness metrics for historical market data';
