-- Run as project administrator. All changes roll back; no X/network calls.
begin;
do $$
declare owner_id uuid; work jsonb; status jsonb; before_total integer; rejected boolean; old_period text;
begin
 select user_id into strict owner_id from library_private.sync;
 perform 1 from library_private.sync where user_id=owner_id for update;
 select (state->>'reserved_units')::integer into before_total from library_private.sync where user_id=owner_id;
 update library_private.sync set lease=null,lease_until=null,state=state || jsonb_build_object('enabled',true,'refresh_pending',false,'budget_mode','monthly','budget_units',15,'month_reserved_units',10,'budget_period',extract(epoch from date_trunc('month',now() at time zone 'UTC') at time zone 'UTC'),'budget_reset_at',extract(epoch from (date_trunc('month',now() at time zone 'UTC')+interval '1 month') at time zone 'UTC'),'last_attempt',0,'next_check',0,'retry_at',0,'check_interval_seconds',1800) where user_id=owner_id;
 work=public.library_worker('claim',owner_id,'{}');
 assert work->>'lease' is not null,'due work must claim';
 assert mod((work->'state'->>'next_check')::numeric,1800)=0,'half-hour alignment';
 assert public.library_worker('claim',owner_id,'{}') is null,'lease prevents overlap';
 perform public.library_worker('reserve',owner_id,jsonb_build_object('lease',work->>'lease','units',5));
 rejected=false;
 begin
  perform public.library_worker('reserve',owner_id,jsonb_build_object('lease',work->>'lease','units',1));
 exception when others then rejected=sqlerrm='Spending allowance reached'; end;
 assert rejected,'cannot reserve beyond monthly cap';
 perform public.library_worker('finish',owner_id,jsonb_build_object('lease',work->>'lease','state',jsonb_build_object('budget_units',999999,'month_reserved_units',0,'reserved_units',0,'check_interval_seconds',1,'budget_mode','total')));
 status=public.library_worker('status',owner_id,'{}');
 assert (status->>'budget_units')::int=15 and (status->>'allowance_used_units')::int=15,'finish cannot change allowance';
 assert (status->>'reserved_units')::int=before_total+5,'lifetime reservations retained';
 assert status->>'budget_mode'='monthly' and (status->>'check_interval_seconds')::int=1800,'policy protected';
 update library_private.sync set state=state || jsonb_build_object('budget_period',1,'budget_reset_at',2,'sync_issue','budget','retry_at',2) where user_id=owner_id;
 status=public.library_worker('status',owner_id,'{}');
 assert (status->>'allowance_used_units')::int=0 and (status->>'reserved_units')::int=before_total+5,'rollover changes only monthly usage';
 assert (status->>'enabled')::boolean and status->>'sync_issue'='','budget waiting resumes next period';
 assert (select state->'budget_history'->>'1' from library_private.sync where user_id=owner_id)='15','closed month recorded';
 update library_private.sync set state=state || '{"enabled":false,"budget_period":1}' where user_id=owner_id;
 status=public.library_worker('status',owner_id,'{}');
 assert not (status->>'enabled')::boolean,'rollover never undoes manual pause';
 update library_private.sync set state=state || jsonb_build_object('enabled',true,'next_check',0,'last_attempt',0,'retry_at',extract(epoch from now())+3600) where user_id=owner_id;
 assert not (public.library_worker('due') @> to_jsonb(array[owner_id])),'backoff excludes owner';
 assert public.library_worker('claim',owner_id,'{}') is null,'claim also enforces backoff';
 update library_private.sync set lease=gen_random_uuid(),lease_until=now()-interval '1 minute',state=state || '{"retry_at":0,"refresh_pending":false}' where user_id=owner_id;
 work=public.library_worker('claim',owner_id,'{}');assert work->>'lease' is not null,'expired read-only lease recovers';
 update library_private.sync set lease_until=now()-interval '1 minute',state=state || '{"refresh_pending":true}' where user_id=owner_id;
 assert public.library_worker('claim',owner_id,'{}') is null,'uncertain rotation does not replay';
 status=public.library_worker('status',owner_id,'{}');assert status->>'sync_issue'='auth' and not (status->>'enabled')::boolean,'uncertain refresh requires reconnect';
 assert not has_function_privilege('anon','public.library_worker(text,uuid,jsonb)','execute'),'anonymous RPC denied';
 assert not has_function_privilege('authenticated','public.library_worker(text,uuid,jsonb)','execute'),'browser RPC denied';
end $$;
rollback;
select 'PASS: monthly cap, rollover, lifetime counter, protected policy, schedule, backoff, leases and RPC access' as result;
