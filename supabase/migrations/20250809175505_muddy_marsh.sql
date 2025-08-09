/*
  # Fix Strategy Deletion RLS Policy

  1. Security Updates
    - Update DELETE policy for trading_strategies table
    - Ensure users can delete their own strategies using auth.uid()
    - Fix any RLS policy issues preventing strategy deletion

  2. Changes
    - Drop existing DELETE policy if it exists
    - Create new DELETE policy with correct auth.uid() reference
*/

-- Drop existing DELETE policy if it exists
DROP POLICY IF EXISTS "Users can delete their own strategies" ON trading_strategies;

-- Create new DELETE policy with correct auth function
CREATE POLICY "Users can delete their own strategies"
  ON trading_strategies
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Ensure RLS is enabled
ALTER TABLE trading_strategies ENABLE ROW LEVEL SECURITY;