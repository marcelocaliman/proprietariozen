import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminRequest } from '@/lib/admin'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import { createClient as createSupabaseAdminAuthClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

type Acao = 'mudar_plano' | 'banir' | 'reativar' | 'resetar_senha'

// POST /api/admin/usuarios/[id]/acao
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await verifyAdminRequest()
  if (auth instanceof NextResponse) return auth
  const { userId: adminId } = auth

  const { id: targetId } = await params

  let body: { acao: Acao; motivo?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido.' }, { status: 400 })
  }

  const { acao, motivo } = body
  if (!['mudar_plano', 'banir', 'reativar', 'resetar_senha'].includes(acao)) {
    return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 })
  }

  const admin = createAdminSupabaseClient()

  // Buscar perfil alvo
  const { data: target, error: fetchErr } = await admin
    .from('profiles')
    .select('id, email, plano, banned, role')
    .eq('id', targetId)
    .single()

  if (fetchErr || !target) {
    return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 })
  }

  // Impedir ações sobre outro admin
  if (target.role === 'admin' && acao !== 'resetar_senha') {
    return NextResponse.json({ error: 'Não é possível executar esta ação em um admin.' }, { status: 403 })
  }

  const agora = new Date().toISOString()

  // ── Executar ação ─────────────────────────────────────────────────────────
  switch (acao) {
    case 'mudar_plano': {
      // Ciclo: gratis → pago → elite → gratis
      const novoPlano = target.plano === 'gratis' ? 'pago'
        : target.plano === 'pago' ? 'elite'
        : 'gratis'
      const { error } = await admin
        .from('profiles')
        .update({ plano: novoPlano })
        .eq('id', targetId)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      await logActivity(admin, adminId, targetId, target.email,
        'admin_mudar_plano',
        { de: target.plano, para: novoPlano, motivo: motivo ?? null, admin_id: adminId },
      )

      return NextResponse.json({ ok: true, plano: novoPlano })
    }

    case 'banir': {
      const { error } = await admin
        .from('profiles')
        .update({
          banned:        true,
          banned_at:     agora,
          banned_reason: motivo ?? null,
          banned_by:     adminId,
        })
        .eq('id', targetId)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      await logActivity(admin, adminId, targetId, target.email,
        'admin_banir',
        { motivo: motivo ?? null, admin_id: adminId },
      )

      return NextResponse.json({ ok: true })
    }

    case 'reativar': {
      const { error } = await admin
        .from('profiles')
        .update({
          banned:        false,
          banned_at:     null,
          banned_reason: null,
          banned_by:     null,
        })
        .eq('id', targetId)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      await logActivity(admin, adminId, targetId, target.email,
        'admin_reativar',
        { admin_id: adminId },
      )

      return NextResponse.json({ ok: true })
    }

    case 'resetar_senha': {
      // Usa o cliente Auth Admin do Supabase (service_role)
      const authAdmin = createSupabaseAdminAuthClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } },
      )

      const { data, error } = await authAdmin.auth.admin.generateLink({
        type: 'recovery',
        email: target.email,
      })

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      await logActivity(admin, adminId, targetId, target.email,
        'admin_resetar_senha',
        { admin_id: adminId },
      )

      return NextResponse.json({
        ok: true,
        reset_link: data.properties?.action_link ?? null,
      })
    }
  }
}

// ── Helper: registrar log de atividade ────────────────────────────────────────
async function logActivity(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  adminId: string,
  userId: string,
  userEmail: string,
  action: string,
  details: Record<string, unknown>,
) {
  try {
    await admin.from('activity_logs').insert({
      user_id:    userId,
      user_email: userEmail,
      action,
      details: { ...details, executed_by: adminId },
    })
  } catch {
    // activity_logs pode não existir ainda — ignorar silenciosamente
  }
}
