-- Explicit grants are required because automatic Data API exposure is disabled.
grant select,insert,update on public.library_references to service_role;
