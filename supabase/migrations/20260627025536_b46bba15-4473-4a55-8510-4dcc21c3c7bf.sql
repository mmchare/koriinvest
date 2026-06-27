
CREATE OR REPLACE FUNCTION public.admin_adjust_balance(_admin uuid, _user uuid, _delta numeric, _reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance NUMERIC(18,4);
BEGIN
  IF NOT public.has_role(_admin,'admin') THEN RETURN jsonb_build_object('ok', false,'error','forbidden'); END IF;
  IF _delta = 0 THEN RETURN jsonb_build_object('ok', false,'error','zero'); END IF;
  IF _reason IS NULL OR length(trim(_reason)) < 3 THEN RETURN jsonb_build_object('ok', false,'error','reason_required'); END IF;

  SELECT kori_balance INTO v_balance FROM public.profiles WHERE id = _user FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false,'error','user_not_found'); END IF;
  IF v_balance + _delta < 0 THEN RETURN jsonb_build_object('ok', false,'error','insufficient'); END IF;

  UPDATE public.profiles SET kori_balance = kori_balance + _delta WHERE id = _user;
  INSERT INTO public.transactions(user_id, type, amount_kori, status, admin_notes)
    VALUES (_user, 'ADMIN_ADJUST', _delta, 'SUCCESS', _reason);
  RETURN jsonb_build_object('ok', true, 'new_balance', v_balance + _delta);
END $$;

REVOKE EXECUTE ON FUNCTION public.admin_adjust_balance(uuid, uuid, numeric, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_adjust_balance(uuid, uuid, numeric, text) TO service_role;
