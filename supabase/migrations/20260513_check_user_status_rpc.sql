-- RPC: check_user_status
-- Allows unauthenticated callers to verify if an email exists and is active.
-- Used by the login/forgot-password forms to avoid exposing RLS-blocked queries.
CREATE OR REPLACE FUNCTION public.check_user_status(user_email TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'exists', true,
    'activo', COALESCE(u.activo, u.active, false)
  )
  INTO result
  FROM public.users u
  WHERE lower(trim(u.email)) = lower(trim(user_email))
  LIMIT 1;

  IF result IS NULL THEN
    RETURN json_build_object('exists', false, 'activo', false);
  END IF;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_user_status(TEXT) TO anon;
