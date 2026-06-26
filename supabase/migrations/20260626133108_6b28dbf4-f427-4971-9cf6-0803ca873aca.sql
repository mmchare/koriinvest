
-- Rate limiting
CREATE TABLE public.rate_limits (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_rate_limits_lookup ON public.rate_limits(user_id, action, created_at DESC);
GRANT ALL ON public.rate_limits TO service_role;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
-- no policies: only service_role accesses it via RPC

CREATE OR REPLACE FUNCTION public.check_rate_limit(_user UUID, _action TEXT, _max INT, _window_seconds INT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
BEGIN
  DELETE FROM public.rate_limits WHERE created_at < now() - interval '1 day';
  SELECT count(*) INTO v_count FROM public.rate_limits
    WHERE user_id = _user AND action = _action
      AND created_at > now() - (_window_seconds || ' seconds')::interval;
  IF v_count >= _max THEN
    RETURN FALSE;
  END IF;
  INSERT INTO public.rate_limits(user_id, action) VALUES (_user, _action);
  RETURN TRUE;
END $$;
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(UUID, TEXT, INT, INT) FROM PUBLIC, authenticated;

-- NotchPay reference + webhook idempotency
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS provider_reference TEXT,
  ADD COLUMN IF NOT EXISTS provider_payload JSONB;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_transactions_provider_ref
  ON public.transactions(provider_reference) WHERE provider_reference IS NOT NULL;

-- Webhook -> credit deposit atomically (mirrors admin_confirm_deposit logic)
CREATE OR REPLACE FUNCTION public.notchpay_credit_deposit(_reference TEXT, _payload JSONB)
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
REVOKE EXECUTE ON FUNCTION public.notchpay_credit_deposit(TEXT, JSONB) FROM PUBLIC, authenticated;
