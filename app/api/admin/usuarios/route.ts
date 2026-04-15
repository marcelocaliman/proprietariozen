import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminRequest } from '@/lib/admin'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 25

type ProfileLite = {
  id: string
  nome: string
  email: string
  telefone: string | null
  plano: string
  role: string
  banned: boolean
  banned_at: string | null
  criado_em: string
  atualizado_em: string
}

// GET /api/admin/usuarios?page=1&search=&plano=&status=&ordenar=
export async function GET(req: NextRequest) {
  const auth = await verifyAdminRequest()
  if (auth instanceof NextResponse) return auth

  const { searchParams } = req.nextUrl
  const page    = Math.max(1, parseInt(searchParams.get('page')    ?? '1', 10))
  const search  = searchParams.get('search')  ?? ''
  const plano   = searchParams.get('plano')   ?? ''
  const status  = searchParams.get('status')  ?? ''
  const ordenar = searchParams.get('ordenar') ?? 'mais_recentes'

  const admin = createAdminSupabaseClient()

  // ── 1. Buscar profiles com filtros ──────────────────────────────────────
  let query = admin
    .from('profiles')
    .select('id, nome, email, telefone, plano, role, banned, banned_at, criado_em, atualizado_em')

  if (search.trim()) {
    const s = search.trim()
    query = query.or(`nome.ilike.%${s}%,email.ilike.%${s}%`)
  }
  if (plano === 'gratis' || plano === 'pago') query = query.eq('plano', plano)
  if (status === 'banidos') query = query.eq('banned', true)
  else if (status === 'ativos') query = query.eq('banned', false)

  if (ordenar === 'mais_recentes') query = query.order('criado_em', { ascending: false })
  else if (ordenar === 'mais_antigos') query = query.order('criado_em', { ascending: true })
  else if (ordenar === 'ultimo_acesso') query = query.order('atualizado_em', { ascending: false })
  else query = query.order('criado_em', { ascending: false })

  const { data: rawProfiles, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const profiles = (rawProfiles ?? []) as ProfileLite[]
  const totalCount = profiles.length
  const allIds = profiles.map(p => p.id)

  // ── 2. Contar imóveis, inquilinos e aluguéis (via imoveis) ───────────────
  let imoveisMap: Record<string, number> = {}
  let inquilinosMap: Record<string, number> = {}
  let alugueisMesMap: Record<string, number> = {}

  if (allIds.length > 0) {
    const inicioMes = new Date()
    inicioMes.setDate(1)
    const inicioMesStr = inicioMes.toISOString().slice(0, 10)

    const [imoveisData, inquilinosData, imoveisParaAluguel] = await Promise.all([
      admin.from('imoveis').select('user_id').in('user_id', allIds).eq('ativo', true),
      admin.from('inquilinos').select('user_id').in('user_id', allIds).eq('ativo', true),
      // imoveis IDs para cruzar com alugueis
      admin.from('imoveis').select('id, user_id').in('user_id', allIds),
    ])

    for (const r of (imoveisData.data ?? [])) {
      imoveisMap[r.user_id] = (imoveisMap[r.user_id] ?? 0) + 1
    }
    for (const r of (inquilinosData.data ?? [])) {
      inquilinosMap[r.user_id] = (inquilinosMap[r.user_id] ?? 0) + 1
    }

    // Mapa imovel_id → user_id
    const imovelUserMap: Record<string, string> = {}
    for (const im of (imoveisParaAluguel.data ?? [])) {
      imovelUserMap[im.id] = im.user_id
    }

    const imovelIds = Object.keys(imovelUserMap)
    if (imovelIds.length > 0) {
      const { data: alugueisData } = await admin
        .from('alugueis')
        .select('imovel_id')
        .in('imovel_id', imovelIds)
        .gte('mes_referencia', inicioMesStr)

      for (const a of (alugueisData ?? [])) {
        const uid = imovelUserMap[a.imovel_id]
        if (uid) alugueisMesMap[uid] = (alugueisMesMap[uid] ?? 0) + 1
      }
    }
  }

  // ── 3. Enriquecer e ordenar por counts ───────────────────────────────────
  const enriched = profiles.map(p => ({
    ...p,
    total_imoveis:      imoveisMap[p.id]     ?? 0,
    total_inquilinos:   inquilinosMap[p.id]  ?? 0,
    total_alugueis_mes: alugueisMesMap[p.id] ?? 0,
  }))

  if (ordenar === 'mais_imoveis') {
    enriched.sort((a, b) => b.total_imoveis - a.total_imoveis)
  } else if (ordenar === 'mais_alugueis') {
    enriched.sort((a, b) => b.total_alugueis_mes - a.total_alugueis_mes)
  }

  // ── 4. Paginar ────────────────────────────────────────────────────────────
  const from = (page - 1) * PAGE_SIZE
  const pageData = enriched.slice(from, from + PAGE_SIZE)

  return NextResponse.json({
    data: pageData,
    pagination: {
      page,
      page_size: PAGE_SIZE,
      total: totalCount,
      total_pages: Math.ceil(totalCount / PAGE_SIZE),
    },
  })
}
