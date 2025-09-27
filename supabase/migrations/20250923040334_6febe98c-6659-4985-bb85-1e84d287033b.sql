-- Deactivate all existing subscription plans
UPDATE subscription_plans 
SET is_active = false, updated_at = now()
WHERE is_active = true;

-- Create the single activation plan
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
  'activation',
  'activation',
  'Monthly Activation',
  849,
  'INR',
  1,
  true,
  1
) ON CONFLICT (plan_id) DO UPDATE SET
  name = EXCLUDED.name,
  display_name = EXCLUDED.display_name,
  price = EXCLUDED.price,
  currency = EXCLUDED.currency,
  duration_months = EXCLUDED.duration_months,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();