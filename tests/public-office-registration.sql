begin;
set local role anon;
do $$
declare
  v_id uuid:=gen_random_uuid();
  v_owner text:='public_office-qa-'||gen_random_uuid()::text;
  v_category text;
  v_sub text;
  v_ok boolean;
begin
  insert into public.places(id,name,category,subcategory,lat,lng,created_by,registrant_nickname)
  values(v_id,'__public_office_registration_validation__','public_office','대사관·영사관',10.77,106.7,v_owner,'검증회원');
  select category,subcategory into v_category,v_sub from public.places_public where id=v_id;
  if v_category is distinct from 'public_office' or v_sub is distinct from '대사관·영사관' then raise exception 'Public office public roundtrip failed'; end if;
  v_ok:=public.owner_update_place(v_id,v_owner,jsonb_build_object('category','public_office','subcategory','출입국관리'));
  if v_ok is not true then raise exception 'Public office owner edit failed'; end if;
  select subcategory into v_sub from public.places_public where id=v_id;
  if v_sub is distinct from '출입국관리' then raise exception 'Immigration office public roundtrip failed'; end if;
end $$;
rollback;
