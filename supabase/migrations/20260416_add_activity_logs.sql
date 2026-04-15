-- ============================================================
-- Migration: tabela de logs de atividade para o painel admin
-- ============================================================

create table if not exists public.activity_logs (
  id          uuid        default gen_random_uuid() primary key,
  user_id     uuid        references public.profiles(id) on delete set null,
  action      text        not null,
  entity_type text,
  entity_id   text,
  details     jsonb,
  ip_address  text,
  created_at  timestamptz default now()
);

create index if not exists idx_activity_logs_created_at
  on public.activity_logs(created_at desc);

create index if not exists idx_activity_logs_user_id
  on public.activity_logs(user_id);

create index if not exists idx_activity_logs_action
  on public.activity_logs(action);

-- RLS: habilitado; apenas service_role (admin) pode ler e inserir
alter table public.activity_logs enable row level security;

-- Usuários normais NÃO veem os logs (nenhuma policy SELECT para authenticated)
-- Service_role bypassa RLS por definição no Supabase
