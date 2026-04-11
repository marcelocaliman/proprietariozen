// Tipos e constantes de configurações — separados das server actions

export type NotificacoesConfig = {
  venc_5_dias: boolean
  venc_3_dias: boolean
  venc_1_dia: boolean
  atraso_notificar: boolean
  atraso_repetir_dias: number
  reajuste_60_dias: boolean
  reajuste_30_dias: boolean
  reajuste_15_dias: boolean
  resumo_mensal: boolean
}

export const NOTIFICACOES_PADRAO: NotificacoesConfig = {
  venc_5_dias: true,
  venc_3_dias: true,
  venc_1_dia: false,
  atraso_notificar: true,
  atraso_repetir_dias: 7,
  reajuste_60_dias: false,
  reajuste_30_dias: true,
  reajuste_15_dias: false,
  resumo_mensal: true,
}
