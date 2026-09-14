
-- ROLES
CREATE TYPE public.app_role AS ENUM ('lider','closer','sdr');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_lider()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'lider');
$$;

CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_lider());
CREATE POLICY "profiles_insert_self" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_lider()) WITH CHECK (id = auth.uid() OR public.is_lider());

CREATE POLICY "roles_select" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_lider());

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role public.app_role;
  v_count int;
BEGIN
  INSERT INTO public.profiles (id, nome)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email,'@',1)));

  SELECT count(*) INTO v_count FROM public.user_roles;
  IF v_count = 0 THEN
    v_role := 'lider';
  ELSE
    v_role := COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'closer');
    IF v_role = 'lider' THEN v_role := 'closer'; END IF;
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- CEREBRO CX
CREATE TABLE public.ofertas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text NOT NULL DEFAULT '',
  preco_condicoes text NOT NULL DEFAULT '',
  garantia text NOT NULL DEFAULT '',
  diferenciais text NOT NULL DEFAULT '',
  publico_ideal text NOT NULL DEFAULT '',
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ofertas TO authenticated;
GRANT ALL ON public.ofertas TO service_role;
ALTER TABLE public.ofertas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ofertas_read" ON public.ofertas FOR SELECT TO authenticated USING (true);
CREATE POLICY "ofertas_write" ON public.ofertas FOR ALL TO authenticated
  USING (public.is_lider()) WITH CHECK (public.is_lider());

CREATE TABLE public.objecoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oferta_id uuid REFERENCES public.ofertas(id) ON DELETE CASCADE,
  categoria text NOT NULL DEFAULT 'outra',
  gatilho text NOT NULL DEFAULT '',
  como_quebrar text NOT NULL DEFAULT '',
  pergunta_pronta text NOT NULL DEFAULT '',
  ativo boolean NOT NULL DEFAULT true,
  ordem int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.objecoes TO authenticated;
GRANT ALL ON public.objecoes TO service_role;
ALTER TABLE public.objecoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "objecoes_read" ON public.objecoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "objecoes_write" ON public.objecoes FOR ALL TO authenticated
  USING (public.is_lider()) WITH CHECK (public.is_lider());

