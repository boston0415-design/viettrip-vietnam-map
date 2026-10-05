-- Read-only grade lookup for visible chat messages. No records are changed.
begin;
create function map_private.chat_grades(p_message_ids uuid[]) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if coalesce(cardinality(p_message_ids),0)>200 then raise exception 'At most 200 messages';end if;
 -- Public chat already exposes these messages. Only their grade is returned;
 -- device credentials, member IDs and contribution details remain private.
 with visible as (
  select id,sender_id from public.chat_messages where id=any(p_message_ids)
   and created_at>now()-interval '7 days'
 ), totals as (
  select actor,count(*) as total from map_private.contributions
  where actor in(select sender_id::text from visible) group by actor
 )
 select coalesce(jsonb_agg(jsonb_build_object('id',v.id,'level',map_private.grade(coalesce(t.total,0)))),'[]'::jsonb)
 into result from visible v left join totals t on t.actor=v.sender_id::text;
 return result;
end $$;
revoke all on function map_private.chat_grades(uuid[]) from public,anon,authenticated;
grant execute on function map_private.chat_grades(uuid[]) to anon,authenticated;
create function public.map_chat_grades(p_message_ids uuid[]) returns jsonb
language sql stable security invoker set search_path='' as $$
 select map_private.chat_grades(p_message_ids);
$$;
revoke all on function public.map_chat_grades(uuid[]) from public,anon,authenticated;
grant execute on function public.map_chat_grades(uuid[]) to anon,authenticated;
commit;
