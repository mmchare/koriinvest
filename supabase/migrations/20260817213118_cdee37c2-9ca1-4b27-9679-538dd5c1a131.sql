CREATE OR REPLACE FUNCTION public.create_vault(_user UUID, _amount NUMERIC, _days INT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_rate NUMERIC(6,4);
  v_profit NUMERIC(18,4);
  v_balance NUMERIC(18,4);
  v_id UUID;
BEGIN
  IF _days = 7 THEN v_rate := 0.15;
  ELSIF _days = 15 THEN v_rate := 0.30;
  ELSIF _days = 30 THEN v_rate := 0.60;
  ELSE RETURN jsonb_build_object('ok', false, 'error', 'bad_duration'); END IF;

  IF _amount <= 0 THEN RETURN jsonb_build_object('ok', false, 'error', 'bad_amount'); END IF;

  SELECT kori_balance INTO v_balance FROM public.profiles WHERE id = _user FOR UPDATE;
  IF v_balance < _amount THEN RETURN jsonb_build_object('ok', false, 'error', 'insufficient'); END IF;

  v_profit := round(_amount * v_rate, 4);
  UPDATE public.profiles SET kori_balance = kori_balance - _amount, kori_locked = kori_locked + _amount WHERE id = _user;

  INSERT INTO public.vaults(user_id, amount_locked, duration_days, yield_rate, expected_profit, end_date)
    VALUES (_user, _amount, _days, v_rate, v_profit, now() + (_days || ' days')::interval)
    RETURNING id INTO v_id;

  INSERT INTO public.transactions(user_id, type, amount_kori, status) VALUES (_user,'VAULT_LOCK',_amount,'SUCCESS');
  RETURN jsonb_build_object('ok', true, 'vault_id', v_id, 'profit', v_profit);
END $$;

GRANT EXECUTE ON FUNCTION public.create_vault(uuid, numeric, integer) TO service_role;