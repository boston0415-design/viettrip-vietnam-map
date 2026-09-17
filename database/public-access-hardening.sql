-- Keep public views read-only. Admin and owner changes go through checked RPCs.
begin;
revoke insert,update,delete,truncate,references,trigger
  on public.places_public from public,anon,authenticated;
revoke update,delete,truncate,references,trigger
  on public.places from public,anon,authenticated;

-- A device identifier is a write credential, not public review metadata.
-- A generated digest lets the public view obey RLS without reading that credential.
alter table public.reviews add column if not exists created_by_hash text
  generated always as (case when created_by is not null then
    encode(extensions.digest(created_by::bytea,'sha256'),'hex') else null end) stored;
create or replace view public.reviews_public with (security_invoker=true) as
select id,client_id,place_id,rating,body,author_name,created_at,photo_urls,created_by_hash
from public.reviews;
revoke all on public.reviews_public from public,anon,authenticated;
grant select on public.reviews_public to anon,authenticated;
grant select(id,client_id,name,category,subcategory,area,address,lat,lng,description,
  initial_rating,member_benefit,benefit_text,created_at,updated_at,delete_requested,
  owner_key_hash,photo_urls,tags) on public.places to anon,authenticated;
create or replace view public.places_public with (security_invoker=true) as
select id,client_id,name,category,subcategory,area,address,lat,lng,description,
  (case when exists(select 1 from public.reviews r where r.place_id=p.id
    and r.created_by_hash=p.owner_key_hash and r.rating is not null)
    then null::numeric else initial_rating end)::numeric(2,1) as initial_rating,
  member_benefit,benefit_text,created_at,updated_at,delete_requested,owner_key_hash,
  photo_urls,tags from public.places p;

-- Apply after the frontend reads reviews_public.
revoke select,update,delete,truncate,references,trigger
  on public.reviews from public,anon,authenticated;
revoke select(created_by) on public.reviews from public,anon,authenticated;
grant select(id,client_id,place_id,rating,body,author_name,created_at,photo_urls,created_by_hash)
  on public.reviews to anon,authenticated;
commit;
