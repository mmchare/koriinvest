
-- 1) Restrict profile self-update to safe columns only via column-level privileges.
-- Drop the broad UPDATE policy and replace it; also restrict UPDATE privilege to safe columns.
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (display_name, country_code, solana_wallet_pubkey) ON public.profiles TO authenticated;
-- Keep service_role full access
GRANT ALL ON public.profiles TO service_role;

-- The existing policy still applies (auth.uid() = id); column-level grants prevent updating sensitive columns.
-- No policy change needed but ensure WITH CHECK still scopes to self.

-- 2) webauthn_challenges: add explicit RESTRICTIVE deny-all policies for clients.
-- All access goes through SECURITY DEFINER edge/server flows using service_role (bypasses RLS).
DROP POLICY IF EXISTS "deny_all_webauthn_challenges" ON public.webauthn_challenges;
CREATE POLICY "deny_all_webauthn_challenges"
  ON public.webauthn_challenges
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- 3) user_roles: explicit deny INSERT/UPDATE/DELETE to clients; SELECT stays via existing policy.
DROP POLICY IF EXISTS "deny_write_user_roles" ON public.user_roles;
CREATE POLICY "deny_write_user_roles"
  ON public.user_roles
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING (true)  -- SELECT still gated by permissive policy AND this restrictive (true) → SELECT allowed
  WITH CHECK (false); -- INSERT/UPDATE blocked
-- DELETE: USING=true here means restrictive doesn't block delete; add explicit delete deny
DROP POLICY IF EXISTS "deny_delete_user_roles" ON public.user_roles;
CREATE POLICY "deny_delete_user_roles"
  ON public.user_roles
  AS RESTRICTIVE
  FOR DELETE
  TO anon, authenticated
  USING (false);
-- Also revoke direct table grants for writes
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM authenticated, anon;

-- 4) Revoke EXECUTE on user-callable SECURITY DEFINER functions from anon/authenticated/public.
-- These are now invoked exclusively from the server via service_role (supabaseAdmin).
REVOKE EXECUTE ON FUNCTION public.spin_wheel(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_vault(uuid, numeric, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.claim_vault(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.initiate_withdrawal(uuid, numeric, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_confirm_deposit(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_process_withdrawal(uuid, uuid, boolean, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.spin_wheel(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_vault(uuid, numeric, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_vault(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.initiate_withdrawal(uuid, numeric, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_confirm_deposit(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_process_withdrawal(uuid, uuid, boolean, text) TO service_role;
-- has_role is used inside RLS policies; keep it executable for authenticated/anon.
