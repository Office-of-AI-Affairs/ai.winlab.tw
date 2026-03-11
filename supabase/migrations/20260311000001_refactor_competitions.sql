-- Rename existing columns
ALTER TABLE competitions RENAME COLUMN date TO start_date;
ALTER TABLE competitions RENAME COLUMN description TO company_description;

-- Add new columns
ALTER TABLE competitions
  ADD COLUMN IF NOT EXISTS end_date DATE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS application_method JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS contact JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS required_documents TEXT DEFAULT NULL;

-- Drop unused column
ALTER TABLE competitions DROP COLUMN IF EXISTS location;
