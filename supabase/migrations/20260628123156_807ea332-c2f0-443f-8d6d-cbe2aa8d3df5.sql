-- 1. Profile: add Solana wallet columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS solana_pubkey TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS solana_secret_encrypted TEXT;

-- 2. Transactions: add on-chain tracking
ALTER TYPE tx_type ADD VALUE IF NOT EXISTS 'ONCHAIN_WITHDRAW';

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS solana_signature TEXT,
  ADD COLUMN IF NOT EXISTS solana_recipient TEXT;

CREATE INDEX IF NOT EXISTS idx_tx_solana_sig ON public.transactions(solana_signature) WHERE solana_signature IS NOT NULL;

-- 3. App config defaults (idempotent)
INSERT INTO public.app_config(key, value) VALUES
  ('solana_network', 'devnet'),
  ('solana_rpc_url', 'https://api.devnet.solana.com'),
  ('kri_mint_address', ''),
  ('kri_treasury_pubkey', ''),
  ('kri_decimals', '4'),
  ('min_onchain_withdraw', '10')
ON CONFLICT (key) DO NOTHING;

-- 4. Secure RPC: debit balance + create pending ONCHAIN_WITHDRAW transaction
CREATE OR REPLACE FUNCTION public.initiate_onchain_withdraw(_user uuid, _amount numeric, _recipient text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance NUMERIC(18,4);
  v_min NUMERIC;
  v_id UUID;
BEGIN
  SELECT value::NUMERIC INTO v_min FROM public.app_config WHERE key='min_onchain_withdraw';
  IF _amount IS NULL OR _amount < COALESCE(v_min, 10) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'min_amount', 'min', COALESCE(v_min, 10));
  END IF;
  IF _recipient IS NULL OR length(_recipient) < 32 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'bad_recipient');
  END IF;

  SELECT kori_balance INTO v_balance FROM public.profiles WHERE id = _user FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'no_profile'); END IF;
  IF v_balance < _amount THEN RETURN jsonb_build_object('ok', false, 'error', 'insufficient'); END IF;

  UPDATE public.profiles
    SET kori_balance = kori_balance - _amount,
        kori_locked = kori_locked + _amount
    WHERE id = _user;

  INSERT INTO public.transactions(user_id, type, amount_kori, status, solana_recipient)
    VALUES (_user, 'ONCHAIN_WITHDRAW', _amount, 'PENDING', _recipient)
    RETURNING id INTO v_id;

  RETURN jsonb_build_object('ok', true, 'tx_id', v_id);
END $$;

-- 5. Mark on-chain withdraw as successful (called after SPL transfer confirms)
CREATE OR REPLACE FUNCTION public.confirm_onchain_withdraw(_tx uuid, _signature text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID;
  v_amt NUMERIC(18,4);
  v_status tx_status;
BEGIN
  SELECT user_id, amount_kori, status INTO v_user, v_amt, v_status
    FROM public.transactions WHERE id = _tx FOR UPDATE;
  IF NOT FOUND OR v_status <> 'PENDING' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'bad_status');
  END IF;

  UPDATE public.profiles SET kori_locked = kori_locked - v_amt WHERE id = v_user;
  UPDATE public.transactions
    SET status = 'SUCCESS', solana_signature = _signature
    WHERE id = _tx;

  RETURN jsonb_build_object('ok', true);
END $$;

-- 6. Refund on-chain withdraw if transfer fails
CREATE OR REPLACE FUNCTION public.refund_onchain_withdraw(_tx uuid, _reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID;
  v_amt NUMERIC(18,4);
  v_status tx_status;
BEGIN
  SELECT user_id, amount_kori, status INTO v_user, v_amt, v_status
    FROM public.transactions WHERE id = _tx FOR UPDATE;
  IF NOT FOUND OR v_status <> 'PENDING' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'bad_status');
  END IF;

  UPDATE public.profiles
    SET kori_locked = kori_locked - v_amt,
        kori_balance = kori_balance + v_amt
    WHERE id = v_user;
  UPDATE public.transactions
    SET status = 'FAILED', admin_notes = _reason
    WHERE id = _tx;

  RETURN jsonb_build_object('ok', true);
END $$;

-- 7. Revoke public execute on new privileged functions
REVOKE ALL ON FUNCTION public.initiate_onchain_withdraw(uuid, numeric, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.confirm_onchain_withdraw(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refund_onchain_withdraw(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.initiate_onchain_withdraw(uuid, numeric, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.confirm_onchain_withdraw(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_onchain_withdraw(uuid, text) TO service_role;