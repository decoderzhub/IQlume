/*
  # Create trading strategies table

  1. New Tables
    - `trading_strategies`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `name` (text, strategy name)
      - `type` (text, strategy type enum)
      - `description` (text, strategy description)
      - `risk_level` (text, risk level enum)
      - `min_capital` (numeric, minimum capital required)
      - `is_active` (boolean, whether strategy is active)
      - `configuration` (jsonb, strategy configuration)
      - `performance` (jsonb, performance metrics)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `trading_strategies` table
    - Add policies for users to manage their own strategies
*/

-- Create enum types for strategy types and risk levels
CREATE TYPE strategy_type AS ENUM (
  'covered_calls',
  'straddle', 
  'iron_condor',
  'wheel',
  'spot_grid',
  'futures_grid',
  'infinity_grid',
  'smart_rebalance',
  'dca',
  'orb'
);

CREATE TYPE risk_level AS ENUM ('low', 'medium', 'high');

-- Create trading strategies table
CREATE TABLE IF NOT EXISTS trading_strategies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  type strategy_type NOT NULL,
  description text DEFAULT '',
  risk_level risk_level NOT NULL DEFAULT 'medium',
  min_capital numeric NOT NULL DEFAULT 1000,
  is_active boolean NOT NULL DEFAULT false,
  configuration jsonb NOT NULL DEFAULT '{}',
  performance jsonb DEFAULT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE trading_strategies ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own strategies"
  ON trading_strategies
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own strategies"
  ON trading_strategies
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own strategies"
  ON trading_strategies
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own strategies"
  ON trading_strategies
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_trading_strategies_user_id ON trading_strategies(user_id);
CREATE INDEX idx_trading_strategies_type ON trading_strategies(type);
CREATE INDEX idx_trading_strategies_is_active ON trading_strategies(is_active);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_trading_strategies_updated_at
  BEFORE UPDATE ON trading_strategies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();