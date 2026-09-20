-- Capability-based map membership. Existing random device credentials remain valid.
-- Private credentials never appear in public views or badge responses.
begin;
create schema if not exists map_private;
revoke all on schema map_private from public;
grant usage on schema map_private to anon,authenticated;

create table if not exists map_private.members (
 id uuid primary key default gen_random_uuid(), nickname text not null default '',
 created_at timestamptz not null default now()
);
create table if not exists map_private.devices (
 device_hash text primary key, device_key text not null unique,
 member_id uuid not null references map_private.members(id), created_at timestamptz not null default now()
);
create index if not exists map_member_devices_member_idx on map_private.devices(member_id);
create table if not exists map_private.codes (
 code_hash text primary key, member_id uuid not null references map_private.members(id),
 kind text not null check(kind in ('link','recovery')), expires_at timestamptz,
 created_at timestamptz not null default now(), unique(member_id,kind)
);
create table if not exists map_private.corrections (
 id uuid primary key default gen_random_uuid(), member_id uuid not null references map_private.members(id),
 place_id uuid not null references public.places(id) on delete cascade,
 kind text not null check(kind in ('address','hours','closed','other')), body text not null,
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 created_at timestamptz not null default now(), reviewed_at timestamptz
);
create index if not exists map_corrections_member_idx on map_private.corrections(member_id,place_id,kind);
create index if not exists map_corrections_place_idx on map_private.corrections(place_id);
create table if not exists map_private.exclusions (
 kind text not null check(kind in ('place','review')), source_id uuid not null,
 created_at timestamptz not null default now(), primary key(kind,source_id)
);
alter table map_private.members enable row level security;
alter table map_private.devices enable row level security;
alter table map_private.codes enable row level security;
alter table map_private.corrections enable row level security;
alter table map_private.exclusions enable row level security;
revoke all on all tables in schema map_private from public,anon,authenticated;

-- Live, deduplicated contributions: editing/deleting/recreating cannot accumulate points.
-- Imported records without a random member credential are not attributed to members.
create or replace view map_private.contributions with (security_invoker=true) as
with places_ranked as (
 select p.*, row_number() over (
  partition by lower(regexp_replace(btrim(p.name),'\s+',' ','g')),round(p.lat::numeric,4),round(p.lng::numeric,4)
  order by p.created_at,p.id) as duplicate_number
 from public.places p
), review_candidates as (
 select r.*, coalesce(d.member_id::text,r.created_by_hash) as actor,
  row_number() over (partition by coalesce(d.member_id::text,r.created_by_hash),r.place_id order by r.created_at desc,r.id) as place_number,
  row_number() over (partition by coalesce(d.member_id::text,r.created_by_hash),lower(regexp_replace(btrim(r.body),'\s+',' ','g')) order by r.created_at,r.id) as text_number
 from public.reviews r left join map_private.devices d on d.device_hash=r.created_by_hash
 where char_length(btrim(coalesce(r.body,'')))>=10 and nullif(btrim(r.author_name),'') is not null
 and r.created_by ~* '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
)
select coalesce(d.member_id::text,p.owner_key_hash) as actor,'place'::text as kind,
 p.id as source_id,p.id as place_id,p.name,p.created_at as at
from places_ranked p left join map_private.devices d on d.device_hash=p.owner_key_hash
where p.duplicate_number=1 and nullif(btrim(p.address),'') is not null
 and p.created_by ~* '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
 and not exists(select 1 from map_private.exclusions e where e.kind='place' and e.source_id=p.id)
union all
select r.actor,'review',r.id,r.place_id,p.name,r.created_at
from review_candidates r join public.places p on p.id=r.place_id
where r.place_number=1 and r.text_number=1
 and not exists(select 1 from map_private.exclusions e where e.kind='review' and e.source_id=r.id)
union all
select c.member_id::text,'correction',min(c.id::text)::uuid,c.place_id,p.name,min(c.reviewed_at)
from map_private.corrections c join public.places p on p.id=c.place_id
where c.status='approved' group by c.member_id,c.place_id,c.kind,p.name;
revoke all on map_private.contributions from public,anon,authenticated;

create or replace function map_private.grade(p_count bigint) returns integer
language sql immutable set search_path='' as $$
 select case when p_count>=150 then 5 when p_count>=60 then 4 when p_count>=25 then 3 when p_count>=10 then 2 when p_count>=3 then 1 else 0 end;
$$;

