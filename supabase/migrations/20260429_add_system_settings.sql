-- ============================================================
-- Migration: tabela system_settings para configurações globais
-- editáveis via admin (banner, modo manutenção, anúncios, etc.)
-- ============================================================

create table if not exists public.system_settings (
  key         text primary key,
  value       jsonb,
  updated_at  timestamptz default now(),
  updated_by  uuid references public.profiles(id) on delete set null
);

alter table public.system_settings enable row level security;

-- Apenas admins podem ler/escrever
create policy "system_settings_admin_select" on public.system_settings
  for select using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "system_settings_admin_all" on public.system_settings
  for all using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Permite que CADA usuário leia configurações públicas (banner, manutenção)
-- via service_role apenas — clientes públicos chamam /api/system-settings/public
-- que filtra apenas as keys públicas

comment on table public.system_settings is
  'Configurações globais editáveis via /admin/configuracoes. Acesso restrito a admins via RLS.';
