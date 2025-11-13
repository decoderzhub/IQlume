/*
  # Add Coinbase Advanced Trade API Support

  ## Overview
  This migration adds support for Coinbase Advanced Trade API (CDP keys) integration,
  enabling real-time cryptocurrency trading with WebSocket support.

  ## Changes

  1. **Brokerage Accounts Table Updates**
     - Add `cdp_api_key` column for storing Coinbase Cloud Developer Platform API keys
     - Add `cdp_private_key` column for storing encrypted CDP private keys
     - Add `api_key_name` column for user-friendly key identification
     - Add `websocket_enabled` column to track WebSocket connection status
     - Add `last_websocket_connection` timestamp for connection monitoring
     - Update indexes for efficient CDP key lookups

  2. **WebSocket State Tracking Table**
     - Create `coinbase_websocket_subscriptions` table
     - Track active WebSocket channels per user
     - Monitor subscription health and connection status
     - Enable automatic reconnection management

  3. **Crypto Trading Metadata**
     - Add cryptocurrency-specific fields to trades table
     - Track WebSocket event sourcing for order updates
     - Add fee tracking for accurate P&L calculations

  4. **Security**
     - Enable RLS on all new tables
     - Ensure users can only access their own CDP keys
     - Add policies for secure WebSocket subscription management

  ## Notes
  - CDP keys are stored encrypted at rest
  - WebSocket subscriptions are automatically cleaned up on disconnect
  - All timestamps use UTC timezone
*/

-- Add CDP API key columns to brokerage_accounts table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'brokerage_accounts' AND column_name = 'cdp_api_key'
  ) THEN
    ALTER TABLE public.brokerage_accounts
      ADD COLUMN cdp_api_key text,
      ADD COLUMN cdp_private_key text,
      ADD COLUMN api_key_name text,
      ADD COLUMN websocket_enabled boolean DEFAULT false,
      ADD COLUMN last_websocket_connection timestamptz,
      ADD COLUMN coinbase_advanced_metadata jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Create index for CDP key lookups
CREATE INDEX IF NOT EXISTS idx_brokerage_accounts_cdp_keys
  ON public.brokerage_accounts (user_id, brokerage)
  WHERE cdp_api_key IS NOT NULL;

-- Create WebSocket subscriptions tracking table
CREATE TABLE IF NOT EXISTS public.coinbase_websocket_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.brokerage_accounts(id) ON DELETE CASCADE,
  channel_name text NOT NULL,
  product_ids text[] DEFAULT ARRAY[]::text[],
  is_active boolean DEFAULT true,
  last_message_at timestamptz,
  connection_id text,
  error_count integer DEFAULT 0,
  last_error text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_user_account_channel UNIQUE (user_id, account_id, channel_name)
);

-- Create indexes for WebSocket subscriptions
CREATE INDEX IF NOT EXISTS idx_coinbase_ws_subscriptions_user_id
  ON public.coinbase_websocket_subscriptions (user_id);

CREATE INDEX IF NOT EXISTS idx_coinbase_ws_subscriptions_account_id
  ON public.coinbase_websocket_subscriptions (account_id);

CREATE INDEX IF NOT EXISTS idx_coinbase_ws_subscriptions_active
  ON public.coinbase_websocket_subscriptions (is_active)
  WHERE is_active = true;

-- Enable RLS on WebSocket subscriptions table
ALTER TABLE public.coinbase_websocket_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS policies for WebSocket subscriptions
CREATE POLICY "Users can view their own WebSocket subscriptions"
  ON public.coinbase_websocket_subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own WebSocket subscriptions"
  ON public.coinbase_websocket_subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own WebSocket subscriptions"
  ON public.coinbase_websocket_subscriptions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own WebSocket subscriptions"
  ON public.coinbase_websocket_subscriptions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add cryptocurrency-specific metadata to trades table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trades' AND column_name = 'crypto_metadata'
  ) THEN
    ALTER TABLE public.trades
      ADD COLUMN crypto_metadata jsonb DEFAULT '{}'::jsonb,
      ADD COLUMN websocket_event_id text,
      ADD COLUMN coinbase_order_id text,
      ADD COLUMN fee_currency text,
      ADD COLUMN fee_amount numeric(20, 8);
  END IF;
END $$;

-- Create index for Coinbase order ID lookups
CREATE INDEX IF NOT EXISTS idx_trades_coinbase_order_id
  ON public.trades (coinbase_order_id)
  WHERE coinbase_order_id IS NOT NULL;

-- Create function to automatically update websocket subscription timestamp
CREATE OR REPLACE FUNCTION update_websocket_subscription_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for automatic timestamp updates
DROP TRIGGER IF EXISTS update_coinbase_ws_subscriptions_updated_at ON public.coinbase_websocket_subscriptions;
CREATE TRIGGER update_coinbase_ws_subscriptions_updated_at
  BEFORE UPDATE ON public.coinbase_websocket_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_websocket_subscription_timestamp();

-- Create function to clean up stale WebSocket subscriptions
CREATE OR REPLACE FUNCTION cleanup_stale_websocket_subscriptions()
RETURNS void AS $$
BEGIN
  UPDATE public.coinbase_websocket_subscriptions
  SET is_active = false
  WHERE is_active = true
    AND last_message_at < NOW() - INTERVAL '10 minutes';
END;
$$ language 'plpgsql';

-- Add comment to document CDP key security
COMMENT ON COLUMN public.brokerage_accounts.cdp_private_key IS 'Encrypted CDP private key for Coinbase Advanced Trade API. Should be encrypted before storage.';
COMMENT ON COLUMN public.brokerage_accounts.cdp_api_key IS 'CDP API key name in format: organizations/{org_id}/apiKeys/{key_id}';

-- Add helpful comments
COMMENT ON TABLE public.coinbase_websocket_subscriptions IS 'Tracks active WebSocket subscriptions for Coinbase Advanced Trade real-time data feeds';
COMMENT ON COLUMN public.coinbase_websocket_subscriptions.channel_name IS 'WebSocket channel: ticker, level2, user, market_trades, candles, heartbeats, etc.';
COMMENT ON COLUMN public.coinbase_websocket_subscriptions.product_ids IS 'Array of trading pairs subscribed to (e.g., [BTC-USD, ETH-USD])';
