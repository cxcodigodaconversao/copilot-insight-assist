CREATE OR REPLACE FUNCTION public.iniciar_turno_copiloto(
  _call_id uuid,
  _turno integer,
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
  SET turno_copiloto = _turno,
      estado_qualificacao = estado_qualificacao || jsonb_build_object(
        'oferta_id', _oferta_id,
        'cerebro_versao', _cerebro_versao,
        'turno', _turno
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
  _turno integer,
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