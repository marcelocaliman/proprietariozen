import { createServerSupabaseClient } from '@/lib/supabase-server'
import { BloqueioPlano } from '@/components/ui/bloqueio-plano'
import { RelatorioIRClient } from '@/components/relatorio-ir/relatorio-ir-client'
import type { PlanoTipo } from '@/lib/stripe'

export const metadata = { title: 'Relatório IR — ProprietárioZen' }

export default async function RelatorioIRPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('plano, role')
    .eq('id', user.id)
    .single()

  const plano = (profile?.role === 'admin' ? 'elite' : profile?.plano ?? 'gratis') as PlanoTipo

  if (plano !== 'elite') {
    return (
      <BloqueioPlano
        titulo="Relatório de Imposto de Renda"
        descricao="Veja o resumo anual dos seus rendimentos de aluguel com cálculo automático do IRPF 2025 e exportação em PDF. Disponível no plano Elite."
        planoCta="Elite"
      />
    )
  }

  return <RelatorioIRClient anoAtual={new Date().getFullYear()} />
}
