-- Align the due gate to the next quarter-hour, not 15 minutes after the worker starts.
-- Worker startup/network jitter must not make the next cron invocation too early.
create or replace function public.library_worker(action text, owner uuid default null, payload jsonb default '{}')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare s library_private.sync; secret_value text; secret_id uuid; found_owner uuid; units integer;
begin
 if action = 'oauth_consume' then
  delete from library_private.oauth where state=payload->>'state' and expires_at>now()
   returning user_id,verifier into found_owner,secret_value;
  return jsonb_build_object('owner',found_owner,'verifier',secret_value);
 elsif action = 'capture_save' then
  insert into public.library_references(user_id,id,record,saved_at)
   values(owner,payload->'record'->>'id',payload->'record',(payload->>'saved_at')::timestamptz)
   on conflict(user_id,id) do update set record=excluded.record,saved_at=excluded.saved_at
   where library_references.deleted_at is null;
  return '{"ok":true}';
 elsif action = 'cron_auth' then
  select decrypted_secret into secret_value from vault.decrypted_secrets where name='library_cron';
  return to_jsonb(secret_value is not null and extensions.digest(secret_value,'sha256') = extensions.digest(coalesce(payload->>'secret',''),'sha256'));
 elsif action = 'device_create' then
  insert into library_private.devices(token_hash,user_id) values(payload->>'hash',owner);
  return '{"ok":true}';
 elsif action = 'device_auth' then
  update library_private.devices set last_seen=now() where token_hash=payload->>'hash' and not revoked returning user_id into found_owner;
  return jsonb_build_object('user_id',found_owner);
 elsif action = 'device_revoke' then
  update library_private.devices set revoked=true where user_id=owner;
  return '{"ok":true}';
 elsif action = 'due' then
  return coalesce((select jsonb_agg(user_id) from library_private.sync where (state->>'enabled')::boolean and coalesce((state->>'next_check')::double precision,0)<=extract(epoch from now())),'[]');
 end if;
 select * into s from library_private.sync where user_id=owner for update;
 if action='import' then
  if s.user_id is not null then raise exception 'Already migrated'; end if;
  select vault.create_secret((payload->'credentials')::text) into secret_id;
  insert into library_private.sync(user_id,state,credential_id) values(owner,(payload->'state') || '{"enabled":false,"message":"Cloud connection ready. Checks paused."}',secret_id);
  return '{"ok":true}';
 end if;
 if s.user_id is null then return null; end if;
 if action='oauth_prepare' then
  if s.lease is not null and s.lease_until>now() then raise exception 'A check is running. Try again shortly.'; end if;
  update library_private.sync set lease=null,lease_until=null,state=state || '{"enabled":false}' where user_id=owner;
  delete from library_private.oauth where user_id=owner or expires_at<now();
  insert into library_private.oauth(state,user_id,verifier) values(payload->>'state',owner,payload->>'verifier');
  select decrypted_secret into secret_value from vault.decrypted_secrets where id=s.credential_id;
  return jsonb_build_object('client_id',secret_value::jsonb->>'client_id');
 end if;
 if action='status' then return s.state - array['baseline_ids','seen_ids','anchors']; end if;
 if action='control' then
  if s.lease is not null then raise exception 'A check is running. Try again shortly.'; end if;
  if (payload->>'enabled')::boolean and coalesce((s.state->>'reserved_units')::integer,0)>=3000 then raise exception 'Spending allowance reached'; end if;
  update library_private.sync set state=state || jsonb_build_object('enabled',(payload->>'enabled')::boolean,'next_check',extract(epoch from now()),'message',case when (payload->>'enabled')::boolean then 'Cloud checks enabled.' else 'Cloud checks paused.' end) where user_id=owner;
  return '{"ok":true}';
 elsif action='claim' then
  if s.lease is not null then
   if s.lease_until<now() then
    update library_private.sync set state=state || '{"enabled":false,"message":"A cloud check was interrupted. Reconnect X before resuming."}' where user_id=owner;
   end if;
   return null;
  end if;
  if not coalesce((payload->>'manual')::boolean,false) and (not (s.state->>'enabled')::boolean or coalesce((s.state->>'next_check')::double precision,0)>extract(epoch from now())) then return null; end if;
  if coalesce((s.state->>'last_attempt')::double precision,0)>extract(epoch from now())-60 then return null; end if;
  update library_private.sync set lease=gen_random_uuid(),lease_until=now()+interval '10 minutes',state=state || jsonb_build_object('last_attempt',extract(epoch from now()),'next_check',(floor(extract(epoch from now())/900)+1)*900) where user_id=owner returning * into s;
  select decrypted_secret into secret_value from vault.decrypted_secrets where id=s.credential_id;
  return jsonb_build_object('state',s.state,'credentials',secret_value::jsonb,'lease',s.lease);
 elsif action in ('reserve','credentials','finish') then
  if s.lease is null or s.lease::text<>payload->>'lease' or s.lease_until<now() then raise exception 'Worker lease expired'; end if;
  if action='reserve' then
   units=(payload->>'units')::integer;
   if units<1 or units>1000 or coalesce((s.state->>'reserved_units')::integer,0)+units>3000 then raise exception 'Spending allowance reached'; end if;
   update library_private.sync set state=state || jsonb_build_object('reserved_units',coalesce((state->>'reserved_units')::integer,0)+units,'requests',coalesce((state->>'requests')::integer,0)+1) where user_id=owner;
  elsif action='credentials' then
   perform vault.update_secret(s.credential_id,(payload->'credentials')::text);
  else
   update library_private.sync set lease=null,lease_until=null,state=state || ((payload->'state')-array['reserved_units','requests','last_attempt','next_check']) where user_id=owner;
  end if;
  return '{"ok":true}';
 end if;
 raise exception 'Unknown worker action';
end $$;

update library_private.sync set state=jsonb_set(state,'{next_check}',to_jsonb((floor(extract(epoch from now())/900)+1)*900)) where (state->>'enabled')::boolean and lease is null;
