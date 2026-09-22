REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_adm() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_lider() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.pode_ver_tudo() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_adm() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_lider() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.pode_ver_tudo() TO authenticated, service_role;