CREATE OR REPLACE FUNCTION public.library_worker(action text, owner uuid DEFAULT NULL::uuid, payload jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare s library_private.sync; secret_value text; secret_id uuid; found_owner uuid; units integer; used_units integer; cadence integer; month_start double precision; month_end double precision;
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
  return coalesce((select jsonb_agg(user_id) from library_private.sync where (state->>'enabled')::boolean and greatest(coalesce((state->>'next_check')::double precision,0),coalesce((state->>'retry_at')::double precision,0))<=extract(epoch from now())),'[]');
 end if;
 select * into s from library_private.sync where user_id=owner for update;
 if action='import' then
  if s.user_id is not null then raise exception 'Already migrated'; end if;
  select vault.create_secret((payload->'credentials')::text) into secret_id;
  insert into library_private.sync(user_id,state,credential_id) values(owner,((payload->'state')-array['budget_units','budget_mode','budget_period','budget_reset_at','month_reserved_units','budget_history','check_interval_seconds','refresh_pending']) || '{"enabled":false,"message":"Cloud connection ready. Checks paused."}',secret_id);
  return '{"ok":true}';
 end if;
 if s.user_id is null then return null; end if;
 -- Only an admin enables recurring budgets. Rollover never clears lifetime reservations.
 month_start=extract(epoch from date_trunc('month',now() at time zone 'UTC') at time zone 'UTC');
 month_end=extract(epoch from (date_trunc('month',now() at time zone 'UTC')+interval '1 month') at time zone 'UTC');
 if s.state->>'budget_mode'='monthly' and coalesce((s.state->>'budget_period')::double precision,0)<month_start then
  update library_private.sync set state=state || jsonb_build_object(
   'budget_history',coalesce(state->'budget_history','{}'::jsonb)||jsonb_build_object(coalesce(state->>'budget_period','legacy'),coalesce((state->>'month_reserved_units')::integer,0)),
   'month_reserved_units',0,'budget_period',month_start,'budget_reset_at',month_end
  ) || case when state->>'sync_issue'='budget' then '{"sync_issue":"","retry_at":0,"message":"Monthly allowance renewed. Automatic checks will continue if enabled."}'::jsonb else '{}'::jsonb end
  where user_id=owner returning * into s;
 end if;
 used_units=coalesce((s.state->>case when s.state->>'budget_mode'='monthly' then 'month_reserved_units' else 'reserved_units' end)::integer,0);
 cadence=greatest(900,least(86400,coalesce((s.state->>'check_interval_seconds')::integer,900)));
 -- Safe read-only work can recover after a crash; uncertain token rotation requires reconnection.
 if s.lease is not null and s.lease_until<now() then
  if coalesce((s.state->>'refresh_pending')::boolean,false) then
   update library_private.sync set state=state || '{"enabled":false,"sync_issue":"auth","message":"X token refresh was interrupted. Reconnect X to continue."}' where user_id=owner returning * into s;
  else
   update library_private.sync set lease=null,lease_until=null where user_id=owner returning * into s;
  end if;
 end if;
 if action='oauth_prepare' then
  if s.lease is not null and s.lease_until>now() then raise exception 'A check is running. Try again shortly.'; end if;
  update library_private.sync set lease=null,lease_until=null,state=state || '{"enabled":false}' where user_id=owner;
  delete from library_private.oauth where user_id=owner or expires_at<now();
  insert into library_private.oauth(state,user_id,verifier) values(payload->>'state',owner,payload->>'verifier');
  select decrypted_secret into secret_value from vault.decrypted_secrets where id=s.credential_id;
  return jsonb_build_object('client_id',secret_value::jsonb->>'client_id');
 end if;
 if action='status' then return (s.state - array['baseline_ids','seen_ids','anchors','refresh_pending','budget_history']) || jsonb_build_object('allowance_used_units',used_units); end if;
 if action='control' then
  if s.lease is not null then raise exception 'A check is running. Try again shortly.'; end if;
  if (payload->>'enabled')::boolean and used_units>=coalesce((s.state->>'budget_units')::integer,3000) then raise exception 'Spending allowance reached'; end if;
  update library_private.sync set state=state || jsonb_build_object('enabled',(payload->>'enabled')::boolean,'next_check',extract(epoch from now()),'retry_at',0,'sync_issue','','message',case when (payload->>'enabled')::boolean then 'Cloud checks enabled.' else 'Cloud checks paused.' end) where user_id=owner;
  return '{"ok":true}';
 elsif action='claim' then
  if s.lease is not null then return null; end if;
  if not coalesce((payload->>'manual')::boolean,false) and (not (s.state->>'enabled')::boolean or greatest(coalesce((s.state->>'next_check')::double precision,0),coalesce((s.state->>'retry_at')::double precision,0))>extract(epoch from now())) then return null; end if;
  if coalesce((s.state->>'last_attempt')::double precision,0)>extract(epoch from now())-60 then return null; end if;
  update library_private.sync set lease=gen_random_uuid(),lease_until=now()+interval '10 minutes',state=state || jsonb_build_object('last_attempt',extract(epoch from now()),'next_check',(floor(extract(epoch from now())/cadence)+1)*cadence) where user_id=owner returning * into s;
  select decrypted_secret into secret_value from vault.decrypted_secrets where id=s.credential_id;
  return jsonb_build_object('state',s.state,'credentials',secret_value::jsonb,'lease',s.lease);
 elsif action in ('reserve','refresh_start','credentials','finish') then
  if s.lease is null or s.lease::text<>payload->>'lease' or s.lease_until<now() then raise exception 'Worker lease expired'; end if;
  if action='reserve' then
   units=(payload->>'units')::integer;
   if units<1 or units>1000 or used_units+units>coalesce((s.state->>'budget_units')::integer,3000) then raise exception 'Spending allowance reached'; end if;
   update library_private.sync set state=state || jsonb_build_object('reserved_units',coalesce((state->>'reserved_units')::integer,0)+units,'requests',coalesce((state->>'requests')::integer,0)+1) || case when state->>'budget_mode'='monthly' then jsonb_build_object('month_reserved_units',used_units+units) else '{}'::jsonb end where user_id=owner;
  elsif action='refresh_start' then
   update library_private.sync set state=state || '{"refresh_pending":true}' where user_id=owner;
  elsif action='credentials' then
   perform vault.update_secret(s.credential_id,(payload->'credentials')::text);
   update library_private.sync set state=state || '{"refresh_pending":false}' where user_id=owner;
  else
   update library_private.sync set lease=null,lease_until=null,state=state || ((payload->'state')-array['reserved_units','requests','last_attempt','next_check','budget_units','budget_mode','budget_period','budget_reset_at','month_reserved_units','budget_history','check_interval_seconds','refresh_pending']) where user_id=owner;
  end if;
  return '{"ok":true}';
 end if;
 raise exception 'Unknown worker action';
end $function$
;
-- Preserve service-only RPC access; no new browser grants.
revoke all on function public.library_worker(text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.library_worker(text,uuid,jsonb) to service_role;
