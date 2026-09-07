-- ============================================================
-- Lockwise - Políticas RLS (row-level security)
-- Revisar/crear políticas para profiles y vault_entries.
-- Idempotente: se puede ejecutar varias veces sin romper nada.
-- ============================================================

-- --- profiles: cada usuario solo su fila ----------------------

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (id = auth.uid());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own" on public.profiles
  for delete using (id = auth.uid());

-- --- vault_entries: cada usuario solo sus entries -------------

alter table public.vault_entries enable row level security;

drop policy if exists "vault_select_own" on public.vault_entries;
create policy "vault_select_own" on public.vault_entries
  for select using (auth.uid() = user_id);

drop policy if exists "vault_insert_own" on public.vault_entries;
create policy "vault_insert_own" on public.vault_entries
  for insert with check (auth.uid() = user_id);

drop policy if exists "vault_update_own" on public.vault_entries;
create policy "vault_update_own" on public.vault_entries
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "vault_delete_own" on public.vault_entries;
create policy "vault_delete_own" on public.vault_entries
  for delete using (auth.uid() = user_id);

-- --- FK user_id referencia auth.users -------------------------
-- (Solo si el FK actual no apunta a auth.users)

do $$
begin
  if not exists (
    select 1 from pg_constraint c
    join pg_namespace n on n.oid = c.connamespace
    where c.conname = 'vault_entries_user_id_fkey'
      and c.confrelid = 'auth.users'::regclass
  ) then
    alter table public.vault_entries
      drop constraint if exists vault_entries_user_id_fkey;
    alter table public.vault_entries
      add constraint vault_entries_user_id_fkey
      foreign key (user_id) references auth.users (id) on delete cascade;
  end if;
end $$;