-- Exercise capabilities and updates against the existing installation, then
-- roll back every test token and state change. No X requests are made.
begin;
do $$
declare owner_id uuid; before_state jsonb; after_state jsonb; snapshot jsonb; result jsonb; hash text:=repeat('0',64); stamp double precision:=extract(epoch from now()); refs integer;
begin
 select user_id,state into owner_id,before_state from library_private.sync limit 1;
 if owner_id is null then raise exception 'A connected library is required.'; end if;
 if has_function_privilege('anon','public.library_folder_worker(text,uuid,jsonb)','execute') or has_function_privilege('authenticated','public.library_folder_worker(text,uuid,jsonb)','execute') then raise exception 'Folder RPC is publicly executable'; end if;
 if has_table_privilege('authenticated','library_private.folder_devices','select') then raise exception 'Folder devices are exposed'; end if;
 select count(*) into refs from public.library_references where user_id=owner_id;
 perform public.library_folder_worker('create',owner_id,jsonb_build_object('hash',hash,'x_user_id',before_state->>'user_id','account_handle','fixture_owner'));
 result:=public.library_folder_worker('auth',null,jsonb_build_object('hash',hash));
 if result->>'user_id' is distinct from owner_id::text then raise exception 'Capability authentication failed'; end if;
 if public.library_worker('device_auth',null,jsonb_build_object('hash',hash))->>'user_id' is not null then raise exception 'Folder token can capture references'; end if;
 snapshot:=(before_state->'folder_snapshot') || jsonb_build_object('observed_at',stamp,'source','x_browser','complete',true);
 begin
  perform public.library_folder_worker('apply',owner_id,jsonb_build_object('hash',hash,'account_handle','other','snapshot',snapshot));
  raise exception 'Wrong account was accepted';
 exception when others then if sqlerrm not like 'Sign in to the linked X account%' then raise; end if; end;
 begin
  perform public.library_folder_worker('apply',owner_id,jsonb_build_object('hash',hash,'account_handle','fixture_owner','snapshot',snapshot||'{"complete":false}'));
  raise exception 'Partial snapshot was accepted';
 exception when others then if sqlerrm not like 'Folder scan was incomplete%' then raise; end if; end;
 result:=public.library_folder_worker('apply',owner_id,jsonb_build_object('hash',hash,'account_handle','fixture_owner','snapshot',snapshot,'edits','[]'::jsonb));
 if result->>'ok' is distinct from 'true' then raise exception 'Complete unchanged scan failed'; end if;
 result:=public.library_folder_worker('apply',owner_id,jsonb_build_object('hash',hash,'account_handle','fixture_owner','snapshot',snapshot));
 if result->>'ignored' is distinct from 'true' then raise exception 'Old upload was replayed'; end if;
 select state into after_state from library_private.sync where user_id=owner_id;
 if before_state->'baseline_ids' is distinct from after_state->'baseline_ids' or before_state->'anchors' is distinct from after_state->'anchors' or before_state->'budget_units' is distinct from after_state->'budget_units' or before_state->'month_reserved_units' is distinct from after_state->'month_reserved_units' then raise exception 'Browser sync changed bookmark or spending state'; end if;
 result:=public.library_folder_worker('apply',owner_id,jsonb_build_object('hash',hash,'account_handle','fixture_owner','snapshot',snapshot||jsonb_build_object('folders','[]'::jsonb,'observed_at',stamp+1)));
 if result->>'retry' is distinct from 'true' then raise exception 'Removals were not confirmed independently'; end if;
 if (select state#>'{folder_snapshot,folders}' from library_private.sync where user_id=owner_id) is distinct from snapshot->'folders' then raise exception 'First removal scan cleared assignments'; end if;
 update library_private.sync set state=state||jsonb_build_object('browser_folder_removal_at',stamp-31) where user_id=owner_id;
 result:=public.library_folder_worker('apply',owner_id,jsonb_build_object('hash',hash,'account_handle','fixture_owner','snapshot',snapshot||jsonb_build_object('folders','[]'::jsonb,'observed_at',stamp+2)));
 if result->>'ok' is distinct from 'true' then raise exception 'Confirmed removal was rejected'; end if;
 if (select count(*) from public.library_references where user_id=owner_id)<>refs then raise exception 'Browser sync changed saved references'; end if;
 perform public.library_folder_worker('device_revoke',owner_id,jsonb_build_object('hash',hash));
 if public.library_folder_worker('auth',null,jsonb_build_object('hash',hash)) is not null then raise exception 'Revoked token still works'; end if;
end $$;
rollback;
select 'Folder capability, account binding, replay, removal confirmation and rollback checks passed' as verification;
