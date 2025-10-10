-- Fix notification templates with correct placeholders and single asterisks
UPDATE wa_sessions
SET notification_templates = jsonb_set(
  COALESCE(notification_templates, '{}'::jsonb),
  '{staff_event_update}',
  '{"title": "EVENT DETAILS UPDATED", "greeting": "Dear *{staffName}*,", "content": "The event you are assigned to has been updated:"}'::jsonb
)
WHERE firm_id IN (SELECT id FROM firms);

-- Fix event_update template for clients (single asterisk)
UPDATE wa_sessions
SET notification_templates = jsonb_set(
  COALESCE(notification_templates, '{}'::jsonb),
  '{event_update}',
  '{"title": "EVENT UPDATED", "greeting": "Dear *{clientName}*,", "content": "Your event details have been updated:"}'::jsonb
)
WHERE firm_id IN (SELECT id FROM firms);

-- Fix event_confirmation template (single asterisk)
UPDATE wa_sessions
SET notification_templates = jsonb_set(
  COALESCE(notification_templates, '{}'::jsonb),
  '{event_confirmation}',
  '{"title": "EVENT CONFIRMED", "greeting": "Dear *{clientName}*,", "content": "Your event has been successfully confirmed:"}'::jsonb
)
WHERE firm_id IN (SELECT id FROM firms);

-- Fix payment_received template (single asterisk)
UPDATE wa_sessions
SET notification_templates = jsonb_set(
  COALESCE(notification_templates, '{}'::jsonb),
  '{payment_received}',
  '{"title": "PAYMENT RECEIVED", "greeting": "Dear *{clientName}*,", "content": "We have successfully received your payment:"}'::jsonb
)
WHERE firm_id IN (SELECT id FROM firms);

-- Fix event_cancellation template (single asterisk)
UPDATE wa_sessions
SET notification_templates = jsonb_set(
  COALESCE(notification_templates, '{}'::jsonb),
  '{event_cancellation}',
  '{"title": "EVENT CANCELLED", "greeting": "Dear *{clientName}*,", "content": "We wish to inform you that the following event has been cancelled:"}'::jsonb
)
WHERE firm_id IN (SELECT id FROM firms);

-- Fix all staff notification templates (single asterisk, correct placeholder)
UPDATE wa_sessions
SET notification_templates = jsonb_set(
  jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(
            COALESCE(notification_templates, '{}'::jsonb),
            '{event_assignment}',
            '{"title": "ASSIGNMENT", "greeting": "Dear *{staffName}*,", "content": "You are assigned as *{role}* for the following event:"}'::jsonb
          ),
          '{task_assignment}',
          '{"title": "TASK ASSIGNMENT", "greeting": "Dear *{staffName}*,", "content": "A new *{taskType}* task has been assigned to you:"}'::jsonb
        ),
        '{salary_payment}',
        '{"title": "PAYMENT PROCESSED", "greeting": "Dear *{staffName}*,", "content": "Your salary payment has been processed:"}'::jsonb
      ),
      '{event_staff_cancellation}',
      '{"title": "EVENT CANCELLED", "greeting": "Dear *{staffName}*,", "content": "The following event has been cancelled:"}'::jsonb
    ),
    '{task_reported}',
    '{"title": "TASK REPORTED", "greeting": "Dear *{staffName}*,", "content": "Your submitted task has been reported due to issues:"}'::jsonb
  ),
  '{task_update}',
  '{"title": "TASK UPDATED", "greeting": "Dear *{staffName}*,", "content": "Your assigned task has been updated:"}'::jsonb
)
WHERE firm_id IN (SELECT id FROM firms);