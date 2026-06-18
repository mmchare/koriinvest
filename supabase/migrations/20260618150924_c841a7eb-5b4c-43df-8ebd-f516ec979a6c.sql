
-- Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.tx_type AS ENUM ('DEPOSIT','WITHDRAWAL','COMMISSION_DEP','COMMISSION_BONUS','WHEEL_REWARD','VAULT_LOCK','VAULT_PAYOUT','REFERRAL_BONUS');
CREATE TYPE public.tx_status AS ENUM ('PENDING','SUCCESS','REJECTED');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  country_code TEXT NOT NULL DEFAULT '+237',
  referral_code TEXT UNIQUE NOT NULL,
  referred_by UUID REFERENCES public.profiles(id),
  kori_balance NUMERIC(18,4) NOT NULL DEFAULT 0,
  kori_locked NUMERIC(18,4) NOT NULL DEFAULT 0,
  solana_wallet_pubkey TEXT UNIQUE,
  is_blocked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role) $$;

-- Profiles RLS
CREATE POLICY "profiles_self_read" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "profiles_self_update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_admin_update" ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "profiles_insert_self" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- user_roles RLS
CREATE POLICY "roles_read_self" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid()=user_id OR public.has_role(auth.uid(),'admin'));

-- Vaults
CREATE TABLE public.vaults (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount_locked NUMERIC(18,4) NOT NULL CHECK(amount_locked > 0),
  duration_days INT NOT NULL CHECK(duration_days IN (7,15,30)),
  yield_rate NUMERIC(6,4) NOT NULL,
  expected_profit NUMERIC(18,4) NOT NULL,
  start_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_date TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  payout_processed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.vaults TO authenticated;
GRANT ALL ON public.vaults TO service_role;
ALTER TABLE public.vaults ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vaults_own" ON public.vaults FOR SELECT TO authenticated USING (auth.uid()=user_id OR public.has_role(auth.uid(),'admin'));

-- Transactions
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type tx_type NOT NULL,
  amount_cfa NUMERIC(12,2),
  amount_kori NUMERIC(18,4) NOT NULL,
  status tx_status NOT NULL DEFAULT 'PENDING',
  provider_tx_id TEXT,
  recipient_phone TEXT,
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tx_own_select" ON public.transactions FOR SELECT TO authenticated USING (auth.uid()=user_id OR public.has_role(auth.uid(),'admin'));

-- Wheel logs
CREATE TABLE public.wheel_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reward_type TEXT NOT NULL,
  reward_amount NUMERIC(18,4) NOT NULL DEFAULT 0,
  played_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.wheel_logs TO authenticated;
GRANT ALL ON public.wheel_logs TO service_role;
ALTER TABLE public.wheel_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wheel_own" ON public.wheel_logs FOR SELECT TO authenticated USING (auth.uid()=user_id OR public.has_role(auth.uid(),'admin'));

-- Referral commissions
CREATE TABLE public.referral_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parrain_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  filleul_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,
  source_id UUID,
  amount_kori NUMERIC(18,4) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.referral_commissions TO authenticated;
GRANT ALL ON public.referral_commissions TO service_role;
ALTER TABLE public.referral_commissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comm_own" ON public.referral_commissions FOR SELECT TO authenticated USING (auth.uid()=parrain_id OR public.has_role(auth.uid(),'admin'));

-- App config
CREATE TABLE public.app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
GRANT SELECT ON public.app_config TO authenticated, anon;
GRANT ALL ON public.app_config TO service_role;
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cfg_read" ON public.app_config FOR SELECT TO authenticated, anon USING (true);
INSERT INTO public.app_config(key,value) VALUES ('kri_per_xaf','0.1'); -- 1 XAF = 0.1 KRI (i.e. 1 KRI = 10 XAF)

-- Indexes
CREATE INDEX idx_profiles_phone ON public.profiles(phone_number);
CREATE INDEX idx_profiles_referred ON public.profiles(referred_by);
CREATE INDEX idx_profiles_refcode ON public.profiles(referral_code);
CREATE INDEX idx_vaults_active_end ON public.vaults(end_date) WHERE status='ACTIVE';
CREATE INDEX idx_tx_user_created ON public.transactions(user_id, created_at DESC);
CREATE INDEX idx_tx_status ON public.transactions(status, type);
CREATE INDEX idx_wheel_user_time ON public.wheel_logs(user_id, played_at DESC);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS TRIGGER LANGUAGE plpgsql SET search_path=public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_tx_updated BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Profile auto-create on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_phone TEXT;
  v_name TEXT;
  v_country TEXT;
  v_ref_code TEXT;
  v_referrer UUID;
  v_input_ref TEXT;
BEGIN
  v_phone := COALESCE(NEW.raw_user_meta_data->>'phone_number', NEW.email);
  v_name := COALESCE(NEW.raw_user_meta_data->>'display_name', 'Utilisateur');
  v_country := COALESCE(NEW.raw_user_meta_data->>'country_code', '+237');
  v_input_ref := NEW.raw_user_meta_data->>'referral_code_used';

  -- generate unique referral code
  LOOP
    v_ref_code := upper(substring(replace(gen_random_uuid()::text,'-',''),1,8));
    EXIT WHEN NOT EXISTS(SELECT 1 FROM public.profiles WHERE referral_code = v_ref_code);
  END LOOP;

  IF v_input_ref IS NOT NULL AND length(v_input_ref) > 0 THEN
    SELECT id INTO v_referrer FROM public.profiles WHERE referral_code = upper(v_input_ref);
  END IF;

  INSERT INTO public.profiles(id, phone_number, display_name, country_code, referral_code, referred_by)
  VALUES (NEW.id, v_phone, v_name, v_country, v_ref_code, v_referrer);

  INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RPC: spin the wheel (atomic, 24h limit)
CREATE OR REPLACE FUNCTION public.spin_wheel(_user UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_last TIMESTAMPTZ;
  v_rand NUMERIC;
  v_reward_type TEXT;
  v_reward NUMERIC(18,4);
  v_parrain UUID;
  v_commission NUMERIC(18,4);
BEGIN
  SELECT max(played_at) INTO v_last FROM public.wheel_logs WHERE user_id = _user;
  IF v_last IS NOT NULL AND v_last > now() - interval '24 hours' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'cooldown', 'next_at', v_last + interval '24 hours');
  END IF;

  v_rand := random();
  IF v_rand < 0.25 THEN v_reward_type := 'LOSE'; v_reward := 0;
  ELSIF v_rand < 0.55 THEN v_reward_type := 'KRI_5'; v_reward := 5;
  ELSIF v_rand < 0.78 THEN v_reward_type := 'KRI_10'; v_reward := 10;
  ELSIF v_rand < 0.92 THEN v_reward_type := 'KRI_25'; v_reward := 25;
  ELSIF v_rand < 0.99 THEN v_reward_type := 'KRI_100'; v_reward := 100;
  ELSE v_reward_type := 'JACKPOT_500'; v_reward := 500;
  END IF;

  INSERT INTO public.wheel_logs(user_id, reward_type, reward_amount) VALUES (_user, v_reward_type, v_reward);

  IF v_reward > 0 THEN
    UPDATE public.profiles SET kori_balance = kori_balance + v_reward WHERE id = _user;
    INSERT INTO public.transactions(user_id,type,amount_kori,status) VALUES (_user,'WHEEL_REWARD',v_reward,'SUCCESS');

    SELECT referred_by INTO v_parrain FROM public.profiles WHERE id = _user;
    IF v_parrain IS NOT NULL THEN
      v_commission := round(v_reward * 0.03, 4);
      IF v_commission > 0 THEN
        UPDATE public.profiles SET kori_balance = kori_balance + v_commission WHERE id = v_parrain;
        INSERT INTO public.referral_commissions(parrain_id, filleul_id, source_type, amount_kori)
          VALUES (v_parrain, _user, 'WHEEL', v_commission);
        INSERT INTO public.transactions(user_id,type,amount_kori,status)
          VALUES (v_parrain,'COMMISSION_BONUS',v_commission,'SUCCESS');
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object('ok', true, 'reward_type', v_reward_type, 'reward', v_reward);
END $$;

-- RPC: create vault (locks balance)
CREATE OR REPLACE FUNCTION public.create_vault(_user UUID, _amount NUMERIC, _days INT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_rate NUMERIC(6,4);
  v_profit NUMERIC(18,4);
  v_balance NUMERIC(18,4);
  v_id UUID;
BEGIN
  IF _days = 7 THEN v_rate := 0.015;
  ELSIF _days = 15 THEN v_rate := 0.04;
  ELSIF _days = 30 THEN v_rate := 0.10;
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

-- RPC: claim mature vault
CREATE OR REPLACE FUNCTION public.claim_vault(_user UUID, _vault UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_amount NUMERIC(18,4);
  v_profit NUMERIC(18,4);
  v_end TIMESTAMPTZ;
  v_status TEXT;
  v_parrain UUID;
  v_commission NUMERIC(18,4);
BEGIN
  SELECT amount_locked, expected_profit, end_date, status INTO v_amount, v_profit, v_end, v_status
    FROM public.vaults WHERE id = _vault AND user_id = _user FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'not_found'); END IF;
  IF v_status <> 'ACTIVE' THEN RETURN jsonb_build_object('ok', false, 'error', 'already_claimed'); END IF;
  IF v_end > now() THEN RETURN jsonb_build_object('ok', false, 'error', 'not_mature'); END IF;

  UPDATE public.profiles SET kori_locked = kori_locked - v_amount, kori_balance = kori_balance + v_amount + v_profit WHERE id = _user;
  UPDATE public.vaults SET status='COMPLETED', payout_processed=true WHERE id = _vault;
  INSERT INTO public.transactions(user_id, type, amount_kori, status) VALUES (_user,'VAULT_PAYOUT', v_amount + v_profit,'SUCCESS');

  SELECT referred_by INTO v_parrain FROM public.profiles WHERE id = _user;
  IF v_parrain IS NOT NULL AND v_profit > 0 THEN
    v_commission := round(v_profit * 0.03, 4);
    IF v_commission > 0 THEN
      UPDATE public.profiles SET kori_balance = kori_balance + v_commission WHERE id = v_parrain;
      INSERT INTO public.referral_commissions(parrain_id, filleul_id, source_type, source_id, amount_kori)
        VALUES (v_parrain, _user, 'VAULT', _vault, v_commission);
      INSERT INTO public.transactions(user_id, type, amount_kori, status)
        VALUES (v_parrain,'COMMISSION_BONUS', v_commission,'SUCCESS');
    END IF;
  END IF;

  RETURN jsonb_build_object('ok', true, 'returned', v_amount + v_profit);
END $$;

-- RPC: initiate withdrawal (freeze balance, create PENDING tx)
CREATE OR REPLACE FUNCTION public.initiate_withdrawal(_user UUID, _amount_cfa NUMERIC, _phone TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_rate NUMERIC;
  v_kri NUMERIC(18,4);
  v_balance NUMERIC(18,4);
  v_id UUID;
BEGIN
  SELECT value::NUMERIC INTO v_rate FROM public.app_config WHERE key='kri_per_xaf';
  v_kri := round(_amount_cfa * v_rate, 4);
  IF v_kri <= 0 THEN RETURN jsonb_build_object('ok', false, 'error', 'bad_amount'); END IF;

  SELECT kori_balance INTO v_balance FROM public.profiles WHERE id = _user FOR UPDATE;
  IF v_balance < v_kri THEN RETURN jsonb_build_object('ok', false, 'error', 'insufficient'); END IF;

  UPDATE public.profiles SET kori_balance = kori_balance - v_kri, kori_locked = kori_locked + v_kri WHERE id = _user;
  INSERT INTO public.transactions(user_id, type, amount_cfa, amount_kori, status, recipient_phone)
    VALUES (_user,'WITHDRAWAL', _amount_cfa, v_kri, 'PENDING', _phone) RETURNING id INTO v_id;
  RETURN jsonb_build_object('ok', true, 'tx_id', v_id, 'kri', v_kri);
END $$;

-- RPC: admin process withdrawal
CREATE OR REPLACE FUNCTION public.admin_process_withdrawal(_admin UUID, _tx UUID, _approve BOOLEAN, _notes TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_user UUID;
  v_kri NUMERIC(18,4);
  v_status tx_status;
  v_type tx_type;
BEGIN
  IF NOT public.has_role(_admin,'admin') THEN RETURN jsonb_build_object('ok', false, 'error','forbidden'); END IF;
  SELECT user_id, amount_kori, status, type INTO v_user, v_kri, v_status, v_type
    FROM public.transactions WHERE id = _tx FOR UPDATE;
  IF NOT FOUND OR v_status <> 'PENDING' OR v_type <> 'WITHDRAWAL' THEN
    RETURN jsonb_build_object('ok', false, 'error','invalid');
  END IF;

  IF _approve THEN
    UPDATE public.profiles SET kori_locked = kori_locked - v_kri WHERE id = v_user;
    UPDATE public.transactions SET status='SUCCESS', admin_notes=_notes WHERE id=_tx;
  ELSE
    UPDATE public.profiles SET kori_locked = kori_locked - v_kri, kori_balance = kori_balance + v_kri WHERE id = v_user;
    UPDATE public.transactions SET status='REJECTED', admin_notes=_notes WHERE id=_tx;
  END IF;
  RETURN jsonb_build_object('ok', true);
END $$;

-- RPC: admin mark deposit success (until NotchPay webhook is wired)
CREATE OR REPLACE FUNCTION public.admin_confirm_deposit(_admin UUID, _tx UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_user UUID;
  v_kri NUMERIC(18,4);
  v_cfa NUMERIC(12,2);
  v_status tx_status;
  v_type tx_type;
  v_parrain UUID;
  v_commission NUMERIC(18,4);
BEGIN
  IF NOT public.has_role(_admin,'admin') THEN RETURN jsonb_build_object('ok', false,'error','forbidden'); END IF;
  SELECT user_id, amount_kori, amount_cfa, status, type INTO v_user, v_kri, v_cfa, v_status, v_type
    FROM public.transactions WHERE id = _tx FOR UPDATE;
  IF NOT FOUND OR v_status <> 'PENDING' OR v_type <> 'DEPOSIT' THEN
    RETURN jsonb_build_object('ok', false,'error','invalid');
  END IF;

  UPDATE public.profiles SET kori_balance = kori_balance + v_kri WHERE id = v_user;
  UPDATE public.transactions SET status='SUCCESS' WHERE id = _tx;

  SELECT referred_by INTO v_parrain FROM public.profiles WHERE id = v_user;
  IF v_parrain IS NOT NULL THEN
    v_commission := round(v_kri * 0.05, 4);
    IF v_commission > 0 THEN
      UPDATE public.profiles SET kori_balance = kori_balance + v_commission WHERE id = v_parrain;
      INSERT INTO public.referral_commissions(parrain_id, filleul_id, source_type, source_id, amount_kori)
        VALUES (v_parrain, v_user, 'DEPOSIT', _tx, v_commission);
      INSERT INTO public.transactions(user_id, type, amount_kori, status)
        VALUES (v_parrain,'COMMISSION_DEP', v_commission,'SUCCESS');
    END IF;
  END IF;

  RETURN jsonb_build_object('ok', true);
END $$;
