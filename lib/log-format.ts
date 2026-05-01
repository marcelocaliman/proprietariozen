// Tradução de chaves do `details` (JSON) pra labels legíveis em PT-BR.
// Usado em /admin/logs e no drawer admin de usuários.

const FRIENDLY_LABELS: Record<string, string> = {
  ip:                  'IP',
  ip_address:          'IP',
  nome:                'Nome',
  email:               'E-mail',
  motivo:              'Motivo',
  apelido:             'Imóvel',
  endereco:            'Endereço',
  valor:               'Valor',
  valor_centavos:      'Valor',
  valor_pago:          'Valor pago',
  charge_id:           'Cobrança',
  refund_id:           'Reembolso',
  subscription_id:     'Assinatura',
  checkout_id:         'Checkout',
  session_id:          'Sessão',
  customer_id:         'Customer Stripe',
  admin_id:            'Admin',
  executed_by:         'Executado por',
  user_id:             'Usuário',
  inquilino_id:        'Inquilino',
  imovel_id:           'Imóvel',
  aluguel_id:          'Aluguel',
  total:               'Total',
  atualizados:         'Atualizados',
  semSub:              'Sem subscription',
  erros:               'Erros',
  de:                  'De',
  para:                'Para',
  result:              'Resultado',
  metodo:              'Método',
  metodo_pagamento:    'Método de pagamento',
  data_pagamento:      'Data do pagamento',
  data_vencimento:     'Vencimento',
  status:              'Status',
  key:                 'Chave',
  value:               'Valor',
  slug:                'Template',
  enabled:             'Habilitado',
  subject_override:    'Assunto override',
  html_override:       'HTML override',
}

// Chaves que não fazem sentido exibir (já vão em outras colunas ou são ruído)
const HIDDEN_KEYS = new Set(['ip', 'ip_address'])

const PLANO_LABEL: Record<string, string> = {
  gratis: 'Grátis',
  pago:   'Master',
  elite:  'Elite',
}

function formatValue(key: string, value: unknown): string {
  if (value == null) return '—'
  if (typeof value === 'boolean') return value ? 'sim' : 'não'

  // Tradução de planos
  if ((key === 'de' || key === 'para' || key === 'plano') && typeof value === 'string') {
    return PLANO_LABEL[value] ?? value
  }

  // valor_centavos → R$ X,XX
  if (key === 'valor_centavos' && typeof value === 'number') {
    return (value / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  // Datas ISO
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:/.test(value)) {
    return new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
  }

  // IDs longos: trunca pra ficar legível
  if (typeof value === 'string' && value.length > 32) {
    return value.slice(0, 12) + '…'
  }

  if (typeof value === 'object') return JSON.stringify(value).slice(0, 60)
  return String(value)
}

export type FormattedDetail = { label: string; value: string }

export function formatLogDetails(details: unknown): FormattedDetail[] {
  if (!details || typeof details !== 'object') return []
  const obj = details as Record<string, unknown>
  return Object.entries(obj)
    .filter(([k]) => !HIDDEN_KEYS.has(k))
    .map(([k, v]) => ({
      label: FRIENDLY_LABELS[k] ?? k,
      value: formatValue(k, v),
    }))
}

// Pega o IP de details.ip se a coluna ip_address estiver vazia.
export function extractIp(details: unknown, ipAddress: string | null): string | null {
  if (ipAddress) return ipAddress
  if (!details || typeof details !== 'object') return null
  const v = (details as Record<string, unknown>).ip
  return typeof v === 'string' ? v : null
}
