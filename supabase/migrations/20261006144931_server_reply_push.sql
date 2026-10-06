begin;
create extension if not exists pg_net;
create table public.chat_push_config(id boolean primary key default true check(id),dispatch_secret text not null default encode(extensions.gen_random_bytes(32),'hex'),vapid jsonb);
insert into public.chat_push_config(id) values(true);
create table public.chat_push_subscriptions(id text primary key,member_id uuid not null,subscription jsonb not null,updated_at timestamptz not null default now());
create index on public.chat_push_subscriptions(member_id);
create table public.chat_push_inbox(message_id uuid primary key references public.chat_messages(id) on delete cascade,member_id uuid not null,read_at timestamptz,created_at timestamptz not null default now());
create index on public.chat_push_inbox(member_id,created_at) where read_at is null;
create table public.chat_push_deliveries(id uuid primary key default gen_random_uuid(),message_id uuid not null references public.chat_push_inbox(message_id) on delete cascade,subscription_id text not null references public.chat_push_subscriptions(id) on delete cascade,attempts integer not null default 0,next_attempt timestamptz not null default now(),done boolean not null default false,last_status integer,unique(message_id,subscription_id));
create index on public.chat_push_deliveries(next_attempt) where not done;
alter table public.chat_push_config enable row level security;
alter table public.chat_push_subscriptions enable row level security;
alter table public.chat_push_inbox enable row level security;
alter table public.chat_push_deliveries enable row level security;
revoke all on public.chat_push_config,public.chat_push_subscriptions,public.chat_push_inbox,public.chat_push_deliveries from public,anon,authenticated;
grant all on public.chat_push_config,public.chat_push_subscriptions,public.chat_push_inbox,public.chat_push_deliveries to service_role;
-- Same private device capability as existing chat; never trust nickname/public member ID.
grant usage on schema map_private to service_role;
create function map_private.push_member(p_device_id text) returns uuid language sql security definer set search_path='' as $$select member_id from map_private.devices where device_key=p_device_id$$;
revoke all on function map_private.push_member(text) from public,anon,authenticated;
grant execute on function map_private.push_member(text) to service_role;
create function public.chat_push_member(p_device_id text) returns uuid language sql security invoker set search_path='' as $$select map_private.push_member(p_device_id)$$;
revoke all on function public.chat_push_member(text) from public,anon,authenticated;
grant execute on function public.chat_push_member(text) to service_role;
create function map_private.wake_chat_push() returns void language plpgsql security definer set search_path='' as $$begin
 if exists(select 1 from public.chat_push_deliveries where not done and attempts<5 and next_attempt<=now()) then
 perform net.http_post(url:='https://oopxtadfimshydsskcyq.supabase.co/functions/v1/chat-push/dispatch',headers:=jsonb_build_object('Content-Type','application/json','x-push-secret',(select dispatch_secret from public.chat_push_config where id)),body:='{}'::jsonb,timeout_milliseconds:=10000);
 end if;
end$$;
revoke all on function map_private.wake_chat_push() from public,anon,authenticated;
create function map_private.enqueue_chat_push() returns trigger language plpgsql security definer set search_path='' as $$
declare target uuid;match text[];
begin
 match:=regexp_match(new.body,'^↪ \[to:([0-9a-fA-F-]{36})\] ');
 if match is null then return new;end if;
 begin target:=match[1]::uuid;exception when invalid_text_representation then return new;end;
 if target=new.sender_id or not exists(select 1 from public.chat_push_subscriptions where member_id=target) then return new;end if;
 insert into public.chat_push_inbox(message_id,member_id) values(new.id,target) on conflict do nothing;
 insert into public.chat_push_deliveries(message_id,subscription_id) select new.id,id from public.chat_push_subscriptions where member_id=target on conflict do nothing;
 -- Delivery outages never prevent the original chat from being saved.
 begin perform map_private.wake_chat_push();exception when others then null;end;
 return new;
end$$;
revoke all on function map_private.enqueue_chat_push() from public,anon,authenticated;
create trigger chat_reply_push after insert on public.chat_messages for each row execute function map_private.enqueue_chat_push();
create function public.claim_chat_push() returns setof public.chat_push_deliveries language sql security invoker set search_path='' as $$
 update public.chat_push_deliveries d set attempts=d.attempts+1,next_attempt=now()+interval '2 minutes' where d.id in(select id from public.chat_push_deliveries where not done and attempts<5 and next_attempt<=now() order by next_attempt limit 20 for update skip locked) returning d.*
$$;
revoke all on function public.claim_chat_push() from public,anon,authenticated;
grant execute on function public.claim_chat_push() to service_role;
select cron.schedule('chat-push-retry','* * * * *',$job$select map_private.wake_chat_push();$job$);
commit;
