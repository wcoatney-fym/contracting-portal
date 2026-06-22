/*
  # Add cross_sell_confirmed column to crm_agencies

  1. Modified Tables
    - `crm_agencies`
      - Added `cross_sell_confirmed` (boolean, default false) - persists whether cross-sell products have been confirmed during onboarding

  2. Important Notes
    - This allows the onboarding flow to remember cross-sell confirmation state across page reloads
    - Without this, confirming cross-sell was ephemeral and lost on refresh, blocking the roster upload step
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_agencies' AND column_name = 'cross_sell_confirmed'
  ) THEN
    ALTER TABLE crm_agencies ADD COLUMN cross_sell_confirmed boolean DEFAULT false;
  END IF;
END $$;
