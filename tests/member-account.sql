-- Synthetic users and records in an isolated CI database; transaction rolls back.
begin;
insert into auth.users(id,email_confirmed_at) values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',now()),('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',now());
insert into auth.sessions(id,user_id) values('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),('22222222-2222-4222-8222-222222222222','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
insert into public.places(id,name,address,lat,lng,created_by) values('33333333-3333-4333-8333-333333333333','Test cafe','Test address',10.7,106.7,'44444444-4444-4444-8444-444444444444');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","session_id":"11111111-1111-4111-8111-111111111111"}',true);
select set_config('test.a_key',public.map_account('profile','{"nickname":"Member A"}')->>'account_device_key',true);
select public.device_upsert_recommended_review('55555555-5555-4555-8555-555555555555','33333333-3333-4333-8333-333333333333',current_setting('test.a_key'),'Member A',4,'Original review content',array['https://example.com/photo.jpg'],null,true);
do $$declare p jsonb;begin
 p:=public.map_account('profile');if (p->>'total')::int<>1 then raise exception 'review must earn one point';end if;
 p:=public.map_account('reviews');if (p->>'total')::int<>1 or p#>>'{items,0,body}'<>'Original review content' then raise exception 'own review listing failed';end if;
end$$;
select set_config('request.jwt.claims','{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","session_id":"22222222-2222-4222-8222-222222222222"}',true);
select public.map_account('profile','{"nickname":"Member B"}');
do $$begin
 if (public.map_account('reviews')->>'total')::int<>0 then raise exception 'another member review leaked';end if;
 begin perform public.map_account('delete_review','{"review_id":"55555555-5555-4555-8555-555555555555"}');raise exception 'unauthorized deletion allowed';exception when insufficient_privilege then null;end;
 begin perform public.device_upsert_review('55555555-5555-4555-8555-555555555555','33333333-3333-4333-8333-333333333333',current_setting('test.a_key'),'B',1,'Cross-account overwrite','{}');raise exception 'old capability bypassed auth';exception when insufficient_privilege then null;end;
 begin perform public.map_membership('profile',current_setting('test.a_key'));raise exception 'profile credentials leaked';exception when insufficient_privilege then null;end;
 begin insert into public.reviews(place_id,created_by,body) values('33333333-3333-4333-8333-333333333333',current_setting('test.a_key'),'Forged direct insert');raise exception 'RLS insert bypassed auth';exception when insufficient_privilege then null;end;
 begin perform snapshot from map_private.deleted_reviews;raise exception 'private archive exposed';exception when insufficient_privilege then null;end;
end$$;
select set_config('request.jwt.claims','{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","session_id":"11111111-1111-4111-8111-111111111111"}',true);
select public.map_account('delete_review','{"review_id":"55555555-5555-4555-8555-555555555555"}');
do $$begin if (public.map_account('profile')->>'total')::int<>0 then raise exception 'deletion did not update points';end if;end$$;
select public.map_account('restore_review','{"review_id":"55555555-5555-4555-8555-555555555555"}');
do $$declare r jsonb;begin
 r:=public.map_account('reviews')#>'{items,0}';
 if r->>'body'<>'Original review content' or (r->>'rating')::numeric<>4 or r#>>'{photo_urls,0}'<>'https://example.com/photo.jpg' or (r->>'recommended')::boolean is not true then raise exception 'restore changed original content';end if;
 if (public.map_account('profile')->>'total')::int<>1 then raise exception 'restore point mismatch';end if;
end$$;
select public.map_membership('profile','44444444-4444-4444-8444-444444444444','{"nickname":"Guest"}');
select public.map_account('claim','{"device_key":"44444444-4444-4444-8444-444444444444","consent":true}');
do $$begin
 if (public.map_account('profile')->>'total')::int<>2 then raise exception 'guest activity claim lost points';end if;
end$$;
reset role;
delete from auth.sessions where id='11111111-1111-4111-8111-111111111111';
set local role authenticated;
do $$begin
 begin perform public.map_account('reviews');raise exception 'revoked session allowed private read';exception when insufficient_privilege then null;end;
 begin perform public.owner_update_place('33333333-3333-4333-8333-333333333333','44444444-4444-4444-8444-444444444444','{"name":"Unauthorized"}');raise exception 'revoked session allowed old owner credential';exception when insufficient_privilege then null;end;
end$$;
reset role;
set local role anon;
select set_config('request.jwt.claims','{}',true);
do $$begin
 begin perform public.map_account('profile');raise exception 'anonymous account API allowed';exception when insufficient_privilege then null;end;
 begin perform public.map_membership('profile',current_setting('test.a_key'));raise exception 'anonymous account credential allowed';exception when insufficient_privilege then null;end;
end$$;
reset role;
do $$begin
 if (select count(*) from public.reviews)<>1 or (select name from public.places where id='33333333-3333-4333-8333-333333333333')<>'Test cafe' then raise exception 'original records changed';end if;
end$$;
rollback;
select 'PASS account ownership, revoked sessions, guest claim, review delete/restore, original content and derived points' as result;
