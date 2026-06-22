/*
  # Grant table-level permissions for cancellation tables

  1. Problem
    - The `agency_cancellation_uploads` and `agency_cancellations` tables had RLS policies
      for the anon role but were missing the underlying GRANT statements
    - This caused all portal uploads to fail silently

  2. Changes
    - Grant SELECT, INSERT on `agency_cancellation_uploads` to anon (portal read + upload)
    - Grant SELECT, INSERT, UPDATE, DELETE on `agency_cancellation_uploads` to authenticated (CRM admin)
    - Grant SELECT, INSERT on `agency_cancellations` to anon (portal row inserts)
    - Grant SELECT, INSERT, UPDATE, DELETE on `agency_cancellations` to authenticated (CRM admin)
*/

GRANT SELECT, INSERT ON agency_cancellation_uploads TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON agency_cancellation_uploads TO authenticated;

GRANT SELECT, INSERT ON agency_cancellations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON agency_cancellations TO authenticated;

-- Force PostgREST to reload its schema cache so new grants take effect immediately
NOTIFY pgrst, 'reload schema';
