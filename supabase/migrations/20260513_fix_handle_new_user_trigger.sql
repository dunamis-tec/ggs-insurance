-- Fix handle_new_user trigger (v3)
-- Reads empresa_id, nombre, rol from invite metadata.
-- Deletes stale rows with same email/different id before inserting
-- to avoid UNIQUE(email) constraint violations on re-invites.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
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

  -- Remove any stale row with the same email but a different id
  -- (happens when a previous invite created a row with a temporary UUID)
  DELETE FROM public.users
  WHERE email = NEW.email AND id <> NEW.id;

  INSERT INTO public.users (id, email, full_name, role, nombre, rol, empresa_id)
  VALUES (
    NEW.id,
    NEW.email,
    v_nombre,
    v_rol::user_role,
    v_nombre,
    v_rol,
    (NEW.raw_user_meta_data->>'empresa_id')::UUID
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name  = COALESCE(EXCLUDED.full_name,  public.users.full_name),
    nombre     = COALESCE(EXCLUDED.nombre,     public.users.nombre),
    rol        = COALESCE(EXCLUDED.rol,        public.users.rol),
    empresa_id = COALESCE(EXCLUDED.empresa_id, public.users.empresa_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
