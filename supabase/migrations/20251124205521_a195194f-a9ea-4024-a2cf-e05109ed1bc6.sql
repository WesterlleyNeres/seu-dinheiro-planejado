-- Security Hardening: Fix Function Search Path Mutable Warning
-- Add SET search_path to functions that don't have it configured
-- This prevents potential security issues from search_path hijacking

-- Fix calculate_next_occurrence function
CREATE OR REPLACE FUNCTION public.calculate_next_occurrence(p_current_date date, p_frequencia recurrence_frequency, p_dia_referencia integer)
 RETURNS date
 LANGUAGE plpgsql
 IMMUTABLE
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  v_next_date date;
BEGIN
  CASE p_frequencia
    WHEN 'semanal' THEN
      v_next_date := p_current_date + INTERVAL '7 days';
    
    WHEN 'quinzenal' THEN
      v_next_date := p_current_date + INTERVAL '15 days';
    
    WHEN 'mensal' THEN
      v_next_date := (p_current_date + INTERVAL '1 month')::date;
      v_next_date := LEAST(
        DATE_TRUNC('month', v_next_date)::date + (p_dia_referencia - 1),
        (DATE_TRUNC('month', v_next_date) + INTERVAL '1 month - 1 day')::date
      );
    
    WHEN 'bimestral' THEN
      v_next_date := (p_current_date + INTERVAL '2 months')::date;
      v_next_date := LEAST(
        DATE_TRUNC('month', v_next_date)::date + (p_dia_referencia - 1),
        (DATE_TRUNC('month', v_next_date) + INTERVAL '1 month - 1 day')::date
      );
    
    WHEN 'trimestral' THEN
      v_next_date := (p_current_date + INTERVAL '3 months')::date;
      v_next_date := LEAST(
        DATE_TRUNC('month', v_next_date)::date + (p_dia_referencia - 1),
        (DATE_TRUNC('month', v_next_date) + INTERVAL '1 month - 1 day')::date
      );
    
    WHEN 'semestral' THEN
      v_next_date := (p_current_date + INTERVAL '6 months')::date;
      v_next_date := LEAST(
        DATE_TRUNC('month', v_next_date)::date + (p_dia_referencia - 1),
        (DATE_TRUNC('month', v_next_date) + INTERVAL '1 month - 1 day')::date
      );
    
    WHEN 'anual' THEN
      v_next_date := (p_current_date + INTERVAL '1 year')::date;
      v_next_date := LEAST(
        DATE_TRUNC('month', v_next_date)::date + (p_dia_referencia - 1),
        (DATE_TRUNC('month', v_next_date) + INTERVAL '1 month - 1 day')::date
      );
  END CASE;
  
  RETURN v_next_date;
END;
$function$;

-- Fix yyyymm function
CREATE OR REPLACE FUNCTION public.yyyymm(d date)
 RETURNS integer
 LANGUAGE sql
 IMMUTABLE
 SECURITY DEFINER
 SET search_path = public
AS $function$
  SELECT EXTRACT(YEAR FROM d)::integer * 100 + EXTRACT(MONTH FROM d)::integer;
$function$;

-- Fix update_updated_at_column trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- Move uuid-ossp extension from public to extensions schema
-- This addresses the "Extension in Public" warning
CREATE SCHEMA IF NOT EXISTS extensions;
ALTER EXTENSION "uuid-ossp" SET SCHEMA extensions;

-- Grant necessary permissions on extensions schema
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA extensions TO postgres, anon, authenticated, service_role;