/*
  # Create brokerage_accounts table for OAuth integration

  1. New Tables
    - `brokerage_accounts`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `brokerage_name` (text, e.g., 'alpaca')
      - `account_name` (text, user-friendly name)
      - `account_type` (text, e.g., 'stocks', 'crypto')
      - `alpaca_account_id` (text, Alpaca's account ID)
      - `access_token` (text, OAuth access token)
      - `refresh_token` (text, OAuth refresh token)
      - `expires_at` (timestamp, token expiration)
      - `balance` (numeric, account balance)
      - `is_connected` (boolean, connection status)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `brokerage_accounts` table
    - Add policies for authenticated users to manage their own accounts

  3. Indexes
    - Index on user_id for efficient queries
    - Index on brokerage_name for filtering
*/

CREATE TABLE IF NOT EXISTS brokerage_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  brokerage_name text NOT NULL,
  account_name text NOT NULL,
  account_type text NOT NULL DEFAULT 'stocks',
  alpaca_account_id text,
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  balance numeric DEFAULT 0,
  is_connected boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE brokerage_accounts ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own brokerage accounts"
  ON brokerage_accounts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own brokerage accounts"
  ON brokerage_accounts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own brokerage accounts"
  ON brokerage_accounts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own brokerage accounts"
  ON brokerage_accounts
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_brokerage_accounts_user_id 
  ON brokerage_accounts(user_id);

CREATE INDEX IF NOT EXISTS idx_brokerage_accounts_brokerage_name 
  ON brokerage_accounts(brokerage_name);

CREATE INDEX IF NOT EXISTS idx_brokerage_accounts_is_connected 
  ON brokerage_accounts(is_connected);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_brokerage_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_brokerage_accounts_updated_at
  BEFORE UPDATE ON brokerage_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_brokerage_accounts_updated_at();