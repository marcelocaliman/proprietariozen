import { NextResponse, type NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { gerarUrlAssinada } from '@/lib/storage'

export const dynamic = 'force-dynamic'

/**
 * GET /api/documentos/url-assinada?path=usuarios/{userId}/...
 *
 * Verifica que o storagePath pertence ao usuário autenticado antes de
 * gerar uma URL assinada fresca — evita URLs expiradas no frontend.
 */
export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const storagePath = req.nextUrl.searchParams.get('path')
  if (!storagePath) return NextResponse.json({ error: 'Parâmetro "path" obrigatório.' }, { status: 400 })

  // Garantir que o path pertence ao usuário autenticado
  const prefixoEsperado = `usuarios/${user.id}/`
  if (!storagePath.startsWith(prefixoEsperado)) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })
  }

  try {
    const url = await gerarUrlAssinada(storagePath)
    return NextResponse.json({ url })
  } catch {
    return NextResponse.json({ error: 'Falha ao gerar URL.' }, { status: 500 })
  }
}
