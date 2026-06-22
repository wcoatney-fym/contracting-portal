/*
  # Fix GHL sync stuck state and add safety valve

  1. Changes
    - Updates `cron_trigger_ghl_sync` to auto-reset agencies stuck in 
      `sync_in_progress = true` for more than 30 minutes before queuing
    - This prevents permanently stuck states from blocking future syncs
    - If the edge function times out or crashes mid-sync, the next scheduled
      run will auto-clear the stuck flag and re-trigger a fresh sync

  2. Notes
    - The edge function now handles the full sync internally (loops until done)
      so the stagger between agencies in the cron is the only scheduling needed
    - No data is lost on reset -- existing agency_clients rows remain intact
    - The next sync will simply start fresh from the beginning
*/

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

  -- Safety valve: reset any agencies stuck in sync_in_progress for > 30 minutes
  UPDATE agency_ghl_configs
  SET sync_in_progress = false,
      sync_cursor = null,
      sync_fetched_so_far = 0,
      sync_total_expected = 0
  WHERE sync_in_progress = true
    AND updated_at < now() - interval '30 minutes';

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
