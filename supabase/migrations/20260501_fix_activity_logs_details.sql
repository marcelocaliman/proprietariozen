-- ============================================================
-- Fix: coluna details em activity_logs
-- ============================================================
-- A migration original (20260416) declarava details jsonb mas
-- aparentemente a coluna não foi criada no banco de produção
-- (migration aplicada parcialmente, ou coluna removida).
--
-- Sintoma: registrarLog() em lib/log.ts inseria com details, recebia
-- erro PGRST204 ("Could not find the 'details' column") e o try/catch
-- vazio engolia o erro — resultado: tabela activity_logs sempre vazia.

alter table public.activity_logs
  add column if not exists details jsonb;

comment on column public.activity_logs.details is
  'Metadados adicionais do evento em formato JSON (ex: motivo, valor, IP)';
