
-- Self-scoped wrappers (use auth.uid()) so the app works without the service role key.

create or replace function public.my_check_rate_limit(_action text, _max int, _window_seconds int)
returns boolean language plpgsql security definer set search_path = public as $$
declare v boolean;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select public.check_rate_limit(auth.uid(), _action, _max, _window_seconds) into v;
  return coalesce(v, false);
end $$;

create or replace function public.my_spin_wheel()
returns jsonb language plpgsql security definer set search_path = public as $$
declare v jsonb;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select public.spin_wheel(auth.uid())::jsonb into v;
  return v;
end $$;

create or replace function public.my_create_vault(_amount numeric, _days int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v jsonb;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select public.create_vault(auth.uid(), _amount, _days)::jsonb into v;
  return v;
end $$;

create or replace function public.my_claim_vault(_vault uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v jsonb;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select public.claim_vault(auth.uid(), _vault)::jsonb into v;
  return v;
end $$;

create or replace function public.my_initiate_withdrawal(_amount_cfa numeric, _phone text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v jsonb;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select public.initiate_withdrawal(auth.uid(), _amount_cfa, _phone)::jsonb into v;
  return v;
end $$;

create or replace function public.my_create_deposit(_amount_cfa numeric, _amount_kori numeric, _phone text, _provider_reference text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  insert into public.transactions (user_id, type, amount_cfa, amount_kori, status, recipient_phone, provider_reference)
  values (auth.uid(), 'DEPOSIT', _amount_cfa, _amount_kori, 'PENDING', _phone, _provider_reference)
  returning id into v;
  return v;
end $$;

create or replace function public.my_is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role(auth.uid(), 'admin')
$$;

-- Admin wrappers
create or replace function public.admin_my_process_withdrawal(_tx uuid, _approve boolean, _notes text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v jsonb;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'forbidden'; end if;
  select public.admin_process_withdrawal(auth.uid(), _tx, _approve, _notes)::jsonb into v;
  return v;
end $$;

create or replace function public.admin_my_confirm_deposit(_tx uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v jsonb;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'forbidden'; end if;
  select public.admin_confirm_deposit(auth.uid(), _tx)::jsonb into v;
  return v;
end $$;

create or replace function public.admin_my_adjust_balance(_user uuid, _delta numeric, _reason text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v jsonb;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'forbidden'; end if;
  select public.admin_adjust_balance(auth.uid(), _user, _delta, _reason)::jsonb into v;
  return v;
end $$;

create or replace function public.admin_my_set_config(_entries jsonb)
returns boolean language plpgsql security definer set search_path = public as $$
declare k text; val text;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'forbidden'; end if;
  for k, val in select key, value from jsonb_each_text(_entries) loop
    insert into public.app_config (key, value) values (k, val)
    on conflict (key) do update set value = excluded.value;
  end loop;
  return true;
end $$;

-- Push notification targets
create or replace function public.my_push_targets()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'endpoint', endpoint, 'p256dh', p256dh, 'auth', auth)), '[]'::jsonb)
  from public.push_subscriptions where user_id = auth.uid()
$$;

create or replace function public.admin_push_targets(_user uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v jsonb;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'forbidden'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'endpoint', endpoint, 'p256dh', p256dh, 'auth', auth)), '[]'::jsonb)
  into v from public.push_subscriptions where user_id = _user;
  return v;
end $$;

create or replace function public.admin_push_targets_all()
returns jsonb language plpgsql security definer set search_path = public as $$
declare v jsonb;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'forbidden'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'endpoint', endpoint, 'p256dh', p256dh, 'auth', auth)), '[]'::jsonb)
  into v from public.push_subscriptions;
  return v;
end $$;

create or replace function public.prune_push_subscription(_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  delete from public.push_subscriptions
  where id = _id and (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
  return true;
end $$;

create or replace function public.my_upsert_push_subscription(_endpoint text, _p256dh text, _auth text, _user_agent text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
  values (auth.uid(), _endpoint, _p256dh, _auth, _user_agent)
  on conflict (endpoint) do update
    set user_id = auth.uid(), p256dh = excluded.p256dh, auth = excluded.auth, user_agent = excluded.user_agent;
  return true;
end $$;

-- Grants: only signed-in users may call these wrappers
do $$
declare fn text;
begin
  for fn in select unnest(array[
    'public.my_check_rate_limit(text,int,int)',
    'public.my_spin_wheel()',
    'public.my_create_vault(numeric,int)',
    'public.my_claim_vault(uuid)',
    'public.my_initiate_withdrawal(numeric,text)',
    'public.my_create_deposit(numeric,numeric,text,text)',
    'public.my_is_admin()',
    'public.admin_my_process_withdrawal(uuid,boolean,text)',
    'public.admin_my_confirm_deposit(uuid)',
    'public.admin_my_adjust_balance(uuid,numeric,text)',
    'public.admin_my_set_config(jsonb)',
    'public.my_push_targets()',
    'public.admin_push_targets(uuid)',
    'public.admin_push_targets_all()',
    'public.prune_push_subscription(uuid)',
    'public.my_upsert_push_subscription(text,text,text,text)'
  ]) loop
    execute format('revoke all on function %s from public, anon', fn);
    execute format('grant execute on function %s to authenticated, service_role', fn);
  end loop;
end $$;
