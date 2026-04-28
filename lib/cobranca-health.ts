import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'

export type CobrancaIssue =
  | { tipo: 'plano_insuficiente'; cta: { label: string; href: string } }
  | { tipo: 'asaas_nao_vinculado'; cta: { label: string; href: string } }
  | { tipo: 'sem_chave_pix'; cta: { label: string; href: string } }
  | { tipo: 'inquilino_sem_cpf'; imovelId: string; imovelApelido: string; inquilinoNome: string; cta: { label: string; href: string } }
  | { tipo: 'inquilino_sem_email'; imovelId: string; imovelApelido: string; inquilinoNome: string; cta: { label: string; href: string } }

type ImovelComInquilino = {
  id: string
  apelido: string
  billing_mode: 'MANUAL' | 'AUTOMATIC' | null
  inquilinos: { nome: string; cpf: string | null; email: string | null; ativo: boolean }[]
}

/**
 * Detecta pendências do gestor para cobrança funcionar sem fricção.
 * Retorna lista vazia quando tudo está saudável.
 */
export async function detectarPendenciasCobranca(
  admin: SupabaseClient,
  userId: string,
  pixKey: string | null,
): Promise<CobrancaIssue[]> {
  const issues: CobrancaIssue[] = []

  // Carrega perfil + imóveis em paralelo
  const [profileRes, imoveisRes] = await Promise.all([
    admin
      .from('profiles')
      .select('asaas_api_key_enc, plano, role')
      .eq('id', userId)
      .single(),
    admin
      .from('imoveis')
      .select('id, apelido, billing_mode, inquilinos(nome, cpf, email, ativo)')
      .eq('user_id', userId)
      .eq('ativo', true),
  ])

  const profile = profileRes.data as { asaas_api_key_enc: string | null; plano: 'gratis' | 'pago' | 'elite' | null; role: 'user' | 'admin' | null } | null
  const imoveis = (imoveisRes.data ?? []) as unknown as ImovelComInquilino[]

  if (!imoveis.length) return []

  const automaticImoveis = imoveis.filter(i => i.billing_mode === 'AUTOMATIC')
  const manualImoveis = imoveis.filter(i => i.billing_mode !== 'AUTOMATIC')

  // ── Issues globais para imóveis AUTOMATIC ──
  if (automaticImoveis.length) {
    const isPaid = profile?.role === 'admin' || profile?.plano === 'pago' || profile?.plano === 'elite'
    if (!isPaid) {
      issues.push({
        tipo: 'plano_insuficiente',
        cta: { label: 'Ver planos', href: '/planos' },
      })
    } else if (!profile?.asaas_api_key_enc) {
      issues.push({
        tipo: 'asaas_nao_vinculado',
        cta: { label: 'Vincular conta Asaas', href: '/configuracoes#asaas' },
      })
    }
  }

  // ── Issue global para imóveis MANUAL sem PIX ──
  if (manualImoveis.length && !pixKey) {
    issues.push({
      tipo: 'sem_chave_pix',
      cta: { label: 'Configurar chave PIX', href: '/configuracoes#perfil' },
    })
  }

  // ── Issues por imóvel — AUTOMATIC sem CPF do inquilino ──
  for (const imovel of automaticImoveis) {
    const inquilinoAtivo = imovel.inquilinos?.find(i => i.ativo)
    if (inquilinoAtivo && !inquilinoAtivo.cpf) {
      issues.push({
        tipo: 'inquilino_sem_cpf',
        imovelId: imovel.id,
        imovelApelido: imovel.apelido,
        inquilinoNome: inquilinoAtivo.nome,
        cta: { label: 'Editar inquilino', href: '/inquilinos' },
      })
    }
  }

  // ── Issues por imóvel — sem email do inquilino (qualquer modo) ──
  for (const imovel of imoveis) {
    const inquilinoAtivo = imovel.inquilinos?.find(i => i.ativo)
    if (inquilinoAtivo && !inquilinoAtivo.email) {
      issues.push({
        tipo: 'inquilino_sem_email',
        imovelId: imovel.id,
        imovelApelido: imovel.apelido,
        inquilinoNome: inquilinoAtivo.nome,
        cta: { label: 'Editar inquilino', href: '/inquilinos' },
      })
    }
  }

  return issues
}
