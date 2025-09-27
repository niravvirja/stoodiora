-- Fix invalid task_type values in existing data
UPDATE tasks 
SET task_type = 'Other'::task_type 
WHERE task_type IS NULL;

-- Add a constraint to prevent NULL task_type values in the future
ALTER TABLE tasks ALTER COLUMN task_type SET DEFAULT 'Other'::task_type;
ALTER TABLE tasks ALTER COLUMN task_type SET NOT NULL;