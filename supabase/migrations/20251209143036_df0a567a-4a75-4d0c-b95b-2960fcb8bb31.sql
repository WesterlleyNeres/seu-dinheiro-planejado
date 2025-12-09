-- Drop existing SELECT policy that includes deleted_at IS NULL
DROP POLICY IF EXISTS "Users can view own goals" ON goals;

-- Recreate SELECT policy WITHOUT deleted_at IS NULL condition
-- Application already filters by deleted_at IS NULL in useGoals.ts
CREATE POLICY "Users can view own goals" ON goals
  FOR SELECT
  USING (auth.uid() = user_id);