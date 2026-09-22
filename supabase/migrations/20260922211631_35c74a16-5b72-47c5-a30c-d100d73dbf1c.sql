UPDATE public.perguntas_qualificacao
SET categoria = CASE ordem
  WHEN 1 THEN 'momento'
  WHEN 2 THEN 'fit'
  WHEN 3 THEN 'fit'
  WHEN 4 THEN 'fit'
  WHEN 5 THEN 'dor'
  WHEN 6 THEN 'dor'
  WHEN 7 THEN 'urgencia'
  WHEN 8 THEN 'autoridade'
  WHEN 9 THEN 'momento'
  ELSE categoria
END
WHERE oferta_id = 'd52fe013-d696-4383-b7a2-b4f94ffe9037';