/**
 * Cálculos de IRPF 2025 para aluguéis recebidos por pessoa física.
 * Tabela progressiva válida para rendimentos de 2025 (declaração 2026).
 */

// ─── Tabela progressiva IRPF 2025 ─────────────────────────────────────────────
// { ate: limite superior da faixa (Infinity = última); aliquota: %; deducao: R$ }
export const TABELA_IRPF_2025 = [
  { ate: 2259.20,  aliquota: 0,    deducao: 0       },
  { ate: 2826.65,  aliquota: 7.5,  deducao: 169.44  },
  { ate: 3751.05,  aliquota: 15,   deducao: 381.44  },
  { ate: 4664.68,  aliquota: 22.5, deducao: 662.77  },
  { ate: Infinity, aliquota: 27.5, deducao: 896.00  },
] as const

/** Limite mensal para obrigatoriedade do Carnê-Leão 2025 */
export const LIMITE_CARNE_LEAO_2025 = 2824.14

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface MesIR {
  mes: number          // 1–12
  ano: number
  label: string        // ex: "Janeiro/2025"
  bruto: number        // total recebido no mês
  imposto: number      // IRPF calculado sobre o bruto
  aliquota_efetiva: number  // aliquota real (%)
  obrigado_carne_leao: boolean
}

export interface ResumoAnualIR {
  ano: number
  meses: MesIR[]
  total_bruto: number
  total_imposto: number
  media_mensal: number
  meses_com_obrigacao: number   // meses em que carnê-leão é obrigatório
}

// ─── Funções de cálculo ────────────────────────────────────────────────────────

/** Calcula o IRPF mensal sobre um rendimento bruto de aluguel */
export function calcularIRMensal(bruto: number): {
  imposto: number
  aliquota_efetiva: number
  obrigado_carne_leao: boolean
} {
  const faixa = TABELA_IRPF_2025.find(f => bruto <= f.ate)!
  const imposto = Math.max(0, bruto * (faixa.aliquota / 100) - faixa.deducao)

  const aliquota_efetiva = bruto > 0 ? (imposto / bruto) * 100 : 0
  const obrigado_carne_leao = bruto > LIMITE_CARNE_LEAO_2025

  return { imposto, aliquota_efetiva, obrigado_carne_leao }
}

const MESES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

/** Agrega registros de aluguéis pagos por mês e calcula o IR de cada mês */
export function calcularResumoAnual(
  ano: number,
  registros: { mes_referencia: string; valor_pago: number | null; valor: number }[],
): ResumoAnualIR {
  // Inicializa os 12 meses com bruto = 0
  const meses: MesIR[] = Array.from({ length: 12 }, (_, i) => ({
    mes: i + 1,
    ano,
    label: `${MESES_PT[i]}/${ano}`,
    bruto: 0,
    imposto: 0,
    aliquota_efetiva: 0,
    obrigado_carne_leao: false,
  }))

  for (const r of registros) {
    // mes_referencia formato: "YYYY-MM" ou "YYYY-MM-DD"
    const partes = r.mes_referencia.split('-')
    const anoRef = parseInt(partes[0], 10)
    const mesRef = parseInt(partes[1], 10)
    if (anoRef !== ano || mesRef < 1 || mesRef > 12) continue

    const valor = r.valor_pago ?? r.valor
    meses[mesRef - 1].bruto += valor
  }

  // Calcula IR para cada mês
  for (const m of meses) {
    const { imposto, aliquota_efetiva, obrigado_carne_leao } = calcularIRMensal(m.bruto)
    m.imposto = imposto
    m.aliquota_efetiva = aliquota_efetiva
    m.obrigado_carne_leao = obrigado_carne_leao
  }

  const total_bruto = meses.reduce((s, m) => s + m.bruto, 0)
  const total_imposto = meses.reduce((s, m) => s + m.imposto, 0)
  const meses_com_renda = meses.filter(m => m.bruto > 0).length
  const media_mensal = meses_com_renda > 0 ? total_bruto / meses_com_renda : 0
  const meses_com_obrigacao = meses.filter(m => m.obrigado_carne_leao).length

  return { ano, meses, total_bruto, total_imposto, media_mensal, meses_com_obrigacao }
}

/** Formata valor em BRL */
export function formatBRL(valor: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)
}

/** Formata percentual com 1 casa decimal */
export function formatPct(valor: number): string {
  return `${valor.toFixed(1)}%`
}
