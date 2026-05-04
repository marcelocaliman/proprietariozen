'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Search, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { STATUS_LABELS, PRIORIDADE_LABELS, type TicketStatus, type TicketPrioridade } from '@/lib/suporte'

const STATUS: TicketStatus[]         = ['open', 'em_andamento', 'aguardando_usuario', 'resolvido', 'fechado']
const PRIORIDADES: TicketPrioridade[] = ['urgente', 'alta', 'normal', 'baixa']

export function AdminSuporteFiltros({
  status, prioridade, q,
}: {
  status: TicketStatus | null
  prioridade: TicketPrioridade | null
  q: string
}) {
  const router = useRouter()
  const sp = useSearchParams()
  const [search, setSearch] = useState(q)

  // debounce de busca
  useEffect(() => {
    const id = setTimeout(() => {
      const params = new URLSearchParams(sp.toString())
      if (search.trim()) params.set('q', search.trim())
      else params.delete('q')
      router.replace(`/admin/suporte?${params.toString()}`)
    }, 400)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  function setParam(key: 'status' | 'prioridade', value: string | null) {
    const params = new URLSearchParams(sp.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    router.replace(`/admin/suporte?${params.toString()}`)
  }

  const hasFilters = status || prioridade || q

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-48">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
        <Input
          placeholder="Buscar no assunto…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 h-9 text-sm"
        />
      </div>

      <select
        value={status ?? ''}
        onChange={e => setParam('status', e.target.value || null)}
        className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 cursor-pointer"
      >
        <option value="">Todos os status</option>
        {STATUS.map(s => (
          <option key={s} value={s}>{STATUS_LABELS[s]}</option>
        ))}
      </select>

      <select
        value={prioridade ?? ''}
        onChange={e => setParam('prioridade', e.target.value || null)}
        className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 cursor-pointer"
      >
        <option value="">Todas as prioridades</option>
        {PRIORIDADES.map(p => (
          <option key={p} value={p}>{PRIORIDADE_LABELS[p]}</option>
        ))}
      </select>

      {hasFilters && (
        <button
          onClick={() => router.replace('/admin/suporte')}
          className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700 px-2 h-9"
        >
          <X className="h-3.5 w-3.5" />
          Limpar
        </button>
      )}
    </div>
  )
}
