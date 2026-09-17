CREATE TABLE IF NOT EXISTS public.closers_cadastro (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  ordem int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.closers_cadastro TO authenticated;
GRANT ALL ON public.closers_cadastro TO service_role;
ALTER TABLE public.closers_cadastro ENABLE ROW LEVEL SECURITY;
CREATE POLICY "closers_cad_read" ON public.closers_cadastro FOR SELECT TO authenticated USING (true);
CREATE POLICY "closers_cad_write" ON public.closers_cadastro FOR ALL TO authenticated USING (public.is_adm()) WITH CHECK (public.is_adm());

CREATE TABLE IF NOT EXISTS public.sdrs_cadastro (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  ordem int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sdrs_cadastro TO authenticated;
GRANT ALL ON public.sdrs_cadastro TO service_role;
ALTER TABLE public.sdrs_cadastro ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sdrs_cad_read" ON public.sdrs_cadastro FOR SELECT TO authenticated USING (true);
CREATE POLICY "sdrs_cad_write" ON public.sdrs_cadastro FOR ALL TO authenticated USING (public.is_adm()) WITH CHECK (public.is_adm());

ALTER TABLE public.calls
  ADD COLUMN IF NOT EXISTS closer_nome text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS sdr_nome text NOT NULL DEFAULT '';