CREATE OR REPLACE FUNCTION public.saspay_credit_deposit(_reference TEXT, _payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx_id UUID;
  v_user UUID;
  v_kri NUMERIC(18,4);
  v_status tx_status;
  v_parrain UUID;
  v_commission NUMERIC(18,4);
BEGIN
  SELECT id, user_id, amount_kori, status INTO v_tx_id, v_user, v_kri, v_status
    FROM public.transactions WHERE provider_reference = _reference FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'tx_not_found'); END IF;
  IF v_status = 'SUCCESS' THEN RETURN jsonb_build_object('ok', true, 'already', true); END IF;
  IF v_status <> 'PENDING' THEN RETURN jsonb_build_object('ok', false, 'error', 'bad_status'); END IF;

  UPDATE public.profiles SET kori_balance = kori_balance + v_kri WHERE id = v_user;
  UPDATE public.transactions SET status='SUCCESS', provider_payload=_payload WHERE id = v_tx_id;

  SELECT referred_by INTO v_parrain FROM public.profiles WHERE id = v_user;
  IF v_parrain IS NOT NULL THEN
    v_commission := round(v_kri * 0.05, 4);
    IF v_commission > 0 THEN
      UPDATE public.profiles SET kori_balance = kori_balance + v_commission WHERE id = v_parrain;
      INSERT INTO public.referral_commissions(parrain_id, filleul_id, source_type, source_id, amount_kori)
        VALUES (v_parrain, v_user, 'DEPOSIT', v_tx_id, v_commission);
      INSERT INTO public.transactions(user_id, type, amount_kori, status)
        VALUES (v_parrain, 'COMMISSION_DEP', v_commission, 'SUCCESS');
    END IF;
  END IF;
  RETURN jsonb_build_object('ok', true);
END $$;
REVOKE EXECUTE ON FUNCTION public.saspay_credit_deposit(TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.saspay_credit_deposit(TEXT, JSONB) TO service_role;

CREATE OR REPLACE FUNCTION public.saspay_fail_deposit(_reference TEXT, _payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx_id UUID;
  v_status tx_status;
BEGIN
  SELECT id, status INTO v_tx_id, v_status
    FROM public.transactions WHERE provider_reference = _reference FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'tx_not_found'); END IF;
  IF v_status <> 'PENDING' THEN RETURN jsonb_build_object('ok', true, 'already', true); END IF;
  UPDATE public.transactions SET status='FAILED', provider_payload=_payload WHERE id = v_tx_id;
  RETURN jsonb_build_object('ok', true);
END $$;
REVOKE EXECUTE ON FUNCTION public.saspay_fail_deposit(TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.saspay_fail_deposit(TEXT, JSONB) TO service_role;

DROP FUNCTION IF EXISTS public.notchpay_credit_deposit(TEXT, JSONB);