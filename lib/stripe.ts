import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  typescript: true,
})

// Limites e recursos por plano
export const LIMITES_PLANO = {
  gratis: {
    nome: 'Grátis',
    maxImoveis: 1,
    recibos: false,
    reajuste: false,
    relatorios: false,
  },
  pago: {
    nome: 'Pro',
    maxImoveis: 5,
    recibos: true,
    reajuste: true,
    relatorios: true,
  },
} as const

export type PlanoKey = keyof typeof LIMITES_PLANO

// Verifica se o usuário pode adicionar mais imóveis
export function podeAdicionarImovel(plano: PlanoKey, qtdAtual: number): boolean {
  return qtdAtual < LIMITES_PLANO[plano].maxImoveis
}
