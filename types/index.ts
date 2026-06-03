export type { Database } from './database'

export type TipoImovel = 'apartamento' | 'casa' | 'kitnet' | 'comercial' | 'terreno' | 'outro'
export type IndiceReajuste = 'igpm' | 'ipca' | 'fixo'
export type StatusPagamento = 'pendente' | 'pago' | 'atrasado' | 'cancelado' | 'estornado'
export type BillingMode = 'MANUAL' | 'AUTOMATIC'
export type StatusImovel = 'disponivel' | 'alugado' | 'manutencao'
export type GarantiaTipo = 'caucao' | 'fiador' | 'seguro_fianca' | 'titulo_capitalizacao' | 'sem_garantia'

export type Imovel = {
  id: string
  user_id: string
  apelido: string
  endereco: string
  tipo: TipoImovel
  valor_aluguel: number
  dia_vencimento: number
  data_inicio_contrato: string | null
  data_proximo_reajuste: string | null
  indice_reajuste: IndiceReajuste
  percentual_fixo: number | null
  ativo: boolean
  observacoes: string | null
  criado_em: string
  billing_mode: BillingMode
  multa_percentual: number
  juros_percentual: number
  desconto_percentual: number
  asaas_subscription_id: string | null
  vigencia_meses: number | null
  data_fim_contrato: string | null
  contrato_indeterminado: boolean
  alerta_vencimento_enviado: boolean
  dias_aviso_vencimento_contrato: number
  // Garantia / caução / fiador
  garantia_tipo: GarantiaTipo | null
  garantia_valor: number | null
  garantia_observacao: string | null
  fiador_nome: string | null
  fiador_cpf: string | null
  fiador_telefone: string | null
  fiador_email: string | null
  seguro_fianca_seguradora: string | null
  seguro_fianca_apolice: string | null
  seguro_fianca_validade: string | null
  // Encargos extras mensais
  iptu_mensal: number
  condominio_mensal: number
  outros_encargos: number
  outros_encargos_descricao: string | null
  inquilinos?: { id: string; nome: string; ativo: boolean }[]
}

export type Inquilino = {
  id: string
  user_id: string
  imovel_id: string
  nome: string
  telefone: string | null
  email: string | null
  cpf: string | null
  ativo: boolean
  criado_em: string
  convite_enviado_em: string | null
  imovel?: { id: string; apelido: string } | null
}

export type Aluguel = {
  id: string
  imovel_id: string
  inquilino_id: string | null
  mes_referencia: string
  valor: number
  data_vencimento: string
  status: StatusPagamento
  data_pagamento: string | null
  observacao: string | null
  recibo_gerado: boolean
  criado_em: string
  // Asaas (modo automático)
  asaas_charge_id: string | null
  asaas_pix_qrcode: string | null
  asaas_pix_copiaecola: string | null
  asaas_boleto_url: string | null
  asaas_customer_id: string | null
  // Campos de pagamento / parcial
  valor_pago: number | null
  metodo_pagamento: string | null
  desconto: number | null
  motivo_cancelamento: string | null
  // Isenção
  isento: boolean | null
  motivo_isencao: string | null
  // Snapshot dos encargos
  valor_aluguel_base: number | null
  valor_iptu: number
  valor_condominio: number
  valor_outros_encargos: number
  // Timestamps de envio
  lembrete_enviado_em: string | null
  recibo_reenviado_em: string | null
}

export type Profile = {
  id: string
  nome: string
  email: string
  telefone: string | null
  plano: 'gratis' | 'pago' | 'elite'
  role: 'user' | 'admin'
  stripe_customer_id: string | null
  criado_em: string
  atualizado_em: string
  // Asaas (subconta marketplace)
  asaas_account_id: string | null
  asaas_account_status: string | null
  asaas_api_key_enc: string | null
  asaas_wallet_id: string | null
  asaas_customer_id: string | null
  // Banimento
  banned: boolean
  banned_at: string | null
  banned_reason: string | null
  banned_by: string | null
  // Override manual de plano (cortesia admin)
  plano_override_motivo: string | null
  plano_override_at: string | null
  plano_override_by: string | null
  // Stripe subscription (sync via webhook)
  stripe_subscription_id: string | null
  stripe_subscription_status: string | null
  stripe_subscription_current_period_end: string | null
  stripe_subscription_cancel_at_period_end: boolean
  stripe_price_id: string | null
}
