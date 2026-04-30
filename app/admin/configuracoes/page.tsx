import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { ConfiguracoesAdminClient } from '@/components/admin/configuracoes-client'
import { getSystemSettings } from '@/lib/system-settings'
import { LIMITES_PLANO } from '@/lib/stripe'

export const metadata = { title: 'Configurações Admin — ProprietárioZen' }

export default async function ConfiguracoesAdminPage() {
  const supabase = await createServerSupabaseClient()
  const admin = createAdminClient()

  const hoje = new Date()
  const ontem = new Date(); ontem.setDate(hoje.getDate() - 1)
  const ha30Dias = new Date(); ha30Dias.setDate(hoje.getDate() - 30)
  const ha7Dias = new Date(); ha7Dias.setDate(hoje.getDate() - 7)

  const [
    { count: totalUsuarios },
    { count: usuariosNovos30d },
    { count: totalImoveis },
    { count: imoveisAutomatic },
    { count: totalInquilinos },
    { count: totalAlugueis },
    { count: alugueisPagos },
    { data: profilesPlano },
    { count: bannidos },
    { count: comAsaas },
    { data: ultimaAtividadeAsaas },
    { data: ultimaAtividadeStripe },
    { count: logsHoje },
    { count: documentosImovel },
    { count: documentosAluguel },
    { count: documentosInquilino },
    { count: tokensAtivos },
  ] = await Promise.all([
    admin.from('profiles').select('id', { count: 'exact', head: true }),
    admin.from('profiles').select('id', { count: 'exact', head: true }).gte('criado_em', ha30Dias.toISOString()),
    admin.from('imoveis').select('id', { count: 'exact', head: true }).eq('ativo', true),
    admin.from('imoveis').select('id', { count: 'exact', head: true }).eq('ativo', true).eq('billing_mode', 'AUTOMATIC'),
    admin.from('inquilinos').select('id', { count: 'exact', head: true }).eq('ativo', true),
    admin.from('alugueis').select('id', { count: 'exact', head: true }),
    admin.from('alugueis').select('id', { count: 'exact', head: true }).eq('status', 'pago'),
    admin.from('profiles').select('plano, stripe_customer_id, plano_override_motivo, stripe_subscription_status'),
    admin.from('profiles').select('id', { count: 'exact', head: true }).not('banned_at', 'is', null),
    admin.from('profiles').select('id', { count: 'exact', head: true }).not('asaas_api_key_enc', 'is', null),
    admin.from('alugueis').select('asaas_charge_id, criado_em').not('asaas_charge_id', 'is', null).order('criado_em', { ascending: false }).limit(1),
    admin.from('profiles').select('stripe_customer_id, criado_em').not('stripe_customer_id', 'is', null).order('criado_em', { ascending: false }).limit(1) as unknown as Promise<{ data: { stripe_customer_id: string | null; criado_em: string }[] | null }>,
    admin.from('activity_logs').select('id', { count: 'exact', head: true }).gte('created_at', new Date(hoje.getTime() - 24 * 60 * 60 * 1000).toISOString()),
    admin.from('documentos_imovel').select('id', { count: 'exact', head: true }),
    admin.from('documentos_aluguel').select('id', { count: 'exact', head: true }),
    admin.from('documentos_inquilino').select('id', { count: 'exact', head: true }),
    admin.from('inquilino_tokens').select('id', { count: 'exact', head: true }).eq('ativo', true),
  ])

  // Receita estimada: somar valor_aluguel dos imóveis ativos
  const { data: imoveisRevenue } = await admin
    .from('imoveis')
    .select('valor_aluguel, iptu_mensal, condominio_mensal, outros_encargos')
    .eq('ativo', true)
  const receitaTotal = (imoveisRevenue ?? []).reduce(
    (s, i) => s + (i.valor_aluguel ?? 0) + (i.iptu_mensal ?? 0) + (i.condominio_mensal ?? 0) + (i.outros_encargos ?? 0),
    0,
  )

  // Activity logs recentes
  const { data: logsRecentes } = await admin
    .from('activity_logs')
    .select('id, action, entity_type, entity_id, details, created_at, user_id')
    .order('created_at', { ascending: false })
    .limit(10)

  // Logs do cron específicos
  const { data: cronGerarLogs } = await admin
    .from('activity_logs')
    .select('action, details, created_at')
    .eq('action', 'ADMIN_CRON_TRIGGERED')
    .eq('entity_id', 'gerar-alugueis')
    .order('created_at', { ascending: false })
    .limit(3)

  const { data: cronAlertasLogs } = await admin
    .from('activity_logs')
    .select('action, details, created_at')
    .eq('action', 'ADMIN_CRON_TRIGGERED')
    .eq('entity_id', 'alertas')
    .order('created_at', { ascending: false })
    .limit(3)

  // Por plano (todos os usuários, inclusive overrides)
  const planoBuckets = { gratis: 0, pago: 0, elite: 0 }
  // MRR real: só conta assinaturas Stripe com status active|trialing E sem
  // override manual. Override é cortesia do admin, não gera receita Stripe.
  const mrrBuckets = { pago: 0, elite: 0 }
  type ProfileRow = {
    plano: string | null
    stripe_customer_id: string | null
    plano_override_motivo: string | null
    stripe_subscription_status: string | null
  }
  for (const p of (profilesPlano ?? []) as ProfileRow[]) {
    const k = (p.plano ?? 'gratis') as keyof typeof planoBuckets
    if (k in planoBuckets) planoBuckets[k]++
    const subAtiva = p.stripe_subscription_status === 'active' || p.stripe_subscription_status === 'trialing'
    if ((k === 'pago' || k === 'elite') && subAtiva && !p.plano_override_motivo) {
      mrrBuckets[k]++
    }
  }

  const mrr = mrrBuckets.pago * (LIMITES_PLANO.pago.preco / 100)
            + mrrBuckets.elite * (LIMITES_PLANO.elite.preco / 100)
  const mrrAssinaturasAtivas = mrrBuckets.pago + mrrBuckets.elite

  // Settings
  const settings = await getSystemSettings(admin)

  // Email overrides
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: emailOverridesRaw } = await (admin.from('email_template_overrides') as any).select('*')
  const emailOverrides = (emailOverridesRaw ?? []) as {
    slug: string
    enabled: boolean
    subject_override: string | null
    html_override: string | null
    updated_at: string | null
    updated_by: string | null
  }[]

  // Env check (só verifica se setadas, nunca expõe valor)
  const envStatus = {
    asaas_api_key_root: !!process.env.ASAAS_API_KEY_ROOT,
    asaas_encryption_key: !!process.env.ASAAS_ENCRYPTION_KEY,
    asaas_webhook_token: !!process.env.ASAAS_WEBHOOK_TOKEN,
    asaas_base_url: process.env.ASAAS_BASE_URL ?? null,
    stripe_secret: !!process.env.STRIPE_SECRET_KEY,
    stripe_publishable: !!process.env.STRIPE_PUBLISHABLE_KEY,
    stripe_webhook_secret: !!process.env.STRIPE_WEBHOOK_SECRET,
    stripe_price_master: !!process.env.STRIPE_PRICE_ID,
    stripe_price_elite: !!process.env.STRIPE_ELITE_PRICE_ID,
    resend_api_key: !!process.env.RESEND_API_KEY,
    supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabase_anon_key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    supabase_service_role: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    cron_secret: !!process.env.CRON_SECRET,
    next_public_app_url: process.env.NEXT_PUBLIC_APP_URL ?? null,
  }

  // Last user
  void supabase

  return (
    <ConfiguracoesAdminClient
      stats={{
        usuarios: { total: totalUsuarios ?? 0, novos30d: usuariosNovos30d ?? 0, banidos: bannidos ?? 0, comAsaas: comAsaas ?? 0 },
        imoveis: { total: totalImoveis ?? 0, automatic: imoveisAutomatic ?? 0, receitaTotal },
        inquilinos: { total: totalInquilinos ?? 0 },
        alugueis: { total: totalAlugueis ?? 0, pagos: alugueisPagos ?? 0 },
        planos: planoBuckets,
        mrr,
        mrrAssinaturasAtivas,
        documentos: {
          imovel: documentosImovel ?? 0,
          aluguel: documentosAluguel ?? 0,
          inquilino: documentosInquilino ?? 0,
        },
        tokensAtivos: tokensAtivos ?? 0,
        logsHoje: logsHoje ?? 0,
      }}
      settings={settings}
      envStatus={envStatus}
      logsRecentes={(logsRecentes ?? []) as { id: string; action: string; entity_type: string | null; entity_id: string | null; details: Record<string, unknown> | null; created_at: string; user_id: string | null }[]}
      cronGerarLogs={(cronGerarLogs ?? []) as { action: string; details: Record<string, unknown> | null; created_at: string }[]}
      cronAlertasLogs={(cronAlertasLogs ?? []) as { action: string; details: Record<string, unknown> | null; created_at: string }[]}
      ultimaAtividadeAsaas={(ultimaAtividadeAsaas ?? [])[0]?.criado_em ?? null}
      ultimaAtividadeStripe={(ultimaAtividadeStripe ?? [])[0]?.criado_em ?? null}
      emailOverrides={emailOverrides}
    />
  )
}
