begin;
set local role anon;
do $$
declare
  v_id uuid:=gen_random_uuid();
  v_owner text:='hospital-qa-'||gen_random_uuid()::text;
  v_sub text;
  v_category text;
  v_ok boolean;
begin
  insert into public.places(id,name,category,subcategory,lat,lng,created_by,registrant_nickname)
  values(v_id,'__hospital_registration_validation__','hospital','피부과',10.77,106.7,v_owner,'검증회원');
  select category,subcategory into v_category,v_sub from public.places_public where id=v_id;
  if v_category is distinct from 'hospital' or v_sub is distinct from '피부과' then
    raise exception 'Hospital registration public roundtrip failed';
  end if;
  v_ok:=public.owner_update_place(v_id,v_owner,jsonb_build_object('category','hospital','subcategory','동물병원'));
  if v_ok is not true then raise exception 'Hospital owner edit failed'; end if;
  select subcategory into v_sub from public.places_public where id=v_id;
  if v_sub is distinct from '동물병원' then raise exception 'Hospital edit public roundtrip failed'; end if;
end $$;
rollback;
