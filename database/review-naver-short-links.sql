-- Accept Naver Copy URL short links in both the review constraint and checked RPC.
-- This validates URL syntax; it does not verify the target article or Cafe membership.
begin;
create or replace function public.is_valid_cafe_review_url(value text)
returns boolean language sql immutable set search_path=public as $$
 select value is null or (
   length(value)<=2000 and value !~ '[[:space:]\\]' and
   (
     value ~ '^https://naver\.me/[A-Za-z0-9]{1,64}/?(\?[^#]*)?$' or
     value ~ '^https://(m\.)?cafe\.naver\.com/[A-Za-z0-9_-]+/[1-9][0-9]*/?(\?[^#]*)?$' or
     value ~ '^https://(m\.)?cafe\.naver\.com/ca-fe/(web/)?cafes/[1-9][0-9]*/articles/[1-9][0-9]*/?(\?[^#]*)?$' or
     (value ~* '^https://(m\.)?cafe\.naver\.com/ArticleRead\.nhn\?[^#]+$'
       and value ~ '[?&]clubid=[1-9][0-9]*(&|$)'
       and value ~ '[?&]articleid=[1-9][0-9]*(&|$)')
   )
 );
$$;
notify pgrst,'reload schema';
commit;
