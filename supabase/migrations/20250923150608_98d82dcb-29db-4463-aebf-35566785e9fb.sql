-- Add missing other_crew_enabled column to events table
ALTER TABLE public.events 
ADD COLUMN other_crew_enabled boolean DEFAULT false;