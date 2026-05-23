alter table public.paper_meta
add column if not exists citation_count integer,
add column if not exists influential_citation_count integer,
add column if not exists openalex_cited_by_count integer,
add column if not exists fwci numeric,
add column if not exists impact_score text,
add column if not exists semantic_scholar_id text,
add column if not exists openalex_id text,
add column if not exists author_metrics jsonb default '[]'::jsonb,
add column if not exists institutions jsonb default '[]'::jsonb;
