ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS provider_network TEXT;

CREATE OR REPLACE FUNCTION public.my_initiate_withdrawal_net(_amount_cfa numeric, _phone text, _network text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare v jsonb; v_tx uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select public.initiate_withdrawal(auth.uid(), _amount_cfa, _phone)::jsonb into v;
  if coalesce((v->>'ok')::boolean, false) then
    v_tx := (v->>'tx_id')::uuid;
    update public.transactions set provider_network = _network where id = v_tx;
  end if;
  return v;
end $$;
REVOKE EXECUTE ON FUNCTION public.my_initiate_withdrawal_net(numeric, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_initiate_withdrawal_net(numeric, text, text) TO authenticated, service_role;