REVOKE EXECUTE ON FUNCTION public.create_vault(uuid, numeric, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_vault(uuid, numeric, integer) TO service_role;