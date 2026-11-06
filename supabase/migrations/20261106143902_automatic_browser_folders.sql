create table library_private.folder_devices (
 token_hash text primary key check (token_hash ~ '^[a-f0-9]{64}$'),
 user_id uuid not null references auth.users(id) on delete cascade,
 x_user_id text not null,
 x_handle text not null check (x_handle ~ '^[A-Za-z0-9_]{1,15}$'),
 created_at timestamptz not null default now(),
 last_seen timestamptz,
 last_observed double precision not null default 0,
 revoked boolean not null default false
);
alter table library_private.folder_devices enable row level security;
revoke all on library_private.folder_devices from public,anon,authenticated;
grant select,insert,update,delete on library_private.folder_devices to service_role;

-- Separate capability from capture tokens: no collection/media/credential reads.
create function public.library_folder_worker(action text, owner uuid default null, payload jsonb default '{}')
returns jsonb language plpgsql security definer set search_path='' as $$
declare device library_private.folder_devices; s library_private.sync; item jsonb; removals jsonb;
begin
 if action='auth' then
  update library_private.folder_devices set last_seen=now()
   where token_hash=payload->>'hash' and not revoked returning * into device;
  if device.user_id is null then return null; end if;
  return jsonb_build_object('user_id',device.user_id,'account_handle',device.x_handle);
 end if;
 select * into s from library_private.sync where user_id=owner for update;
 if s.user_id is null then raise exception 'Connect X before enabling automatic folders.'; end if;
 if action='create' then
  if payload->>'x_user_id' is distinct from s.state->>'user_id' then raise exception 'Connect the same X account.'; end if;
  update library_private.folder_devices set revoked=true where user_id=owner;
  insert into library_private.folder_devices(token_hash,user_id,x_user_id,x_handle)
   values(payload->>'hash',owner,payload->>'x_user_id',payload->>'account_handle');
  update library_private.sync set state=state || jsonb_build_object('browser_folder_pending',true,'browser_folder_account',payload->>'account_handle','browser_folder_error','') where user_id=owner;
  return '{"ok":true}';
 elsif action='revoke' then
  update library_private.folder_devices set revoked=true where user_id=owner;
  update library_private.sync set state=state || '{"browser_folder_sync_enabled":false,"browser_folder_pending":false,"browser_folder_error":""}'::jsonb where user_id=owner;
  return '{"ok":true}';
 end if;
 select * into device from library_private.folder_devices where token_hash=payload->>'hash' and user_id=owner and not revoked for update;
 if device.user_id is null or device.x_user_id is distinct from s.state->>'user_id' then raise exception 'Automatic folder connection expired. Reconnect it from your library.'; end if;
 if action='device_revoke' then
  update library_private.folder_devices set revoked=true where token_hash=device.token_hash;
  update library_private.sync set state=state || '{"browser_folder_sync_enabled":false,"browser_folder_pending":false,"browser_folder_error":""}'::jsonb where user_id=owner;
  return '{"ok":true}';
 elsif action='context' then
  return jsonb_build_object('excluded_ids',coalesce(s.state->'baseline_ids','[]'));
 elsif action='error' then
  update library_private.sync set state=state || jsonb_build_object('browser_folder_error',left(coalesce(payload->>'message','Folder check interrupted.'),300)) where user_id=owner;
  return '{"ok":true}';
 elsif action='apply' then
  if s.lease is not null then raise exception 'An X check is running. Retrying shortly.'; end if;
  if payload->>'account_handle' is distinct from lower(device.x_handle) then raise exception 'Sign in to the linked X account.'; end if;
  if payload#>>'{snapshot,complete}' is distinct from 'true' then raise exception 'Folder scan was incomplete.'; end if;
  if (payload#>>'{snapshot,observed_at}')::double precision<=device.last_observed then return '{"ok":true,"ignored":true}'; end if;
  -- A second independent scan confirms removals. An empty/loading X menu or a
  -- shortened timeline can never immediately wipe previously verified data.
  select coalesce(jsonb_agg(key order by key),'[]') into removals from (
   select f->>'id'||':folder' as key from jsonb_array_elements(coalesce(s.state#>'{folder_snapshot,folders}','[]')) f
    where not exists(select 1 from jsonb_array_elements(payload#>'{snapshot,folders}') n where n->>'id'=f->>'id')
   union
   select f->>'id'||':'||saved.post_id as key from jsonb_array_elements(coalesce(s.state#>'{folder_snapshot,folders}','[]')) f cross join lateral jsonb_array_elements_text(f->'post_ids') as saved(post_id)
    where not exists(select 1 from jsonb_array_elements(payload#>'{snapshot,folders}') n where n->>'id'=f->>'id' and n->'post_ids' @> jsonb_build_array(saved.post_id))
  ) removed;
  if jsonb_array_length(removals)>0 then
   if s.state->'browser_folder_pending_removals' is distinct from removals or coalesce((s.state->>'browser_folder_removal_at')::double precision,0)<extract(epoch from now())-900 then
    update library_private.sync set state=state || jsonb_build_object('browser_folder_pending_removals',removals,'browser_folder_removal_at',extract(epoch from now()),'browser_folder_error','Confirming folder changes with a second check.') where user_id=owner;
    return '{"ok":false,"retry":true,"message":"Confirming folder changes with a second check."}';
   elsif (s.state->>'browser_folder_removal_at')::double precision>extract(epoch from now())-30 then
    return '{"ok":false,"retry":true,"message":"Confirming folder changes with a second check."}';
   end if;
  end if;
  for item in select value from jsonb_array_elements(coalesce(payload->'edits','[]')) loop
   update public.library_references set metadata=coalesce(metadata,'{}') || jsonb_build_object('edit_history_tweet_ids',item->'edit_history_tweet_ids')
    where user_id=owner and id=item->>'id' and deleted_at is null;
  end loop;
  update library_private.sync set state=state || jsonb_build_object(
   'folder_snapshot',(payload->'snapshot') || jsonb_build_object('synced_at',extract(epoch from now())),
   'folder_last_attempt',extract(epoch from now()),'folder_error','','folder_sync_issue','','folder_partial_snapshot',null,
   'browser_folder_sync_enabled',true,'browser_folder_pending',false,'browser_folder_last_sync',extract(epoch from now()),'browser_folder_error','','browser_folder_pending_removals',null,'browser_folder_removal_at',null
  ) where user_id=owner;
  update library_private.folder_devices set last_observed=(payload#>>'{snapshot,observed_at}')::double precision,last_seen=now() where token_hash=device.token_hash;
  return jsonb_build_object('ok',true,'folders',jsonb_array_length(payload#>'{snapshot,folders}'));
 end if;
 raise exception 'Unknown folder worker action';
end $$;
revoke all on function public.library_folder_worker(text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.library_folder_worker(text,uuid,jsonb) to service_role;
