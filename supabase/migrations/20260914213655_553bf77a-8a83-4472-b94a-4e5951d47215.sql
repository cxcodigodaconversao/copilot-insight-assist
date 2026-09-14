ALTER TABLE public.calls
  ADD COLUMN IF NOT EXISTS time text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS closer_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sdr_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cliente text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS modalidade text NOT NULL DEFAULT 'online',
  ADD COLUMN IF NOT EXISTS funil text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS data_reuniao_agendada timestamptz,
  ADD COLUMN IF NOT EXISTS status_reuniao text NOT NULL DEFAULT 'agendada',
  ADD COLUMN IF NOT EXISTS resultado text NOT NULL DEFAULT 'indefinido',
  ADD COLUMN IF NOT EXISTS valor_vendido numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_coletado numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_pendente numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS forma_pagamento text,
  ADD COLUMN IF NOT EXISTS observacoes text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS telefone_lead text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS email_lead text NOT NULL DEFAULT '';

ALTER TABLE public.calls
  ADD CONSTRAINT calls_modalidade_check CHECK (modalidade IN ('online','presencial','telefone')),
  ADD CONSTRAINT calls_status_reuniao_check CHECK (status_reuniao IN ('agendada','no_show','realizada','remarcada')),
  ADD CONSTRAINT calls_resultado_check CHECK (resultado IN ('venda','nao_venda','follow_up','indefinido'));

CREATE INDEX IF NOT EXISTS calls_data_reuniao_idx ON public.calls (data_reuniao_agendada);
CREATE INDEX IF NOT EXISTS calls_status_reuniao_idx ON public.calls (status_reuniao);
CREATE INDEX IF NOT EXISTS calls_resultado_idx ON public.calls (resultado);

CREATE TABLE public.times (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.times TO authenticated;
GRANT ALL ON public.times TO service_role;
ALTER TABLE public.times ENABLE ROW LEVEL SECURITY;
CREATE POLICY times_read ON public.times FOR SELECT TO authenticated USING (true);
CREATE POLICY times_write ON public.times FOR ALL TO authenticated USING (public.is_lider()) WITH CHECK (public.is_lider());

CREATE TABLE public.origens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.origens TO authenticated;
GRANT ALL ON public.origens TO service_role;
ALTER TABLE public.origens ENABLE ROW LEVEL SECURITY;
CREATE POLICY origens_read ON public.origens FOR SELECT TO authenticated USING (true);
CREATE POLICY origens_write ON public.origens FOR ALL TO authenticated USING (public.is_lider()) WITH CHECK (public.is_lider());

CREATE TABLE public.funis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.funis TO authenticated;
GRANT ALL ON public.funis TO service_role;
ALTER TABLE public.funis ENABLE ROW LEVEL SECURITY;
CREATE POLICY funis_read ON public.funis FOR SELECT TO authenticated USING (true);
CREATE POLICY funis_write ON public.funis FOR ALL TO authenticated USING (public.is_lider()) WITH CHECK (public.is_lider());

CREATE TABLE public.clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clientes TO authenticated;
GRANT ALL ON public.clientes TO service_role;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY clientes_read ON public.clientes FOR SELECT TO authenticated USING (true);
CREATE POLICY clientes_write ON public.clientes FOR ALL TO authenticated USING (public.is_lider()) WITH CHECK (public.is_lider());

CREATE TABLE public.modalidades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.modalidades TO authenticated;
GRANT ALL ON public.modalidades TO service_role;
ALTER TABLE public.modalidades ENABLE ROW LEVEL SECURITY;
CREATE POLICY modalidades_read ON public.modalidades FOR SELECT TO authenticated USING (true);
CREATE POLICY modalidades_write ON public.modalidades FOR ALL TO authenticated USING (public.is_lider()) WITH CHECK (public.is_lider());

INSERT INTO public.modalidades (nome, ordem) VALUES ('online', 1), ('presencial', 2), ('telefone', 3);
INSERT INTO public.origens (nome, ordem) VALUES ('Instagram', 1), ('Indicação', 2), ('Tráfego pago', 3), ('Prospecção ativa', 4), ('Evento', 5);

DROP POLICY IF EXISTS profiles_select ON public.profiles;
CREATE POLICY profiles_select ON public.profiles FOR SELECT TO authenticated USING (true);