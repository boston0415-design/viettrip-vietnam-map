-- Add optional Naver Cafe article links without changing the old review RPC.
begin;
create or replace function public.is_valid_cafe_review_url(value text)
returns boolean language sql immutable set search_path=public as $$
 select value is null or (
   length(value)<=2000 and value !~ '[[:space:]\\]' and
   value ~ '^https://(m\.)?cafe\.naver\.com/' and (
     value ~ '^https://(m\.)?cafe\.naver\.com/[A-Za-z0-9_-]+/[1-9][0-9]*/?(\?[^#]*)?$' or
     value ~ '^https://(m\.)?cafe\.naver\.com/ca-fe/(web/)?cafes/[1-9][0-9]*/articles/[1-9][0-9]*/?(\?[^#]*)?$' or
     (value ~* '^https://(m\.)?cafe\.naver\.com/ArticleRead\.nhn\?[^#]+$'
       and value ~ '[?&]clubid=[1-9][0-9]*(&|$)'
       and value ~ '[?&]articleid=[1-9][0-9]*(&|$)')
   )
 );
$$;
alter table public.reviews add column cafe_url text
 constraint reviews_cafe_url_valid check(public.is_valid_cafe_review_url(cafe_url));
grant select(cafe_url) on public.reviews to anon,authenticated;
create or replace view public.reviews_public with (security_invoker=true) as
select id,client_id,place_id,rating,body,author_name,created_at,photo_urls,created_by_hash,cafe_url
from public.reviews;
revoke all on public.reviews_public from public,anon,authenticated;
grant select on public.reviews_public to anon,authenticated;

create or replace function public.device_upsert_review_with_link(
 p_review_id uuid,p_place_id uuid,p_device_id text,p_nickname text,
 p_rating numeric,p_body text,p_photo_urls text[] default '{}',p_cafe_url text default null
) returns uuid language plpgsql security definer set search_path=public as $$
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
end;$$;
revoke all on function public.device_upsert_review_with_link(uuid,uuid,text,text,numeric,text,text[],text) from public;
grant execute on function public.device_upsert_review_with_link(uuid,uuid,text,text,numeric,text,text[],text) to anon,authenticated;
notify pgrst,'reload schema';
commit;
