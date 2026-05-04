import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

// GET /api/notificacoes — retorna últimas N + count de não lidas do usuário
export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const [{ data: items }, { count: unread }] = await Promise.all([
    supabase
      .from('notificacoes')
      .select('id, tipo, titulo, mensagem, link, lida, criado_em')
      .eq('user_id', user.id)
      .order('criado_em', { ascending: false })
      .limit(20),
    supabase
      .from('notificacoes')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('lida', false),
  ])

  return NextResponse.json({
    items: items ?? [],
    unread: unread ?? 0,
  })
}
