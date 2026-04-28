-- ============================================================
-- Migration: dias de antecedência configuráveis para aviso de fim
-- de contrato, por imóvel
-- ============================================================

alter table public.imoveis
  add column if not exists dias_aviso_vencimento_contrato integer not null default 60
    check (dias_aviso_vencimento_contrato >= 1 and dias_aviso_vencimento_contrato <= 365);

comment on column public.imoveis.dias_aviso_vencimento_contrato is
  'Quantos dias antes do fim do contrato o gestor deve receber alerta. Default 60.';
