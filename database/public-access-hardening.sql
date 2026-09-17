-- Keep public views read-only. Admin and owner changes go through checked RPCs.
begin;
revoke insert,update,delete,truncate,references,trigger
  on public.places_public from public,anon,authenticated;
revoke update,delete,truncate,references,trigger
  on public.places from public,anon,authenticated;

-- A device identifier is a write credential, not public review metadata.
-- Deliberately expose a read-only projection: the underlying credential stays private.
create or replace view public.reviews_public as
select id,client_id,place_id,rating,body,author_name,created_at,photo_urls,
  case when created_by is not null then
    encode(extensions.digest(created_by::bytea,'sha256'),'hex')
  else null end as created_by_hash
from public.reviews;
revoke all on public.reviews_public from public,anon,authenticated;
grant select on public.reviews_public to anon,authenticated;

-- Apply after the frontend reads reviews_public.
revoke select,update,delete,truncate,references,trigger
  on public.reviews from public,anon,authenticated;
revoke select(created_by) on public.reviews from public,anon,authenticated;
grant select(id,client_id,place_id,rating,body,author_name,created_at,photo_urls)
  on public.reviews to anon,authenticated;
commit;
