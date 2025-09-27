-- Add invoice and quotation sharing templates to wa_sessions notification_templates
UPDATE wa_sessions 
SET notification_templates = jsonb_set(
    jsonb_set(
        COALESCE(notification_templates, '{}'::jsonb),
        '{invoice_share}',
        '{"title": "INVOICE DOCUMENT", "greeting": "Dear *{clientName}*,", "content": "Please find your invoice document for {eventType} event attached.", "footer": "Thank you for your business!"}'::jsonb
    ),
    '{quotation_share}',
    '{"title": "QUOTATION DOCUMENT", "greeting": "Dear *{clientName}*,", "content": "Please find your quotation document for {eventType} event attached.", "footer": "We look forward to working with you!"}'::jsonb
)
WHERE notification_templates IS NOT NULL;

-- For sessions that don't have notification_templates yet, create the full structure
UPDATE wa_sessions 
SET notification_templates = '{
    "salary_payment": {"title": "PAYMENT PROCESSED", "content": "Your salary payment has been processed:", "greeting": "Dear *{staffName}*,"},
    "task_assignment": {"title": "TASK ASSIGNMENT", "content": "A new *{taskType}* task has been assigned to you:", "greeting": "Dear *{staffName}*,"},
    "event_assignment": {"title": "ASSIGNMENT", "content": "You are assigned as *{role}* for the following event:", "greeting": "Dear *{staffName}*,"},
    "payment_received": {"title": "PAYMENT RECEIVED", "content": "We have successfully received your payment:", "greeting": "Dear *{clientName}*,"},
    "event_cancellation": {"title": "EVENT CANCELLED", "content": "We wish to inform you that the following event has been cancelled:", "greeting": "Dear *{clientName}*,"},
    "event_confirmation": {"title": "EVENT CONFIRMED", "content": "Your event has been successfully confirmed:", "greeting": "Dear *{clientName}*,"},
    "invoice_share": {"title": "INVOICE DOCUMENT", "greeting": "Dear *{clientName}*,", "content": "Please find your invoice document for {eventType} event attached.", "footer": "Thank you for your business!"},
    "quotation_share": {"title": "QUOTATION DOCUMENT", "greeting": "Dear *{clientName}*,", "content": "Please find your quotation document for {eventType} event attached.", "footer": "We look forward to working with you!"}
}'::jsonb
WHERE notification_templates IS NULL;