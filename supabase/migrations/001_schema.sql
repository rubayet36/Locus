-- 001_schema.sql: Core Schema & Policies for Paper HUB (Recursion-Free)

-- 1. EXTENSIONS
create extension if not exists "uuid-ossp";

-- 2. TABLES

-- groups: Collaboration spaces for researchers
create table public.groups (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  invite_code text unique not null,
  created_by uuid references auth.users not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- group_members: Links users to groups with a specific role
create table public.group_members (
  group_id uuid references public.groups on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  role text not null check (role in ('owner', 'member')) default 'member',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (group_id, user_id)
);

-- papers: Academic papers added to a specific group library
create table public.papers (
  id uuid default gen_random_uuid() primary key,
  group_id uuid references public.groups on delete cascade not null,
  title text not null,
  doi text,
  url text,
  abstract text,
  authors text[] default '{}'::text[] not null,
  year integer,
  summary text,
  limitations text,
  sections jsonb default '[]'::jsonb,
  added_by uuid references auth.users,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- paper_meta: Cached academic ranks and scores for papers
create table public.paper_meta (
  paper_id uuid references public.papers on delete cascade primary key,
  venue_name text,
  issn text,
  sjr_rank text,
  sjr_quartile text,
  core_rank text,
  rank_source text,
  sjr text,
  h_index integer,
  citation_count integer,
  influential_citation_count integer,
  openalex_cited_by_count integer,
  fwci numeric,
  impact_score text,
  semantic_scholar_id text,
  openalex_id text,
  author_metrics jsonb default '[]'::jsonb,
  institutions jsonb default '[]'::jsonb,
  cached_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- comments: Threaded conversation threads on papers
create table public.comments (
  id uuid default gen_random_uuid() primary key,
  paper_id uuid references public.papers on delete cascade not null,
  user_id uuid references auth.users not null,
  body text not null,
  parent_id uuid references public.comments on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- assignments: Tasks for papers
create table public.assignments (
  id uuid default gen_random_uuid() primary key,
  paper_id uuid references public.papers on delete cascade not null,
  assigned_to uuid references auth.users not null,
  assigned_by uuid references auth.users not null,
  due_date date,
  note text,
  status text not null check (status in ('unread', 'reading', 'done')) default 'unread',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- reading_claims: Active locks preventing duplicate reading efforts
create table public.reading_claims (
  id uuid default gen_random_uuid() primary key,
  paper_id uuid references public.papers on delete cascade not null,
  user_id uuid references auth.users not null,
  status text not null check (status in ('reading', 'done', 'dropped')) default 'reading',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (paper_id, user_id)
);

-- tags: Custom classification labels
create table public.tags (
  id uuid default gen_random_uuid() primary key,
  paper_id uuid references public.papers on delete cascade not null,
  label text not null,
  color text not null,
  created_by uuid references auth.users,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- activity_log: Logs of group interactions for the Dashboard feed
create table public.activity_log (
  id uuid default gen_random_uuid() primary key,
  group_id uuid references public.groups on delete cascade not null,
  paper_id uuid references public.papers on delete cascade,
  user_id uuid references auth.users,
  action text not null, -- 'added', 'claimed', 'commented', 'assigned', etc.
  meta jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. FUNCTIONS & TRIGGERS

-- Auto-insert creator as member when a group is created
create or replace function public.handle_new_group()
returns trigger as $$
begin
  insert into public.group_members (group_id, user_id, role)
  values (new.id, new.created_by, 'member');
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_group_created
  after insert on public.groups
  for each row execute procedure public.handle_new_group();

-- 4. ROW LEVEL SECURITY (RLS) POLICIES

-- Enable RLS
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.papers enable row level security;
alter table public.paper_meta enable row level security;
alter table public.comments enable row level security;
alter table public.assignments enable row level security;
alter table public.reading_claims enable row level security;
alter table public.tags enable row level security;
alter table public.activity_log enable row level security;

-- Groups (Recursion-Free)
create policy "Allow select for authenticated users" on public.groups
  for select using (auth.uid() is not null);
create policy "Users can create groups" on public.groups
  for insert with check (auth.uid() = created_by);
create policy "Group owners can update their groups" on public.groups
  for update using (auth.uid() = created_by);

-- Group Members (Recursion-Free)
create policy "Allow select for authenticated users" on public.group_members
  for select using (auth.uid() is not null);
create policy "Allow insert for authenticated users" on public.group_members
  for insert with check (auth.uid() is not null);
create policy "Group owners can remove members" on public.group_members
  for delete using (exists (
    select 1 from public.groups g
    where g.id = group_members.group_id
    and g.created_by = auth.uid()
  ));

-- Papers
create policy "Users can view papers in their groups" on public.papers
  for select using (exists (
    select 1 from public.group_members gm
    where gm.group_id = papers.group_id
    and gm.user_id = auth.uid()
  ));
create policy "Users can insert papers in their groups" on public.papers
  for insert with check (exists (
    select 1 from public.group_members gm
    where gm.group_id = papers.group_id
    and gm.user_id = auth.uid()
  ));
create policy "Users can update papers in their groups" on public.papers
  for update using (exists (
    select 1 from public.group_members gm
    where gm.group_id = papers.group_id
    and gm.user_id = auth.uid()
  ));
create policy "Users can delete papers in their groups" on public.papers
  for delete using (exists (
    select 1 from public.group_members gm
    where gm.group_id = papers.group_id
    and gm.user_id = auth.uid()
  ));

-- Paper Metadata
create policy "Users can view paper metadata" on public.paper_meta
  for select using (exists (
    select 1 from public.papers p
    join public.group_members gm on gm.group_id = p.group_id
    where p.id = paper_meta.paper_id
    and gm.user_id = auth.uid()
  ));
create policy "Users can manage paper metadata" on public.paper_meta
  for all using (exists (
    select 1 from public.papers p
    join public.group_members gm on gm.group_id = p.group_id
    where p.id = paper_meta.paper_id
    and gm.user_id = auth.uid()
  ));

-- Comments
create policy "Users can view comments on papers in their groups" on public.comments
  for select using (exists (
    select 1 from public.papers p
    join public.group_members gm on gm.group_id = p.group_id
    where p.id = comments.paper_id
    and gm.user_id = auth.uid()
  ));
create policy "Users can insert comments on papers in their groups" on public.comments
  for insert with check (
    exists (
      select 1 from public.papers p
      join public.group_members gm on gm.group_id = p.group_id
      where p.id = comments.paper_id
      and gm.user_id = auth.uid()
    )
    and auth.uid() = user_id
  );
create policy "Users can delete/update their own comments" on public.comments
  for all using (auth.uid() = user_id);

-- Assignments
create policy "Users can view assignments in their groups" on public.assignments
  for select using (exists (
    select 1 from public.papers p
    join public.group_members gm on gm.group_id = p.group_id
    where p.id = assignments.paper_id
    and gm.user_id = auth.uid()
  ));
create policy "Users can manage assignments in their groups" on public.assignments
  for all using (exists (
    select 1 from public.papers p
    join public.group_members gm on gm.group_id = p.group_id
    where p.id = assignments.paper_id
    and gm.user_id = auth.uid()
  ));

-- Reading Claims
create policy "Users can view reading claims in their groups" on public.reading_claims
  for select using (exists (
    select 1 from public.papers p
    join public.group_members gm on gm.group_id = p.group_id
    where p.id = reading_claims.paper_id
    and gm.user_id = auth.uid()
  ));
create policy "Users can manage reading claims in their groups" on public.reading_claims
  for all using (exists (
    select 1 from public.papers p
    join public.group_members gm on gm.group_id = p.group_id
    where p.id = reading_claims.paper_id
    and gm.user_id = auth.uid()
  ));

-- Tags
create policy "Users can view tags in their groups" on public.tags
  for select using (exists (
    select 1 from public.papers p
    join public.group_members gm on gm.group_id = p.group_id
    where p.id = tags.paper_id
    and gm.user_id = auth.uid()
  ));
create policy "Users can manage tags in their groups" on public.tags
  for all using (exists (
    select 1 from public.papers p
    join public.group_members gm on gm.group_id = p.group_id
    where p.id = tags.paper_id
    and gm.user_id = auth.uid()
  ));

-- Activity Log
create policy "Users can view activity logs in their groups" on public.activity_log
  for select using (exists (
    select 1 from public.group_members gm
    where gm.group_id = activity_log.group_id
    and gm.user_id = auth.uid()
  ));
create policy "Users can insert activity logs" on public.activity_log
  for insert with check (exists (
    select 1 from public.group_members gm
    where gm.group_id = activity_log.group_id
    and gm.user_id = auth.uid()
  ));

-- 5. REALTIME ENABLEMENT
begin;
  -- drop the publication if it exists to avoid conflicts
  drop publication if exists supabase_realtime;
  -- create the publication
  create publication supabase_realtime;
commit;

-- add the tables we want real-time notifications for
alter publication supabase_realtime add table public.papers;
alter publication supabase_realtime add table public.comments;
alter publication supabase_realtime add table public.reading_claims;
alter publication supabase_realtime add table public.assignments;
alter publication supabase_realtime add table public.activity_log;
