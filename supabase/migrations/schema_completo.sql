-- ============================================================
--  GGS Insurance — Schema Completo
--  Aplica en proyectos nuevos (producción o staging)
--  Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- ── Extensiones ─────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Secuencias ──────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS poliza_numero_seq START 1;
CREATE SEQUENCE IF NOT EXISTS req_pago_seq START 1;

-- ── Enums ───────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE public.user_role          AS ENUM ('admin','agente'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.cliente_tipo       AS ENUM ('prospecto','individual','empresa'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.documento_tipo     AS ENUM ('licencia','dpi','contrato','pdf_poliza','comprobante','otro'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.emision_tipo       AS ENUM ('emision','inclusion','exclusion','renovacion','modificacion'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.fraccionamiento_tipo AS ENUM ('anual','semestral','trimestral','mensual'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.informe_tipo       AS ENUM ('liquidacion','comision'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.req_pago_estado    AS ENUM ('pendiente','pagado','vencido'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.tarea_estado       AS ENUM ('pendiente','completada'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.tarea_tipo         AS ENUM ('automatica','manual'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Funciones helpers (sin deps de tablas) ───────────────────
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE OR REPLACE FUNCTION public.auto_set_empresa_id()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.empresa_id IS NULL THEN
    NEW.empresa_id := public.get_my_empresa_id();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_numero_poliza()
RETURNS text LANGUAGE plpgsql AS $$
BEGIN RETURN 'POL-' || LPAD(nextval('poliza_numero_seq')::TEXT, 5, '0'); END;
$$;

CREATE OR REPLACE FUNCTION public.generate_codigo_req()
RETURNS text LANGUAGE plpgsql AS $$
BEGIN RETURN 'REQ-' || LPAD(nextval('req_pago_seq')::TEXT, 5, '0'); END;
$$;

CREATE OR REPLACE FUNCTION public.generate_numero_solicitud()
RETURNS text LANGUAGE plpgsql AS $$
DECLARE nuevo text; existe boolean;
BEGIN
  LOOP
    nuevo := LPAD((FLOOR(RANDOM() * 900000) + 100000)::int::text, 6, '0');
    SELECT EXISTS(SELECT 1 FROM polizas WHERE numero_solicitud = nuevo) INTO existe;
    EXIT WHEN NOT existe;
  END LOOP;
  RETURN nuevo;
END;
$$;

-- ── Tabla: configuracion_empresa ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.configuracion_empresa (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      text NOT NULL DEFAULT 'Grupo Global en Seguros',
  nombre_corto text DEFAULT 'GGS',
  nit         text,
  direccion   text,
  telefono    text,
  email       text,
  website     text,
  logo_url    text,
  updated_at  timestamptz DEFAULT now(),
  updated_by  uuid
);

-- ── Tabla: users ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.users (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email       text NOT NULL UNIQUE,
  full_name   text NOT NULL,
  role        public.user_role NOT NULL DEFAULT 'agente',
  active      boolean DEFAULT true,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  rol         text DEFAULT 'agente',
  activo      boolean DEFAULT true,
  nombre      text,
  telefono    text,
  empresa_id  uuid REFERENCES public.configuracion_empresa(id) ON DELETE RESTRICT
);

-- FK diferida: configuracion_empresa.updated_by → users
ALTER TABLE public.configuracion_empresa
  ADD COLUMN IF NOT EXISTS updated_by uuid;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'configuracion_empresa_updated_by_fkey'
  ) THEN
    ALTER TABLE public.configuracion_empresa
      ADD CONSTRAINT configuracion_empresa_updated_by_fkey
      FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE NO ACTION;
  END IF;
END $$;

-- ── Tabla: conglomerados ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.conglomerados (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre      text NOT NULL,
  descripcion text,
  activo      boolean DEFAULT true,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  empresa_id  uuid REFERENCES public.configuracion_empresa(id) ON DELETE RESTRICT
);

-- ── Tabla: aseguradoras ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.aseguradoras (
  id                      uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre                  text NOT NULL,
  nit                     text,
  direccion               text,
  telefono                text,
  email                   text,
  contacto_nombre         text,
  activa                  boolean DEFAULT true,
  created_at              timestamptz DEFAULT now(),
  updated_at              timestamptz DEFAULT now(),
  logo_url                text,
  empresa_id              uuid REFERENCES public.configuracion_empresa(id) ON DELETE RESTRICT,
  porcentaje_gasto_emision numeric NOT NULL DEFAULT 5.00,
  codigo_agente           text
);

-- ── Tabla: productos ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.productos (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  aseguradora_id uuid NOT NULL REFERENCES public.aseguradoras(id) ON DELETE CASCADE,
  nombre         text NOT NULL,
  descripcion    text,
  activo         boolean DEFAULT true,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now(),
  empresa_id     uuid REFERENCES public.configuracion_empresa(id) ON DELETE RESTRICT
);

-- ── Tabla: coberturas ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.coberturas (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  producto_id uuid NOT NULL REFERENCES public.productos(id) ON DELETE CASCADE,
  nombre      text NOT NULL,
  descripcion text,
  activa      boolean DEFAULT true,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  empresa_id  uuid REFERENCES public.configuracion_empresa(id) ON DELETE RESTRICT,
  monto       numeric
);

-- ── Tabla: coberturas_catalogo ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.coberturas_catalogo (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aseguradora_id uuid REFERENCES public.aseguradoras(id) ON DELETE CASCADE,
  nombre         text NOT NULL,
  monto          numeric,
  activa         boolean NOT NULL DEFAULT true,
  empresa_id     uuid REFERENCES public.configuracion_empresa(id) ON DELETE NO ACTION,
  created_at     timestamptz DEFAULT now()
);

-- ── Tabla: producto_coberturas_catalogo ──────────────────────
CREATE TABLE IF NOT EXISTS public.producto_coberturas_catalogo (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id          uuid REFERENCES public.productos(id) ON DELETE CASCADE,
  cobertura_catalogo_id uuid REFERENCES public.coberturas_catalogo(id) ON DELETE CASCADE,
  UNIQUE (producto_id, cobertura_catalogo_id)
);

-- ── Tabla: recargo_fraccionamiento ───────────────────────────
CREATE TABLE IF NOT EXISTS public.recargo_fraccionamiento (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id     uuid NOT NULL REFERENCES public.configuracion_empresa(id) ON DELETE CASCADE,
  aseguradora_id uuid NOT NULL REFERENCES public.aseguradoras(id) ON DELETE CASCADE,
  numero_cuotas  integer NOT NULL,
  porcentaje     numeric NOT NULL DEFAULT 0,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now(),
  UNIQUE (empresa_id, aseguradora_id, numero_cuotas)
);

-- ── Tabla: clientes ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.clientes (
  id                       uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo                     public.cliente_tipo NOT NULL DEFAULT 'prospecto',
  conglomerado_id          uuid REFERENCES public.conglomerados(id) ON DELETE NO ACTION,
  nombre                   text NOT NULL,
  apellido                 text,
  razon_social             text,
  nit                      text,
  dpi                      text,
  email                    text,
  telefono                 text,
  direccion                text,
  nombre_empresa           text,
  representante_legal      text,
  agente_id                uuid REFERENCES public.users(id) ON DELETE NO ACTION,
  activo                   boolean DEFAULT true,
  created_at               timestamptz DEFAULT now(),
  updated_at               timestamptz DEFAULT now(),
  contacto_nombre          text,
  contacto_apellido        text,
  contacto_telefono        text,
  contacto_email           text,
  contacto_cargo           text,
  fecha_nacimiento         date,
  empresa_id               uuid REFERENCES public.configuracion_empresa(id) ON DELETE RESTRICT,
  rep_legal_nombre         text,
  rep_legal_nit            text,
  rep_legal_fecha_nacimiento date,
  fecha_constitucion       date,
  pep                      boolean DEFAULT false,
  pep_parentesco           boolean DEFAULT false,
  cpe                      boolean DEFAULT false,
  doc_recibo_url           text,
  doc_dpi_url              text,
  doc_patente_url          text
);

-- ── Tabla: personas_facturables ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.personas_facturables (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id  uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  nombre      text NOT NULL,
  apellido    text NOT NULL,
  nit         text NOT NULL,
  dpi         text,
  email       text,
  telefono    text,
  activa      boolean DEFAULT true,
  created_at  timestamptz DEFAULT now(),
  direccion   text,
  created_by  uuid REFERENCES public.users(id) ON DELETE NO ACTION,
  empresa_id  uuid REFERENCES public.configuracion_empresa(id) ON DELETE RESTRICT
);

-- ── Tabla: vehiculos ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.vehiculos (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id     uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  marca          text NOT NULL,
  modelo         text NOT NULL,
  anio           integer NOT NULL,
  placa          text,
  chasis         text,
  motor          text,
  color          text,
  tipo           text,
  valor_asegurado numeric,
  activo         boolean DEFAULT true,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now(),
  poliza_id      uuid,  -- FK added after polizas
  tipo_placa     text,
  empresa_id     uuid REFERENCES public.configuracion_empresa(id) ON DELETE RESTRICT
);

-- ── Tabla: polizas ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.polizas (
  id                   uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero_poliza        text,
  cliente_id           uuid NOT NULL REFERENCES public.clientes(id) ON DELETE NO ACTION,
  aseguradora_id       uuid NOT NULL REFERENCES public.aseguradoras(id) ON DELETE NO ACTION,
  producto_id          uuid NOT NULL REFERENCES public.productos(id) ON DELETE NO ACTION,
  persona_facturable_id uuid REFERENCES public.personas_facturables(id) ON DELETE NO ACTION,
  agente_id            uuid REFERENCES public.users(id) ON DELETE NO ACTION,
  prima_total          numeric NOT NULL DEFAULT 0,
  fraccionamiento      public.fraccionamiento_tipo NOT NULL DEFAULT 'anual',
  fecha_inicio         date NOT NULL,
  fecha_vencimiento    date NOT NULL,
  activa               boolean DEFAULT true,
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now(),
  tipo_pago            text NOT NULL DEFAULT 'contado',
  estado               text NOT NULL DEFAULT 'solicitud',
  poliza_origen_id     uuid REFERENCES public.polizas(id) ON DELETE SET NULL,
  numero_solicitud     text,
  poliza_pdf_url       text,
  numero_cuotas        integer NOT NULL DEFAULT 1,
  empresa_id           uuid REFERENCES public.configuracion_empresa(id) ON DELETE RESTRICT,
  prima_neta           numeric NOT NULL DEFAULT 0,
  monto_gasto_emision  numeric NOT NULL DEFAULT 0,
  monto_recargo        numeric NOT NULL DEFAULT 0,
  monto_iva            numeric NOT NULL DEFAULT 0,
  observaciones        text,
  ejecutivo_id         uuid REFERENCES public.users(id) ON DELETE NO ACTION,
  incluir_coberturas_pdf boolean DEFAULT false,
  UNIQUE (numero_poliza, empresa_id)
);

-- FK circular: vehiculos.poliza_id → polizas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'vehiculos_poliza_id_fkey'
  ) THEN
    ALTER TABLE public.vehiculos
      ADD CONSTRAINT vehiculos_poliza_id_fkey
      FOREIGN KEY (poliza_id) REFERENCES public.polizas(id) ON DELETE NO ACTION;
  END IF;
END $$;

-- ── Tabla: emisiones ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.emisiones (
  id                     uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  poliza_id              uuid NOT NULL REFERENCES public.polizas(id) ON DELETE CASCADE,
  tipo                   public.emision_tipo NOT NULL DEFAULT 'emision',
  estado                 text NOT NULL DEFAULT 'solicitud',
  numero_emision         text NOT NULL,
  prima_emision          numeric NOT NULL DEFAULT 0,
  fraccionamiento        public.fraccionamiento_tipo NOT NULL DEFAULT 'anual',
  fecha_inicio           date NOT NULL,
  fecha_fin              date NOT NULL,
  notas                  text,
  pdf_url                text,
  created_by             uuid REFERENCES public.users(id) ON DELETE NO ACTION,
  created_at             timestamptz DEFAULT now(),
  updated_at             timestamptz DEFAULT now(),
  persona_facturable_id  uuid REFERENCES public.personas_facturables(id) ON DELETE NO ACTION,
  tipo_pago              text DEFAULT 'contado',
  numero_cuotas          integer NOT NULL DEFAULT 1,
  empresa_id             uuid REFERENCES public.configuracion_empresa(id) ON DELETE RESTRICT,
  prima_neta             numeric NOT NULL DEFAULT 0,
  monto_gasto_emision    numeric NOT NULL DEFAULT 0,
  monto_recargo          numeric NOT NULL DEFAULT 0,
  monto_iva              numeric NOT NULL DEFAULT 0,
  metodo_pago            text,
  incluir_coberturas_pdf boolean DEFAULT false
);

-- ── Tabla: emision_coberturas ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.emision_coberturas (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  emision_id   uuid NOT NULL REFERENCES public.emisiones(id) ON DELETE CASCADE,
  cobertura_id uuid NOT NULL REFERENCES public.coberturas(id) ON DELETE NO ACTION,
  created_at   timestamptz DEFAULT now(),
  empresa_id   uuid REFERENCES public.configuracion_empresa(id) ON DELETE RESTRICT
);

-- ── Tabla: emision_vehiculos ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.emision_vehiculos (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  emision_id          uuid NOT NULL REFERENCES public.emisiones(id) ON DELETE CASCADE,
  vehiculo_id         uuid NOT NULL REFERENCES public.vehiculos(id) ON DELETE NO ACTION,
  created_at          timestamptz DEFAULT now(),
  empresa_id          uuid REFERENCES public.configuracion_empresa(id) ON DELETE RESTRICT,
  prima_neta          numeric DEFAULT 0,
  monto_gasto_emision numeric DEFAULT 0,
  monto_recargo       numeric DEFAULT 0,
  monto_iva           numeric DEFAULT 0,
  prima_total         numeric DEFAULT 0,
  deducible_danios    numeric DEFAULT 0,
  deducible_robo      numeric DEFAULT 0
);

-- ── Tabla: solicitud_vehiculos ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.solicitud_vehiculos (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poliza_id           uuid NOT NULL REFERENCES public.polizas(id) ON DELETE CASCADE,
  vehiculo_id         uuid NOT NULL REFERENCES public.vehiculos(id) ON DELETE CASCADE,
  created_at          timestamptz DEFAULT now(),
  empresa_id          uuid REFERENCES public.configuracion_empresa(id) ON DELETE RESTRICT,
  prima_neta          numeric DEFAULT 0,
  monto_gasto_emision numeric DEFAULT 0,
  monto_recargo       numeric DEFAULT 0,
  monto_iva           numeric DEFAULT 0,
  prima_total         numeric DEFAULT 0,
  deducible_danios    numeric DEFAULT 0,
  deducible_robo      numeric DEFAULT 0,
  UNIQUE (poliza_id, vehiculo_id)
);

-- ── Tabla: bitacora_polizas ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bitacora_polizas (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poliza_id       uuid NOT NULL REFERENCES public.polizas(id) ON DELETE CASCADE,
  estado_anterior text,
  estado_nuevo    text,
  descripcion     text,
  created_by      uuid,
  created_at      timestamptz DEFAULT now(),
  empresa_id      uuid REFERENCES public.configuracion_empresa(id) ON DELETE RESTRICT
);

-- ── Tabla: documentos ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.documentos (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo        public.documento_tipo NOT NULL DEFAULT 'otro',
  nombre      text NOT NULL,
  url         text NOT NULL,
  size_bytes  bigint,
  cliente_id  uuid REFERENCES public.clientes(id) ON DELETE CASCADE,
  poliza_id   uuid REFERENCES public.polizas(id) ON DELETE CASCADE,
  emision_id  uuid REFERENCES public.emisiones(id) ON DELETE CASCADE,
  vehiculo_id uuid REFERENCES public.vehiculos(id) ON DELETE CASCADE,
  uploaded_by uuid REFERENCES public.users(id) ON DELETE NO ACTION,
  created_at  timestamptz DEFAULT now(),
  empresa_id  uuid REFERENCES public.configuracion_empresa(id) ON DELETE RESTRICT
);

-- ── Tabla: poliza_documentos ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.poliza_documentos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poliza_id   uuid NOT NULL REFERENCES public.polizas(id) ON DELETE CASCADE,
  empresa_id  uuid,
  nombre      text NOT NULL,
  url         text NOT NULL,
  created_by  uuid,
  created_at  timestamptz DEFAULT now()
);

-- ── Tabla: informes_enviados ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.informes_enviados (
  id                    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo                  public.informe_tipo NOT NULL,
  aseguradora_id        uuid NOT NULL REFERENCES public.aseguradoras(id) ON DELETE NO ACTION,
  fecha_desde           date NOT NULL,
  fecha_hasta           date NOT NULL,
  total_requerimientos  integer NOT NULL DEFAULT 0,
  total_monto           numeric NOT NULL DEFAULT 0,
  pdf_url               text,
  created_by            uuid REFERENCES public.users(id) ON DELETE NO ACTION,
  created_at            timestamptz DEFAULT now(),
  empresa_id            uuid REFERENCES public.configuracion_empresa(id) ON DELETE RESTRICT
);

-- ── Tabla: requerimientos_pago ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.requerimientos_pago (
  id                          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  emision_id                  uuid NOT NULL REFERENCES public.emisiones(id) ON DELETE CASCADE,
  poliza_id                   uuid NOT NULL REFERENCES public.polizas(id) ON DELETE NO ACTION,
  codigo                      text NOT NULL,
  codigo_matriz               text,
  numero_cuota                integer NOT NULL DEFAULT 1,
  total_cuotas                integer NOT NULL DEFAULT 1,
  monto                       numeric NOT NULL,
  fecha_vencimiento           date NOT NULL,
  fecha_pago                  date,
  estado                      public.req_pago_estado NOT NULL DEFAULT 'pendiente',
  informe_liquidacion_enviado boolean DEFAULT false,
  informe_comision_enviado    boolean DEFAULT false,
  fecha_informe_liquidacion   timestamptz,
  fecha_informe_comision      timestamptz,
  comprobante_url             text,
  notas                       text,
  created_by                  uuid REFERENCES public.users(id) ON DELETE NO ACTION,
  created_at                  timestamptz DEFAULT now(),
  updated_at                  timestamptz DEFAULT now(),
  informe_id                  uuid REFERENCES public.informes_enviados(id) ON DELETE NO ACTION,
  informe_comision_id         uuid REFERENCES public.informes_enviados(id) ON DELETE NO ACTION,
  empresa_id                  uuid REFERENCES public.configuracion_empresa(id) ON DELETE RESTRICT,
  prima_neta                  numeric NOT NULL DEFAULT 0,
  monto_gasto_emision         numeric NOT NULL DEFAULT 0,
  monto_recargo               numeric NOT NULL DEFAULT 0,
  monto_iva                   numeric NOT NULL DEFAULT 0,
  porcentaje_comision         numeric NOT NULL DEFAULT 0,
  monto_comision              numeric NOT NULL DEFAULT 0,
  UNIQUE (codigo, empresa_id)
);

-- ── Tabla: bitacora_seguimiento_reqs ─────────────────────────
CREATE TABLE IF NOT EXISTS public.bitacora_seguimiento_reqs (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  req_id         uuid NOT NULL REFERENCES public.requerimientos_pago(id) ON DELETE CASCADE,
  empresa_id     uuid NOT NULL,
  observaciones  text,
  created_by     uuid REFERENCES public.users(id) ON DELETE NO ACTION,
  created_at     timestamptz DEFAULT now(),
  usuario_nombre text
);

-- ── Tabla: reclamos ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reclamos (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_reclamo text NOT NULL,
  poliza_id      uuid REFERENCES public.polizas(id) ON DELETE NO ACTION,
  vehiculo_id    uuid REFERENCES public.vehiculos(id) ON DELETE NO ACTION,
  cliente_id     uuid REFERENCES public.clientes(id) ON DELETE NO ACTION,
  estado         text DEFAULT 'en_proceso',
  descripcion    text,
  empresa_id     uuid,
  created_by     uuid,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now(),
  fecha_cierre   timestamptz
);

-- ── Tabla: reclamos_bitacora ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reclamos_bitacora (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reclamo_id       uuid REFERENCES public.reclamos(id) ON DELETE CASCADE,
  comentario       text NOT NULL,
  empresa_id       uuid,
  created_by       uuid,
  created_at       timestamptz DEFAULT now(),
  created_by_nombre text
);

-- ── Tabla: reclamos_documentos ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.reclamos_documentos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reclamo_id  uuid REFERENCES public.reclamos(id) ON DELETE CASCADE,
  nombre      text NOT NULL,
  url         text NOT NULL,
  empresa_id  uuid,
  created_by  uuid,
  created_at  timestamptz DEFAULT now()
);

-- ── Tabla: tareas ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tareas (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo             public.tarea_tipo NOT NULL DEFAULT 'manual',
  estado           public.tarea_estado NOT NULL DEFAULT 'pendiente',
  titulo           text NOT NULL,
  descripcion      text,
  poliza_id        uuid REFERENCES public.polizas(id) ON DELETE CASCADE,
  requerimiento_id uuid REFERENCES public.requerimientos_pago(id) ON DELETE CASCADE,
  cliente_id       uuid REFERENCES public.clientes(id) ON DELETE CASCADE,
  fecha_vencimiento date,
  fecha_completada  timestamptz,
  asignado_a       uuid REFERENCES public.users(id) ON DELETE NO ACTION,
  created_by       uuid REFERENCES public.users(id) ON DELETE NO ACTION,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now(),
  empresa_id       uuid REFERENCES public.configuracion_empresa(id) ON DELETE RESTRICT
);

-- ── Tabla: producto_comisiones ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.producto_comisiones (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id  uuid NOT NULL REFERENCES public.configuracion_empresa(id) ON DELETE CASCADE,
  producto_id uuid NOT NULL REFERENCES public.productos(id) ON DELETE CASCADE,
  porcentaje  numeric NOT NULL DEFAULT 0,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  UNIQUE (empresa_id, producto_id)
);

-- ── Tabla: vehiculo_documentos ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.vehiculo_documentos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehiculo_id uuid NOT NULL REFERENCES public.vehiculos(id) ON DELETE CASCADE,
  empresa_id  uuid NOT NULL,
  nombre      text NOT NULL,
  archivo_url text NOT NULL,
  tipo        text,
  created_at  timestamptz DEFAULT now(),
  created_by  uuid REFERENCES public.users(id) ON DELETE NO ACTION
);

-- ── Funciones que dependen de tablas ────────────────────────
CREATE OR REPLACE FUNCTION public.get_my_empresa_id()
RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT empresa_id FROM public.users WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
$$;

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS public.user_role LANGUAGE sql STABLE AS $$
  SELECT role FROM users WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.check_user_status(user_email text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE result JSON;
BEGIN
  SELECT json_build_object('exists', true, 'activo', COALESCE(u.activo, u.active, false))
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

CREATE OR REPLACE FUNCTION public.list_users_with_auth_status()
RETURNS TABLE (id uuid, email text, nombre text, rol text, activo boolean, active boolean, empresa_id uuid, created_at timestamptz, last_sign_in_at timestamptz)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT u.id, u.email, u.nombre, COALESCE(u.rol, u.role::text) AS rol, u.activo, u.active, u.empresa_id, u.created_at, a.last_sign_in_at
  FROM public.users u
  LEFT JOIN auth.users a ON a.id = u.id
  ORDER BY u.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_user(target_uid uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND rol = 'admin') THEN
    RAISE EXCEPTION 'Not authorized: must be admin';
  END IF;
  IF target_uid = auth.uid() THEN
    RAISE EXCEPTION 'Cannot delete your own account';
  END IF;
  DELETE FROM auth.users WHERE id = target_uid;
  DELETE FROM public.users WHERE id = target_uid;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_nombre TEXT;
  v_rol    TEXT;
BEGIN
  v_nombre := COALESCE(NEW.raw_user_meta_data->>'nombre', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
  v_rol    := COALESCE(NEW.raw_user_meta_data->>'rol', 'agente');
  DELETE FROM public.users WHERE email = NEW.email AND id <> NEW.id;
  INSERT INTO public.users (id, email, full_name, role, nombre, rol, empresa_id)
  VALUES (NEW.id, NEW.email, v_nombre, v_rol::public.user_role, v_nombre, v_rol, (NEW.raw_user_meta_data->>'empresa_id')::uuid)
  ON CONFLICT (id) DO UPDATE SET
    full_name  = COALESCE(EXCLUDED.full_name,  public.users.full_name),
    nombre     = COALESCE(EXCLUDED.nombre,     public.users.nombre),
    rol        = COALESCE(EXCLUDED.rol,        public.users.rol),
    empresa_id = COALESCE(EXCLUDED.empresa_id, public.users.empresa_id);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_vencimiento_task()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.numero_poliza IS NOT NULL THEN
    INSERT INTO tareas (tipo, estado, titulo, poliza_id, fecha_vencimiento, created_by)
    VALUES ('automatica', 'pendiente', 'Póliza por vencer: ' || NEW.numero_poliza, NEW.id, NEW.fecha_vencimiento - INTERVAL '30 days', NEW.agente_id);
  END IF;
  RETURN NEW;
END;
$$;

-- ── Trigger: auth.users → public.users ──────────────────────
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── Triggers: updated_at ────────────────────────────────────
CREATE OR REPLACE FUNCTION _trigger_updated_at(tbl regclass) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated_at ON %s; CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION update_updated_at()', tbl, tbl, tbl, tbl);
END $$;
SELECT _trigger_updated_at('public.aseguradoras');
SELECT _trigger_updated_at('public.clientes');
SELECT _trigger_updated_at('public.emisiones');
SELECT _trigger_updated_at('public.polizas');
SELECT _trigger_updated_at('public.productos');
SELECT _trigger_updated_at('public.requerimientos_pago');
SELECT _trigger_updated_at('public.tareas');
SELECT _trigger_updated_at('public.users');
SELECT _trigger_updated_at('public.vehiculos');
SELECT _trigger_updated_at('public.recargo_fraccionamiento');
DROP FUNCTION _trigger_updated_at(regclass);

-- ── Triggers: auto_set_empresa_id ───────────────────────────
CREATE OR REPLACE FUNCTION _trigger_empresa(tbl regclass) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE format('DROP TRIGGER IF EXISTS trg_auto_empresa_id ON %s; CREATE TRIGGER trg_auto_empresa_id BEFORE INSERT ON %s FOR EACH ROW EXECUTE FUNCTION auto_set_empresa_id()', tbl, tbl);
END $$;
SELECT _trigger_empresa('public.aseguradoras');
SELECT _trigger_empresa('public.bitacora_polizas');
SELECT _trigger_empresa('public.clientes');
SELECT _trigger_empresa('public.coberturas');
SELECT _trigger_empresa('public.conglomerados');
SELECT _trigger_empresa('public.documentos');
SELECT _trigger_empresa('public.emision_coberturas');
SELECT _trigger_empresa('public.emision_vehiculos');
SELECT _trigger_empresa('public.emisiones');
SELECT _trigger_empresa('public.informes_enviados');
SELECT _trigger_empresa('public.personas_facturables');
SELECT _trigger_empresa('public.polizas');
SELECT _trigger_empresa('public.producto_comisiones');
SELECT _trigger_empresa('public.productos');
SELECT _trigger_empresa('public.recargo_fraccionamiento');
SELECT _trigger_empresa('public.requerimientos_pago');
SELECT _trigger_empresa('public.solicitud_vehiculos');
SELECT _trigger_empresa('public.tareas');
SELECT _trigger_empresa('public.vehiculos');
DROP FUNCTION _trigger_empresa(regclass);

-- ── Trigger: póliza vencimiento ─────────────────────────────
DROP TRIGGER IF EXISTS trg_poliza_vencimiento ON public.polizas;
CREATE TRIGGER trg_poliza_vencimiento
  AFTER INSERT ON public.polizas
  FOR EACH ROW EXECUTE FUNCTION public.create_vencimiento_task();

-- ── RLS ─────────────────────────────────────────────────────
ALTER TABLE public.configuracion_empresa  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conglomerados          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aseguradoras           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coberturas             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coberturas_catalogo    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.producto_coberturas_catalogo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recargo_fraccionamiento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personas_facturables   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehiculos              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.polizas                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emisiones              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emision_coberturas     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emision_vehiculos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solicitud_vehiculos    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bitacora_polizas       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poliza_documentos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.informes_enviados      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requerimientos_pago    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bitacora_seguimiento_reqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reclamos               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reclamos_bitacora      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reclamos_documentos    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tareas                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.producto_comisiones    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehiculo_documentos    ENABLE ROW LEVEL SECURITY;

-- Políticas: configuracion_empresa
CREATE POLICY ce_select ON public.configuracion_empresa FOR SELECT USING (id = get_my_empresa_id());
CREATE POLICY ce_insert ON public.configuracion_empresa FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY ce_update ON public.configuracion_empresa FOR UPDATE USING (id = get_my_empresa_id()) WITH CHECK (id = get_my_empresa_id());

-- Políticas: users
CREATE POLICY users_select ON public.users FOR SELECT USING (id = auth.uid() OR empresa_id = get_my_empresa_id());
CREATE POLICY users_insert ON public.users FOR INSERT WITH CHECK (id = auth.uid() OR empresa_id = get_my_empresa_id());
CREATE POLICY users_update ON public.users FOR UPDATE USING (id = auth.uid() OR (empresa_id = get_my_empresa_id() AND is_admin())) WITH CHECK (id = auth.uid() OR (empresa_id = get_my_empresa_id() AND is_admin()));
CREATE POLICY users_delete ON public.users FOR DELETE USING (empresa_id = get_my_empresa_id() AND is_admin());

-- Políticas tenant (empresa_id)
DO $$
DECLARE tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'aseguradoras','bitacora_polizas','clientes','coberturas','conglomerados',
    'documentos','emision_coberturas','emision_vehiculos','emisiones',
    'informes_enviados','personas_facturables','polizas','producto_comisiones',
    'productos','recargo_fraccionamiento','requerimientos_pago',
    'solicitud_vehiculos','vehiculos'
  ]
  LOOP
    EXECUTE format('CREATE POLICY tenant ON public.%I FOR ALL USING (empresa_id = get_my_empresa_id()) WITH CHECK (empresa_id = get_my_empresa_id())', tbl);
  END LOOP;
END $$;

-- Políticas especiales
CREATE POLICY "tenant bitacora_seguimiento_reqs" ON public.bitacora_seguimiento_reqs FOR ALL USING (empresa_id = get_my_empresa_id());
CREATE POLICY "tenant vehiculo_documentos" ON public.vehiculo_documentos FOR ALL USING (empresa_id = get_my_empresa_id());
CREATE POLICY tareas_general   ON public.tareas FOR ALL USING (empresa_id = get_my_empresa_id() AND asignado_a IS NULL) WITH CHECK (empresa_id = get_my_empresa_id() AND asignado_a IS NULL);
CREATE POLICY tareas_assigned  ON public.tareas FOR ALL USING (empresa_id = get_my_empresa_id() AND asignado_a IS NOT NULL AND (created_by = auth.uid() OR asignado_a = auth.uid())) WITH CHECK (empresa_id = get_my_empresa_id() AND asignado_a IS NOT NULL AND (created_by = auth.uid() OR asignado_a = auth.uid()));
CREATE POLICY allow_all_poliza_documentos ON public.poliza_documentos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY empresa_reclamos           ON public.reclamos           FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY empresa_reclamos_bitacora  ON public.reclamos_bitacora  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY empresa_reclamos_documentos ON public.reclamos_documentos FOR ALL USING (true) WITH CHECK (true);

-- producto_coberturas_catalogo (no empresa_id, permissive)
CREATE POLICY "tenant pcc" ON public.producto_coberturas_catalogo FOR ALL USING (true) WITH CHECK (true);

-- coberturas_catalogo
CREATE POLICY "tenant cc" ON public.coberturas_catalogo FOR ALL USING (empresa_id = get_my_empresa_id()) WITH CHECK (empresa_id = get_my_empresa_id());

-- ── Storage buckets ──────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public) VALUES
  ('logos',              'logos',              true),
  ('polizas-pdfs',       'polizas-pdfs',       true),
  ('cliente-docs',       'cliente-docs',       false),
  ('reclamos-docs',      'reclamos-docs',      false),
  ('polizas-docs',       'polizas-docs',       false),
  ('vehiculo-documentos','vehiculo-documentos', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY logos_select ON storage.objects FOR SELECT USING (bucket_id = 'logos');
CREATE POLICY logos_insert ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'logos' AND auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = get_my_empresa_id()::text);
CREATE POLICY logos_update ON storage.objects FOR UPDATE USING (bucket_id = 'logos' AND (storage.foldername(name))[1] = get_my_empresa_id()::text);
CREATE POLICY logos_delete ON storage.objects FOR DELETE USING (bucket_id = 'logos' AND (storage.foldername(name))[1] = get_my_empresa_id()::text);

CREATE POLICY polizas_pdfs_select ON storage.objects FOR SELECT USING (bucket_id = 'polizas-pdfs' AND (storage.foldername(name))[1] = get_my_empresa_id()::text);
CREATE POLICY polizas_pdfs_insert ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'polizas-pdfs' AND auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = get_my_empresa_id()::text);
CREATE POLICY polizas_pdfs_update ON storage.objects FOR UPDATE USING (bucket_id = 'polizas-pdfs' AND (storage.foldername(name))[1] = get_my_empresa_id()::text);
CREATE POLICY polizas_pdfs_delete ON storage.objects FOR DELETE USING (bucket_id = 'polizas-pdfs' AND (storage.foldername(name))[1] = get_my_empresa_id()::text);

CREATE POLICY "cliente-docs-tenant" ON storage.objects FOR ALL USING (bucket_id = 'cliente-docs' AND (storage.foldername(name))[1] = get_my_empresa_id()::text) WITH CHECK (bucket_id = 'cliente-docs' AND (storage.foldername(name))[1] = get_my_empresa_id()::text);

CREATE POLICY reclamos_docs_access ON storage.objects FOR ALL USING (bucket_id = 'reclamos-docs') WITH CHECK (bucket_id = 'reclamos-docs');

CREATE POLICY allow_all_polizas_docs ON storage.objects FOR ALL USING (bucket_id = 'polizas-docs') WITH CHECK (bucket_id = 'polizas-docs');

CREATE POLICY "Authenticated upload vehiculo docs" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'vehiculo-documentos');
CREATE POLICY "Authenticated read vehiculo docs"   ON storage.objects FOR SELECT USING (bucket_id = 'vehiculo-documentos');
CREATE POLICY "Authenticated delete vehiculo docs" ON storage.objects FOR DELETE USING (bucket_id = 'vehiculo-documentos');
