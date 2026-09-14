
CREATE OR REPLACE FUNCTION public.is_adm()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'adm');
$$;

CREATE OR REPLACE FUNCTION public.pode_ver_tudo()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'adm') OR public.has_role(auth.uid(), 'lider');
$$;

REVOKE EXECUTE ON FUNCTION public.is_adm() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.pode_ver_tudo() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_adm() TO authenticated;
GRANT EXECUTE ON FUNCTION public.pode_ver_tudo() TO authenticated;

-- handle_new_user: nunca conceder adm/lider automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role public.app_role;
BEGIN
  INSERT INTO public.profiles (id, nome)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email,'@',1)));

  v_role := COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'closer');
  IF v_role = 'adm' THEN v_role := 'closer'; END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role);
  RETURN NEW;
END;
$$;

-- calls
DROP POLICY IF EXISTS calls_select ON public.calls;
DROP POLICY IF EXISTS calls_insert ON public.calls;
DROP POLICY IF EXISTS calls_update ON public.calls;
DROP POLICY IF EXISTS calls_delete ON public.calls;
CREATE POLICY calls_select ON public.calls FOR SELECT TO authenticated
  USING (vendedor_id = auth.uid() OR public.pode_ver_tudo());
CREATE POLICY calls_insert ON public.calls FOR INSERT TO authenticated
  WITH CHECK (vendedor_id = auth.uid());
CREATE POLICY calls_update ON public.calls FOR UPDATE TO authenticated
  USING (vendedor_id = auth.uid() OR public.is_adm())
  WITH CHECK (vendedor_id = auth.uid() OR public.is_adm());
CREATE POLICY calls_delete ON public.calls FOR DELETE TO authenticated
  USING (public.is_adm());

-- falas
DROP POLICY IF EXISTS falas_all ON public.falas;
CREATE POLICY falas_select ON public.falas FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.calls c WHERE c.id = falas.call_id AND (c.vendedor_id = auth.uid() OR public.pode_ver_tudo())));
CREATE POLICY falas_insert ON public.falas FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.calls c WHERE c.id = falas.call_id AND (c.vendedor_id = auth.uid() OR public.is_adm())));
CREATE POLICY falas_update ON public.falas FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.calls c WHERE c.id = falas.call_id AND (c.vendedor_id = auth.uid() OR public.is_adm())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.calls c WHERE c.id = falas.call_id AND (c.vendedor_id = auth.uid() OR public.is_adm())));
CREATE POLICY falas_delete ON public.falas FOR DELETE TO authenticated
  USING (public.is_adm());

-- sugestoes
DROP POLICY IF EXISTS sugestoes_all ON public.sugestoes;
CREATE POLICY sugestoes_select ON public.sugestoes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.calls c WHERE c.id = sugestoes.call_id AND (c.vendedor_id = auth.uid() OR public.pode_ver_tudo())));
CREATE POLICY sugestoes_insert ON public.sugestoes FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.calls c WHERE c.id = sugestoes.call_id AND (c.vendedor_id = auth.uid() OR public.is_adm())));
CREATE POLICY sugestoes_update ON public.sugestoes FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.calls c WHERE c.id = sugestoes.call_id AND (c.vendedor_id = auth.uid() OR public.is_adm())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.calls c WHERE c.id = sugestoes.call_id AND (c.vendedor_id = auth.uid() OR public.is_adm())));
CREATE POLICY sugestoes_delete ON public.sugestoes FOR DELETE TO authenticated
  USING (public.is_adm());

-- cérebro e cadastros: escrita só adm
DROP POLICY IF EXISTS ofertas_write ON public.ofertas;
CREATE POLICY ofertas_write ON public.ofertas FOR ALL TO authenticated USING (public.is_adm()) WITH CHECK (public.is_adm());
DROP POLICY IF EXISTS objecoes_write ON public.objecoes;
CREATE POLICY objecoes_write ON public.objecoes FOR ALL TO authenticated USING (public.is_adm()) WITH CHECK (public.is_adm());
DROP POLICY IF EXISTS disc_write ON public.perfis_disc;
CREATE POLICY disc_write ON public.perfis_disc FOR ALL TO authenticated USING (public.is_adm()) WITH CHECK (public.is_adm());
DROP POLICY IF EXISTS regras_write ON public.regras_copiloto;
CREATE POLICY regras_write ON public.regras_copiloto FOR ALL TO authenticated USING (public.is_adm()) WITH CHECK (public.is_adm());
DROP POLICY IF EXISTS config_write ON public.config_api;
CREATE POLICY config_write ON public.config_api FOR ALL TO authenticated USING (public.is_adm()) WITH CHECK (public.is_adm());
DROP POLICY IF EXISTS times_write ON public.times;
CREATE POLICY times_write ON public.times FOR ALL TO authenticated USING (public.is_adm()) WITH CHECK (public.is_adm());
DROP POLICY IF EXISTS origens_write ON public.origens;
CREATE POLICY origens_write ON public.origens FOR ALL TO authenticated USING (public.is_adm()) WITH CHECK (public.is_adm());
DROP POLICY IF EXISTS funis_write ON public.funis;
CREATE POLICY funis_write ON public.funis FOR ALL TO authenticated USING (public.is_adm()) WITH CHECK (public.is_adm());
DROP POLICY IF EXISTS clientes_write ON public.clientes;
CREATE POLICY clientes_write ON public.clientes FOR ALL TO authenticated USING (public.is_adm()) WITH CHECK (public.is_adm());
DROP POLICY IF EXISTS convites_all ON public.convites;
CREATE POLICY convites_all ON public.convites FOR ALL TO authenticated USING (public.is_adm()) WITH CHECK (public.is_adm());

-- profiles
DROP POLICY IF EXISTS profiles_update ON public.profiles;
CREATE POLICY profiles_update ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_adm())
  WITH CHECK (id = auth.uid() OR public.is_adm());

-- user_roles: só adm gerencia
DROP POLICY IF EXISTS roles_select ON public.user_roles;
CREATE POLICY roles_select ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.pode_ver_tudo());
CREATE POLICY roles_write ON public.user_roles FOR ALL TO authenticated
  USING (public.is_adm()) WITH CHECK (public.is_adm());
