-- Fix database security issues by setting proper search_path for functions

-- Fix function search_path security issues
CREATE OR REPLACE FUNCTION public.cleanup_expired_otps()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    DELETE FROM public.otps 
    WHERE expires_at < now() OR used = true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_otps_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_whatsapp_connection_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_whatsapp_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  NEW.last_seen = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_wa_sessions_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_subscription_plans_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

-- Add proper indexes for better performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_firm_id_date ON public.events(firm_id, event_date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_firm_id_status ON public.tasks(firm_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_event_id ON public.payments(event_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_firm_id ON public.clients(firm_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_freelancers_firm_id ON public.freelancers(firm_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_expenses_firm_id_date ON public.expenses(firm_id, expense_date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quotations_firm_id_date ON public.quotations(firm_id, event_date);

-- Add NOT NULL constraints to critical foreign keys
ALTER TABLE public.events 
  ALTER COLUMN firm_id SET NOT NULL,
  ALTER COLUMN client_id SET NOT NULL;

ALTER TABLE public.tasks 
  ALTER COLUMN firm_id SET NOT NULL;

ALTER TABLE public.expenses 
  ALTER COLUMN firm_id SET NOT NULL;

-- Improve security for sensitive operations
ALTER TABLE public.firm_subscriptions 
  ADD CONSTRAINT check_trial_dates CHECK (trial_end_at >= trial_start_at);

ALTER TABLE public.payments 
  ADD CONSTRAINT check_positive_amount CHECK (amount > 0);

ALTER TABLE public.expenses 
  ADD CONSTRAINT check_positive_expense_amount CHECK (amount > 0);