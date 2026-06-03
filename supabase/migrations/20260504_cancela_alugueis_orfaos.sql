-- ============================================================
-- Limpa aluguéis órfãos criados por bug antigo do cron
-- ============================================================
-- O cron /api/cron/gerar-alugueis e as actions gerarAlugueisMes /
-- gerarAlugueisMesesAno geravam aluguel com inquilino_id = NULL
-- quando o imóvel não tinha mais inquilino ativo. Esses registros
-- poluem a UI/relatórios e nunca podem ser cobrados.
--
-- Esta migration cancela esses aluguéis órfãos que ainda estão
-- pendentes ou atrasados (não toca em aluguéis pagos ou já cancelados).

update public.alugueis
set status            = 'cancelado',
    motivo_cancelamento = coalesce(motivo_cancelamento, 'Cancelado automaticamente: aluguel órfão (sem inquilino vinculado)')
where inquilino_id is null
  and status in ('pendente', 'atrasado');
