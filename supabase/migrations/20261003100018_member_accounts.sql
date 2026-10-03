-- Email accounts extend the existing contribution identity without rewriting posts.
-- No production posts, reviews, or existing membership rows are changed by this migration.
begin;
create table map_private.accounts (
 user_id uuid primary key references auth.users(id),
 member_id uuid not null unique references map_private.members(id),
 device_key text not null unique,
 created_at timestamptz not null default now()
);
create table map_private.deleted_reviews (
 review_id uuid primary key,
 member_id uuid not null references map_private.members(id),
 snapshot jsonb not null,
 deleted_at timestamptz not null default now()
);
create index map_deleted_reviews_member_idx on map_private.deleted_reviews(member_id);
alter table map_private.accounts enable row level security;
alter table map_private.deleted_reviews enable row level security;
revoke all on map_private.accounts,map_private.deleted_reviews from public,anon,authenticated;

create function map_private.account_user() returns uuid
language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid(); v_session text:=auth.jwt()->>'session_id';
begin
 if v_user is null or not exists(select 1 from auth.users where id=v_user and email_confirmed_at is not null and not coalesce(is_anonymous,false)) then
  raise exception '회원 로그인이 필요합니다.' using errcode='42501';
 end if;
 if v_session is null or not exists(select 1 from auth.sessions where id::text=v_session and user_id=v_user and (not_after is null or not_after>now())) then
  raise exception '로그인이 만료되었습니다. 다시 로그인해 주세요.' using errcode='42501';
 end if;
 return v_user;
end;$$;

-- Retained device credentials cannot bypass account logout or access another account.
create function map_private.device_access(p_key text) returns boolean
language plpgsql security definer set search_path='' as $$
declare v_user uuid;
begin
 select a.user_id into v_user from map_private.accounts a join map_private.devices d on d.member_id=a.member_id where d.device_key=p_key;
 if v_user is not null and map_private.account_user() is distinct from v_user then
  raise exception '본인의 회원 기록만 변경할 수 있습니다.' using errcode='42501';
 end if;
 return true;
end;$$;
revoke all on function map_private.account_user(),map_private.device_access(text) from public,anon,authenticated;
grant execute on function map_private.device_access(text) to anon,authenticated;

create policy "account-owned place inserts require login" on public.places as restrictive for insert to anon,authenticated with check (map_private.device_access(created_by));
create policy "account-owned review inserts require login" on public.reviews as restrictive for insert to anon,authenticated with check (map_private.device_access(created_by));

