-- Allow multiple commission rates per plazo per aseguradora (feature: named rates)
-- Each rate gets a "nombre" (e.g. "Estándar", "Negociado") so the same cuota count
-- can have multiple rates to choose from when creating a póliza.

-- 1. Add nombre column with default so existing rows get 'Estándar'
ALTER TABLE recargo_fraccionamiento
  ADD COLUMN IF NOT EXISTS nombre text NOT NULL DEFAULT 'Estándar';

-- 2. Drop the old unique constraint (empresa_id, aseguradora_id, numero_cuotas)
ALTER TABLE recargo_fraccionamiento
  DROP CONSTRAINT IF EXISTS recargo_fraccionamiento_empresa_id_aseguradora_id_numero_cuotas_key;

-- 3. Add new unique constraint that includes nombre
ALTER TABLE recargo_fraccionamiento
  ADD CONSTRAINT recargo_fraccionamiento_empresa_aseg_cuotas_nombre_key
  UNIQUE (empresa_id, aseguradora_id, numero_cuotas, nombre);
