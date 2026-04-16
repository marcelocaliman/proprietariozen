-- ============================================================
-- Migration: colunas de funcionalidades de gestão de aluguéis
-- desconto, isenção, cancelamento, lembrete, reenvio de recibo
-- ============================================================

alter table public.alugueis
  add column if not exists desconto             numeric(10,2),
  add column if not exists motivo_cancelamento  text,
  add column if not exists isento               boolean not null default false,
  add column if not exists motivo_isencao       text,
  add column if not exists lembrete_enviado_em  timestamptz,
  add column if not exists recibo_reenviado_em  timestamptz;

-- Índice parcial para consultas de isentos
create index if not exists idx_alugueis_isento
  on public.alugueis(isento)
  where isento = true;

comment on column public.alugueis.desconto            is 'Desconto manual aplicado pelo proprietário (valor absoluto em R$)';
comment on column public.alugueis.motivo_cancelamento is 'Motivo do cancelamento quando status = cancelado';
comment on column public.alugueis.isento              is 'Mês isento — proprietário dispensou o pagamento';
comment on column public.alugueis.motivo_isencao      is 'Justificativa da isenção';
comment on column public.alugueis.lembrete_enviado_em is 'Quando o proprietário enviou lembrete manual ao inquilino';
comment on column public.alugueis.recibo_reenviado_em is 'Quando o proprietário reencaminhou o recibo ao inquilino';
