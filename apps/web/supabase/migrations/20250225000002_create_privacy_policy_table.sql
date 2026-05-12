CREATE TABLE privacy_policy (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  content jsonb NOT NULL,
  version integer NOT NULL,
  note text,
  created_at timestamptz DEFAULT now() NOT NULL,
  created_by uuid REFERENCES profiles(id)
);

CREATE INDEX ON privacy_policy (version DESC);

ALTER TABLE privacy_policy ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read privacy policy"
  ON privacy_policy FOR SELECT USING (true);

CREATE POLICY "Admins can insert privacy policy versions"
  ON privacy_policy FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
