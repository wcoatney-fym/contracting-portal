/*
  # Add CSR can fill terminated agent seat column

  1. Changes
    - Add `csr_can_fill_seat` boolean column (default false) to `crm_agencies`

  2. Purpose
    - Tracks whether the agency's CSR is eligible to temporarily fill
      a terminated agent's seat. Only applicable when the CSR has an NPN.
*/

ALTER TABLE crm_agencies ADD COLUMN IF NOT EXISTS csr_can_fill_seat boolean DEFAULT false;
