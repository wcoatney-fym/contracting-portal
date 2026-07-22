-- Auto-populate agency_clients when a new business intake is submitted.
-- No approval gate — intake submissions flow straight into the book of business
-- so Dashboard and BoB tabs light up immediately.

CREATE OR REPLACE FUNCTION fn_intake_to_agency_client()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO agency_clients (
    agency_id,
    first_name,
    last_name,
    client_name,
    phone,
    email,
    carrier,
    product_type,
    policy_number,
    premium_amount,
    effective_date,
    status,
    submit_date,
    ghl_assigned_to,
    is_cross_sell
  ) VALUES (
    NEW.agency_id,
    COALESCE(NEW.client_first_name, ''),
    COALESCE(NEW.client_last_name, ''),
    TRIM(COALESCE(NEW.client_first_name, '') || ' ' || COALESCE(NEW.client_last_name, '')),
    COALESCE(NEW.client_phone, ''),
    COALESCE(NEW.client_email, ''),
    COALESCE(NEW.carrier, ''),
    COALESCE(NEW.product_type, ''),
    COALESCE(NEW.policy_number, ''),
    COALESCE(NEW.premium_amount, 0),
    NEW.effective_date,
    'active',
    NOW(),
    TRIM(COALESCE(NEW.agent_first_name, '') || ' ' || COALESCE(NEW.agent_last_name, '')),
    false
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fire after every intake insert
DROP TRIGGER IF EXISTS trg_intake_to_agency_client ON crm_business_intake;
CREATE TRIGGER trg_intake_to_agency_client
  AFTER INSERT ON crm_business_intake
  FOR EACH ROW
  EXECUTE FUNCTION fn_intake_to_agency_client();
