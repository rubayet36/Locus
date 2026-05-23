alter table public.paper_meta
add column if not exists rank_source text;

alter table public.paper_meta
add column if not exists sjr text;