create function map_private.account(p_action text,p_payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 v_user uuid:=map_private.account_user(); v_member uuid; v_key text; v_guest text; v_guest_member uuid;
 v_profile jsonb; v_result jsonb; v_id uuid; v_snapshot jsonb; v_offset integer; v_total bigint;
begin
 if octet_length(coalesce(p_payload,'{}'::jsonb)::text)>16000 then raise exception '요청이 너무 큽니다.'; end if;
 perform pg_advisory_xact_lock(hashtextextended('account:'||v_user::text,0));
 select member_id,device_key into v_member,v_key from map_private.accounts where user_id=v_user;
 if v_member is null then
  if p_action<>'profile' then raise exception '회원 정보를 먼저 불러와 주세요.'; end if;
  v_key:=gen_random_uuid()::text;
  insert into map_private.members(nickname) values(left(btrim(coalesce(p_payload->>'nickname','')),30)) returning id into v_member;
  insert into map_private.devices(device_hash,device_key,member_id) values(encode(extensions.digest(v_key::bytea,'sha256'),'hex'),v_key,v_member);
  insert into map_private.accounts(user_id,member_id,device_key) values(v_user,v_member,v_key);
 end if;
 if p_action='claim' then
  if coalesce((p_payload->>'consent')::boolean,false) is not true then raise exception '기존 활동 연결에 동의해 주세요.'; end if;
  v_guest:=p_payload->>'device_key';
  if v_guest is null or v_guest!~* '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then raise exception '기존 기기를 확인하지 못했습니다.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(encode(extensions.digest(v_guest::bytea,'sha256'),'hex'),0));
  perform pg_advisory_xact_lock(hashtextextended('map-membership-connect',0));
  select member_id into v_guest_member from map_private.devices where device_key=v_guest;
  if v_guest_member is null then
   perform map_private.membership('profile',v_guest,'{}'::jsonb);
   select member_id into v_guest_member from map_private.devices where device_key=v_guest;
  end if;
  if v_guest_member<>v_member then
   if exists(select 1 from map_private.accounts where member_id=v_guest_member) then raise exception '다른 회원 계정의 활동은 가져올 수 없습니다.' using errcode='42501'; end if;
   perform id from map_private.members where id in(v_member,v_guest_member) order by id for update;
   update map_private.devices set member_id=v_member where member_id=v_guest_member;
   update map_private.corrections set member_id=v_member where member_id=v_guest_member;
   delete from map_private.codes where member_id=v_guest_member;
  end if;
 elsif p_action='reviews' then
  v_offset:=greatest(0,least(100000,coalesce((p_payload->>'offset')::integer,0)));
  select count(*) into v_total from public.reviews r join map_private.devices d on d.device_key=r.created_by where d.member_id=v_member;
  select coalesce(jsonb_agg(to_jsonb(q)),'[]'::jsonb) into v_result from (
   select r.id,r.place_id,p.name as place_name,r.rating,r.body,r.author_name,r.photo_urls,r.cafe_url,r.recommended,r.created_at,r.created_by_hash
   from public.reviews r join map_private.devices d on d.device_key=r.created_by join public.places p on p.id=r.place_id
   where d.member_id=v_member order by r.created_at desc,r.id limit 30 offset v_offset
  ) q;
  return jsonb_build_object('items',v_result,'total',v_total,'has_more',v_offset+30<v_total);
 elsif p_action='delete_review' then
  v_id:=(p_payload->>'review_id')::uuid;
  select to_jsonb(r) into v_snapshot from public.reviews r join map_private.devices d on d.device_key=r.created_by where r.id=v_id and d.member_id=v_member for update of r;
  if v_snapshot is null then raise exception '삭제할 본인 후기를 찾지 못했습니다.' using errcode='42501'; end if;
  insert into map_private.deleted_reviews(review_id,member_id,snapshot) values(v_id,v_member,v_snapshot)
   on conflict(review_id) do update set snapshot=excluded.snapshot,deleted_at=now() where map_private.deleted_reviews.member_id=excluded.member_id;
  delete from public.reviews where id=v_id;
  return jsonb_build_object('ok',true,'review_id',v_id);
 elsif p_action='restore_review' then
  v_id:=(p_payload->>'review_id')::uuid;
  select snapshot into v_snapshot from map_private.deleted_reviews where review_id=v_id and member_id=v_member for update;
  if v_snapshot is null then raise exception '복원할 본인 후기를 찾지 못했습니다.' using errcode='42501'; end if;
  if exists(select 1 from public.reviews where id=v_id or (place_id=(v_snapshot->>'place_id')::uuid and created_by=v_snapshot->>'created_by')) then raise exception '이미 후기가 있습니다. 기존 후기를 먼저 확인해 주세요.'; end if;
  insert into public.reviews(id,client_id,place_id,rating,body,author_name,created_by,created_at,photo_urls,cafe_url,recommended)
   select r.id,r.client_id,r.place_id,r.rating,r.body,r.author_name,r.created_by,r.created_at,r.photo_urls,r.cafe_url,r.recommended from jsonb_populate_record(null::public.reviews,v_snapshot) r;
  delete from map_private.deleted_reviews where review_id=v_id and member_id=v_member;
  return jsonb_build_object('ok',true,'review_id',v_id);
 elsif p_action<>'profile' then raise exception '지원하지 않는 회원 요청입니다.';
 end if;
 v_profile:=map_private.membership('profile',v_key,jsonb_build_object('nickname',coalesce(p_payload->>'nickname','')));
 return v_profile||jsonb_build_object('account_user_id',v_user,'account_device_key',v_key);
end;$$;
create function public.map_account(p_action text,p_payload jsonb default '{}'::jsonb) returns jsonb
language sql security invoker set search_path='' as $$select map_private.account(p_action,p_payload);$$;
revoke all on function map_private.account(text,jsonb),public.map_account(text,jsonb) from public,anon,authenticated;
grant execute on function map_private.account(text,jsonb),public.map_account(text,jsonb) to authenticated;
-- Existing capability functions and membership guard follow below.
CREATE OR REPLACE FUNCTION public.device_upsert_review(p_review_id uuid, p_place_id uuid, p_device_id text, p_nickname text, p_rating numeric, p_body text, p_photo_urls text[] DEFAULT '{}'::text[])
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_id uuid;
begin
 perform map_private.device_access(p_device_id);
 if p_device_id is null or length(trim(p_device_id))<8 then raise exception 'invalid device id'; end if;
 if p_rating is not null and (p_rating<1 or p_rating>5 or p_rating='NaN'::numeric) then raise exception 'invalid rating'; end if;
 if p_rating is null and nullif(btrim(p_body),'') is null then raise exception 'rating or review required'; end if;
 if nullif(btrim(p_body),'') is not null and nullif(btrim(p_nickname),'') is null then raise exception 'nickname required for review'; end if;
 if coalesce(array_length(p_photo_urls,1),0)>3 then raise exception 'too many photos'; end if;
 v_id=coalesce(p_review_id,gen_random_uuid());
 insert into public.reviews as existing(id,client_id,place_id,rating,body,author_name,created_by,created_at,photo_urls)
 values(v_id,v_id::text,p_place_id,p_rating,nullif(btrim(p_body),''),nullif(btrim(p_nickname),''),p_device_id,now(),case when nullif(btrim(p_body),'') is not null then coalesce(p_photo_urls,'{}') else '{}' end)
 on conflict(place_id,created_by) where created_by is not null do update
 set rating=coalesce(excluded.rating,existing.rating),
 body=coalesce(excluded.body,existing.body),
 author_name=coalesce(excluded.author_name,existing.author_name),
 photo_urls=case when excluded.body is not null then excluded.photo_urls else existing.photo_urls end,
 created_at=now()
 returning id into v_id;
 return v_id;
