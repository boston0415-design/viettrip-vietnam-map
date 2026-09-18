begin;
set local role anon;
do $$
declare
  v_id uuid:=gen_random_uuid();
  v_owner text:='pharmacy-qa-'||gen_random_uuid()::text;
  v_category text;
  v_ok boolean;
begin
  insert into public.places(id,name,category,subcategory,lat,lng,created_by,registrant_nickname)
  values(v_id,'__pharmacy_registration_validation__','pharmacy','약국',10.77,106.7,v_owner,'검증회원');
  select category into v_category from public.places_public where id=v_id;
  if v_category is distinct from 'pharmacy' then raise exception 'Pharmacy registration public roundtrip failed'; end if;
  v_ok:=public.owner_update_place(v_id,v_owner,jsonb_build_object('category','pharmacy','subcategory','약국'));
  if v_ok is not true then raise exception 'Pharmacy owner edit failed'; end if;
end $$;
rollback;
