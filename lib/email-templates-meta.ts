// Metadados de templates de email — SEGURO PARA IMPORTAR EM CLIENTE.
// Não importa nada que dependa de service_role ou env server-only.
// As funções server-only (getEmailOverride, resolveTemplate, etc.) ficam
// em lib/email-overrides.ts.

export const EMAIL_SLUGS = [
  'lembrete_vencimento_proprietario',
  'alerta_atraso',
  'alerta_reajuste',
  'convite_inquilino',
  'cobranca_inquilino',
  'lembrete_inquilino',
  'recibo',
  'bem_vindo',
  'alerta_vencimento_contrato',
] as const

export type EmailSlug = typeof EMAIL_SLUGS[number]

export const TEMPLATE_VARS: Record<EmailSlug, string[]> = {
  lembrete_vencimento_proprietario: [
    'nomeProprietario', 'nomeImovel', 'nomeInquilino',
    'valor', 'dataVencimento', 'mesReferencia',
  ],
  alerta_atraso: [
    'nomeProprietario', 'nomeImovel', 'nomeInquilino',
    'valor', 'dataVencimento', 'diasAtraso', 'mesReferencia',
  ],
  alerta_reajuste: [
    'nomeProprietario', 'nomeImovel', 'valorAtual',
    'indiceReajuste', 'percentualFixo', 'dataReajuste',
  ],
  convite_inquilino: [
    'nomeInquilino', 'nomeProprietario', 'nomeImovel',
    'enderecoImovel', 'linkAcesso',
  ],
  cobranca_inquilino: [
    'nomeInquilino', 'nomeProprietario', 'nomeImovel',
    'valor', 'mesReferencia', 'dataVencimento',
  ],
  lembrete_inquilino: [
    'nomeInquilino', 'nomeProprietario', 'nomeImovel',
    'valor', 'mesReferencia', 'dataVencimento',
  ],
  recibo: [
    'nomeInquilino', 'nomeProprietario', 'nomeImovel', 'enderecoImovel',
    'valor', 'valorPago', 'mesReferencia', 'dataVencimento',
    'dataPagamento', 'metodoPagamento', 'observacao',
  ],
  bem_vindo: ['nome'],
  alerta_vencimento_contrato: [
    'nomeProprietario', 'nomeImovel', 'nomeInquilino',
    'dataFim', 'diasRestantes',
  ],
}

export const TEMPLATE_LABELS: Record<EmailSlug, { label: string; desc: string }> = {
  lembrete_vencimento_proprietario: {
    label: 'Lembrete vencimento (proprietário)',
    desc: 'Disparado 3 dias antes do vencimento.',
  },
  alerta_atraso: {
    label: 'Alerta de atraso (proprietário)',
    desc: 'Disparado 1 dia após o vencimento.',
  },
  alerta_reajuste: {
    label: 'Alerta de reajuste (proprietário)',
    desc: 'Disparado 30 dias antes do reajuste.',
  },
  convite_inquilino: {
    label: 'Convite ao inquilino',
    desc: 'Enviado quando o gestor convida o inquilino.',
  },
  cobranca_inquilino: {
    label: 'Cobrança inicial ao inquilino',
    desc: 'Enviado no dia em que o aluguel é gerado.',
  },
  lembrete_inquilino: {
    label: 'Lembrete vencimento (inquilino)',
    desc: 'Disparado 3 dias antes — inclui PIX/boleto.',
  },
  recibo: {
    label: 'Recibo de pagamento',
    desc: 'Enviado pelo gestor após registrar pagamento.',
  },
  bem_vindo: {
    label: 'Boas-vindas',
    desc: 'Disparado após cadastro novo.',
  },
  alerta_vencimento_contrato: {
    label: 'Alerta fim de contrato',
    desc: 'Disparado dias antes do fim do contrato.',
  },
}