end; $function$
;

CREATE OR REPLACE FUNCTION public.owner_request_place_delete(p_place_id uuid, p_owner_key text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
begin
 perform map_private.device_access(p_owner_key);
  update public.places
  set delete_requested=true, updated_at=now()
  where id=p_place_id
    and owner_key_hash = encode(extensions.digest(p_owner_key::bytea, 'sha256'), 'hex');
  return found;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.owner_update_place(p_place_id uuid, p_owner_key text, p_patch jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
begin
 perform map_private.device_access(p_owner_key);
  update public.places
  set name = coalesce(nullif(p_patch->>'name',''), name),
      category = coalesce(nullif(p_patch->>'category',''), category),
      subcategory = case when p_patch ? 'subcategory' then nullif(p_patch->>'subcategory','') else subcategory end,
      area = case when p_patch ? 'area' then nullif(p_patch->>'area','') else area end,
      address = case when p_patch ? 'address' then nullif(p_patch->>'address','') else address end,
      lat = case when p_patch ? 'lat' then (p_patch->>'lat')::double precision else lat end,
      lng = case when p_patch ? 'lng' then (p_patch->>'lng')::double precision else lng end,
      description = case when p_patch ? 'description' then nullif(p_patch->>'description','') else description end,
      member_benefit = case when p_patch ? 'member_benefit' then (p_patch->>'member_benefit')::boolean else member_benefit end,
      benefit_text = case when p_patch ? 'benefit_text' then nullif(p_patch->>'benefit_text','') else benefit_text end,
      photo_urls = case
        when p_patch ? 'photo_urls' then coalesce(
          array(select jsonb_array_elements_text(coalesce(p_patch->'photo_urls','[]'::jsonb))),
          '{}'::text[]
        )
        else photo_urls
      end,
      tags = case
        when p_patch ? 'tags' then coalesce(
          array(select jsonb_array_elements_text(coalesce(p_patch->'tags','[]'::jsonb))),
          '{}'::text[]
        )
        else tags
      end,
      updated_at = now()
  where id = p_place_id
    and owner_key_hash = encode(extensions.digest(p_owner_key::bytea, 'sha256'), 'hex');
  return found;
end;
$function$
;

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
 perform map_private.device_access(p_device_id);
 v_hash:=encode(extensions.digest(p_device_id::bytea,'sha256'),'hex');
 perform pg_advisory_xact_lock(hashtextextended(v_hash,0));
 select member_id into v_member from map_private.devices where device_hash=v_hash;
 if v_member is null then
  insert into map_private.members default values returning id into v_member;
  insert into map_private.devices(device_hash,device_key,member_id) values(v_hash,p_device_id,v_member);
 end if;

 if p_action in ('connect','code') and exists(select 1 from map_private.accounts where member_id=v_member) then raise exception '회원 계정은 다른 기기에서도 이메일로 로그인해 주세요.'; end if;
 if p_action='connect' then
  perform pg_advisory_xact_lock(hashtextextended('map-membership-connect',0));
  select member_id into v_member from map_private.devices where device_hash=v_hash;
  v_code:=lower(regexp_replace(coalesce(p_payload->>'code',''),'[-[:space:]]','','g'));
  if v_code !~ '^vm[0-9a-f]{48}$' then raise exception '연결·복구 코드를 다시 확인해 주세요.'; end if;
  select member_id,kind into v_target,v_kind from map_private.codes
   where code_hash=encode(extensions.digest(v_code::bytea,'sha256'),'hex') and (expires_at is null or expires_at>now()) for update;
  if v_target is null then raise exception '코드가 만료되었거나 올바르지 않습니다.'; end if;
  if exists(select 1 from map_private.accounts where member_id=v_target) then raise exception '회원 계정은 이메일로 로그인해 주세요.'; end if;
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

notify pgrst,'reload schema';
commit;
