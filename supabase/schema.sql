-- WlmAfton Games: Supabase database setup
-- Run this entire file in Supabase → SQL Editor → New query → Run.
-- After creating your admin user in Authentication → Users, copy its UUID
-- and run the INSERT at the bottom (replace the placeholder).

create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  genre text not null default 'PC GAME',
  status text not null default 'СКОРО',
  code text not null default 'WA_01',
  description text not null default '',
  download_url text not null default '',
  published boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;
alter table public.games enable row level security;

-- Anyone can read published titles. Only registered admins can read drafts.
create policy "Public can read published games"
on public.games for select
using (published = true or exists (
  select 1 from public.admins where admins.user_id = auth.uid()
));

create policy "Admins can insert games"
on public.games for insert to authenticated
with check (exists (select 1 from public.admins where admins.user_id = auth.uid()));

create policy "Admins can update games"
on public.games for update to authenticated
using (exists (select 1 from public.admins where admins.user_id = auth.uid()))
with check (exists (select 1 from public.admins where admins.user_id = auth.uid()));

create policy "Admins can delete games"
on public.games for delete to authenticated
using (exists (select 1 from public.admins where admins.user_id = auth.uid()));

-- Only an existing admin can read the admins table through the client.
create policy "Admins can view admins"
on public.admins for select to authenticated
using (exists (select 1 from public.admins a where a.user_id = auth.uid()));

-- Public bucket for downloadable game builds.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('game-files', 'game-files', true, 524288000,
  array['application/zip','application/x-msdownload','application/octet-stream','application/x-7z-compressed','application/vnd.rar'])
on conflict (id) do nothing;

-- Public can download files from this bucket; only admins can upload/delete.
create policy "Public can download game files"
on storage.objects for select
using (bucket_id = 'game-files');

create policy "Admins can upload game files"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'game-files' and exists (
    select 1 from public.admins where admins.user_id = auth.uid()
  )
);

create policy "Admins can update game files"
on storage.objects for update to authenticated
using (
  bucket_id = 'game-files' and exists (
    select 1 from public.admins where admins.user_id = auth.uid()
  )
);

create policy "Admins can delete game files"
on storage.objects for delete to authenticated
using (
  bucket_id = 'game-files' and exists (
    select 1 from public.admins where admins.user_id = auth.uid()
  )
);

-- AFTER creating your account in Supabase Authentication → Users:
-- replace YOUR-AUTH-USER-UUID with that user's UUID and run this separately:
-- insert into public.admins (user_id) values ('YOUR-AUTH-USER-UUID');
