CREATE OR REPLACE FUNCTION public.ensure_my_solana_wallet(_pubkey text, _secret_encrypted text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _existing text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT solana_pubkey INTO _existing FROM public.profiles WHERE id = _uid FOR UPDATE;
  IF _existing IS NOT NULL AND length(_existing) > 0 THEN RETURN _existing; END IF;
  UPDATE public.profiles SET solana_pubkey = _pubkey, solana_secret_encrypted = _secret_encrypted WHERE id = _uid;
  RETURN _pubkey;
END; $$;
REVOKE ALL ON FUNCTION public.ensure_my_solana_wallet(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_my_solana_wallet(text, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_solana_public_config()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(jsonb_object_agg(key, value), '{}'::jsonb)
  FROM public.app_config
  WHERE key IN ('solana_network','solana_rpc_url','kri_mint_address','kri_treasury_pubkey','kri_decimals','kri_metadata_uri','kri_metadata_name','kri_metadata_symbol');
$$;
REVOKE ALL ON FUNCTION public.get_solana_public_config() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_solana_public_config() TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.my_initiate_onchain_withdraw(_amount numeric)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _recipient text; _allowed boolean;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT public.check_rate_limit(_uid, 'onchain_withdraw', 3, 600) INTO _allowed;
  IF NOT _allowed THEN RETURN jsonb_build_object('ok', false, 'error', 'rate_limited'); END IF;
  SELECT solana_pubkey INTO _recipient FROM public.profiles WHERE id = _uid;
  IF _recipient IS NULL OR length(_recipient) = 0 THEN RETURN jsonb_build_object('ok', false, 'error', 'no_wallet'); END IF;
  RETURN public.initiate_onchain_withdraw(_uid, _amount, _recipient);
END; $$;
REVOKE ALL ON FUNCTION public.my_initiate_onchain_withdraw(numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_initiate_onchain_withdraw(numeric) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.my_confirm_onchain_withdraw(_tx uuid, _signature text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.transactions WHERE id = _tx AND user_id = _uid) THEN RAISE EXCEPTION 'Not found'; END IF;
  RETURN public.confirm_onchain_withdraw(_tx, _signature);
END; $$;
REVOKE ALL ON FUNCTION public.my_confirm_onchain_withdraw(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_confirm_onchain_withdraw(uuid, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.my_refund_onchain_withdraw(_tx uuid, _reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.transactions WHERE id = _tx AND user_id = _uid) THEN RAISE EXCEPTION 'Not found'; END IF;
  RETURN public.refund_onchain_withdraw(_tx, _reason);
END; $$;
REVOKE ALL ON FUNCTION public.my_refund_onchain_withdraw(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_refund_onchain_withdraw(uuid, text) TO authenticated, service_role;