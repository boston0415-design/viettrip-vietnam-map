-- Preserve existing device ownership checks and compatibility with old clients.
begin;
alter table public.reviews add column if not exists recommended boolean not null default false;
grant select(recommended) on public.reviews to anon,authenticated;
create or replace view public.reviews_public with (security_invoker=true) as
select id,client_id,place_id,rating,body,author_name,created_at,photo_urls,created_by_hash,cafe_url,recommended from public.reviews;
create or replace function public.device_upsert_recommended_review(
 p_review_id uuid,p_place_id uuid,p_device_id text,p_nickname text,
 p_rating numeric,p_body text,p_photo_urls text[],p_cafe_url text,p_recommended boolean
) returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
 -- Existing RPC validates the device token and enforces one review per device/place.
 v_id:=public.device_upsert_review_with_link(p_review_id,p_place_id,p_device_id,p_nickname,p_rating,p_body,p_photo_urls,p_cafe_url);
 update public.reviews set recommended=coalesce(p_recommended,false)
 where id=v_id and place_id=p_place_id and created_by=p_device_id;
 if not found then raise exception 'Review ownership check failed'; end if;
 return v_id;
end;$$;
revoke all on function public.device_upsert_recommended_review(uuid,uuid,text,text,numeric,text,text[],text,boolean) from public;
grant execute on function public.device_upsert_recommended_review(uuid,uuid,text,text,numeric,text,text[],text,boolean) to anon,authenticated;
notify pgrst,'reload schema';
commit;
