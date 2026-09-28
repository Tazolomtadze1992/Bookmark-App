begin;
create table public.library_references (
 user_id uuid not null references auth.users(id) on delete cascade,
 id text not null check (id ~ '^[a-f0-9]{32}$'),
 record jsonb not null,
 saved_at timestamptz not null,
 motion jsonb,
 poster text,
 metadata jsonb not null default '{}'::jsonb,
 primary key (user_id,id),
 check (jsonb_typeof(record)='object'),
 check (record->>'id'=id),
 check (record->>'kind' in ('website','x_post')),
 check (record->>'url' ~ '^https?://'),
 check (octet_length(record::text)<50000)
);
alter table public.library_references enable row level security;
revoke all on public.library_references from anon, authenticated;
grant select,insert,update on public.library_references to authenticated;
create policy "Read own references" on public.library_references for select to authenticated using ((select auth.uid())=user_id);
create policy "Insert own references" on public.library_references for insert to authenticated with check ((select auth.uid())=user_id);
create policy "Update own references" on public.library_references for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create index library_references_recent on public.library_references(user_id,saved_at desc,id);
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types) values ('previews','previews',false,3000000,array['image/jpeg']);
create policy "Read own previews" on storage.objects for select to authenticated using (bucket_id='previews' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "Insert own previews" on storage.objects for insert to authenticated with check (bucket_id='previews' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "Update own previews" on storage.objects for update to authenticated using (bucket_id='previews' and (storage.foldername(name))[1]=(select auth.uid())::text) with check (bucket_id='previews' and (storage.foldername(name))[1]=(select auth.uid())::text);
-- The dashboard's optional automatic-RLS helper is for database administration only.
do $$ begin
 if to_regprocedure('public.rls_auto_enable()') is not null then
  revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
 end if;
end $$;
commit;
select relrowsecurity as row_security_enabled from pg_class where oid='public.library_references'::regclass;
select id,public from storage.buckets where id='previews';
