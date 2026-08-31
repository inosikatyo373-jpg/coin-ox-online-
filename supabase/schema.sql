-- BID GRID v3.1 / Supabase account + rating foundation

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'PLAYER'
    check (char_length(display_name) between 1 and 24),
  rating integer not null default 1500,
  highest_rating integer not null default 1500,
  wins integer not null default 0 check (wins >= 0),
  losses integer not null default 0 check (losses >= 0),
  draws integer not null default 0 check (draws >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id, display_name, rating, highest_rating, wins, losses, draws
  )
  values (
    new.id,
    left(
      coalesce(
        nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
        split_part(coalesce(new.email, 'PLAYER'), '@', 1),
        'PLAYER'
      ),
      24
    ),
    1500, 1500, 0, 0, 0
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public;
revoke all on function public.handle_new_user() from anon;
revoke all on function public.handle_new_user() from authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.record_match_result(
  p_user_id uuid,
  p_result text
)
returns setof public.profiles
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_result not in ('win','loss','draw') then
    raise exception 'invalid result';
  end if;

  update public.profiles
  set
    wins = wins + case when p_result = 'win' then 1 else 0 end,
    losses = losses + case when p_result = 'loss' then 1 else 0 end,
    draws = draws + case when p_result = 'draw' then 1 else 0 end,
    highest_rating = greatest(highest_rating, rating),
    updated_at = now()
  where id = p_user_id;

  return query
  select * from public.profiles where id = p_user_id;
end;
$$;

revoke all on function public.record_match_result(uuid,text) from public;
revoke all on function public.record_match_result(uuid,text) from anon;
revoke all on function public.record_match_result(uuid,text) from authenticated;
grant execute on function public.record_match_result(uuid,text) to service_role;
