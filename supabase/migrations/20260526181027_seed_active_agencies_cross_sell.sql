/*
  # Seed Cross-Sell Products for Active Agencies

  1. Purpose
    - Initialize all 5 cross-sell products for each active agency
    - Default the specialist fields to the agency's assigned CSR

  2. What this does
    - For each active agency that does NOT already have cross-sell rows,
      inserts 5 product rows using defaults from cross_sell_defaults
    - Sets specialist_full_name, specialist_mobile, specialist_email
      from the agency's csr_first_name, csr_last_name, csr_phone, csr_email

  3. Notes
    - Only runs for agencies without existing crm_agency_cross_sell records
    - Uses ON CONFLICT to safely skip duplicates
*/

INSERT INTO crm_agency_cross_sell (agency_id, product_number, product_name, fields)
SELECT
  a.id AS agency_id,
  p.product_number,
  p.product_name,
  jsonb_object_agg(p.field_key, p.field_value) ||
    jsonb_build_object(
      'specialist_full_name', COALESCE(NULLIF(TRIM(COALESCE(a.csr_first_name, '') || ' ' || COALESCE(a.csr_last_name, '')), ''), ''),
      'specialist_mobile', COALESCE(a.csr_phone, ''),
      'specialist_email', COALESCE(a.csr_email, '')
    ) AS fields
FROM crm_agencies a
CROSS JOIN LATERAL (
  SELECT DISTINCT product_number, product_name
  FROM cross_sell_defaults
) AS products(product_number, product_name)
JOIN cross_sell_defaults p ON p.product_number = products.product_number AND p.product_name = products.product_name
WHERE a.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM crm_agency_cross_sell cs
    WHERE cs.agency_id = a.id
  )
GROUP BY a.id, p.product_number, p.product_name, a.csr_first_name, a.csr_last_name, a.csr_phone, a.csr_email
ON CONFLICT (agency_id, product_number) DO NOTHING;