-- regras_copiloto: passa a ter id próprio e vínculo opcional com produto
ALTER TABLE public.regras_copiloto ADD COLUMN IF NOT EXISTS id uuid NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE public.regras_copiloto ADD COLUMN IF NOT EXISTS oferta_id uuid REFERENCES public.ofertas(id) ON DELETE CASCADE;
ALTER TABLE public.regras_copiloto DROP CONSTRAINT IF EXISTS regras_copiloto_pkey;
ALTER TABLE public.regras_copiloto ADD CONSTRAINT regras_copiloto_pkey PRIMARY KEY (id);
CREATE UNIQUE INDEX IF NOT EXISTS regras_copiloto_chave_global_uidx
  ON public.regras_copiloto (chave) WHERE oferta_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS regras_copiloto_chave_oferta_uidx
  ON public.regras_copiloto (chave, oferta_id) WHERE oferta_id IS NOT NULL;

-- perguntas_qualificacao
ALTER TABLE public.perguntas_qualificacao ADD COLUMN IF NOT EXISTS oferta_id uuid REFERENCES public.ofertas(id) ON DELETE CASCADE;
ALTER TABLE public.perguntas_qualificacao ADD COLUMN IF NOT EXISTS oculto boolean NOT NULL DEFAULT false;
ALTER TABLE public.perguntas_qualificacao ADD COLUMN IF NOT EXISTS base_id uuid REFERENCES public.perguntas_qualificacao(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS perguntas_qualificacao_oferta_idx ON public.perguntas_qualificacao (oferta_id);

-- criterios_qualificacao
ALTER TABLE public.criterios_qualificacao ADD COLUMN IF NOT EXISTS oferta_id uuid REFERENCES public.ofertas(id) ON DELETE CASCADE;
ALTER TABLE public.criterios_qualificacao ADD COLUMN IF NOT EXISTS oculto boolean NOT NULL DEFAULT false;
ALTER TABLE public.criterios_qualificacao ADD COLUMN IF NOT EXISTS base_id uuid REFERENCES public.criterios_qualificacao(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS criterios_qualificacao_oferta_idx ON public.criterios_qualificacao (oferta_id);