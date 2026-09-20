-- Transactional integration test: all synthetic records are rolled back.
begin;
do $$
declare
 a text:=gen_random_uuid()::text; b text:=gen_random_uuid()::text; c text:=gen_random_uuid()::text;
 outsider text:=gen_random_uuid()::text; place_id uuid:=gen_random_uuid(); rid uuid; other_place uuid:=gen_random_uuid();
 profile jsonb; linked jsonb; link_code text; backup_code text; ah text; bad boolean; cid uuid;
begin
 ah:=encode(extensions.digest(a::bytea,'sha256'),'hex');
 insert into public.places(id,name,category,address,lat,lng,created_by,registrant_nickname)
 values(place_id,'__grade_qa_'||place_id,'restaurant','QA 주소',10.77,106.7,a,'회원');
 insert into public.places(id,name,category,address,lat,lng,created_by,registrant_nickname)
 values(other_place,'__grade_qa_'||other_place,'restaurant','QA 주소',10.78,106.7,outsider,'다른회원');
 profile:=public.map_membership('profile',a,'{"nickname":"같은닉네임"}');
 assert (profile->>'total')::int=1,'existing registration must count';
 linked:=public.map_membership('profile',b,'{"nickname":"같은닉네임"}');
 assert linked->>'id'<>profile->>'id','nickname must not merge identities';
 assert (linked->>'total')::int=0,'new account must start at zero';
 rid:=public.device_upsert_recommended_review(gen_random_uuid(),other_place,a,'회원',1,'직접 방문했는데 대기 시간이 길었습니다.',array[]::text[],null,false);
 profile:=public.map_membership('profile',a);
 assert (profile->>'total')::int=2,'negative written review counts';
 perform public.device_upsert_recommended_review(rid,other_place,a,'회원',5,'직접 방문했는데 대기 시간이 길었습니다. 수정.',array[]::text[],null,true);
 assert (public.map_membership('profile',a)->>'total')::int=2,'edit/high rating/recommendation must not multiply';
 perform public.device_upsert_recommended_review(gen_random_uuid(),place_id,a,'회원',5,'',array[]::text[],null,true);
 assert (public.map_membership('profile',a)->>'total')::int=2,'rating only must not count';
 perform public.device_upsert_recommended_review(gen_random_uuid(),other_place,b,'회원',2,'같이 방문했고 직원 안내가 부족했습니다.',array[]::text[],null,false);
 link_code:=public.map_membership('code',a,'{"kind":"link"}')->>'code';
 backup_code:=public.map_membership('code',a,'{"kind":"recovery"}')->>'code';
 linked:=public.map_membership('connect',b,jsonb_build_object('code',link_code,'merge',true));
 assert linked->>'id'=profile->>'id','link should preserve account';
 assert (linked->>'total')::int=2,'linked duplicate reviews count once per place';
 assert jsonb_array_length(linked->'devices')=2,'both device credentials available only to owner';
 bad:=false;
 begin perform public.map_membership('connect',c,jsonb_build_object('code',link_code,'merge',true));
 exception when others then bad:=true;end;
 assert bad,'link code must be single use';
 linked:=public.map_membership('connect',c,jsonb_build_object('code',backup_code,'merge',true));
 assert linked->>'id'=profile->>'id','recovery code should restore account';
 perform public.map_membership('correct',a,jsonb_build_object('place_id',other_place,'kind','hours','body','방문해서 확인한 영업시간은 오후 10시까지입니다.'));
 assert (public.map_membership('profile',a)->>'total')::int=2,'pending correction not counted';
 select id into cid from map_private.corrections where member_id=(profile->>'id')::uuid;
 update map_private.corrections set status='approved',reviewed_at=now() where id=cid;
 assert (public.map_membership('profile',a)->>'total')::int=3,'approved correction increments';
 assert (public.map_membership('profile',a)->>'level')::int=1,'3 contributions => private';
 update map_private.corrections set status='rejected' where id=cid;
 assert (public.map_membership('profile',a)->>'total')::int=2,'revocation decrements';
 linked:=public.map_membership('badges',null,jsonb_build_object('hashes',jsonb_build_array(ah)));
 assert linked->0->>'member'=profile->>'id','public badge shares stable member';
 assert not (linked->0 ? 'devices') and not (linked->0 ? 'key'),'public badges exclude credentials';
 assert map_private.grade(0)=0 and map_private.grade(2)=0 and map_private.grade(3)=1 and map_private.grade(10)=2
  and map_private.grade(25)=3 and map_private.grade(60)=4 and map_private.grade(150)=5,'all thresholds';
 insert into map_private.exclusions(kind,source_id) values('place',place_id);
 assert (public.map_membership('profile',a)->>'total')::int=1,'moderated record not counted';
 delete from public.reviews r where r.place_id=other_place;
 assert (public.map_membership('profile',a)->>'total')::int=0,'deleted contributions not counted';
end;$$;
set local role anon;
do $$
declare a text:=gen_random_uuid()::text; p jsonb; denied boolean;
begin
 p:=public.map_membership('profile',a,'{"nickname":"권한검사"}');
 assert p->>'id' is not null,'anonymous capability API works';
 denied:=false;begin perform public.map_membership('profile',repeat('a',64));exception when others then denied:=true;end;
 assert denied,'public digest is not a credential';
 denied:=false;begin perform public.map_membership('moderation',a,'{"admin_key":"invalid"}');exception when others then denied:=true;end;
 assert denied,'moderation requires admin proof';
 denied:=false;begin perform public.map_membership('moderate',a,'{"admin_key":"invalid","status":"approved"}');exception when others then denied:=true;end;
 assert denied,'cannot self-approve';
 denied:=false;begin perform device_key from map_private.devices;exception when insufficient_privilege then denied:=true;end;
 assert denied,'private credentials cannot be selected';
 denied:=false;begin update map_private.members set nickname='fake';exception when insufficient_privilege then denied:=true;end;
 assert denied,'private memberships cannot be overwritten';
 denied:=false;begin insert into map_private.exclusions values('review',gen_random_uuid(),now());exception when insufficient_privilege then denied:=true;end;
 assert denied,'contribution totals cannot be changed directly';
end;$$;
rollback;
