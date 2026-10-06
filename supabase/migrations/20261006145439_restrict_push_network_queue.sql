begin;
-- pg_net is extension-owned. Keep long-lived credentials out of its queue;
-- dispatch uses a hashed, single-use token expiring after one minute.
create table public.chat_push_tokens(token_hash text primary key,created_at timestamptz not null default now());
alter table public.chat_push_tokens enable row level security;
revoke all on public.chat_push_tokens from public,anon,authenticated;
grant all on public.chat_push_tokens to service_role;
create or replace function map_private.wake_chat_push() returns void language plpgsql security definer set search_path='' as $$
declare token text;
begin
 delete from public.chat_push_tokens where created_at<now()-interval '1 minute';
 if exists(select 1 from public.chat_push_deliveries where not done and attempts<5 and next_attempt<=now()) then
 token:=encode(extensions.gen_random_bytes(32),'hex');
 insert into public.chat_push_tokens(token_hash) values(encode(extensions.digest(token,'sha256'),'hex'));
 perform net.http_post(url:='https://oopxtadfimshydsskcyq.supabase.co/functions/v1/chat-push/dispatch',headers:=jsonb_build_object('Content-Type','application/json','x-push-token',token),body:='{}'::jsonb,timeout_milliseconds:=10000);
 end if;
end$$;
revoke all on function map_private.wake_chat_push() from public,anon,authenticated;
-- Invalidate the initial dispatcher credential after switching to one-time tokens.
update public.chat_push_config set dispatch_secret=encode(extensions.gen_random_bytes(32),'hex') where id;
commit;
