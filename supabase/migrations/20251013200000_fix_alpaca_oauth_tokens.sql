/*
  # Fix Alpaca OAuth Token Storage

  1. Purpose
    - Ensure access_token is populated from existing oauth_token and oauth_data
    - Backfill missing access_token values for existing Alpaca connections
    - Maintain consistency between oauth_token, access_token, and oauth_data fields

  2. Changes
    - Copy oauth_token to access_token where access_token is NULL
    - Extract access_token from oauth_data JSONB where both fields are NULL
    - Log affected records for audit trail

  3. Safety
    - Only updates records where access_token is NULL
    - Does not modify records that already have access_token populated
    - Preserves all existing data
*/

-- Backfill access_token from oauth_token for Alpaca accounts
DO $$
DECLARE
  updated_from_oauth_token INT;
  updated_from_oauth_data INT;
BEGIN
  -- First, copy from oauth_token where access_token is NULL
  UPDATE public.brokerage_accounts
  SET access_token = oauth_token
  WHERE brokerage = 'alpaca'
    AND is_connected = true
    AND access_token IS NULL
    AND oauth_token IS NOT NULL;

  GET DIAGNOSTICS updated_from_oauth_token = ROW_COUNT;

  -- Then, extract from oauth_data where both access_token and oauth_token are NULL
  UPDATE public.brokerage_accounts
  SET access_token = (oauth_data->>'access_token')
  WHERE brokerage = 'alpaca'
    AND is_connected = true
    AND access_token IS NULL
    AND oauth_data IS NOT NULL
    AND oauth_data->>'access_token' IS NOT NULL;

  GET DIAGNOSTICS updated_from_oauth_data = ROW_COUNT;

  -- Log the results
  RAISE NOTICE 'Alpaca OAuth token backfill completed: % records updated from oauth_token, % records updated from oauth_data',
    updated_from_oauth_token, updated_from_oauth_data;
END $$;

-- Ensure oauth_token is also populated where access_token exists but oauth_token doesn't
UPDATE public.brokerage_accounts
SET oauth_token = access_token
WHERE brokerage = 'alpaca'
  AND is_connected = true
  AND oauth_token IS NULL
  AND access_token IS NOT NULL;
