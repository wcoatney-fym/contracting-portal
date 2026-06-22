/*
  # Add Agency Field to Agents Table

  1. Changes
    - Add `agency` column to `agents` table
      - Type: text
      - Constraint: Must be one of 'FYM', 'Wisechoice', or 'Aspire'
      - Default: 'FYM' for backward compatibility
      - Required field (NOT NULL)
  
  2. Purpose
    - Track which agency each agent belongs to
    - Support multi-agency operations
    - Enable agency-specific workflows and reporting
*/

-- Add agency column to agents table with constraint
ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS agency text NOT NULL DEFAULT 'FYM'
CHECK (agency IN ('FYM', 'Wisechoice', 'Aspire'));