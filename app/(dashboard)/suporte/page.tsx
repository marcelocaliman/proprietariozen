import { redirect } from 'next/navigation'
import Link from 'next/link'
import { LifeBuoy, Plus, MessageSquare, ArrowRight } from 'lucide-react'
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
  const aguardandoResposta = abertos.filter(t => t.status === 'aguardando_usuario').length

  return (
    <div className="space-y-7 max-w-[1400px] mx-auto">
      {/* Hero */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div
          className="lg:col-span-2 rounded-2xl p-7 sm:p-8 relative overflow-hidden text-white flex flex-col justify-between min-h-[180px]"
          style={{
            background: 'linear-gradient(135deg, #022C22 0%, #064E3B 50%, #059669 100%)',
            boxShadow: '0 8px 32px rgba(5, 150, 105, 0.20)',
          }}
        >
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full pointer-events-none" style={{ background: 'rgba(110, 231, 183, 0.18)', filter: 'blur(80px)', transform: 'translate(40%, -40%)' }} />
          <div className="relative z-10">
            <p className="text-[11px] uppercase tracking-widest font-semibold text-emerald-200">Precisa de ajuda?</p>
            <h1
              className="font-extrabold mt-2 leading-[1.05]"
              style={{
                fontSize: 'clamp(28px, 3vw, 38px)',
                background: 'linear-gradient(135deg, #FFFFFF 0%, #6EE7B7 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                letterSpacing: '-0.025em',
              }}
            >
              Suporte
            </h1>
            <p className="text-sm text-emerald-100/80 mt-2 max-w-md">
              Abra um ticket e nosso time responde por aqui e por e-mail em até 24h úteis.
            </p>
          </div>
          <div className="relative z-10 mt-5">
            <Link
              href="/suporte/novo"
              className="inline-flex items-center gap-2 rounded-md bg-white text-emerald-700 hover:bg-emerald-50 px-5 py-2.5 text-sm font-bold transition-colors shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Novo ticket
            </Link>
          </div>
        </div>

        {/* Stats secundários */}
        <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
          <StatTile
            label="Em andamento"
            value={abertos.length}
            sub={aguardandoResposta > 0 ? `${aguardandoResposta} aguardando você` : 'todos sem pendência'}
            color="emerald"
          />
          <StatTile
            label="Encerrados"
            value={fechados.length}
            sub="resolvidos e fechados"
            color="slate"
          />
        </div>
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

function StatTile({ label, value, sub, color }: {
  label: string; value: number; sub: string;
  color: 'emerald' | 'slate'
}) {
  const colors = {
    emerald: 'border-emerald-100',
    slate:   'border-slate-100',
  }
  return (
    <div className={`rounded-2xl border ${colors[color]} bg-white p-5 shadow-sm flex flex-col justify-between`}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
      <div className="mt-2">
        <p
          className="font-extrabold text-slate-900 leading-none tabular-nums"
          style={{ fontSize: 'clamp(28px, 3vw, 36px)', letterSpacing: '-0.02em' }}
        >
          {value}
        </p>
        <p className="text-[11px] text-slate-500 mt-1">{sub}</p>
      </div>
    </div>
  )
}

function Section({ title, tickets, muted = false }: { title: string; tickets: TicketRow[]; muted?: boolean }) {
  return (
    <section>
      <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-3 px-1">
        {title} <span className="text-slate-400 ml-1">· {tickets.length}</span>
      </h2>
      <div className="space-y-2">
        {tickets.map(t => (
          <Link
            key={t.id}
            href={`/suporte/${t.id}`}
            className={`group block rounded-2xl border bg-white px-5 py-4 hover:shadow-md hover:-translate-y-0.5 transition-all ${
              muted ? 'border-slate-100 opacity-90' : 'border-slate-100 hover:border-emerald-200'
            }`}
          >
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <TicketStatusBadge status={t.status} />
                  <TicketPrioridadeBadge prioridade={t.prioridade} />
                  <span className="text-[11px] text-slate-400">
                    <TicketCategoriaLabel categoria={t.categoria} />
                  </span>
                </div>
                <p className="text-sm font-semibold text-slate-900 truncate group-hover:text-emerald-700 transition-colors">
                  {t.assunto}
                </p>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                  <MessageSquare className="h-3 w-3" />
                  <span>Última atualização {formatDataRelativa(t.atualizado_em)}</span>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all mt-2 shrink-0" />
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
