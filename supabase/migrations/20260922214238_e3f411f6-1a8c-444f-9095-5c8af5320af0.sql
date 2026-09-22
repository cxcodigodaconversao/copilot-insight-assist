ALTER TABLE public.calls ALTER COLUMN estado_qualificacao SET DEFAULT jsonb_build_object(
  'etapa_atual', 'apresentacao',
  'etapas_concluidas', '[]'::jsonb,
  'perguntas_respondidas', '[]'::jsonb,
  'perguntas_puladas', '[]'::jsonb,
  'pergunta_pendente_id', null,
  'criterios_atendidos', '[]'::jsonb,
  'respostas_coletadas', '{}'::jsonb,
  'ultima_orientacao', '',
  'lembrete', null
);

UPDATE public.calls
SET estado_qualificacao = estado_qualificacao
  || jsonb_build_object(
    'perguntas_puladas', COALESCE(estado_qualificacao->'perguntas_puladas', '[]'::jsonb),
    'pergunta_pendente_id', estado_qualificacao->'pergunta_pendente_id'
  )
WHERE tipo = 'sdr';