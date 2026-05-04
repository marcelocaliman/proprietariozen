import { redirect } from 'next/navigation'
import Link from 'next/link'
import { LifeBuoy, Plus, MessageSquare } from 'lucide-react'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { EmptyState } from '@/components/ui/empty-state'
import { TicketStatusBadge, TicketPrioridadeBadge, TicketCategoriaLabel } from '@/components/suporte/ticket-badges'
import { formatDataRelativa } from '@/components/suporte/format'
import type { TicketStatus, TicketPrioridade, TicketCategoria } from '@/lib/suporte'

export const metadata = { title: 'Suporte — ProprietárioZen' }

type TicketRow = {
  id: string
  assunto: string
  status: TicketStatus
  prioridade: TicketPrioridade
  categoria: TicketCategoria
  criado_em: string
  atualizado_em: string
}

export default async function SuportePage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: tickets } = await supabase
    .from('tickets')
    .select('id, assunto, status, prioridade, categoria, criado_em, atualizado_em')
    .eq('user_id', user.id)
    .order('atualizado_em', { ascending: false })
    .limit(50) as unknown as { data: TicketRow[] | null }

  const list = tickets ?? []
  const abertos = list.filter(t => t.status !== 'fechado' && t.status !== 'resolvido')
  const fechados = list.filter(t => t.status === 'fechado' || t.status === 'resolvido')

  return (
    <div className="space-y-7 max-w-[1400px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500 font-medium">Precisa de ajuda?</p>
          <h1
            className="font-extrabold tracking-tight text-slate-900 mt-1 leading-[1.05]"
            style={{ letterSpacing: '-0.025em', fontSize: 'clamp(28px, 3vw, 40px)' }}
          >
            Suporte
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Abra um ticket e nossa equipe responde por aqui e por e-mail.
          </p>
        </div>
        <Link
          href="/suporte/novo"
          className="inline-flex items-center gap-2 self-start sm:self-auto rounded-md bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 text-sm font-semibold transition-colors"
        >
          <Plus className="h-4 w-4" />
          Novo ticket
        </Link>
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={LifeBuoy}
          title="Nenhum ticket aberto ainda"
          description="Tem alguma dúvida, encontrou um bug ou quer sugerir algo? Abra um ticket — nosso time responde dentro de 24h úteis."
          primaryCta={{
            label: 'Abrir primeiro ticket',
            href: '/suporte/novo',
            icon: Plus,
          }}
          steps={[
            { title: 'Descreva', desc: 'Conta o que está acontecendo. Quanto mais detalhe, mais rápido resolvemos.' },
            { title: 'Acompanhe', desc: 'Você recebe e-mail quando responderem. Pode também acompanhar por aqui.' },
            { title: 'Resolva', desc: 'Quando estiver tudo certo, marca como resolvido — ou continua a conversa.' },
          ]}
        />
      ) : (
        <div className="space-y-7">
          {abertos.length > 0 && (
            <Section title="Em andamento" tickets={abertos} />
          )}
          {fechados.length > 0 && (
            <Section title="Encerrados" tickets={fechados} muted />
          )}
        </div>
      )}
    </div>
  )
}

function Section({ title, tickets, muted = false }: { title: string; tickets: TicketRow[]; muted?: boolean }) {
  return (
    <section>
      <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">
        {title} <span className="text-slate-400">· {tickets.length}</span>
      </h2>
      <div className="space-y-2">
        {tickets.map(t => (
          <Link
            key={t.id}
            href={`/suporte/${t.id}`}
            className={`block rounded-2xl border bg-white px-5 py-4 hover:shadow-sm transition-all ${
              muted ? 'border-slate-100 opacity-80' : 'border-slate-100 hover:border-emerald-200'
            }`}
          >
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <TicketStatusBadge status={t.status} />
                  <TicketPrioridadeBadge prioridade={t.prioridade} />
                  <span className="text-[11px] text-slate-400">
                    <TicketCategoriaLabel categoria={t.categoria} />
                  </span>
                </div>
                <p className="text-sm font-semibold text-slate-900 truncate">{t.assunto}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Criado {formatDataRelativa(t.criado_em)} · Última atualização {formatDataRelativa(t.atualizado_em)}
                </p>
              </div>
              <MessageSquare className="h-4 w-4 text-slate-300 mt-1 shrink-0" />
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
