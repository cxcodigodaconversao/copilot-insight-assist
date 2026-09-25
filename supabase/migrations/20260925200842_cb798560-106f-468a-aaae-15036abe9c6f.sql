CREATE TABLE public.documentos_cerebro (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oferta_id uuid REFERENCES public.ofertas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  tipo text NOT NULL DEFAULT '',
  tamanho integer NOT NULL DEFAULT 0,
  texto text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'lido',
  erro text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documentos_cerebro TO authenticated;
GRANT ALL ON public.documentos_cerebro TO service_role;
ALTER TABLE public.documentos_cerebro ENABLE ROW LEVEL SECURITY;
CREATE POLICY docs_cerebro_read ON public.documentos_cerebro FOR SELECT TO authenticated USING (true);
CREATE POLICY docs_cerebro_write ON public.documentos_cerebro FOR ALL TO authenticated USING (public.is_adm()) WITH CHECK (public.is_adm());
CREATE INDEX documentos_cerebro_oferta_idx ON public.documentos_cerebro(oferta_id);
INSERT INTO public.config_api (chave, valor, descricao_ajuda)
VALUES ('pausa_fim_fala_ms', '800', 'Tempo de silêncio (em milissegundos) para considerar que a pessoa terminou de falar. Menor = mais rápido, maior = corta menos frases.')
ON CONFLICT (chave) DO NOTHING;