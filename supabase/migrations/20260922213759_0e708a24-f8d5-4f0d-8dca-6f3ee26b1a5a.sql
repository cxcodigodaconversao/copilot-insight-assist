ALTER TABLE public.perguntas_qualificacao
  ADD COLUMN IF NOT EXISTS etapa text NOT NULL DEFAULT 'diagnostico',
  ADD COLUMN IF NOT EXISTS obrigatoria boolean NOT NULL DEFAULT true;

ALTER TABLE public.perguntas_qualificacao
  DROP CONSTRAINT IF EXISTS perguntas_qualificacao_etapa_check;

ALTER TABLE public.perguntas_qualificacao
  ADD CONSTRAINT perguntas_qualificacao_etapa_check CHECK (
    etapa IN ('apresentacao', 'motivo', 'diagnostico', 'dor_implicacao', 'interesse', 'agendamento', 'validacao', 'compromisso', 'encerramento')
  );

WITH limites AS (
  SELECT oferta_id, max(ordem) AS maior_ordem
  FROM public.perguntas_qualificacao
  WHERE ativo = true AND oculto = false
  GROUP BY oferta_id
)
UPDATE public.perguntas_qualificacao p
SET etapa = CASE
  WHEN p.categoria = 'momento' AND p.ordem = l.maior_ordem THEN 'agendamento'
  WHEN p.categoria = 'momento' THEN 'motivo'
  WHEN p.categoria IN ('fit', 'autoridade') THEN 'diagnostico'
  WHEN p.categoria = 'dor' THEN 'dor_implicacao'
  WHEN p.categoria IN ('urgencia', 'orcamento') THEN 'interesse'
  ELSE 'diagnostico'
END
FROM limites l
WHERE p.oferta_id IS NOT DISTINCT FROM l.oferta_id;

ALTER TABLE public.calls ALTER COLUMN turno_copiloto TYPE bigint;

CREATE OR REPLACE FUNCTION public.iniciar_turno_copiloto(
  _call_id uuid,
  _turno bigint,
  _oferta_id uuid,
  _cerebro_versao text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  _estado jsonb;
BEGIN
  UPDATE public.calls
  SET turno_copiloto = GREATEST(turno_copiloto + 1, _turno),
      estado_qualificacao = estado_qualificacao || jsonb_build_object(
        'oferta_id', _oferta_id,
        'cerebro_versao', _cerebro_versao,
        'turno', GREATEST(turno_copiloto + 1, _turno)
      )
  WHERE id = _call_id
    AND tipo = 'sdr'
    AND oferta_id = _oferta_id
    AND turno_copiloto < _turno
    AND (vendedor_id = auth.uid() OR public.pode_ver_tudo())
  RETURNING estado_qualificacao INTO _estado;

  RETURN _estado;
END;
$$;

CREATE OR REPLACE FUNCTION public.concluir_turno_copiloto(
  _call_id uuid,
  _turno bigint,
  _estado jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  _atualizado integer;
BEGIN
  UPDATE public.calls
  SET estado_qualificacao = _estado
  WHERE id = _call_id
    AND tipo = 'sdr'
    AND turno_copiloto = _turno
    AND (vendedor_id = auth.uid() OR public.pode_ver_tudo());

  GET DIAGNOSTICS _atualizado = ROW_COUNT;
  RETURN _atualizado = 1;
END;
$$;

REVOKE ALL ON FUNCTION public.iniciar_turno_copiloto(uuid, integer, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.concluir_turno_copiloto(uuid, integer, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.iniciar_turno_copiloto(uuid, bigint, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.iniciar_turno_copiloto(uuid, bigint, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.concluir_turno_copiloto(uuid, bigint, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.concluir_turno_copiloto(uuid, bigint, jsonb) TO service_role;