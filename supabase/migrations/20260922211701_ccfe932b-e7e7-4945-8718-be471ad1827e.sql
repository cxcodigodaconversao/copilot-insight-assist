ALTER TABLE public.calls ALTER COLUMN estado_qualificacao SET DEFAULT jsonb_build_object(
  'etapa_atual', 'apresentacao',
  'etapas_concluidas', '[]'::jsonb,
  'perguntas_respondidas', '[]'::jsonb,
  'criterios_atendidos', '[]'::jsonb,
  'respostas_coletadas', '{}'::jsonb,
  'ultima_orientacao', '',
  'lembrete', null
);

UPDATE public.calls
SET estado_qualificacao = jsonb_set(estado_qualificacao, '{etapa_atual}', '"apresentacao"'::jsonb)
WHERE tipo = 'sdr'
  AND estado_qualificacao->>'etapa_atual' = 'abertura'
  AND COALESCE(jsonb_array_length(estado_qualificacao->'perguntas_respondidas'), 0) = 0;