/*
  # Create brokerage_accounts table

  1. New Tables
    - `brokerage_accounts`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `brokerage` (text, e.g., 'alpaca', 'schwab', 'coinbase')
      - `account_name` (text, user-friendly name)
      - `account_type` (text, e.g., 'stocks', 'crypto', 'ira', 'forex')
      - `balance` (numeric, account balance)
      - `is_connected` (boolean, connection status)
      - `last_sync` (timestamp, last synchronization time)
      - `oauth_token` (text, OAuth access token)
      - `account_number` (text, brokerage account number)
      - `routing_number` (text, routing number if applicable)
      - `access_token` (text, API access token)
      - `refresh_token` (text, OAuth refresh token)
      - `expires_at` (timestamp, token expiration)
      - `oauth_data` (jsonb, additional OAuth metadata)

  2. Security
    - Enable RLS on `brokerage_accounts` table
    - Add policies for authenticated users to manage their own accounts
    - Foreign key constraint to auth.users with CASCADE delete

  3. Indexes
    - Primary key index on id
    - Index on user_id for efficient queries
*/

-- Create brokerage_accounts table
CREATE TABLE IF NOT EXISTS public.brokerage_accounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    brokerage text NOT NULL,
    account_name text NOT NULL,
    account_type text NOT NULL,
    balance numeric NOT NULL DEFAULT 0,
    is_connected boolean NOT NULL DEFAULT false,
    last_sync timestamp with time zone,
    oauth_token text,
    account_number text,
    routing_number text,
    access_token text,
    refresh_token text,
    expires_at timestamp with time zone,
    oauth_data jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT brokerage_accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_brokerage_accounts_user_id ON public.brokerage_accounts USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_brokerage_accounts_brokerage ON public.brokerage_accounts USING btree (brokerage);
CREATE INDEX IF NOT EXISTS idx_brokerage_accounts_is_connected ON public.brokerage_accounts USING btree (is_connected);

-- Enable Row Level Security
ALTER TABLE public.brokerage_accounts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for secure access
CREATE POLICY "Users can create their own brokerage accounts"
  ON public.brokerage_accounts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own brokerage accounts"
  ON public.brokerage_accounts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own brokerage accounts"
  ON public.brokerage_accounts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own brokerage accounts"
  ON public.brokerage_accounts
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'update_brokerage_accounts_updated_at'
    ) THEN
        CREATE TRIGGER update_brokerage_accounts_updated_at
            BEFORE UPDATE ON public.brokerage_accounts
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;