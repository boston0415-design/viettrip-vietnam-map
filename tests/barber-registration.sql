begin;
set local role anon;
do $$
declare
  v_id uuid:=gen_random_uuid();
  v_owner text:='barber-qa-'||gen_random_uuid()::text;
  v_category text;
  v_sub text;
  v_ok boolean;
begin
  insert into public.places(id,name,category,subcategory,lat,lng,created_by,registrant_nickname)
  values(v_id,'__barber_registration_validation__','barber','이발소',10.77,106.7,v_owner,'검증회원');
  select category,subcategory into v_category,v_sub from public.places_public where id=v_id;
  if v_category is distinct from 'barber' or v_sub is distinct from '이발소' then raise exception 'Barber public roundtrip failed'; end if;
  v_ok:=public.owner_update_place(v_id,v_owner,jsonb_build_object('category','barber','subcategory','미용실'));
  if v_ok is not true then raise exception 'Barber owner edit failed'; end if;
  select subcategory into v_sub from public.places_public where id=v_id;
  if v_sub is distinct from '미용실' then raise exception 'Hair salon public roundtrip failed'; end if;
end $$;
rollback;
