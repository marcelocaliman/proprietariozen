import Link from 'next/link'
import { LifeBuoy, Clock, AlertCircle, CheckCircle2, ArrowRight, MessageSquare } from 'lucide-react'
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

  const totalAtivos = (countOpen ?? 0) + (countEmAndamento ?? 0)

  return (
    <div className="space-y-7 max-w-[1400px] mx-auto">
      {/* Hero */}
      <div className="grid gap-4 lg:grid-cols-7">
        <div
          className="lg:col-span-3 rounded-2xl p-7 relative overflow-hidden text-white flex flex-col justify-between min-h-[200px]"
          style={{
            background: 'linear-gradient(135deg, #022C22 0%, #064E3B 50%, #059669 100%)',
            boxShadow: '0 8px 32px rgba(5, 150, 105, 0.20)',
          }}
        >
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full pointer-events-none" style={{ background: 'rgba(110, 231, 183, 0.18)', filter: 'blur(80px)', transform: 'translate(40%, -40%)' }} />
          <div className="relative z-10">
            <p className="text-[11px] uppercase tracking-widest font-semibold text-emerald-200">Tickets ativos</p>
            <p
              className="font-extrabold leading-none mt-2 tabular-nums"
              style={{
                fontSize: 'clamp(48px, 5vw, 64px)',
                background: 'linear-gradient(135deg, #FFFFFF 0%, #6EE7B7 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                letterSpacing: '-0.025em',
              }}
            >
              {totalAtivos}
            </p>
          </div>
          <div className="relative z-10 mt-4">
            <p className="text-sm text-emerald-100/80">
              {(countOpen ?? 0) > 0
                ? `${countOpen} aguardando triagem`
                : 'Nada aguardando triagem'}
              {(countAguardando ?? 0) > 0 ? ` · ${countAguardando} aguardando usuário` : ''}
            </p>
          </div>
        </div>

        <div className="lg:col-span-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Aguardando triagem" value={countOpen ?? 0} icon={LifeBuoy} color="emerald" />
          <StatCard label="Em andamento"        value={countEmAndamento ?? 0} icon={Clock} color="blue" />
          <StatCard label="Aguardando usuário"  value={countAguardando ?? 0} icon={AlertCircle} color="amber" />
          <StatCard label="Resolvidos"          value={countResolvidos ?? 0} icon={CheckCircle2} color="slate" />
        </div>
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
              className="group block rounded-2xl border border-slate-100 bg-white px-5 py-4 hover:border-emerald-200 hover:shadow-md hover:-translate-y-0.5 transition-all"
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
                  <p className="text-sm font-semibold text-slate-900 truncate group-hover:text-emerald-700 transition-colors">{t.assunto}</p>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                    <span className="font-medium text-slate-600">{t.profiles?.nome ?? '—'}</span>
                    <span className="text-slate-300">·</span>
                    <span className="text-slate-400">{t.profiles?.email ?? '—'}</span>
                    <span className="text-slate-300">·</span>
                    <span className="inline-flex items-center gap-1 text-slate-400">
                      <MessageSquare className="h-3 w-3" />
                      {formatDataRelativa(t.atualizado_em)}
                    </span>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all mt-2 shrink-0" />
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
    emerald: 'text-emerald-600 bg-emerald-50',
    blue:    'text-blue-600 bg-blue-50',
    amber:   'text-amber-600 bg-amber-50',
    slate:   'text-slate-500 bg-slate-50',
  }
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm flex flex-col justify-between min-h-[110px]">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 leading-tight">{label}</p>
        <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${colors[color]}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
      </div>
      <p
        className="font-extrabold text-slate-900 leading-none mt-2 tabular-nums"
        style={{ fontSize: 'clamp(22px, 2vw, 28px)', letterSpacing: '-0.02em' }}
      >
        {value}
      </p>
    </div>
  )
}
