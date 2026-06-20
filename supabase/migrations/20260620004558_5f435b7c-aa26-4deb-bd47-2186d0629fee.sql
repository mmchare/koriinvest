DROP POLICY IF EXISTS cfg_read ON public.app_config;
CREATE POLICY cfg_read ON public.app_config FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.app_config FROM anon;