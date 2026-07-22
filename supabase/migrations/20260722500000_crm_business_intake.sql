-- Business intake form submissions (per-agency, single table)
-- Agents submit new business through /{agency-slug}/intake-form
-- Validated against the agency's CRM roster before submission

create table if not exists crm_business_intake (
  id uuid default gen_random_uuid() primary key,
  agency_id uuid not null references hierarchy_agencies(id),
  agency_name text not null,

  -- Agent info (from roster validation)
  agent_first_name text not null,
  agent_last_name text not null,
  agent_npn text not null,
  roster_row_id uuid references crm_roster(id),

  -- Client / policyholder info
  client_first_name text not null,
  client_last_name text not null,
  client_phone text,
  client_email text,
  client_state text,

  -- Policy details
  carrier text not null,
  product_type text not null,
  policy_number text,
  premium_amount numeric(10,2),
  effective_date date,
  billing_mode text,

  -- Submission metadata
  notes text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  reviewed_by text,
  reviewed_at timestamptz,
  review_note text,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index for per-agency queries (portal dashboard, book of business)
create index if not exists idx_crm_business_intake_agency on crm_business_intake(agency_id);
create index if not exists idx_crm_business_intake_agent_npn on crm_business_intake(agent_npn);
create index if not exists idx_crm_business_intake_status on crm_business_intake(status);

-- RLS: anon can insert (public form), read own agency's data when authenticated via portal
alter table crm_business_intake enable row level security;

-- Allow public inserts (the form is ungated)
create policy "Allow public insert" on crm_business_intake
  for insert to anon with check (true);

-- Allow reads for authenticated + anon (portal reads via anon key, filtered by agency in app code)
create policy "Allow read" on crm_business_intake
  for select to anon using (true);

-- Allow updates (for review/status changes from CRM ops)
create policy "Allow update" on crm_business_intake
  for update to anon using (true) with check (true);
