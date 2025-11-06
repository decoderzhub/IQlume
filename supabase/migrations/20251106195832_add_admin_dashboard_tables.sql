/*
  # Admin Dashboard Infrastructure

  ## Overview
  Creates tables and functions to support admin dashboard functionality including:
  - User activity logging (login/logout tracking)
  - System logs for monitoring
  - Endpoint health checks
  - Admin user management

  ## New Tables

  ### `user_activity_logs`
  Tracks user authentication and activity events
  - `id` (uuid, primary key)
  - `user_id` (uuid, references auth.users)
  - `user_email` (text, denormalized for quick access)
  - `activity_type` (text, e.g., 'login', 'logout', 'action')
  - `ip_address` (text, user's IP)
  - `user_agent` (text, browser/device info)
  - `metadata` (jsonb, additional context)
  - `created_at` (timestamptz)

  ### `system_logs`
  Stores system-level events and health checks
  - `id` (uuid, primary key)
  - `log_level` (text, INFO, WARNING, ERROR)
  - `source` (text, which system component)
  - `message` (text, log message)
  - `details` (jsonb, structured log data)
  - `user_id` (uuid, nullable, references auth.users)
  - `created_at` (timestamptz)

  ### `endpoint_health`
  Tracks health status of system endpoints
  - `id` (uuid, primary key)
  - `endpoint_name` (text, human-readable name)
  - `endpoint_url` (text, actual URL)
  - `status` (text, 'healthy', 'degraded', 'down')
  - `response_time_ms` (integer, latency)
  - `http_status` (integer, HTTP status code)
  - `last_checked_at` (timestamptz)
  - `last_error` (text, nullable)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## Security
  - Enable RLS on all tables
  - Only admin users (darin.j.manley@gmail.com, brycemurad0@gmail.com) can access
  - Function to check if user is admin
  - Policies enforce admin-only access
*/

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_email text)
RETURNS boolean AS $$
BEGIN
  RETURN user_email IN ('darin.j.manley@gmail.com', 'brycemurad0@gmail.com');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current user email
CREATE OR REPLACE FUNCTION current_user_email()
RETURNS text AS $$
BEGIN
  RETURN (SELECT email FROM auth.users WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- User Activity Logs Table
CREATE TABLE IF NOT EXISTS user_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email text NOT NULL,
  activity_type text NOT NULL CHECK (activity_type IN ('login', 'logout', 'strategy_created', 'strategy_activated', 'trade_executed', 'account_connected')),
  ip_address text,
  user_agent text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- System Logs Table
CREATE TABLE IF NOT EXISTS system_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  log_level text NOT NULL CHECK (log_level IN ('INFO', 'WARNING', 'ERROR', 'CRITICAL')),
  source text NOT NULL,
  message text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Endpoint Health Table
CREATE TABLE IF NOT EXISTS endpoint_health (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_name text NOT NULL UNIQUE,
  endpoint_url text NOT NULL,
  status text NOT NULL CHECK (status IN ('healthy', 'degraded', 'down')) DEFAULT 'down',
  response_time_ms integer,
  http_status integer,
  last_checked_at timestamptz,
  last_error text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id ON user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_created_at ON user_activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_activity_type ON user_activity_logs(activity_type);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_log_level ON system_logs(log_level);
CREATE INDEX IF NOT EXISTS idx_endpoint_health_status ON endpoint_health(status);

-- Enable RLS
ALTER TABLE user_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE endpoint_health ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Admin only access

-- User Activity Logs - Admin read only
CREATE POLICY "Admins can read all user activity logs"
  ON user_activity_logs FOR SELECT
  TO authenticated
  USING (is_admin(current_user_email()));

CREATE POLICY "System can insert user activity logs"
  ON user_activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- System Logs - Admin read only
CREATE POLICY "Admins can read all system logs"
  ON system_logs FOR SELECT
  TO authenticated
  USING (is_admin(current_user_email()));

CREATE POLICY "System can insert system logs"
  ON system_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Endpoint Health - Admin access
CREATE POLICY "Admins can read endpoint health"
  ON endpoint_health FOR SELECT
  TO authenticated
  USING (is_admin(current_user_email()));

CREATE POLICY "Admins can update endpoint health"
  ON endpoint_health FOR UPDATE
  TO authenticated
  USING (is_admin(current_user_email()))
  WITH CHECK (is_admin(current_user_email()));

CREATE POLICY "Admins can insert endpoint health"
  ON endpoint_health FOR INSERT
  TO authenticated
  WITH CHECK (is_admin(current_user_email()));

-- Insert initial endpoint health records
INSERT INTO endpoint_health (endpoint_name, endpoint_url, status)
VALUES 
  ('Supabase Database', 'Database Connection', 'healthy'),
  ('Backend - Main', 'http://localhost:8000/health', 'healthy'),
  ('Backend - Strategies', 'http://localhost:8000/api/strategies/health', 'healthy'),
  ('Backend - Market Data', 'http://localhost:8000/api/market-data/health', 'healthy'),
  ('Backend - Trades', 'http://localhost:8000/api/trades/health', 'healthy')
ON CONFLICT (endpoint_name) DO NOTHING;

-- Function to log user activity (called from frontend/backend)
CREATE OR REPLACE FUNCTION log_user_activity(
  p_user_id uuid,
  p_activity_type text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void AS $$
DECLARE
  v_user_email text;
BEGIN
  SELECT email INTO v_user_email FROM auth.users WHERE id = p_user_id;
  
  INSERT INTO user_activity_logs (user_id, user_email, activity_type, metadata)
  VALUES (p_user_id, v_user_email, p_activity_type, p_metadata);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;