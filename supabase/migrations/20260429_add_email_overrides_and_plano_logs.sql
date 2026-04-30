-- ============================================================
-- Migration: email_template_overrides + suporte a override de plano
-- ============================================================

-- Tabela para sobrescrever templates de email via UI admin.
-- Cada slug corresponde a uma function em lib/email.ts.
-- Quando subject_override OU html_override é null, usa o default
-- hardcoded do código.

create table if not exists public.email_template_overrides (
  slug              text primary key,
  enabled           boolean      not null default true,
  subject_override  text,
  html_override     text,
  updated_at        timestamptz default now(),
  updated_by        uuid references public.profiles(id) on delete set null
);

alter table public.email_template_overrides enable row level security;

create policy "email_overrides_admin_select" on public.email_template_overrides
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "email_overrides_admin_all" on public.email_template_overrides
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

comment on table public.email_template_overrides is
  'Overrides de templates de email — admin pode editar subject/html sem deploy';

-- ── Override de plano por usuário ─────────────────────────────
-- Não precisa de tabela nova — usamos profiles.plano direto.
-- Mas adicionamos colunas pra rastrear:
--   - plano_override_motivo: motivo do override
--   - plano_override_at: quando foi feito
--   - plano_override_by: admin que fez

alter table public.profiles
  add column if not exists plano_override_motivo text,
  add column if not exists plano_override_at timestamptz,
  add column if not exists plano_override_by uuid references public.profiles(id) on delete set null;

comment on column public.profiles.plano_override_motivo is
  'Quando preenchido, indica que o plano foi sobrescrito manualmente pelo admin';
