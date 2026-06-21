-- Through The Body — Supabase schema
-- Run this in the Supabase SQL editor

-- Clients
CREATE TABLE clients (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                   TEXT NOT NULL,
  phone                  TEXT,
  package_size           INTEGER NOT NULL DEFAULT 10,
  total_lessons_purchased INTEGER NOT NULL DEFAULT 10,
  notes                  TEXT,
  active                 BOOLEAN NOT NULL DEFAULT true,
  created_at             TIMESTAMPTZ DEFAULT now()
);

-- One row per "client showed up on this date"
CREATE TABLE attendances (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id  UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  date       DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (client_id, date)
);

-- App-wide settings (key/value)
CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value JSONB
);

-- Default: Sun–Thu active
INSERT INTO settings (key, value)
VALUES ('active_days', '[0, 1, 2, 3, 4]'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Index for fast "who attended on date X" queries
CREATE INDEX idx_attendances_date ON attendances (date);

-- Index for fast "all attendances for client Y" queries
CREATE INDEX idx_attendances_client ON attendances (client_id);

-- Enable Row Level Security (optional but recommended)
-- If you want all authenticated users to have full access:
-- ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE attendances ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "full access" ON clients FOR ALL USING (true);
-- CREATE POLICY "full access" ON attendances FOR ALL USING (true);
-- CREATE POLICY "full access" ON settings FOR ALL USING (true);
