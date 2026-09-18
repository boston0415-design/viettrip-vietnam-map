-- Public display attribution only; never use this value to grant ownership.
-- Nullable for existing rows and pending uploads from older clients. The new
-- registration UI requires a nickname. Existing owner/admin RPCs preserve it.
alter table public.places add column registrant_nickname text;
alter table public.places add constraint places_registrant_nickname_check
  check (registrant_nickname is null or (
    char_length(btrim(registrant_nickname)) between 1 and 30
    and char_length(registrant_nickname) <= 30
    and registrant_nickname !~ '[[:cntrl:]]'
  ));

comment on column public.places.registrant_nickname is
  'Member-supplied public nickname at registration; not a verified identity or authorization credential. Null for older registrations.';

-- Add exactly one public column while retaining security_invoker, existing
-- grants/RLS and the rule that prevents double counting an owner's rating.
grant select(registrant_nickname) on public.places to anon,authenticated;
create or replace view public.places_public with (security_invoker=true) as
select id,client_id,name,category,subcategory,area,address,lat,lng,description,
  (case when exists(select 1 from public.reviews r where r.place_id=p.id
    and r.created_by_hash=p.owner_key_hash and r.rating is not null)
    then null::numeric else initial_rating end)::numeric(2,1) as initial_rating,
  member_benefit,benefit_text,created_at,updated_at,delete_requested,owner_key_hash,
  photo_urls,tags,registrant_nickname
from public.places p;

notify pgrst,'reload schema';
