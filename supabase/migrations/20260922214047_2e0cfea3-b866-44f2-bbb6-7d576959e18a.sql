UPDATE public.perguntas_qualificacao
SET etapa = CASE id
  WHEN '135bbf22-2c6d-41f7-823e-a391c100fb82'::uuid THEN 'motivo'
  WHEN '00c88c4e-c0b8-4bfd-ad99-a5ac39eecd37'::uuid THEN 'diagnostico'
  WHEN 'f42b8c67-71ac-49b7-a034-33942231bfb9'::uuid THEN 'diagnostico'
  WHEN '131d13be-1d6e-4ccd-9484-2650ced81ebc'::uuid THEN 'diagnostico'
  WHEN 'dd49db3d-8564-47e6-995e-dd4f711bf499'::uuid THEN 'dor_implicacao'
  WHEN '39ee8990-5698-40a6-a667-9f31eab8b247'::uuid THEN 'dor_implicacao'
  WHEN 'b92de7ce-14a9-4b69-8018-24d75a903359'::uuid THEN 'interesse'
  WHEN '6e1c30ef-f446-47b8-b55a-2157f8e1cef6'::uuid THEN 'validacao'
  WHEN 'ca6580d1-532c-41b4-8cad-aa994b635e0c'::uuid THEN 'agendamento'
  ELSE etapa
END
WHERE oferta_id = 'd52fe013-d696-4383-b7a2-b4f94ffe9037'::uuid;