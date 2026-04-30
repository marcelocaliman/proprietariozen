import { createAdminSupabaseClient } from './supabase-admin'

// Slugs disponíveis — espelham as funções de lib/email.ts
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

export type EmailOverrideRow = {
  slug: string
  enabled: boolean
  subject_override: string | null
  html_override: string | null
  updated_at: string | null
  updated_by: string | null
}

// Cache em memória para reduzir hits no DB durante o dispatch de emails
type CacheEntry = { row: EmailOverrideRow | null; expires: number }
const cache = new Map<EmailSlug, CacheEntry>()
const TTL_MS = 60_000 // 1 minuto

export async function getEmailOverride(slug: EmailSlug): Promise<EmailOverrideRow | null> {
  const cached = cache.get(slug)
  if (cached && cached.expires > Date.now()) return cached.row

  try {
    const admin = createAdminSupabaseClient()
    const { data } = await admin
      .from('email_template_overrides')
      .select('*')
      .eq('slug', slug)
      .maybeSingle()

    const row = (data as EmailOverrideRow | null) ?? null
    cache.set(slug, { row, expires: Date.now() + TTL_MS })
    return row
  } catch {
    return null
  }
}

// Substitui {{var}} no template
export function applyVars(tpl: string, vars: Record<string, string | number | null | undefined>): string {
  return tpl.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key: string) => {
    const v = vars[key]
    if (v === null || v === undefined) return ''
    return String(v)
  })
}

// Resolve template final: aplica override se houver, ou usa defaults.
// Retorna null se template estiver desabilitado.
export async function resolveTemplate(
  slug: EmailSlug,
  defaults: { subject: string; html: string },
  vars: Record<string, string | number | null | undefined>,
): Promise<{ subject: string; html: string } | null> {
  const override = await getEmailOverride(slug)
  if (override && override.enabled === false) return null

  const subject = override?.subject_override
    ? applyVars(override.subject_override, vars)
    : defaults.subject

  const html = override?.html_override
    ? applyVars(override.html_override, vars)
    : defaults.html

  return { subject, html }
}

export function clearEmailOverridesCache() {
  cache.clear()
}

// Variáveis disponíveis por template — fonte da verdade para a UI de edição.
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
