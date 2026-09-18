begin;
set local role anon;
do $$
declare
  v_id uuid:=gen_random_uuid();
  v_owner text:='nickname-qa-'||gen_random_uuid()::text;
  v_name text;
  v_bad text;
  v_ok boolean;
begin
  insert into public.places(id,name,category,lat,lng,created_by,registrant_nickname)
  values(v_id,'__nickname_validation__','restaurant',10.77,106.7,v_owner,'카페회원');
  select registrant_nickname into v_name from public.places_public where id=v_id;
  if v_name is distinct from '카페회원' then raise exception 'Public nickname roundtrip failed'; end if;

  foreach v_bad in array array['','   ',repeat('가',31),'a'||chr(9)||'b'] loop
    begin
      insert into public.places(name,category,lat,lng,registrant_nickname)
      values('__nickname_invalid__','restaurant',10.77,106.7,v_bad);
      raise exception 'Invalid nickname was accepted';
    exception when check_violation then null;
    end;
  end loop;

  insert into public.places(name,category,lat,lng)
    values('__nickname_legacy__','restaurant',10.77,106.7);

  begin
    update public.places set registrant_nickname='unauthorized' where id=v_id;
    raise exception 'Anonymous direct update unexpectedly allowed';
  exception when insufficient_privilege then null;
  end;
  v_ok:=public.owner_update_place(v_id,'wrong-owner-key',jsonb_build_object('name','wrong owner'));
  if v_ok is true then raise exception 'Wrong owner key accepted'; end if;
  v_ok:=public.admin_update_place('invalid-admin-key',v_id,jsonb_build_object('name','wrong admin'));
  if v_ok is true then raise exception 'Wrong admin key accepted'; end if;
  v_ok:=public.owner_update_place(v_id,v_owner,jsonb_build_object('name','__nickname_validation_updated__','registrant_nickname','changed by patch'));
  if v_ok is not true then raise exception 'Existing owner edit failed'; end if;
  select registrant_nickname into v_name from public.places_public where id=v_id;
  if v_name is distinct from '카페회원' then raise exception 'Edit changed original attribution'; end if;
end $$;
rollback;
