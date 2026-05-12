-- 1. Add new columns (all nullable TEXT)
ALTER TABLE organization_members
  ADD COLUMN school TEXT,
  ADD COLUMN research_areas TEXT,
  ADD COLUMN email TEXT,
  ADD COLUMN website TEXT,
  ADD COLUMN member_role TEXT;

-- 2. Update check constraint to new category values
-- (temporarily allow both old and new to enable data migration)
ALTER TABLE organization_members
  DROP CONSTRAINT organization_members_category_check,
  ADD CONSTRAINT organization_members_category_check
    CHECK (category = ANY (ARRAY['core'::text, 'legal_entity'::text, 'industry'::text, 'ai_newcomer'::text, 'industry_academy'::text, 'alumni'::text]));

-- 3. Migrate existing rows to 'core'
UPDATE organization_members
  SET category = 'core'
  WHERE category IN ('ai_newcomer', 'industry_academy', 'alumni');

-- 4. Apply final constraint with new values only
ALTER TABLE organization_members
  DROP CONSTRAINT organization_members_category_check,
  ADD CONSTRAINT organization_members_category_check
    CHECK (category = ANY (ARRAY['core'::text, 'legal_entity'::text, 'industry'::text]));
