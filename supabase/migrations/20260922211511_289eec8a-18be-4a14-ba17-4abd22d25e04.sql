REVOKE ALL ON FUNCTION public.iniciar_turno_copiloto(uuid, integer, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.concluir_turno_copiloto(uuid, integer, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.iniciar_turno_copiloto(uuid, integer, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.iniciar_turno_copiloto(uuid, integer, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.concluir_turno_copiloto(uuid, integer, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.concluir_turno_copiloto(uuid, integer, jsonb) TO service_role;