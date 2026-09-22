WITH ordenadas AS (
  SELECT id, ordem,
    row_number() OVER (ORDER BY ordem, created_at, id) AS posicao,
    count(*) OVER () AS total
  FROM public.perguntas_qualificacao
  WHERE oferta_id = '8f071e81-be93-41a0-bb51-bf20740c1d8f'::uuid
    AND ativo = true AND oculto = false
)
UPDATE public.perguntas_qualificacao p
SET etapa = CASE
  WHEN o.posicao = 1 THEN 'motivo'
  WHEN o.posicao <= 4 THEN 'diagnostico'
  WHEN o.posicao <= 6 THEN 'dor_implicacao'
  WHEN o.posicao < o.total THEN 'interesse'
  ELSE 'agendamento'
END
FROM ordenadas o
WHERE p.id = o.id;