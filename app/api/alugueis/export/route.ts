// Exporta aluguéis em CSV (compatível com Excel BR e Google Sheets).
// Query params: from=YYYY-MM-DD, to=YYYY-MM-DD, imovel_id=uuid, status=pago|pendente|atrasado|cancelado|estornado
// Sem filtros: retorna ano corrente.
import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

type Linha = {
  mes_referencia: string
  data_vencimento: string
  data_pagamento: string | null
  status: string
  valor: number | null
  valor_pago: number | null
  desconto: number | null
  metodo_pagamento: string | null
  observacao: string | null
  imovel: { apelido: string; endereco: string | null } | { apelido: string; endereco: string | null }[] | null
  inquilino: { nome: string; cpf: string | null; email: string | null } | { nome: string; cpf: string | null; email: string | null }[] | null
}

// Escapa um valor pra CSV padrão pt-BR (separator ';').
// Se contém ; " ou \n, envolve em aspas e duplica aspas internas.
function csvField(v: unknown): string {
  if (v === null || v === undefined) return ''
  const s = String(v)
  if (s.includes(';') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function fmtBRL(n: number | null): string {
  if (n === null || n === undefined) return ''
  return n.toFixed(2).replace('.', ',')
}

function fmtDate(d: string | null): string {
  if (!d) return ''
  // d pode vir como YYYY-MM-DD ou ISO. Pega só a data.
  const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return d
  return `${m[3]}/${m[2]}/${m[1]}`
}

const STATUS_LABEL: Record<string, string> = {
  pago: 'Pago',
  pendente: 'Pendente',
  atrasado: 'Atrasado',
  cancelado: 'Cancelado',
  estornado: 'Estornado',
}

const METODO_LABEL: Record<string, string> = {
  pix: 'PIX',
  boleto: 'Boleto',
  dinheiro: 'Dinheiro',
  transferencia: 'Transferência',
  cartao: 'Cartão',
  outro: 'Outro',
}

export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
  }

  const url = new URL(request.url)
  const fromParam = url.searchParams.get('from')
  const toParam = url.searchParams.get('to')
  const imovelId = url.searchParams.get('imovel_id')
  const statusParam = url.searchParams.get('status')

  // Default: ano corrente
  const ano = new Date().getFullYear()
  const from = fromParam ?? `${ano}-01-01`
  const to = toParam ?? `${ano}-12-31`

  let query = supabase
    .from('alugueis')
    .select(`
      mes_referencia, data_vencimento, data_pagamento, status,
      valor, valor_pago, desconto, metodo_pagamento, observacao,
      imovel:imoveis!inner(apelido, endereco, user_id),
      inquilino:inquilinos(nome, cpf, email)
    `)
    .eq('imovel.user_id', user.id)
    .gte('mes_referencia', from)
    .lte('mes_referencia', to)
    .order('mes_referencia', { ascending: true })
    .order('data_vencimento', { ascending: true })

  if (imovelId) query = query.eq('imovel_id', imovelId)
  if (statusParam) {
    type Status = 'pago' | 'pendente' | 'atrasado' | 'cancelado' | 'estornado'
    const ALL: Status[] = ['pago', 'pendente', 'atrasado', 'cancelado', 'estornado']
    const statuses = statusParam.split(',').filter((s): s is Status =>
      (ALL as string[]).includes(s),
    )
    if (statuses.length > 0) query = query.in('status', statuses)
  }

  const { data, error } = await query
  if (error) {
    return NextResponse.json({ error: 'Erro ao buscar aluguéis.' }, { status: 500 })
  }

  const linhas = (data ?? []) as unknown as Linha[]

  // Header em pt-BR (Excel BR usa ; como separator)
  const header = [
    'Mês de referência',
    'Vencimento',
    'Pagamento',
    'Imóvel',
    'Endereço',
    'Inquilino',
    'CPF do inquilino',
    'E-mail do inquilino',
    'Valor (R$)',
    'Desconto (R$)',
    'Valor pago (R$)',
    'Status',
    'Método de pagamento',
    'Observação',
  ]

  const rows = linhas.map(a => {
    const imo = Array.isArray(a.imovel) ? a.imovel[0] : a.imovel
    const inq = Array.isArray(a.inquilino) ? a.inquilino[0] : a.inquilino
    return [
      a.mes_referencia ? a.mes_referencia.slice(0, 7) : '',
      fmtDate(a.data_vencimento),
      fmtDate(a.data_pagamento),
      imo?.apelido ?? '',
      imo?.endereco ?? '',
      inq?.nome ?? '',
      inq?.cpf ?? '',
      inq?.email ?? '',
      fmtBRL(a.valor),
      fmtBRL(a.desconto),
      fmtBRL(a.valor_pago),
      STATUS_LABEL[a.status] ?? a.status,
      a.metodo_pagamento ? (METODO_LABEL[a.metodo_pagamento] ?? a.metodo_pagamento) : '',
      a.observacao ?? '',
    ].map(csvField).join(';')
  })

  // BOM UTF-8 pra Excel BR abrir com acentos corretos
  const csv = '﻿' + header.map(csvField).join(';') + '\r\n' + rows.join('\r\n') + '\r\n'

  const filename = `alugueis_${from}_${to}.csv`
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
