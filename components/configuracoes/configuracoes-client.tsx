'use client'

import { useEffect, useState } from 'react'
import { User, CreditCard, Bell, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AbaPerfil } from './aba-perfil'
import { AbaAssinatura } from './aba-assinatura'
import { AbaNotificacoes } from './aba-notificacoes'
import { AbaSeguranca } from './aba-seguranca'
import type { NotificacoesConfig } from '@/app/(dashboard)/configuracoes/types'

const ABAS = [
  { id: 'perfil',        label: 'Perfil',        icon: User },
  { id: 'assinatura',    label: 'Assinatura',     icon: CreditCard },
  { id: 'notificacoes',  label: 'Notificações',   icon: Bell },
  { id: 'seguranca',     label: 'Segurança',      icon: ShieldCheck },
] as const

type AbaId = typeof ABAS[number]['id']

interface Props {
  profile: {
    nome: string
    email: string
    telefone: string | null
    plano: 'gratis' | 'pago'
    criado_em: string
  }
  avatarUrl: string | null
  qtdImoveis: number
  notificacoesConfig: NotificacoesConfig
}

export function ConfiguracoesClient({ profile, avatarUrl, qtdImoveis, notificacoesConfig }: Props) {
  const [abaAtiva, setAbaAtiva] = useState<AbaId>('perfil')

  // Lê o hash da URL ao montar e ao navegar
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
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Gerencie sua conta e preferências</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* ── Navegação lateral (desktop) / horizontal (mobile) ── */}
        <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible lg:w-52 shrink-0 pb-1 lg:pb-0">
          {ABAS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => trocarAba(id)}
              className={cn(
                'flex items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2.5 text-sm font-medium transition-colors text-left',
                'hover:bg-muted hover:text-foreground',
                abaAtiva === id
                  ? 'bg-muted text-foreground shadow-sm'
                  : 'text-muted-foreground',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </button>
          ))}
        </nav>

        {/* ── Conteúdo da aba ── */}
        <div className="flex-1 min-w-0">
          {abaAtiva === 'perfil' && (
            <AbaPerfil
              profile={profile}
              avatarUrl={avatarUrl}
              qtdImoveis={qtdImoveis}
            />
          )}
          {abaAtiva === 'assinatura' && (
            <AbaAssinatura plano={profile.plano} />
          )}
          {abaAtiva === 'notificacoes' && (
            <AbaNotificacoes config={notificacoesConfig} />
          )}
          {abaAtiva === 'seguranca' && (
            <AbaSeguranca email={profile.email} />
          )}
        </div>
      </div>
    </div>
  )
}
