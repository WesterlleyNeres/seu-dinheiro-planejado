-- Drop existing UPDATE policy
DROP POLICY IF EXISTS "Users can update own goals" ON goals;

-- Recreate with WITH CHECK clause to allow soft delete
CREATE POLICY "Users can update own goals" ON goals
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);