
-- 1. Drop the constraint that forces main=no parent, sub=has parent
--    so we can reparent agencies freely.
ALTER TABLE crm_agencies DROP CONSTRAINT IF EXISTS crm_agencies_parent_type_check;

-- 2. Reparent MHA (YFMO), Test, Texas Medical Care Plans under FYM
UPDATE crm_agencies
SET agency_type = 'sub',
    parent_agency_id = (SELECT id FROM crm_agencies WHERE name = 'FYM')
WHERE name IN ('MHA (YFMO)', 'Test', 'Texas Medical Care Plans')
  AND agency_type = 'main';

-- 3. Re-add a looser constraint: main must have no parent, sub must have a parent
ALTER TABLE crm_agencies ADD CONSTRAINT crm_agencies_parent_type_check
  CHECK (
    (agency_type = 'main' AND parent_agency_id IS NULL) OR
    (agency_type = 'sub' AND parent_agency_id IS NOT NULL)
  );

-- 4. Update the self-referencing FK to CASCADE on delete
--    so deleting a parent removes all descendants automatically.
ALTER TABLE crm_agencies DROP CONSTRAINT IF EXISTS crm_agencies_parent_agency_fk;
ALTER TABLE crm_agencies
  ADD CONSTRAINT crm_agencies_parent_agency_fk
  FOREIGN KEY (parent_agency_id) REFERENCES crm_agencies(id) ON DELETE CASCADE;
