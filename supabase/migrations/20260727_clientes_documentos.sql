-- ── Tabla: clientes_documentos ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.clientes_documentos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id  uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  empresa_id  uuid,
  nombre      text NOT NULL,
  url         text NOT NULL,
  created_by  uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at  timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.clientes_documentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant clientes_documentos" ON public.clientes_documentos
  FOR ALL USING (empresa_id = get_my_empresa_id());

-- Storage bucket for client docs (already exists as 'cliente-docs', but adding policy if missing)
INSERT INTO storage.buckets (id, name, public) VALUES ('cliente-docs', 'cliente-docs', false)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated upload cliente docs"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'cliente-docs' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated read cliente docs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'cliente-docs' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated delete cliente docs"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'cliente-docs' AND auth.role() = 'authenticated');
