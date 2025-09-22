/*
  # Create trades table for historical trade storage

  1. New Tables
    - `trades`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `strategy_id` (uuid, foreign key to trading_strategies, nullable)
      - `alpaca_order_id` (text, unique, nullable)
      - `symbol` (text, not null)
      - `type` (text, not null - 'buy' or 'sell')
      - `quantity` (numeric, not null)
      - `price` (numeric, not null)
      - `profit_loss` (numeric, default 0)
      - `status` (text, not null - 'pending', 'executed', 'failed', 'canceled')
      - `order_type` (text, not null - 'market', 'limit')
      - `time_in_force` (text, not null - 'day', 'gtc')
      - `created_at` (timestamp with time zone, default now())
      - `updated_at` (timestamp with time zone, default now())

  2. Security
    - Enable RLS on `trades` table
    - Add policies for authenticated users to manage their own trades

  3. Indexes
    - Index on user_id for fast user-specific queries
    - Index on strategy_id for strategy performance analysis
    - Index on created_at for time-based queries
    - Index on symbol for symbol-based filtering
    - Index on status for status filtering

  4. Triggers
    - Add trigger to update updated_at column on row updates
*/

-- Create trades table
CREATE TABLE IF NOT EXISTS public.trades (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    strategy_id uuid REFERENCES public.trading_strategies(id) ON DELETE SET NULL,
    alpaca_order_id text UNIQUE,
    symbol text NOT NULL,
    type text NOT NULL CHECK (type IN ('buy', 'sell')),
    quantity numeric NOT NULL CHECK (quantity > 0),
    price numeric NOT NULL CHECK (price > 0),
    profit_loss numeric DEFAULT 0,
    status text NOT NULL CHECK (status IN ('pending', 'executed', 'failed', 'canceled')),
    order_type text NOT NULL CHECK (order_type IN ('market', 'limit', 'stop', 'stop_limit')),
    time_in_force text NOT NULL CHECK (time_in_force IN ('day', 'gtc', 'ioc', 'fok')),
    filled_qty numeric DEFAULT 0,
    filled_avg_price numeric DEFAULT 0,
    commission numeric DEFAULT 0,
    fees numeric DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own trades"
    ON public.trades
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own trades"
    ON public.trades
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trades"
    ON public.trades
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trades"
    ON public.trades
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_trades_user_id ON public.trades (user_id);
CREATE INDEX IF NOT EXISTS idx_trades_strategy_id ON public.trades (strategy_id);
CREATE INDEX IF NOT EXISTS idx_trades_created_at ON public.trades (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trades_symbol ON public.trades (symbol);
CREATE INDEX IF NOT EXISTS idx_trades_status ON public.trades (status);
CREATE INDEX IF NOT EXISTS idx_trades_type ON public.trades (type);
CREATE INDEX IF NOT EXISTS idx_trades_alpaca_order_id ON public.trades (alpaca_order_id);

-- Create trigger to update updated_at column
CREATE TRIGGER update_trades_updated_at
    BEFORE UPDATE ON public.trades
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();