CREATE TABLE public.perfis_disc (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL UNIQUE,
  como_identificar text NOT NULL DEFAULT '',
  como_conduzir text NOT NULL DEFAULT '',
  evitar text NOT NULL DEFAULT ''
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.perfis_disc TO authenticated;
GRANT ALL ON public.perfis_disc TO service_role;
ALTER TABLE public.perfis_disc ENABLE ROW LEVEL SECURITY;
CREATE POLICY "disc_read" ON public.perfis_disc FOR SELECT TO authenticated USING (true);
CREATE POLICY "disc_write" ON public.perfis_disc FOR ALL TO authenticated
  USING (public.is_lider()) WITH CHECK (public.is_lider());

CREATE TABLE public.regras_copiloto (
  chave text PRIMARY KEY,
  valor text NOT NULL DEFAULT '',
  descricao_ajuda text NOT NULL DEFAULT ''
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.regras_copiloto TO authenticated;
GRANT ALL ON public.regras_copiloto TO service_role;
ALTER TABLE public.regras_copiloto ENABLE ROW LEVEL SECURITY;
CREATE POLICY "regras_read" ON public.regras_copiloto FOR SELECT TO authenticated USING (true);
CREATE POLICY "regras_write" ON public.regras_copiloto FOR ALL TO authenticated
  USING (public.is_lider()) WITH CHECK (public.is_lider());

CREATE TABLE public.config_api (
  chave text PRIMARY KEY,
  valor text NOT NULL DEFAULT '',
  descricao_ajuda text NOT NULL DEFAULT ''
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.config_api TO authenticated;
GRANT ALL ON public.config_api TO service_role;
ALTER TABLE public.config_api ENABLE ROW LEVEL SECURITY;
CREATE POLICY "config_read" ON public.config_api FOR SELECT TO authenticated USING (true);
CREATE POLICY "config_write" ON public.config_api FOR ALL TO authenticated
  USING (public.is_lider()) WITH CHECK (public.is_lider());

-- CALLS
CREATE TABLE public.calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendedor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  oferta_id uuid REFERENCES public.ofertas(id) ON DELETE SET NULL,
  nome_lead text NOT NULL DEFAULT '',
  origem_lead text NOT NULL DEFAULT '',
  notas_crm text NOT NULL DEFAULT '',
  objetivo text NOT NULL DEFAULT '',
  tipo text NOT NULL DEFAULT 'closer',
  resumo_falas_antigas text,
  iniciada_em timestamptz NOT NULL DEFAULT now(),
  encerrada_em timestamptz,
  resumo_final jsonb
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.calls TO authenticated;
GRANT ALL ON public.calls TO service_role;
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "calls_select" ON public.calls FOR SELECT TO authenticated
  USING (vendedor_id = auth.uid() OR public.is_lider());
CREATE POLICY "calls_insert" ON public.calls FOR INSERT TO authenticated
  WITH CHECK (vendedor_id = auth.uid());
CREATE POLICY "calls_update" ON public.calls FOR UPDATE TO authenticated
  USING (vendedor_id = auth.uid() OR public.is_lider())
  WITH CHECK (vendedor_id = auth.uid() OR public.is_lider());
CREATE POLICY "calls_delete" ON public.calls FOR DELETE TO authenticated
  USING (vendedor_id = auth.uid() OR public.is_lider());

CREATE TABLE public.falas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id uuid NOT NULL REFERENCES public.calls(id) ON DELETE CASCADE,
  falante text NOT NULL DEFAULT 'cliente',
  texto text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX falas_call_idx ON public.falas(call_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.falas TO authenticated;
GRANT ALL ON public.falas TO service_role;
ALTER TABLE public.falas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "falas_all" ON public.falas FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.calls c WHERE c.id = call_id AND (c.vendedor_id = auth.uid() OR public.is_lider())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.calls c WHERE c.id = call_id AND (c.vendedor_id = auth.uid() OR public.is_lider())));

CREATE TABLE public.sugestoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id uuid NOT NULL REFERENCES public.calls(id) ON DELETE CASCADE,
  fala_id uuid REFERENCES public.falas(id) ON DELETE SET NULL,
  resposta jsonb NOT NULL DEFAULT '{}'::jsonb,
  latencia_ms int,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sugestoes_call_idx ON public.sugestoes(call_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sugestoes TO authenticated;
GRANT ALL ON public.sugestoes TO service_role;
ALTER TABLE public.sugestoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sugestoes_all" ON public.sugestoes FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.calls c WHERE c.id = call_id AND (c.vendedor_id = auth.uid() OR public.is_lider())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.calls c WHERE c.id = call_id AND (c.vendedor_id = auth.uid() OR public.is_lider())));

-- SEED
INSERT INTO public.perfis_disc (tipo, como_identificar, como_conduzir, evitar) VALUES
('D','Fala rápido, direto, foca em resultado e tempo, interrompe, pergunta "quanto custa" e "quanto tempo" cedo.','Perguntas curtas, mostre impacto no resultado, dê opções e deixe ele decidir.','Rodeio, história longa, excesso de detalhe técnico.'),
('I','Entusiasmado, fala de pessoas e sensações, conta histórias, ri, dispersa.','Valide, use exemplos de outras pessoas, mantenha energia, traga de volta ao ponto com leveza.','Planilha de números, frieza, cortar a história dele.'),
('S','Ritmo calmo, pergunta sobre suporte, processo e risco, menciona equipe ou família, evita conflito.','Garantias, próximos passos claros, ritmo tranquilo, mostre que ele não vai ficar sozinho.','Pressão, urgência artificial, mudanças bruscas de assunto.'),
('C','Pede dados, compara, questiona a lógica, quer saber "como funciona exatamente".','Números, prova, comparação estruturada, responda com precisão.','Superlativos vazios, promessas sem base, "confia em mim".');

INSERT INTO public.regras_copiloto (chave, valor, descricao_ajuda) VALUES
('persona','Você é o Copiloto CX, assistente em tempo real de um closer/SDR da Comercial 10X durante uma reunião ou ligação de vendas. Você escuta a transcrição ao vivo e, a cada nova fala do cliente, orienta o vendedor sobre o próximo passo.','Quem é o copiloto. Abre o prompt e define o papel dele.'),
('regras_conduta','Você NÃO fala com o cliente. Você orienta o vendedor. Nunca escreva como se fosse o vendedor respondendo.
Seja curto. O vendedor lê em 3 segundos enquanto o cliente fala.
Só sugira algo novo quando a fala do cliente mudar o jogo: nova objeção, nova informação, mudança de tom, sinal de compra, pergunta direta. Se nada mudou, responda "manter".
Uma pergunta por vez, em linguagem falada, sem jargão de vendas.
Não interprete silêncio, ruído ou fala cortada como sinal.
Se o cliente ficar hostil ou pedir para encerrar, oriente a respeitar. Sem táticas de pressão.
Não fixe o perfil DISC nos primeiros 2 minutos; suba a confiança conforme a call avança.','Regras de comportamento do copiloto durante a call.'),
('etapas_spin','Situação: entender o contexto atual do cliente. Problema: fazer o cliente nomear a dor. Implicação: fazer o cliente sentir o custo de não resolver. Necessidade: fazer o cliente verbalizar o que a solução precisa entregar. Fechamento: conduzir ao próximo passo concreto. Sinalize quando o vendedor pular etapa (ex.: apresentou solução sem passar por implicação).','Como o copiloto entende cada etapa do SPIN.'),
('instrucoes_livres','','Regras da operação. Ex.: "nunca ofereça desconto antes do cliente pedir duas vezes".'),
('formato_saida_extra','','Instruções extras sobre o formato da resposta. Deixe vazio se não precisar.');

INSERT INTO public.config_api (chave, valor, descricao_ajuda) VALUES
('modelo_claude','claude-sonnet-4-6','Modelo da Anthropic usado nas sugestões.'),
('max_tokens','600','Tamanho máximo da resposta do modelo.'),
('provedor_transcricao','deepgram','Serviço de transcrição ao vivo.'),
('idioma','pt-BR','Idioma da transcrição.'),
('min_palavras_para_analisar','6','Mínimo de palavras na fala do cliente para acionar uma sugestão.');

WITH o AS (
  INSERT INTO public.ofertas (nome, descricao, preco_condicoes, garantia, diferenciais, publico_ideal)
  VALUES ('Mentoria Comercial 10X (exemplo)',
    'Programa de 12 semanas para estruturar o time comercial e dobrar a taxa de conversão.',
    'R$ 12.000 à vista ou 12x de R$ 1.190 no cartão. Entrada de 20% para pagamento parcelado.',
    '7 dias de garantia incondicional a partir do primeiro encontro.',
    'Método CX aplicado ao seu funil, playbook de objeções personalizado, acompanhamento semanal com o time, gravações e materiais vitalícios.',
    'Empresas de serviço com time comercial de 3 a 20 pessoas e faturamento acima de R$ 100 mil/mês.')
  RETURNING id
)
INSERT INTO public.objecoes (oferta_id, categoria, gatilho, como_quebrar, pergunta_pronta, ordem)
SELECT o.id, x.categoria, x.gatilho, x.como_quebrar, x.pergunta_pronta, x.ordem FROM o, (VALUES
  ('preco','"Está caro", "não tenho esse orçamento agora", "preciso ver o investimento"','Não defenda o preço. Traga o custo de continuar como está e compare com o retorno de uma única venda a mais por mês. Só fale de condição de pagamento depois que o valor estiver claro.','Se o time fechasse só uma venda a mais por mês, quanto isso representaria em faturamento?',1),
  ('tempo','"Agora não é o momento", "vamos deixar para o próximo semestre"','Faça o cliente calcular o custo da espera em vez de argumentar urgência. Traga a implicação concreta de mais 6 meses no cenário atual.','O que precisa acontecer entre hoje e lá para esse ser o momento certo?',2),
  ('confianca','"Já tentei outras coisas e não funcionou", "como sei que vai dar certo comigo?"','Valide a frustração, pergunte o que exatamente falhou antes e mostre a diferença de método. Mencione a garantia quando fizer sentido.','O que foi diferente na última vez que você tentou resolver isso?',3)
) AS x(categoria,gatilho,como_quebrar,pergunta_pronta,ordem);