-- A single narrowly scoped API. Public badges are read-only; every private action
-- requires possession of a 122-bit device credential or a 192-bit linking code.
-- No Supabase Auth accounts are used by the existing app; auth.uid() is therefore
-- not its identity boundary. Neither nicknames nor public hashes authorize writes.
create or replace function map_private.membership(p_action text,p_device_id text,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 v_hash text; v_member uuid; v_target uuid; v_nickname text; v_code text; v_kind text;
 v_total bigint; v_result jsonb; v_id uuid; v_place uuid; v_status text; v_keys jsonb;
begin
 if octet_length(coalesce(p_payload,'{}'::jsonb)::text)>32000 then raise exception '요청이 너무 큽니다.'; end if;
 if p_action='badges' then
  if jsonb_typeof(p_payload->'hashes') is distinct from 'array' or jsonb_array_length(p_payload->'hashes')>200 then raise exception '잘못된 등급 조회입니다.'; end if;
  with requested as (select distinct value as hash from jsonb_array_elements_text(p_payload->'hashes') where value ~ '^[0-9a-f]{64}$'),
  actors as (select r.hash,coalesce(d.member_id::text,r.hash) as actor from requested r left join map_private.devices d on d.device_hash=r.hash),
  totals as (select c.actor,count(*) as total from map_private.contributions c where c.actor in(select a.actor from actors a) group by c.actor)
  select coalesce(jsonb_agg(jsonb_build_object('hash',a.hash,'member',a.actor,'total',coalesce(t.total,0),'level',map_private.grade(coalesce(t.total,0)))),'[]') into v_result
  from actors a left join totals t on t.actor=a.actor;
  return v_result;
 end if;

 if p_action in ('moderation','moderate','exclude') then
  if not coalesce(public.admin_verify(p_payload->>'admin_key'),false) then raise exception '관리자 인증이 필요합니다.'; end if;
  if p_action='moderation' then
   select coalesce(jsonb_agg(to_jsonb(q)),'[]') into v_result from (
    select c.id,c.place_id,p.name,c.kind,c.body,c.status,c.created_at,m.nickname
    from map_private.corrections c join public.places p on p.id=c.place_id join map_private.members m on m.id=c.member_id
    order by (c.status='pending') desc,c.created_at desc limit 100) q;
   return v_result;
  elsif p_action='moderate' then
   v_status:=p_payload->>'status';
   if v_status not in ('approved','rejected') or v_status is null then raise exception '처리 상태를 확인하세요.'; end if;
   update map_private.corrections set status=v_status,reviewed_at=now() where id=(p_payload->>'id')::uuid;
   if not found then raise exception '제안을 찾지 못했습니다.'; end if;
  else
   v_kind:=p_payload->>'kind'; v_id:=(p_payload->>'id')::uuid;
   if v_kind not in ('place','review') or v_id is null or v_kind is null then raise exception '기여를 확인하세요.'; end if;
   if coalesce((p_payload->>'excluded')::boolean,true) then
    insert into map_private.exclusions(kind,source_id) values(v_kind,v_id) on conflict do nothing;
   else delete from map_private.exclusions where kind=v_kind and source_id=v_id; end if;
  end if;
  return jsonb_build_object('ok',true);
 end if;

 if p_device_id is null or p_device_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then raise exception '기기 정보를 확인하지 못했습니다. 새로고침해 주세요.'; end if;
 v_hash:=encode(extensions.digest(p_device_id::bytea,'sha256'),'hex');
 perform pg_advisory_xact_lock(hashtextextended(v_hash,0));
 select member_id into v_member from map_private.devices where device_hash=v_hash;
 if v_member is null then
  insert into map_private.members default values returning id into v_member;
  insert into map_private.devices(device_hash,device_key,member_id) values(v_hash,p_device_id,v_member);
 end if;

 if p_action='connect' then
  perform pg_advisory_xact_lock(hashtextextended('map-membership-connect',0));
  select member_id into v_member from map_private.devices where device_hash=v_hash;
  v_code:=lower(regexp_replace(coalesce(p_payload->>'code',''),'[-[:space:]]','','g'));
  if v_code !~ '^vm[0-9a-f]{48}$' then raise exception '연결·복구 코드를 다시 확인해 주세요.'; end if;
  select member_id,kind into v_target,v_kind from map_private.codes
   where code_hash=encode(extensions.digest(v_code::bytea,'sha256'),'hex') and (expires_at is null or expires_at>now()) for update;
  if v_target is null then raise exception '코드가 만료되었거나 올바르지 않습니다.'; end if;
  if v_target<>v_member then
   -- Serialize concurrent merges in a stable order. Proof of BOTH identities is required.
   perform id from map_private.members where id in(v_member,v_target) order by id for update;
   if not coalesce((p_payload->>'merge')::boolean,false) then raise exception '현재 기기의 활동을 합치는 데 동의해 주세요.'; end if;
   update map_private.devices set member_id=v_target where member_id=v_member;
   update map_private.corrections set member_id=v_target where member_id=v_member;
   delete from map_private.codes where member_id=v_member;
   delete from map_private.members where id=v_member;
   v_member:=v_target;
  end if;
  if v_kind='link' then delete from map_private.codes where code_hash=encode(extensions.digest(v_code::bytea,'sha256'),'hex'); end if;
 elsif p_action='code' then
  v_kind:=p_payload->>'kind';
  if v_kind not in ('link','recovery') or v_kind is null then raise exception '코드 종류를 확인하세요.'; end if;
  v_code:='VM-'||encode(extensions.gen_random_bytes(24),'hex');
  insert into map_private.codes(code_hash,member_id,kind,expires_at)
   values(encode(extensions.digest(lower(replace(v_code,'-',''))::bytea,'sha256'),'hex'),v_member,v_kind,case when v_kind='link' then now()+interval '10 minutes' end)
   on conflict(member_id,kind) do update set code_hash=excluded.code_hash,expires_at=excluded.expires_at,created_at=now();
  return jsonb_build_object('code',v_code,'kind',v_kind,'minutes',case when v_kind='link' then 10 else null end);
 elsif p_action='correct' then
  v_place:=(p_payload->>'place_id')::uuid; v_kind:=p_payload->>'kind';
  if v_kind not in ('address','hours','closed','other') or v_kind is null or char_length(btrim(coalesce(p_payload->>'body',''))) not between 10 and 1000 then raise exception '수정할 내용을 10~1,000자로 적어주세요.'; end if;
  perform id from map_private.members where id=v_member for update;
  if (select count(*) from map_private.corrections where member_id=v_member and created_at>now()-interval '1 day')>=10 then raise exception '오늘은 제안을 충분히 남겨주셨어요. 내일 다시 이용해 주세요.'; end if;
  if exists(select 1 from map_private.corrections where member_id=v_member and place_id=v_place and kind=v_kind and status<>'rejected') then raise exception '같은 항목의 제안이 이미 접수되었거나 인정되었습니다.'; end if;
  insert into map_private.corrections(member_id,place_id,kind,body) values(v_member,v_place,v_kind,btrim(p_payload->>'body'));
 elsif p_action not in ('profile','nickname','connect') then
  raise exception '지원하지 않는 요청입니다.';
 end if;

 v_nickname:=btrim(coalesce(p_payload->>'nickname',''));
 if p_action='nickname' and (char_length(v_nickname) not between 1 and 30 or v_nickname ~ '[[:cntrl:]]') then raise exception '닉네임은 1~30자로 입력해 주세요.'; end if;
 if char_length(v_nickname) between 1 and 30 and v_nickname !~ '[[:cntrl:]]' then
  update map_private.members set nickname=v_nickname where id=v_member and (p_action='nickname' or nickname='');
 end if;
 select count(*) into v_total from map_private.contributions where actor=v_member::text;
 select jsonb_agg(jsonb_build_object('hash',device_hash,'key',device_key)) into v_keys from map_private.devices where member_id=v_member;
 select jsonb_build_object('id',id,'nickname',nickname,'total',v_total,'level',map_private.grade(v_total),
  'devices',v_keys,'has_recovery',exists(select 1 from map_private.codes where member_id=v_member and kind='recovery'),
  'counts',(select jsonb_build_object('place',count(*) filter(where kind='place'),'review',count(*) filter(where kind='review'),'correction',count(*) filter(where kind='correction')) from map_private.contributions where actor=v_member::text),
  'activities',(select coalesce(jsonb_agg(to_jsonb(q)),'[]') from (select kind,source_id,place_id,name,at from map_private.contributions where actor=v_member::text order by at desc limit 50) q),
  'corrections',(select coalesce(jsonb_agg(to_jsonb(q)),'[]') from (select c.id,c.kind,c.status,c.body,p.name,c.place_id from map_private.corrections c join public.places p on p.id=c.place_id where c.member_id=v_member order by c.created_at desc limit 30) q)
 ) into v_result from map_private.members where id=v_member;
 return v_result;
end;$$;

create or replace function public.map_membership(p_action text,p_device_id text default null,p_payload jsonb default '{}'::jsonb)
returns jsonb language sql security invoker set search_path='' as $$
 select map_private.membership(p_action,p_device_id,p_payload);
$$;
revoke all on all functions in schema map_private from public,anon,authenticated;
grant execute on function map_private.membership(text,text,jsonb) to anon,authenticated;
revoke all on function public.map_membership(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.map_membership(text,text,jsonb) to anon,authenticated;
notify pgrst,'reload schema';
commit;
