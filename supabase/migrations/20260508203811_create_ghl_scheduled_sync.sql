/*
  # Scheduled GHL Auto-Sync (9am, 12pm, 6pm Eastern)

  1. New Objects
    - `cron_trigger_ghl_sync(target_hour int)` - DST-aware wrapper that only executes
      when current Eastern time matches the target hour
    - `cron_sync_next_ghl_agency()` - processes one agency at a time with 60s stagger

  2. New Tables
    - `ghl_sync_queue` - temporary queue for staggered processing
    - `ghl_sync_log` - audit log of scheduled sync executions

  3. Cron Jobs (6 total for DST coverage)
    - 9am Eastern: 13:00 UTC (EDT) and 14:00 UTC (EST)
    - 12pm Eastern: 16:00 UTC (EDT) and 17:00 UTC (EST)
    - 6pm Eastern: 22:00 UTC (EDT) and 23:00 UTC (EST)

  4. Security
    - RLS enabled on ghl_sync_log with authenticated-only read policy
    - Edge function auth uses anon key (function creates its own service role client internally)

  5. Notes
    - Syncs ALL connected agencies automatically (future agencies included)
    - 60-second delay between each agency to avoid GHL rate limits
    - DST handled by dual-scheduling with Eastern time guard check
*/

-- Create sync queue table for staggered processing
CREATE TABLE IF NOT EXISTS ghl_sync_queue (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  agency_id uuid NOT NULL,
  queued_at timestamptz DEFAULT now()
);

-- Create sync log for auditing
CREATE TABLE IF NOT EXISTS ghl_sync_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  agency_id uuid,
  triggered_at timestamptz DEFAULT now(),
  trigger_type text DEFAULT 'scheduled',
  status text DEFAULT 'pending',
  error text
);

ALTER TABLE ghl_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view sync logs"
  ON ghl_sync_log FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Function: Check if current Eastern time matches target hour, then queue all connected agencies
CREATE OR REPLACE FUNCTION cron_trigger_ghl_sync(target_hour int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $fn$
DECLARE
  eastern_hour int;
BEGIN
  eastern_hour := EXTRACT(HOUR FROM now() AT TIME ZONE 'America/New_York');

  IF eastern_hour != target_hour THEN
    RETURN;
  END IF;

  DELETE FROM ghl_sync_queue;

  INSERT INTO ghl_sync_queue (agency_id)
  SELECT agency_id
  FROM agency_ghl_configs
  WHERE connection_status = 'connected'
    AND ghl_api_key IS NOT NULL
    AND ghl_location_id IS NOT NULL
  ORDER BY agency_id;

  PERFORM cron_sync_next_ghl_agency();
END;
$fn$;

-- Function: Process one agency from queue, schedule next one via pg_cron
CREATE OR REPLACE FUNCTION cron_sync_next_ghl_agency()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $fn$
DECLARE
  next_agency uuid;
  queue_count int;
  base_url text := 'https://akhojhncsswyzcnicedt.supabase.co';
  anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFraG9qaG5jc3N3eXpjbmljZWR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MjM1MTYsImV4cCI6MjA4MzQ5OTUxNn0.RtCoshv7k0QDgg37LD_fV7XFwiS_ShWs3YTyrXvq74Y';
BEGIN
  SELECT agency_id INTO next_agency
  FROM ghl_sync_queue
  ORDER BY id
  LIMIT 1;

  IF next_agency IS NULL THEN
    PERFORM cron.unschedule('ghl-sync-next-agency');
    RETURN;
  END IF;

  DELETE FROM ghl_sync_queue WHERE agency_id = next_agency;

  PERFORM net.http_post(
    url := base_url || '/functions/v1/sync-ghl-data',
    body := json_build_object('agency_id', next_agency)::jsonb,
    headers := json_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || anon_key,
      'apikey', anon_key
    )::jsonb
  );

  INSERT INTO ghl_sync_log (agency_id, trigger_type, status)
  VALUES (next_agency, 'scheduled', 'dispatched');

  SELECT count(*) INTO queue_count FROM ghl_sync_queue;

  IF queue_count > 0 THEN
    PERFORM cron.schedule(
      'ghl-sync-next-agency',
      '* * * * *',
      'SELECT cron_sync_next_ghl_agency()'
    );
  ELSE
    PERFORM cron.unschedule('ghl-sync-next-agency');
  END IF;
END;
$fn$;

-- Schedule cron jobs: dual UTC times for DST coverage
-- 9am Eastern = 13:00 UTC (EDT/summer) or 14:00 UTC (EST/winter)
SELECT cron.schedule('ghl-sync-9am-edt', '0 13 * * *', 'SELECT cron_trigger_ghl_sync(9)');
SELECT cron.schedule('ghl-sync-9am-est', '0 14 * * *', 'SELECT cron_trigger_ghl_sync(9)');

-- 12pm Eastern = 16:00 UTC (EDT/summer) or 17:00 UTC (EST/winter)
SELECT cron.schedule('ghl-sync-12pm-edt', '0 16 * * *', 'SELECT cron_trigger_ghl_sync(12)');
SELECT cron.schedule('ghl-sync-12pm-est', '0 17 * * *', 'SELECT cron_trigger_ghl_sync(12)');

-- 6pm Eastern = 22:00 UTC (EDT/summer) or 23:00 UTC (EST/winter)
SELECT cron.schedule('ghl-sync-6pm-edt', '0 22 * * *', 'SELECT cron_trigger_ghl_sync(18)');
SELECT cron.schedule('ghl-sync-6pm-est', '0 23 * * *', 'SELECT cron_trigger_ghl_sync(18)');