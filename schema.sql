-- Jalankan seluruh file ini sekali di Supabase Dashboard > SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null default 'siswa' check (role in ('guru','siswa')),
  nis text unique,
  class_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

alter table public.profiles drop constraint if exists profiles_class_id_fkey;
alter table public.profiles add constraint profiles_class_id_fkey foreign key (class_id) references public.classes(id) on delete set null;

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  attendance_date date not null default current_date,
  status text not null check (status in ('H','I','S','A')),
  note text not null default '',
  recorded_by uuid not null references auth.users(id),
  recorded_at timestamptz not null default now(),
  unique (student_id, attendance_date)
);

create or replace function public.is_teacher()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.profiles where id = auth.uid() and role = 'guru') $$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role, nis)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)), 'siswa', new.raw_user_meta_data->>'nis')
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.classes enable row level security;
alter table public.attendance enable row level security;
revoke all on public.profiles, public.classes, public.attendance from anon;
grant select, insert on public.profiles to authenticated;
grant select, insert, update, delete on public.classes to authenticated;
grant select, insert, update on public.attendance to authenticated;

drop policy if exists "profiles read own or teacher" on public.profiles;
create policy "profiles read own or teacher" on public.profiles for select to authenticated using (id = auth.uid() or public.is_teacher());
drop policy if exists "students update own profile" on public.profiles;
drop policy if exists "users create own profile" on public.profiles;
create policy "users create own profile" on public.profiles for insert to authenticated with check (id = auth.uid());

drop policy if exists "classes visible" on public.classes;
create policy "classes visible" on public.classes for select to authenticated using (true);
drop policy if exists "teacher creates classes" on public.classes;
create policy "teacher creates classes" on public.classes for insert to authenticated with check (public.is_teacher());
drop policy if exists "teacher updates classes" on public.classes;
create policy "teacher updates classes" on public.classes for update to authenticated using (public.is_teacher()) with check (public.is_teacher());
drop policy if exists "teacher deletes classes" on public.classes;
create policy "teacher deletes classes" on public.classes for delete to authenticated using (public.is_teacher());

drop policy if exists "attendance read own or teacher" on public.attendance;
create policy "attendance read own or teacher" on public.attendance for select to authenticated using (student_id = auth.uid() or public.is_teacher());
drop policy if exists "attendance insert own or teacher" on public.attendance;
create policy "attendance insert own or teacher" on public.attendance for insert to authenticated with check ((student_id = auth.uid() and recorded_by = auth.uid()) or public.is_teacher());
drop policy if exists "attendance update own or teacher" on public.attendance;
create policy "attendance update own or teacher" on public.attendance for update to authenticated using (student_id = auth.uid() or public.is_teacher()) with check ((student_id = auth.uid() and recorded_by = auth.uid()) or public.is_teacher());

-- Setelah membuat akun guru melalui Authentication > Users, jalankan:
-- update public.profiles set role = 'guru', full_name = 'Nama Guru' where id = 'UUID-AKUN-GURU';
-- Untuk menambahkan siswa ke kelas:
-- update public.profiles set nis = '2026001', class_id = 'UUID-KELAS' where id = 'UUID-AKUN-SISWA';
