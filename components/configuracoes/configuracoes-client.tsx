'use client'

import { useEffect, useState } from 'react'
import { User, CreditCard, Bell, ShieldCheck, Zap, Lock } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { AbaPerfil } from './aba-perfil'
import { AbaAssinatura } from './aba-assinatura'
import { AbaNotificacoes } from './aba-notificacoes'
import { AbaSeguranca } from './aba-seguranca'
import { AbaAsaas } from './aba-asaas'
import type { NotificacoesConfig } from '@/app/(dashboard)/configuracoes/types'
import { isPlanoPago } from '@/lib/stripe'

const ABAS = [
  { id: 'perfil',       label: 'Perfil',        icon: User },
  { id: 'assinatura',   label: 'Assinatura',    icon: CreditCard },
  { id: 'cobrancas',    label: 'Cobranças',     icon: Zap },
  { id: 'notificacoes', label: 'Notificações',  icon: Bell },
  { id: 'seguranca',    label: 'Segurança',     icon: ShieldCheck },
] as const

type AbaId = typeof ABAS[number]['id']

interface Props {
  profile: {
    nome: string
    email: string
    telefone: string | null
    plano: 'gratis' | 'pago' | 'elite'
    criado_em: string
    asaas_account_id: string | null
    asaas_account_status: string | null
    pix_key?: string | null
    pix_key_tipo?: string | null
    stripe_subscription_status?: string | null
    stripe_subscription_current_period_end?: string | null
    stripe_subscription_cancel_at_period_end?: boolean
  }
  avatarUrl: string | null
  qtdImoveis: number
  notificacoesConfig: NotificacoesConfig
}

export function ConfiguracoesClient({ profile, avatarUrl, qtdImoveis, notificacoesConfig }: Props) {
  const [abaAtiva, setAbaAtiva] = useState<AbaId>('perfil')

  useEffect(() => {
    function lerHash() {
      const hash = window.location.hash.replace('#', '') as AbaId
      if (ABAS.some(a => a.id === hash)) setAbaAtiva(hash)
    }
    lerHash()
    window.addEventListener('hashchange', lerHash)
    return () => window.removeEventListener('hashchange', lerHash)
  }, [])

  function trocarAba(id: AbaId) {
    setAbaAtiva(id)
    window.history.replaceState(null, '', `#${id}`)
  }

  return (
    <div className="space-y-7 max-w-[1400px] mx-auto">
      <div>
        <p className="text-sm text-slate-500 font-medium">Sua conta e preferências</p>
        <h1
          className="font-extrabold tracking-tight text-slate-900 mt-1 leading-[1.05]"
          style={{ letterSpacing: '-0.025em', fontSize: 'clamp(28px, 3vw, 40px)' }}
        >
          Configurações
        </h1>
      </div>

      <Tabs value={abaAtiva} onValueChange={v => trocarAba(v as AbaId)}>
        <TabsList className="bg-slate-100 border border-slate-200 rounded-lg p-1 h-auto w-full sm:w-auto overflow-x-auto flex-nowrap">
          {ABAS.map(({ id, label, icon: Icon }) => (
            <TabsTrigger
              key={id}
              value={id}
              className="text-slate-600 data-[selected]:text-slate-900 gap-1.5"
            >
              <Icon className="h-3.5 w-3.5" /> {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="perfil" className="mt-5 outline-none">
          <AbaPerfil profile={profile} avatarUrl={avatarUrl} qtdImoveis={qtdImoveis} />
        </TabsContent>

        <TabsContent value="assinatura" className="mt-5 outline-none">
          <AbaAssinatura
            plano={profile.plano}
            subscriptionStatus={profile.stripe_subscription_status ?? null}
            currentPeriodEnd={profile.stripe_subscription_current_period_end ?? null}
            cancelAtPeriodEnd={profile.stripe_subscription_cancel_at_period_end ?? false}
          />
        </TabsContent>

        <TabsContent value="cobrancas" className="mt-5 outline-none">
          {isPlanoPago(profile.plano) ? (
            <AbaAsaas
              asaasAccountId={profile.asaas_account_id}
              asaasAccountStatus={profile.asaas_account_status}
              profileNome={profile.nome}
              profileEmail={profile.email}
              profileTelefone={profile.telefone}
            />
          ) : (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 flex flex-col items-center gap-4 text-center shadow-sm">
              <div className="p-3 rounded-full bg-amber-100">
                <Lock className="h-7 w-7 text-amber-500" />
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-slate-800">Cobrança automática via Asaas</p>
                <p className="text-sm text-slate-500 max-w-sm">
                  Gere cobranças de aluguel com PIX e boleto automáticos direto pelo app.
                  Disponível no <strong>plano Master</strong>.
                </p>
              </div>
              <a
                href="/planos"
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-5 py-2.5 transition-colors"
              >
                <Zap className="h-4 w-4" />
                Fazer upgrade para o Master
              </a>
            </div>
          )}
        </TabsContent>

        <TabsContent value="notificacoes" className="mt-5 outline-none">
          <AbaNotificacoes config={notificacoesConfig} />
        </TabsContent>

        <TabsContent value="seguranca" className="mt-5 outline-none">
          <AbaSeguranca email={profile.email} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
