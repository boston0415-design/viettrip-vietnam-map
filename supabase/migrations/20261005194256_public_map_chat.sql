-- New public chat only. Existing places, reviews and memberships are not modified.
begin;
create table public.chat_messages (
 id uuid primary key,
 sender_id uuid not null,
 nickname text not null check(char_length(btrim(nickname)) between 1 and 30),
 body text not null check(char_length(btrim(body)) between 1 and 1000),
 created_at timestamptz not null default clock_timestamp()
);
create index chat_messages_time_idx on public.chat_messages(created_at desc,id desc);
create index chat_messages_sender_idx on public.chat_messages(sender_id,created_at desc);
alter table public.chat_messages enable row level security;
revoke all on public.chat_messages from public,anon,authenticated;
grant select on public.chat_messages to anon,authenticated;
create policy chat_recent_public on public.chat_messages for select to anon,authenticated
 using(created_at>now()-interval '7 days');

-- The existing app uses random device capabilities, not Supabase Auth accounts.
-- Never authorize by nickname or by public sender_id. Only the private device key
-- can resolve a member. Keep privileged code in the existing private schema.
create function map_private.send_chat(p_device_id text,p_nickname text,p_body text,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_member uuid; v_row public.chat_messages; v_nickname text:=btrim(p_nickname);v_body text:=btrim(p_body);
begin
 if p_device_id is null or p_device_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then raise exception '회원 연결을 다시 확인해 주세요.';end if;
 select member_id into v_member from map_private.devices where device_key=p_device_id;
 if v_member is null then raise exception '회원 정보를 불러온 뒤 다시 보내주세요.';end if;
 if p_request_id is null or v_nickname is null or char_length(v_nickname) not between 1 and 30 or v_body is null or char_length(v_body) not between 1 and 1000 then raise exception '닉네임은 30자, 메시지는 1,000자 이내로 입력해 주세요.';end if;
 perform pg_advisory_xact_lock(hashtextextended('chat:'||v_member::text,0));
 select * into v_row from public.chat_messages where id=p_request_id;
 if found then
  if v_row.created_at<=now()-interval '7 days' then raise exception '오래된 전송 요청입니다. 내용을 바꾼 뒤 보내주세요.';end if;
  if v_row.sender_id<>v_member or v_row.body<>v_body then raise exception '전송 번호가 중복되었습니다. 내용을 바꾼 뒤 다시 보내주세요.';end if;
  return to_jsonb(v_row)-'sender_id';
 end if;
 if exists(select 1 from public.chat_messages where sender_id=v_member and created_at>clock_timestamp()-interval '3 seconds') then raise exception '3초 뒤에 다시 보내주세요.';end if;
 if (select count(*) from public.chat_messages where sender_id=v_member and created_at>clock_timestamp()-interval '1 hour')>=120 then raise exception '한 시간에 120건까지 보낼 수 있습니다.';end if;
 insert into public.chat_messages(id,sender_id,nickname,body) values(p_request_id,v_member,v_nickname,v_body) returning * into v_row;
 return to_jsonb(v_row)-'sender_id';
end $$;
revoke all on function map_private.send_chat(text,text,text,uuid) from public,anon,authenticated;
grant execute on function map_private.send_chat(text,text,text,uuid) to anon,authenticated;
create function public.send_map_chat(p_device_id text,p_nickname text,p_body text,p_request_id uuid)
returns jsonb language sql security invoker set search_path='' as $$
 select map_private.send_chat(p_device_id,p_nickname,p_body,p_request_id);
$$;
revoke all on function public.send_map_chat(text,text,text,uuid) from public,anon,authenticated;
grant execute on function public.send_map_chat(text,text,text,uuid) to anon,authenticated;
alter publication supabase_realtime add table public.chat_messages;
create extension if not exists pg_cron;
select cron.schedule('map-chat-seven-day-retention','*/5 * * * *',
 $job$delete from public.chat_messages where created_at<=now()-interval '7 days';$job$);
commit;
