/*
  # Enable pg_cron and pg_net extensions

  1. Extensions
    - `pg_cron` - Job scheduler for PostgreSQL, allows scheduling recurring tasks
    - `pg_net` - Async HTTP client for PostgreSQL, allows calling edge functions from SQL

  2. Notes
    - These extensions are required for the scheduled GHL auto-sync feature
    - pg_cron runs in the `cron` schema by default
    - pg_net provides `net.http_post()` for making HTTP requests to edge functions
*/

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;