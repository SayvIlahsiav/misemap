-- Drop the existing foreign key constraint referencing auth.users
alter table public.org_join_requests 
  drop constraint if exists org_join_requests_user_id_fkey;

-- Re-create the foreign key constraint pointing to public.profiles table
-- This enables PostgREST (Supabase) to understand the relationship and resolve
-- relationship queries like '.select("*, profiles(email)")'
alter table public.org_join_requests 
  add constraint org_join_requests_user_id_fkey 
  foreign key (user_id) 
  references public.profiles(id) 
  on delete cascade;
