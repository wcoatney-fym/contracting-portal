/*
  # Seed Specialist Titles in Cross-Sell Defaults

  1. Modified Tables
    - `cross_sell_defaults`
      - Sets `field_value` for `specialist_title` field across all 5 products

  2. Changes
    - Product 1 (Final Expense Life Insurance): "Final Expense Specialist"
    - Product 2 (Hospital Indemnity): "Hospital Indemnity Specialist"
    - Product 3 (Cancer/Stroke Coverage): "Cancer & Stroke Specialist"
    - Product 4 (LTC/STC): "Long-Term Care Specialist"
    - Product 5 (SmartSaveMeds): "Prescription Savings Specialist"

  3. Notes
    - These titles are used as the default specialist title for each cross-sell product
    - They are always enforced (not user-editable) and will be synced on every load
*/

UPDATE cross_sell_defaults
SET field_value = 'Final Expense Specialist'
WHERE product_number = 1 AND field_key = 'specialist_title';

UPDATE cross_sell_defaults
SET field_value = 'Hospital Indemnity Specialist'
WHERE product_number = 2 AND field_key = 'specialist_title';

UPDATE cross_sell_defaults
SET field_value = 'Cancer & Stroke Specialist'
WHERE product_number = 3 AND field_key = 'specialist_title';

UPDATE cross_sell_defaults
SET field_value = 'Long-Term Care Specialist'
WHERE product_number = 4 AND field_key = 'specialist_title';

UPDATE cross_sell_defaults
SET field_value = 'Prescription Savings Specialist'
WHERE product_number = 5 AND field_key = 'specialist_title';
