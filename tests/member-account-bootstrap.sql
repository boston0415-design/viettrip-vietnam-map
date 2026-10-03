-- Isolated CI database only. Never run this fixture on production.
create role anon; create role authenticated; create schema auth; create schema extensions; create extension pgcrypto with schema extensions;
create table auth.users(id uuid primary key,email_confirmed_at timestamptz,is_anonymous boolean default false); create table auth.sessions(id uuid primary key,user_id uuid,not_after timestamptz);
create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$; create function auth.uid() returns uuid language sql stable as $$select nullif(auth.jwt()->>'sub','')::uuid$$; grant usage on schema auth to anon,authenticated; grant execute on function auth.jwt(),auth.uid() to anon,authenticated;
create table public.places("id" uuid default gen_random_uuid() primary key,"client_id" text,"name" text,"category" text,"subcategory" text,"area" text,"address" text,"lat" double precision,"lng" double precision,"description" text,"initial_rating" numeric(2,1),"member_benefit" boolean default false,"benefit_text" text,"created_by" text,"created_at" timestamp with time zone default now(),"updated_at" timestamp with time zone default now(),"delete_requested" boolean default false,"owner_key_hash" text,"photo_urls" text[] default '{}'::text[],"tags" text[] default '{}'::text[],"registrant_nickname" text); alter table public.places enable row level security; grant select,insert on public.places to anon,authenticated; create policy "public read places" on public.places for select to anon,authenticated using (true); create policy "public insert places" on public.places for insert to anon,authenticated with check (true);
create table public.reviews("id" uuid default gen_random_uuid() primary key,"client_id" text,"place_id" uuid references public.places(id),"rating" numeric(2,1),"body" text,"author_name" text,"created_by" text,"created_at" timestamp with time zone default now(),"photo_urls" text[] default '{}'::text[],"created_by_hash" text generated always as (
CASE
    WHEN (created_by IS NOT NULL) THEN encode(extensions.digest((created_by)::bytea, 'sha256'::text), 'hex'::text)
    ELSE NULL::text
END) stored,"cafe_url" text,"recommended" boolean default false); alter table public.reviews enable row level security; grant select,insert on public.reviews to anon,authenticated; create policy "public read reviews" on public.reviews for select to anon,authenticated using (true); create policy "public insert reviews" on public.reviews for insert to anon,authenticated with check (true);
create unique index review_device_place on public.reviews(place_id,created_by) where created_by is not null;
create function public.test_place_hash() returns trigger language plpgsql as $$begin new.owner_key_hash:=encode(extensions.digest(new.created_by::bytea,'sha256'),'hex');return new;end$$; create trigger test_place_hash before insert or update of created_by on public.places for each row execute function public.test_place_hash();
create function public.admin_verify(p_admin_key text) returns boolean language sql as $$select p_admin_key='isolated-test-only'$$;
-- Accept Naver Copy URL short links in both the review constraint and checked RPC.
-- This validates URL syntax; it does not verify the target article or Cafe membership.
begin;
create or replace function public.is_valid_cafe_review_url(value text)
returns boolean language sql immutable set search_path=public as $$
 select value is null or (
   length(value)<=2000 and value !~ '[[:space:]\\]' and
   (
     value ~ '^https://naver\.me/[A-Za-z0-9]{1,64}/?(\?[^#]*)?$' or
     value ~ '^https://(m\.)?cafe\.naver\.com/[A-Za-z0-9_-]+/[1-9][0-9]*/?(\?[^#]*)?$' or
     value ~ '^https://(m\.)?cafe\.naver\.com/ca-fe/(web/)?cafes/[1-9][0-9]*/articles/[1-9][0-9]*/?(\?[^#]*)?$' or
     (value ~* '^https://(m\.)?cafe\.naver\.com/ArticleRead\.nhn\?[^#]+$'
       and value ~ '[?&]clubid=[1-9][0-9]*(&|$)'
       and value ~ '[?&]articleid=[1-9][0-9]*(&|$)')
   )
 );
$$;
notify pgrst,'reload schema';
commit;

CREATE OR REPLACE FUNCTION public.device_upsert_recommended_review(p_review_id uuid, p_place_id uuid, p_device_id text, p_nickname text, p_rating numeric, p_body text, p_photo_urls text[], p_cafe_url text, p_recommended boolean)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_id uuid; v_rating numeric;
begin
 select initial_rating into v_rating from public.places
 where id=p_place_id and created_by=p_device_id for update;
 -- Existing RPC validates the device token and enforces one review per device/place.
 v_id:=public.device_upsert_review_with_link(p_review_id,p_place_id,p_device_id,p_nickname,coalesce(p_rating,v_rating),p_body,p_photo_urls,p_cafe_url);
 update public.reviews set recommended=coalesce(p_recommended,false)
 where id=v_id and place_id=p_place_id and created_by=p_device_id;
 if not found then raise exception 'Review ownership check failed'; end if;
 -- Move the registrant's original evaluation into their single review atomically.
 update public.places set initial_rating=null,tags=array_remove(tags,'강추업소')
 where id=p_place_id and created_by=p_device_id;
 return v_id;
end;$function$
;
CREATE OR REPLACE FUNCTION public.device_upsert_review(p_review_id uuid, p_place_id uuid, p_device_id text, p_nickname text, p_rating numeric, p_body text, p_photo_urls text[] DEFAULT '{}'::text[])
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_id uuid;
begin
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
CREATE OR REPLACE FUNCTION public.device_upsert_review_with_link(p_review_id uuid, p_place_id uuid, p_device_id text, p_nickname text, p_rating numeric, p_body text, p_photo_urls text[] DEFAULT '{}'::text[], p_cafe_url text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_id uuid; v_url text:=nullif(btrim(p_cafe_url),'');
begin
 if not public.is_valid_cafe_review_url(v_url) then raise exception 'Invalid Naver Cafe article URL'; end if;
 if v_url is not null and nullif(btrim(p_body),'') is null then raise exception 'Written review required for Cafe link'; end if;
 -- Retain the existing device ownership, rating, nickname and one-per-place checks.
 v_id:=public.device_upsert_review(p_review_id,p_place_id,p_device_id,p_nickname,p_rating,p_body,p_photo_urls);
 if p_cafe_url is not null and nullif(btrim(p_body),'') is not null then
   update public.reviews set cafe_url=v_url where id=v_id and created_by=p_device_id;
 end if;
 return v_id;
end;$function$
;
CREATE OR REPLACE FUNCTION public.owner_request_place_delete(p_place_id uuid, p_owner_key text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
begin
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
