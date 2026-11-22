-- WlmAfton Games: safe admin RLS policies
-- Run once in Supabase SQL Editor AFTER the base schema.sql.
-- This avoids recursive RLS when checking membership in public.admins.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admins
    where user_id = auth.uid()
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- Remove the earlier policies that queried public.admins directly.
drop policy if exists "Public can read published games" on public.games;
drop policy if exists "Admins can insert games" on public.games;
drop policy if exists "Admins can update games" on public.games;
drop policy if exists "Admins can delete games" on public.games;
drop policy if exists "Admins can view admins" on public.admins;
drop policy if exists "Admins can upload game files" on storage.objects;
drop policy if exists "Admins can update game files" on storage.objects;
drop policy if exists "Admins can delete game files" on storage.objects;

create policy "Public can read published games"
on public.games for select
using (published = true or (auth.uid() is not null and public.is_admin()));

create policy "Admins can insert games"
on public.games for insert to authenticated
with check (public.is_admin());

create policy "Admins can update games"
on public.games for update to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can delete games"
on public.games for delete to authenticated
using (public.is_admin());

create policy "Admins can view admins"
on public.admins for select to authenticated
using (public.is_admin());

create policy "Admins can upload game files"
on storage.objects for insert to authenticated
with check (bucket_id = 'game-files' and public.is_admin());

create policy "Admins can update game files"
on storage.objects for update to authenticated
using (bucket_id = 'game-files' and public.is_admin())
with check (bucket_id = 'game-files' and public.is_admin());

create policy "Admins can delete game files"
on storage.objects for delete to authenticated
using (bucket_id = 'game-files' and public.is_admin());
