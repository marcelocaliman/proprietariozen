import Stripe from 'stripe'

let _stripe: Stripe | undefined

// Lazy singleton — evita inicialização no momento do build (env vars ausentes)
export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { typescript: true })
  }
  return _stripe
}

// Tipos de plano disponíveis
export type PlanoTipo = 'gratis' | 'pago' | 'elite'

/** @deprecated Use PlanoTipo */
export type PlanoKey = PlanoTipo

// Limites e recursos por plano
export const LIMITES_PLANO = {
  gratis: {
    nome: 'Grátis',
    preco: 0,
    imoveis: 1,
    inquilinos: 1,
    storage_mb: 100,
    recibos_pdf: false,
    reajuste: false,
    relatorios: false,
    alertas_email: true,
    pagina_inquilino: true,
    cobranca_automatica: false,
    suporte_prioritario: false,
    relatorio_ir: false,
  },
  pago: {
    nome: 'Master',
    preco: 4990,
    imoveis: 3,
    inquilinos: 3,
    storage_mb: 500,
    recibos_pdf: true,
    reajuste: true,
    relatorios: true,
    alertas_email: true,
    pagina_inquilino: true,
    cobranca_automatica: false,
    suporte_prioritario: false,
    relatorio_ir: false,
  },
  elite: {
    nome: 'Elite',
    preco: 9990,
    imoveis: 10,
    inquilinos: 999,
    storage_mb: 5000,
    recibos_pdf: true,
    reajuste: true,
    relatorios: true,
    alertas_email: true,
    pagina_inquilino: true,
    cobranca_automatica: true,
    suporte_prioritario: true,
    relatorio_ir: true,
  },
} as const

/** Retorna true se o plano tem acesso pago (Master ou Elite) */
export function isPlanoPago(plano: PlanoTipo): boolean {
  return plano === 'pago' || plano === 'elite'
}

/** Verifica se o plano tem acesso a uma feature específica */
export function temAcesso(
  plano: PlanoTipo,
  feature: keyof (typeof LIMITES_PLANO)['gratis'],
): boolean {
  return Boolean(LIMITES_PLANO[plano][feature])
}

/** Retorna o limite numérico de um recurso para o plano */
export function getLimite(
  plano: PlanoTipo,
  limite: 'imoveis' | 'inquilinos' | 'storage_mb',
): number {
  return LIMITES_PLANO[plano][limite]
}

// Verifica se o usuário pode adicionar mais imóveis
export function podeAdicionarImovel(plano: PlanoTipo, qtdAtual: number): boolean {
  return qtdAtual < LIMITES_PLANO[plano].imoveis
}
