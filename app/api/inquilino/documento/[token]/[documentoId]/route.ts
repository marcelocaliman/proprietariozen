import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { gerarUrlAssinada } from '@/lib/storage'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ token: string; documentoId: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  // Rate limit por IP: máx 30 reqs/min — bloqueia enumeration de tokens.
  const ip = getClientIp(req)
  const rl = rateLimit({ key: `inq-doc:${ip}`, windowMs: 60_000, max: 30 })
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Muitas requisições. Aguarde alguns segundos.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
    )
  }

  const { token, documentoId } = await params
  if (!token || token.length !== 64)
    return NextResponse.json({ error: 'Token inválido.' }, { status: 400 })

  const admin = createAdminClient()

  // Valida token
  const { data: tokenRow } = await admin
    .from('inquilino_tokens')
    .select('inquilino_id, ativo')
    .eq('token', token)
    .maybeSingle()

  if (!tokenRow || !tokenRow.ativo)
    return NextResponse.json({ error: 'Link inválido ou revogado.' }, { status: 404 })

  // Valida que o documento pertence ao inquilino do token
  const { data: doc } = await admin
    .from('documentos_inquilino')
    .select('id, storage_path')
    .eq('id', documentoId)
    .eq('inquilino_id', tokenRow.inquilino_id)
    .maybeSingle()

  if (!doc)
    return NextResponse.json({ error: 'Documento não encontrado.' }, { status: 404 })

  const url = await gerarUrlAssinada(doc.storage_path, 300) // 5 minutos
  return NextResponse.json({ url })
}
