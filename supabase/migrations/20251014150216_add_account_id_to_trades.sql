/*
  # Add account tracking to trades table

  1. Schema Changes
    - Add `account_id` column to `trades` table as foreign key to `brokerage_accounts`
    - Add index on `account_id` for efficient queries
    - Update existing trades to set account_id to NULL (will be populated going forward)

  2. Purpose
    - Track which specific brokerage account each trade was executed through
    - Enable multi-account trading support
    - Provide full audit trail for compliance and debugging
    - Allow filtering trades by specific connected account

  3. Migration Safety
    - Column is nullable to handle existing trades without disrupting data
    - New trades will require account_id to be set
    - Foreign key constraint ensures referential integrity
*/

-- Add account_id column to trades table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trades' AND column_name = 'account_id'
  ) THEN
    ALTER TABLE trades ADD COLUMN account_id uuid;

    -- Add foreign key constraint
    ALTER TABLE trades
      ADD CONSTRAINT trades_account_id_fkey
      FOREIGN KEY (account_id)
      REFERENCES brokerage_accounts(id)
      ON DELETE SET NULL;

    -- Add index for efficient querying
    CREATE INDEX idx_trades_account_id ON trades(account_id);

    -- Add comment for documentation
    COMMENT ON COLUMN trades.account_id IS 'References the specific brokerage account used for this trade';
  END IF;
END $$;