/*
  # Grid Orders Tracking System

  1. New Tables
    - `grid_orders`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `strategy_id` (uuid, references trading_strategies)
      - `alpaca_order_id` (text, unique)
      - `symbol` (text)
      - `side` (text) - 'buy' or 'sell'
      - `order_type` (text) - 'limit', 'market'
      - `quantity` (numeric)
      - `limit_price` (numeric)
      - `grid_level` (integer) - which grid level this order represents
      - `grid_price` (numeric) - the price level for this grid
      - `status` (text) - 'pending', 'partially_filled', 'filled', 'cancelled', 'rejected'
      - `filled_qty` (numeric)
      - `filled_avg_price` (numeric)
      - `time_in_force` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `filled_at` (timestamptz)

  2. Security
    - Enable RLS on `grid_orders` table
    - Add policy for users to read their own grid orders
    - Add policy for authenticated users to insert their own grid orders
    - Add policy for users to update their own grid orders

  3. Indexes
    - Index on strategy_id for fast lookups
    - Index on alpaca_order_id for order sync
    - Index on status for monitoring pending orders
    - Compound index on (strategy_id, status) for active order queries
*/

-- Create grid_orders table
CREATE TABLE IF NOT EXISTS grid_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  strategy_id uuid NOT NULL REFERENCES trading_strategies(id) ON DELETE CASCADE,
  alpaca_order_id text UNIQUE,
  symbol text NOT NULL,
  side text NOT NULL CHECK (side IN ('buy', 'sell')),
  order_type text NOT NULL DEFAULT 'limit' CHECK (order_type IN ('limit', 'market')),
  quantity numeric NOT NULL CHECK (quantity > 0),
  limit_price numeric CHECK (limit_price >= 0),
  grid_level integer NOT NULL,
  grid_price numeric NOT NULL CHECK (grid_price > 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partially_filled', 'filled', 'cancelled', 'rejected')),
  filled_qty numeric DEFAULT 0 CHECK (filled_qty >= 0),
  filled_avg_price numeric DEFAULT 0 CHECK (filled_avg_price >= 0),
  time_in_force text DEFAULT 'gtc',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  filled_at timestamptz
);

-- Enable Row Level Security
ALTER TABLE grid_orders ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own grid orders
CREATE POLICY "Users can view own grid orders"
  ON grid_orders
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own grid orders
CREATE POLICY "Users can insert own grid orders"
  ON grid_orders
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own grid orders
CREATE POLICY "Users can update own grid orders"
  ON grid_orders
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own grid orders
CREATE POLICY "Users can delete own grid orders"
  ON grid_orders
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_grid_orders_strategy_id ON grid_orders(strategy_id);
CREATE INDEX IF NOT EXISTS idx_grid_orders_alpaca_order_id ON grid_orders(alpaca_order_id);
CREATE INDEX IF NOT EXISTS idx_grid_orders_status ON grid_orders(status);
CREATE INDEX IF NOT EXISTS idx_grid_orders_strategy_status ON grid_orders(strategy_id, status);
CREATE INDEX IF NOT EXISTS idx_grid_orders_user_id ON grid_orders(user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_grid_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_grid_orders_timestamp
  BEFORE UPDATE ON grid_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_grid_orders_updated_at();

-- Add comment to table
COMMENT ON TABLE grid_orders IS 'Tracks all grid trading orders across strategies for event-based execution';
