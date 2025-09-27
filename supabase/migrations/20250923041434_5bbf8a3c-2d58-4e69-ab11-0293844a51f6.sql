-- Phase 1: Database Schema Cleanup & Restructure

-- First, let's clean up the subscription_plans table and add proper monthly plan
DELETE FROM subscription_plans;

-- Insert proper monthly subscription plan
INSERT INTO subscription_plans (
  plan_id,
  name,
  display_name,
  price,
  currency,
  duration_months,
  is_active,
  sort_order
) VALUES (
  'monthly_access',
  'monthly_access',
  'Monthly Access',
  849,
  'INR',
  1,
  true,
  1
);

-- Phase 2: Fix the critical is_firm_writable function to enforce monthly expiry
CREATE OR REPLACE FUNCTION public.is_firm_writable(p_firm_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_rec public.firm_subscriptions%ROWTYPE;
BEGIN
  SELECT *
  INTO v_rec
  FROM public.firm_subscriptions
  WHERE firm_id = p_firm_id;

  -- No record found: default to not writable for security
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- CRITICAL CHANGE: Only allow access if subscription is currently active
  -- Remove the lifetime access for subscribed_once = true
  IF v_rec.subscription_end_at IS NOT NULL AND v_rec.subscription_end_at > now() THEN
    RETURN TRUE;
  END IF;

  -- For trial users who haven't paid yet: allow access during trial period
  IF v_rec.subscribed_once = FALSE AND v_rec.trial_end_at IS NOT NULL AND now() <= v_rec.trial_end_at THEN
    RETURN TRUE;
  END IF;

  -- All other cases: no access (including expired paying customers)
  RETURN FALSE;
END;
$$;

-- Clean up firm_subscriptions table - remove trial-specific columns that are no longer needed
-- We'll keep trial_end_at and trial_start_at for new users but make subscription logic simpler
ALTER TABLE firm_subscriptions 
DROP COLUMN IF EXISTS grace_until;

-- Update existing subscriptions to remove any "lifetime" access
-- Reset all subscriptions to expired state so users need to pay monthly
UPDATE firm_subscriptions 
SET 
  status = 'expired',
  subscription_end_at = now() - interval '1 day'
WHERE subscribed_once = true;