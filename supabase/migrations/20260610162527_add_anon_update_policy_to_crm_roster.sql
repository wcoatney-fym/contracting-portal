CREATE POLICY "Anon users can update roster entries"
  ON crm_roster
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);