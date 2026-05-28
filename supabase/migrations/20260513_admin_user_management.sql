-- RPC: list_users_with_auth_status
-- Returns all users joined with their auth.users last_sign_in_at.
-- Used in Configuracion > Usuarios to detect invite vs reset-password state.
CREATE OR REPLACE FUNCTION public.list_users_with_auth_status()
RETURNS TABLE(
  id          UUID,
  email       TEXT,
  nombre      TEXT,
  rol         TEXT,
  activo      BOOLEAN,
  active      BOOLEAN,
  empresa_id  UUID,
  created_at  TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    u.id, u.email, u.nombre, u.rol, u.activo, u.active,
    u.empresa_id, u.created_at,
    a.last_sign_in_at
  FROM public.users u
  LEFT JOIN auth.users a ON a.id = u.id
  ORDER BY u.created_at DESC;
$$;
GRANT EXECUTE ON FUNCTION public.list_users_with_auth_status() TO authenticated;

-- RPC: admin_delete_user
-- Admin-only: hard-deletes a user from auth.users and public.users.
CREATE OR REPLACE FUNCTION public.admin_delete_user(target_uid UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND rol = 'admin'
  ) THEN
    RAISE EXCEPTION 'Not authorized: must be admin';
  END IF;

  IF target_uid = auth.uid() THEN
    RAISE EXCEPTION 'Cannot delete your own account';
  END IF;

  DELETE FROM auth.users WHERE id = target_uid;
  DELETE FROM public.users WHERE id = target_uid;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(UUID) TO authenticated;
