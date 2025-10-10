-- Fix role reversion issue in handle_new_user_profile trigger
-- Remove role from ON CONFLICT UPDATE to prevent overwriting user's current role

CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  profile_firm_id UUID;
  user_role user_role;
BEGIN
  -- Extract firm_id and role from user metadata
  profile_firm_id := NULLIF(NEW.raw_user_meta_data ->> 'firm_id', '')::UUID;
  user_role := COALESCE((NEW.raw_user_meta_data ->> 'role')::user_role, 'Admin'::user_role);
  
  -- Insert profile with firm_id from metadata
  INSERT INTO public.profiles (
    user_id,
    full_name,
    mobile_number,
    role,
    firm_id,
    current_firm_id
  ) VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''), 'Unknown User'),
    COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'mobile_number', ''), ''),
    user_role,
    profile_firm_id,
    profile_firm_id
  ) ON CONFLICT (user_id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    mobile_number = EXCLUDED.mobile_number,
    -- CRITICAL FIX: Removed role = EXCLUDED.role to prevent role reversion
    firm_id = EXCLUDED.firm_id,
    current_firm_id = EXCLUDED.current_firm_id;

  -- If user is joining an existing firm, add them as member
  IF profile_firm_id IS NOT NULL THEN
    -- Check if the firm exists
    IF EXISTS (SELECT 1 FROM firms WHERE id = profile_firm_id) THEN
      -- Check if user is NOT the creator of this firm
      IF NOT EXISTS (
        SELECT 1 FROM firms 
        WHERE id = profile_firm_id AND created_by = NEW.id
      ) THEN
        -- Add as firm member
        INSERT INTO public.firm_members (
          firm_id,
          user_id,
          role
        ) VALUES (
          profile_firm_id,
          NEW.id,
          CASE 
            WHEN user_role = 'Admin' THEN 'Admin'
            ELSE 'Member'
          END
        ) ON CONFLICT (firm_id, user_id) DO UPDATE SET
          role = EXCLUDED.role;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE LOG 'Error in handle_new_user_profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;