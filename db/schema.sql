-- Core tables for CRM
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  business_number TEXT,
  industry TEXT,
  company_type TEXT,
  employee_count INTEGER,
  revenue_scale TEXT,
  energy_grade TEXT,
  city TEXT,
  country TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  owner TEXT,
  lead_source TEXT,
  tags TEXT[],
  score INTEGER,
  rep_name TEXT,
  rep_position TEXT,
  rep_phone TEXT,
  email TEXT,
  status TEXT NOT NULL,
  last_contact DATE,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  title TEXT,
  department TEXT,
  email TEXT,
  phone TEXT,
  role TEXT,
  last_interaction DATE,
  type TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS deals (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id),
  name TEXT NOT NULL,
  stage TEXT NOT NULL,
  amount BIGINT DEFAULT 0,
  expected_close_date DATE,
  status TEXT,
  owner TEXT,
  last_updated TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id),
  deal_id UUID REFERENCES deals(id),
  type TEXT NOT NULL,
  summary TEXT NOT NULL,
  actor TEXT,
  occurred_at TIMESTAMPTZ NOT NULL,
  next_step TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS field_tracking_policies (
  id UUID PRIMARY KEY,
  entity_type TEXT NOT NULL,
  field_name TEXT NOT NULL,
  is_tracked BOOLEAN DEFAULT TRUE,
  retention_days INTEGER DEFAULT 365,
  max_length SMALLINT DEFAULT 255,
  exclude_long_text BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (entity_type, field_name)
);

CREATE TABLE IF NOT EXISTS change_logs (
  id UUID PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  field_name TEXT NOT NULL,
  old_value VARCHAR(255),
  new_value VARCHAR(255),
  old_value_length INTEGER,
  new_value_length INTEGER,
  old_value_truncated BOOLEAN DEFAULT FALSE,
  new_value_truncated BOOLEAN DEFAULT FALSE,
  changed_by TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  change_type TEXT,
  reason TEXT,
  tracked BOOLEAN DEFAULT TRUE,
  latency_minutes INTEGER,
  retention_expires_at TIMESTAMPTZ,
  policy_id UUID REFERENCES field_tracking_policies(id),
  CONSTRAINT chk_old_value_length CHECK (old_value IS NULL OR char_length(old_value) <= 255),
  CONSTRAINT chk_new_value_length CHECK (new_value IS NULL OR char_length(new_value) <= 255)
);

-- Helpful indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_business_number ON companies(business_number) WHERE business_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_deals_company_stage ON deals(company_id, stage);
CREATE INDEX IF NOT EXISTS idx_deals_owner ON deals(owner);
CREATE INDEX IF NOT EXISTS idx_activities_company ON activities(company_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_company_contact ON activities(company_id, contact_id);
CREATE INDEX IF NOT EXISTS idx_changelog_entity ON change_logs(entity_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_changelog_changed_at ON change_logs(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_field_policy_entity_field ON field_tracking_policies(entity_type, field_name);
CREATE INDEX IF NOT EXISTS idx_changelog_retention ON change_logs(retention_expires_at);
