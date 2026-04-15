-- ============================================================
-- Migration: adiciona coluna role na tabela profiles
-- ============================================================

alter table public.profiles
  add column if not exists role text not null default 'user'
    check (role in ('user', 'admin'));

-- Índice para lookups rápidos por role (dashboard admin, middleware)
create index if not exists idx_profiles_role
  on public.profiles(role);

-- RLS: usuários só podem ver seu próprio role, não alterar
-- (admins usam service_role que ignora RLS)
