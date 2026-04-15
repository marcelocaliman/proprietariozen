-- ============================================================
-- Migration: tabela de logs de atividade para o painel admin
-- ============================================================

create table if not exists public.activity_logs (
  id          uuid        default gen_random_uuid() primary key,
  user_id     uuid        references public.profiles(id) on delete set null,
  user_email  text,
  action      text        not null,
  details     jsonb       default '{}'::jsonb,
  ip_address  text,
  created_at  timestamptz default now()
);

create index if not exists idx_activity_logs_created_at
  on public.activity_logs(created_at desc);

create index if not exists idx_activity_logs_user_id
  on public.activity_logs(user_id);

-- RLS: somente service_role lê/escreve (admin usa service_role)
alter table public.activity_logs enable row level security;
