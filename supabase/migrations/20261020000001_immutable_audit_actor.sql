-- Audit actors are historical identifiers. Deleting an authentication account
-- must preserve the immutable record rather than attempting ON DELETE SET NULL.
-- RLS and the audit immutability trigger remain unchanged.
alter table public.audit_logs drop constraint audit_logs_actor_id_fkey;
comment on column public.audit_logs.actor_id is 'Historical admin UUID; retained after account deletion to preserve immutable audit evidence.';
