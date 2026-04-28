import 'server-only'

export type TimelineEvento = {
  data: string  // ISO yyyy-mm-dd
  tipo:
    | 'contrato_iniciado'
    | 'contrato_renovado'
    | 'contrato_encerrado'
    | 'inquilino_ativo'
    | 'inquilino_anterior'
    | 'pagamento'
    | 'atraso'
    | 'cancelamento'
    | 'reajuste_aplicado'
    | 'reajuste_previsto'
    | 'fim_contrato'
    | 'fim_contrato_previsto'
  titulo: string
  descricao?: string | null
  /** quando true, evento está no futuro (planejamento) */
  futuro?: boolean
}

type ImovelInfo = {
  data_inicio_contrato: string | null
  data_fim_contrato: string | null
  contrato_indeterminado: boolean
  data_proximo_reajuste: string | null
  indice_reajuste: 'igpm' | 'ipca' | 'fixo'
  percentual_fixo: number | null
}

type InquilinoInfo = {
  nome: string
  ativo: boolean
  criado_em: string
}

type AluguelInfo = {
  status: string
  mes_referencia: string
  data_vencimento: string
  data_pagamento: string | null
  valor: number
  motivo_cancelamento: string | null
}

export type ActivityLogInfo = {
  action: string
  details: Record<string, unknown> | null
  created_at: string
}

const indiceLabel: Record<string, string> = {
  igpm: 'IGP-M',
  ipca: 'IPCA',
  fixo: 'Percentual fixo',
}

/**
 * Sintetiza eventos relevantes a partir dos dados do imóvel + inquilinos
 * + aluguéis, ordenados cronologicamente. Inclui eventos futuros para
 * planejamento (próximo reajuste, fim do contrato).
 */
export function montarTimeline(
  imovel: ImovelInfo,
  inquilinos: InquilinoInfo[],
  alugueis: AluguelInfo[],
  logs: ActivityLogInfo[] = [],
): TimelineEvento[] {
  const eventos: TimelineEvento[] = []
  const hojeStr = new Date().toISOString().slice(0, 10)

  // Início do contrato
  if (imovel.data_inicio_contrato) {
    eventos.push({
      data: imovel.data_inicio_contrato,
      tipo: 'contrato_iniciado',
      titulo: 'Contrato iniciado',
    })
  }

  // Inquilinos: o ativo entra como evento atual; inativos ficam como "saiu em" se tiverem data
  for (const inq of inquilinos) {
    eventos.push({
      data: inq.criado_em.slice(0, 10),
      tipo: inq.ativo ? 'inquilino_ativo' : 'inquilino_anterior',
      titulo: inq.ativo ? `Inquilino ativo: ${inq.nome}` : `Inquilino anterior: ${inq.nome}`,
    })
  }

  // Eventos de aluguéis: focar em pagamentos, atrasos, cancelamentos
  for (const a of alugueis) {
    if (a.status === 'pago' && a.data_pagamento) {
      const venc = new Date(a.data_vencimento + 'T00:00:00')
      const pago = new Date(a.data_pagamento + 'T00:00:00')
      const diffDias = Math.round((pago.getTime() - venc.getTime()) / 86_400_000)
      const refLabel = formatarMesCurto(a.mes_referencia)
      eventos.push({
        data: a.data_pagamento,
        tipo: 'pagamento',
        titulo: `Pagamento ${refLabel}`,
        descricao: diffDias < 0
          ? `R$ ${a.valor.toFixed(2)} · pago ${Math.abs(diffDias)}d antes do vencimento`
          : diffDias === 0
            ? `R$ ${a.valor.toFixed(2)} · pago no vencimento`
            : `R$ ${a.valor.toFixed(2)} · pago com ${diffDias}d de atraso`,
      })
    } else if (a.status === 'atrasado') {
      eventos.push({
        data: a.data_vencimento,
        tipo: 'atraso',
        titulo: `Atraso em ${formatarMesCurto(a.mes_referencia)}`,
        descricao: `Vencimento ${formatarDataBR(a.data_vencimento)} · R$ ${a.valor.toFixed(2)} em aberto`,
      })
    } else if (a.status === 'cancelado') {
      eventos.push({
        data: a.data_vencimento,
        tipo: 'cancelamento',
        titulo: `Cobrança cancelada · ${formatarMesCurto(a.mes_referencia)}`,
        descricao: a.motivo_cancelamento ?? null,
      })
    }
  }

  // Eventos de logs do imovel (renovacoes, encerramentos)
  for (const log of logs) {
    const dataLog = log.created_at.slice(0, 10)
    if (log.action === 'CONTRATO_RENOVADO') {
      const novoFim = (log.details?.novo_fim as string | null) ?? null
      const indeterminado = log.details?.indeterminado === true
      eventos.push({
        data: dataLog,
        tipo: 'contrato_renovado',
        titulo: 'Contrato renovado',
        descricao: indeterminado
          ? 'Passou para vigência indeterminada'
          : novoFim
            ? `Novo fim: ${formatarDataBR(novoFim)}`
            : null,
      })
    } else if (log.action === 'CONTRATO_ENCERRADO') {
      const ultimoMes = (log.details?.ultimoMes as string | undefined)
      const removidos = (log.details?.removidos as number | undefined) ?? 0
      eventos.push({
        data: dataLog,
        tipo: 'contrato_encerrado',
        titulo: 'Contrato encerrado',
        descricao: ultimoMes
          ? `Último mês: ${formatarMesCurto(ultimoMes + '-01')}${removidos > 0 ? ` · ${removidos} cobrança(s) futura(s) removida(s)` : ''}`
          : null,
      })
    }
  }

  // Reajuste previsto (futuro)
  if (imovel.data_proximo_reajuste && imovel.data_proximo_reajuste >= hojeStr) {
    eventos.push({
      data: imovel.data_proximo_reajuste,
      tipo: 'reajuste_previsto',
      titulo: 'Reajuste previsto',
      descricao: imovel.indice_reajuste === 'fixo' && imovel.percentual_fixo != null
        ? `${indiceLabel[imovel.indice_reajuste]} · ${imovel.percentual_fixo}%`
        : indiceLabel[imovel.indice_reajuste] ?? imovel.indice_reajuste,
      futuro: true,
    })
  }

  // Fim de contrato previsto / vencido
  if (imovel.data_fim_contrato && !imovel.contrato_indeterminado) {
    const isFuturo = imovel.data_fim_contrato >= hojeStr
    eventos.push({
      data: imovel.data_fim_contrato,
      tipo: isFuturo ? 'fim_contrato_previsto' : 'fim_contrato',
      titulo: isFuturo ? 'Fim previsto do contrato' : 'Contrato venceu',
      futuro: isFuturo,
    })
  }

  // Ordena cronológico decrescente — mais recente primeiro, mas eventos futuros
  // ficam no topo agrupados como "próximos eventos"
  return eventos.sort((a, b) => {
    if (a.futuro && !b.futuro) return -1
    if (!a.futuro && b.futuro) return 1
    return b.data.localeCompare(a.data)
  })
}

function formatarMesCurto(ref: string): string {
  const [ano, mes] = ref.split('-').map(Number)
  return new Intl.DateTimeFormat('pt-BR', { month: 'short', year: '2-digit' })
    .format(new Date(ano, mes - 1, 1))
    .replace('.', '')
}

function formatarDataBR(data: string): string {
  return new Date(data + 'T00:00:00')
    .toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
