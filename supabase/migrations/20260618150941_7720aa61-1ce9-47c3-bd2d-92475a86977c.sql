
REVOKE EXECUTE ON FUNCTION public.spin_wheel(UUID), public.create_vault(UUID,NUMERIC,INT), public.claim_vault(UUID,UUID), public.initiate_withdrawal(UUID,NUMERIC,TEXT), public.admin_process_withdrawal(UUID,UUID,BOOLEAN,TEXT), public.admin_confirm_deposit(UUID,UUID), public.has_role(UUID,public.app_role), public.handle_new_user(), public.touch_updated_at() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;
-- Other RPCs are only called through server-side service_role; no grants to authenticated needed.
GRANT EXECUTE ON FUNCTION public.spin_wheel(UUID), public.create_vault(UUID,NUMERIC,INT), public.claim_vault(UUID,UUID), public.initiate_withdrawal(UUID,NUMERIC,TEXT), public.admin_process_withdrawal(UUID,UUID,BOOLEAN,TEXT), public.admin_confirm_deposit(UUID,UUID) TO service_role;
