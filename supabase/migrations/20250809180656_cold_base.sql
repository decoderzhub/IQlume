/*
  # Fix Strategy Deletion RLS Policy

  1. Security Updates
    - Fix DELETE policy to use correct auth.uid() function
    - Ensure users can only delete their own strategies
    - Maintain data integrity and security
*/

-- Drop the existing incorrect DELETE policy
DROP POLICY IF EXISTS "Users can delete their own strategies" ON trading_strategies;

-- Create the corrected DELETE policy using auth.uid()
CREATE POLICY "Users can delete their own strategies"
  ON trading_strategies
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);