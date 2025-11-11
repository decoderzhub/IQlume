/*
  # Add is_admin flag to user_profiles
  
  1. Changes
    - Add `is_admin` boolean column to `user_profiles` table with default false
    - Allows marking specific users as administrators for admin dashboard access
  
  2. Security
    - Column defaults to false for security
    - Only admins can access admin endpoints
*/

-- Add is_admin column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN is_admin boolean DEFAULT false NOT NULL;
  END IF;
END $$;
