-- Adicionar policies de DELETE faltantes para tabelas JARVIS

-- Policy DELETE para ff_habits
CREATE POLICY "Users can delete habits in their tenants"
ON public.ff_habits
FOR DELETE
USING (
  tenant_id IN (
    SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
  )
);

-- Policy DELETE para ff_events
CREATE POLICY "Users can delete events in their tenants"
ON public.ff_events
FOR DELETE
USING (
  tenant_id IN (
    SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
  )
);

-- Policy DELETE para ff_habit_logs
CREATE POLICY "Users can delete habit logs in their tenants"
ON public.ff_habit_logs
FOR DELETE
USING (
  tenant_id IN (
    SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
  )
);

-- Policy DELETE para ff_reminders
CREATE POLICY "Users can delete reminders in their tenants"
ON public.ff_reminders
FOR DELETE
USING (
  tenant_id IN (
    SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
  )
);

-- Policy DELETE para ff_memory_items
CREATE POLICY "Users can delete memory items in their tenants"
ON public.ff_memory_items
FOR DELETE
USING (
  tenant_id IN (
    SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
  )
);

-- Policy DELETE para ff_tasks
CREATE POLICY "Users can delete tasks in their tenants"
ON public.ff_tasks
FOR DELETE
USING (
  tenant_id IN (
    SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
  )
);