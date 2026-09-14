ALTER TABLE public.calls DROP COLUMN IF EXISTS modalidade;
DROP TABLE IF EXISTS public.modalidades;

CREATE TABLE public.convites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  nome text NOT NULL DEFAULT '',
  role public.app_role NOT NULL DEFAULT 'closer',
  status text NOT NULL DEFAULT 'enviado',
  convidado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.convites TO authenticated;
GRANT ALL ON public.convites TO service_role;

ALTER TABLE public.convites ENABLE ROW LEVEL SECURITY;

CREATE POLICY convites_all ON public.convites FOR ALL TO authenticated
  USING (public.is_lider()) WITH CHECK (public.is_lider());