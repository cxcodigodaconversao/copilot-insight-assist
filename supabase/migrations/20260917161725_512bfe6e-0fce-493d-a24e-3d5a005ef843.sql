CREATE TABLE public.perguntas_qualificacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria text NOT NULL,
  pergunta text NOT NULL,
  o_que_identificar text NOT NULL DEFAULT '',
  pergunta_followup text,
  ativo boolean NOT NULL DEFAULT true,
  ordem int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.perguntas_qualificacao ADD CONSTRAINT perguntas_qualificacao_categoria_check CHECK (categoria IN ('momento','autoridade','dor','orcamento','fit','urgencia'));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.perguntas_qualificacao TO authenticated;
GRANT ALL ON public.perguntas_qualificacao TO service_role;
ALTER TABLE public.perguntas_qualificacao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "perg_qual_read" ON public.perguntas_qualificacao FOR SELECT TO authenticated USING (true);
CREATE POLICY "perg_qual_write" ON public.perguntas_qualificacao FOR ALL TO authenticated USING (public.is_adm()) WITH CHECK (public.is_adm());

CREATE TABLE public.criterios_qualificacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  criterio text NOT NULL,
  como_identificar text NOT NULL DEFAULT '',
  peso int NOT NULL DEFAULT 1,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.criterios_qualificacao TO authenticated;
GRANT ALL ON public.criterios_qualificacao TO service_role;
ALTER TABLE public.criterios_qualificacao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crit_qual_read" ON public.criterios_qualificacao FOR SELECT TO authenticated USING (true);
CREATE POLICY "crit_qual_write" ON public.criterios_qualificacao FOR ALL TO authenticated USING (public.is_adm()) WITH CHECK (public.is_adm());

ALTER TABLE public.calls
  ADD COLUMN IF NOT EXISTS resultado_sdr text,
  ADD COLUMN IF NOT EXISTS call_origem_id uuid REFERENCES public.calls(id) ON DELETE SET NULL;
ALTER TABLE public.calls
  ADD CONSTRAINT calls_resultado_sdr_check CHECK (resultado_sdr IS NULL OR resultado_sdr IN ('agendado','nao_qualificado','remarcar','sem_resposta'));
CREATE INDEX IF NOT EXISTS calls_call_origem_id_idx ON public.calls(call_origem_id);

INSERT INTO public.perguntas_qualificacao (categoria, pergunta, o_que_identificar, pergunta_followup, ordem) VALUES
('momento', 'O que te fez buscar uma solução agora?', 'Se existe um evento ou urgência real que motivou a busca', 'O que acontece se você não resolver isso nos próximos 3 meses?', 1),
('momento', 'Você já tentou resolver isso antes? Como foi?', 'Experiências anteriores e por que não funcionaram', 'O que você faria diferente dessa vez?', 2),
('autoridade', 'Além de você, quem mais participa dessa decisão?', 'Se o lead é o decisor ou influenciador', 'Como essas pessoas costumam decidir algo assim?', 3),
('autoridade', 'Se decidir avançar, a decisão final é sua?', 'Confirma autoridade de decisão', 'O que você precisaria ver para se sentir seguro em decidir?', 4),
('dor', 'Hoje, qual é o maior gargalo do seu comercial?', 'A dor principal e se ela é clara para o lead', 'Quanto isso está custando por mês, em números?', 5),
('dor', 'Como esse problema afeta seus resultados hoje?', 'Impacto concreto da dor (receita, tempo, equipe)', 'Se resolvesse isso, o que mudaria primeiro?', 6),
('orcamento', 'Vocês têm um orçamento previsto para resolver isso?', 'Se há verba ou disposição de investimento', 'Qual faixa de investimento faria sentido para vocês?', 7),
('orcamento', 'Como vocês costumam aprovar investimentos desse tipo?', 'Processo de aprovação e possíveis travas financeiras', 'Quem precisa aprovar além de você?', 8),
('fit', 'Como funciona seu processo comercial hoje, do início ao fim?', 'Se o cenário do lead combina com a oferta', 'Quantas reuniões vocês fazem por semana hoje?', 9),
('fit', 'O que seria um sucesso absoluto para você nesse projeto?', 'Expectativas alinhadas com o que a oferta entrega', 'Em quanto tempo você espera ver esse resultado?', 10),
('urgencia', 'Para quando você precisa disso resolvido?', 'Se há prazo real ou apenas curiosidade', 'O que está travando para começar já?', 11);

INSERT INTO public.criterios_qualificacao (criterio, como_identificar, peso) VALUES
('Dor clara e mensurável', 'O lead descreve o problema com números ou exemplos concretos, sem generalizar', 3),
('É o decisor', 'Afirma que decide sozinho ou demonstra influência direta sobre quem decide', 3),
('Urgência real', 'Existe prazo ou evento concreto (meta, lançamento, perda de receita) puxando a decisão', 2),
('Capacidade de investimento', 'Tem orçamento ou já investe em soluções parecidas', 2),
('Fit com a oferta', 'Perfil de negócio e momento combinam com o público ideal da oferta', 3),
('Engajamento na call', 'Responde com detalhes, faz perguntas de volta e aceita próximos passos', 1);