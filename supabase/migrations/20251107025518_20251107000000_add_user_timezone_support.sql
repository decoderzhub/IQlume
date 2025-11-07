/*
  # Add User Timezone Support

  1. Changes to user_profiles table
    - Add `timezone` field to store user's preferred timezone (defaults to 'America/New_York' for EST)
    - This is critical for trading platform accuracy:
      * Market hours display (NYSE opens 9:30 AM EST)
      * Order timing and execution
      * Historical data interpretation
      * Chart time labels
      * Trade timestamps

  2. Security
    - Maintains existing RLS policies on user_profiles table

  3. Important Notes
    - Uses IANA timezone database format (e.g., 'America/New_York', 'America/Chicago', 'America/Los_Angeles')
    - Default is 'America/New_York' (EST/EDT) since US stock markets operate on Eastern Time
    - Users can change this in settings to match their local timezone
*/

-- Add timezone column to user_profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'timezone'
  ) THEN
    ALTER TABLE user_profiles
    ADD COLUMN timezone text NOT NULL DEFAULT 'America/New_York';

    -- Add check constraint to ensure valid timezone format
    ALTER TABLE user_profiles
    ADD CONSTRAINT valid_timezone CHECK (
      timezone ~ '^[A-Za-z]+/[A-Za-z_]+$'
    );
  END IF;
END $$;

-- Create index for faster timezone lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_timezone ON user_profiles(timezone);

-- Add helpful comment
COMMENT ON COLUMN user_profiles.timezone IS 'User timezone in IANA format (e.g., America/New_York). Critical for accurate market hours, order timing, and data display.';
