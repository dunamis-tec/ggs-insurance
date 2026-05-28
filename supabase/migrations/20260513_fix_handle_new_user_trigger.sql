-- Fix handle_new_user trigger (v5 - final)
-- Requires SECURITY DEFINER to write to public.users (auth role lacks permission).
-- Requires SET search_path = public, pg_catalog so user_role enum is found.
-- Also deletes stale email rows before insert to avoid UNIQUE(email) conflicts.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_catalog
LANGUAGE plpgsql
AS $$
DECLARE
  v_nombre TEXT;
  v_rol    TEXT;
BEGIN
  v_nombre := COALESCE(
    NEW.raw_user_meta_data->>'nombre',
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1)
  );
  v_rol := COALESCE(NEW.raw_user_meta_data->>'rol', 'agente');

  -- Remove stale row with same email but different id (from a previous invite)
  DELETE FROM public.users
  WHERE email = NEW.email AND id <> NEW.id;

  INSERT INTO public.users (id, email, full_name, role, nombre, rol, empresa_id)
  VALUES (
    NEW.id,
    NEW.email,
    v_nombre,
    v_rol::public.user_role,
    v_nombre,
    v_rol,
    (NEW.raw_user_meta_data->>'empresa_id')::uuid
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name  = COALESCE(EXCLUDED.full_name,  public.users.full_name),
    nombre     = COALESCE(EXCLUDED.nombre,     public.users.nombre),
    rol        = COALESCE(EXCLUDED.rol,        public.users.rol),
    empresa_id = COALESCE(EXCLUDED.empresa_id, public.users.empresa_id);

  RETURN NEW;
END;
$$;
