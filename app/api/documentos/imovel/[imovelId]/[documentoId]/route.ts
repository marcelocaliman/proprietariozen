import { NextResponse, type NextRequest } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { deletarDocumento } from '@/lib/storage'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ imovelId: string; documentoId: string }> }

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { imovelId, documentoId } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const admin = createAdminClient()

  const { data: doc } = await admin
    .from('documentos_imovel')
    .select('id, storage_path, user_id')
    .eq('id', documentoId)
    .eq('imovel_id', imovelId)
    .single()

  if (!doc) return NextResponse.json({ error: 'Documento não encontrado.' }, { status: 404 })
  if (doc.user_id !== user.id) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })

  await deletarDocumento(doc.storage_path)

  const { error } = await admin
    .from('documentos_imovel')
    .delete()
    .eq('id', documentoId)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
