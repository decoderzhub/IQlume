/*
  # Enable Realtime for Admin Dashboard Tables

  1. Changes
    - Enable realtime replication for `system_logs` table
    - Enable realtime replication for `user_activity_logs` table
    - Enable realtime replication for `endpoint_health` table
    - Set REPLICA IDENTITY to FULL for real-time updates
    - Add tables to realtime publication

  2. Notes
    - This allows WebSocket subscriptions to receive INSERT/UPDATE/DELETE events
    - Frontend can now receive real-time updates without HTTP polling
    - REPLICA IDENTITY FULL is required for realtime to work with RLS
*/

-- Enable replica identity for realtime
ALTER TABLE system_logs REPLICA IDENTITY FULL;
ALTER TABLE user_activity_logs REPLICA IDENTITY FULL;
ALTER TABLE endpoint_health REPLICA IDENTITY FULL;

-- Add tables to realtime publication (Supabase automatically manages this publication)
-- The supabase_realtime publication must include these tables
ALTER PUBLICATION supabase_realtime ADD TABLE system_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE user_activity_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE endpoint_health;
