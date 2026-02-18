-- Create ff_complete_task function before search_path alterations
CREATE OR REPLACE FUNCTION public.ff_complete_task(p_task_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.ff_tasks
  SET status = 'done',
      completed_at = now(),
      updated_at = now()
  WHERE id = p_task_id;
END;
$$;
