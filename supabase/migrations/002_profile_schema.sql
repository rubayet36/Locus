-- 002_profile_schema.sql: Schema additions for Scholar Profiles (Names and Avatars) in Locus

-- 1. Add profile name and avatar columns to group_members table
ALTER TABLE public.group_members ADD COLUMN IF NOT EXISTS full_name text;
ALTER TABLE public.group_members ADD COLUMN IF NOT EXISTS avatar_url text;

-- 2. Establish update policy for group_members so scholars can edit their own profiles
CREATE POLICY "Allow update for owners of membership" ON public.group_members
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Note: Execute the queries above inside your Supabase project's SQL Editor to enable full profile editing.
