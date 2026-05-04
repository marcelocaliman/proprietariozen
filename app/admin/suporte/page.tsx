import Link from 'next/link'
import { LifeBuoy, Clock, AlertCircle, CheckCircle2 } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase-server'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TicketStatusBadge, TicketPrioridadeBadge, TicketCategoriaLabel } from '@/components/suporte/ticket-badges'
import { formatDataRelativa } from '@/components/suporte/format'
import { AdminSuporteFiltros } from '@/components/admin/suporte-filtros'
import type { TicketStatus, TicketPrioridade, TicketCategoria } from '@/lib/suporte'

export const metadata = { title: 'Suporte Admin — ProprietárioZen' }

type TicketRow = {
  id: string
  user_id: string
  assunto: string
  status: TicketStatus
  prioridade: TicketPrioridade
  categoria: TicketCategoria
  assigned_to: string | null
  criado_em: string
  atualizado_em: string
  profiles: { nome: string | null; email: string | null } | null
}

const STATUS_FILTRO_VALIDOS: TicketStatus[] = ['open', 'em_andamento', 'aguardando_usuario', 'resolvido', 'fechado']
const PRIORIDADE_FILTRO_VALIDAS: TicketPrioridade[] = ['baixa', 'normal', 'alta', 'urgente']

export default async function AdminSuportePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; prioridade?: string; q?: string }>
}) {
  const sp = await searchParams
  const status     = STATUS_FILTRO_VALIDOS.includes(sp.status as TicketStatus) ? (sp.status as TicketStatus) : undefined
  const prioridade = PRIORIDADE_FILTRO_VALIDAS.includes(sp.prioridade as TicketPrioridade) ? (sp.prioridade as TicketPrioridade) : undefined
  const q = (sp.q ?? '').trim()

  const admin = createAdminClient()

  let query = admin
    .from('tickets')
    .select('id, user_id, assunto, status, prioridade, categoria, assigned_to, criado_em, atualizado_em, profiles!tickets_user_id_fkey(nome, email)')
    .order('atualizado_em', { ascending: false })
    .limit(100)

  if (status)     query = query.eq('status', status)
  if (prioridade) query = query.eq('prioridade', prioridade)
  if (q)          query = query.ilike('assunto', `%${q}%`)

  const { data: tickets } = await query as unknown as { data: TicketRow[] | null }

  // Stats: contagens
  const [
    { count: countOpen },
    { count: countEmAndamento },
    { count: countAguardando },
    { count: countResolvidos },
  ] = await Promise.all([
    admin.from('tickets').select('id', { count: 'exact', head: true }).eq('status', 'open'),
    admin.from('tickets').select('id', { count: 'exact', head: true }).eq('status', 'em_andamento'),
    admin.from('tickets').select('id', { count: 'exact', head: true }).eq('status', 'aguardando_usuario'),
    admin.from('tickets').select('id', { count: 'exact', head: true }).eq('status', 'resolvido'),
  ])

  return (
    <div className="space-y-7 max-w-[1400px] mx-auto">
      <div>
        <p className="text-sm text-slate-500 font-medium">Painel administrativo</p>
        <h1
          className="font-extrabold tracking-tight text-slate-900 mt-1 leading-[1.05]"
          style={{ letterSpacing: '-0.025em', fontSize: 'clamp(28px, 3vw, 40px)' }}
        >
          Tickets de suporte
        </h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Aguardando triagem" value={countOpen ?? 0} icon={LifeBuoy} color="emerald" />
        <StatCard label="Em andamento"        value={countEmAndamento ?? 0} icon={Clock} color="blue" />
        <StatCard label="Aguardando usuário"  value={countAguardando ?? 0} icon={AlertCircle} color="amber" />
        <StatCard label="Resolvidos"          value={countResolvidos ?? 0} icon={CheckCircle2} color="slate" />
      </div>

      {/* Filtros */}
      <AdminSuporteFiltros
        status={status ?? null}
        prioridade={prioridade ?? null}
        q={q}
      />

      {/* Lista */}
      {(!tickets || tickets.length === 0) ? (
        <Card className="rounded-2xl border-slate-100">
          <CardContent className="py-16 text-center">
            <LifeBuoy className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">
              {status || prioridade || q ? 'Nenhum ticket com esses filtros.' : 'Nenhum ticket aberto ainda.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {tickets.map(t => (
            <Link
              key={t.id}
              href={`/admin/suporte/${t.id}`}
              className="block rounded-2xl border border-slate-100 bg-white px-5 py-4 hover:border-emerald-200 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <TicketStatusBadge status={t.status} />
                    <TicketPrioridadeBadge prioridade={t.prioridade} />
                    <span className="text-[11px] text-slate-400">
                      <TicketCategoriaLabel categoria={t.categoria} />
                    </span>
                    {t.assigned_to && (
                      <Badge className="text-[10px] bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Atribuído</Badge>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-slate-900 truncate">{t.assunto}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    <span className="font-medium">{t.profiles?.nome ?? '—'}</span>
                    <span className="text-slate-400"> · {t.profiles?.email ?? '—'}</span>
                  </p>
                </div>
                <p className="text-[11px] text-slate-400 whitespace-nowrap">
                  {formatDataRelativa(t.atualizado_em)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, icon: Icon, color }: {
  label: string; value: number; icon: React.ComponentType<{ className?: string }>;
  color: 'emerald' | 'blue' | 'amber' | 'slate'
}) {
  const colors = {
    emerald: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    blue:    'text-blue-600 bg-blue-50 border-blue-100',
    amber:   'text-amber-600 bg-amber-50 border-amber-100',
    slate:   'text-slate-600 bg-slate-50 border-slate-100',
  }
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 flex items-center gap-3">
      <div className={`shrink-0 h-10 w-10 rounded-xl border flex items-center justify-center ${colors[color]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-extrabold text-slate-900 mt-0.5 tabular-nums">{value}</p>
      </div>
    </div>
  )
}
