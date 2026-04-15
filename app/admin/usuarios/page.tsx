'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Search, Building2, Users, Download,
  ChevronLeft, ChevronRight, Ban, MoreHorizontal,
  ShieldOff, TrendingUp, KeyRound, RefreshCw, UserCheck,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { UserDrawer, type UserRow } from '@/components/admin/user-drawer'

// ── Helpers ───────────────────────────────────────────────────────────────────

const CORES_AVATAR = [
  'bg-emerald-100 text-emerald-700',
  'bg-blue-100 text-blue-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-violet-100 text-violet-700',
  'bg-cyan-100 text-cyan-700',
]
function corAvatar(nome: string) {
  let h = 0
  for (let i = 0; i < nome.length; i++) h = nome.charCodeAt(i) + ((h << 5) - h)
  return CORES_AVATAR[Math.abs(h) % CORES_AVATAR.length]
}
function initials(nome: string) {
  return nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}
function tempoRelativo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 2) return 'agora'
  if (m < 60) return `há ${m}min`
  const h = Math.floor(m / 60)
  if (h < 24) return `há ${h}h`
  const d = Math.floor(h / 24)
  if (d < 30) return `há ${d}d`
  return new Date(iso).toLocaleDateString('pt-BR', { dateStyle: 'short' })
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { dateStyle: 'short' })
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded bg-slate-100', className)} />
}

type Pagination = { page: number; page_size: number; total: number; total_pages: number }

// ── Filtros ───────────────────────────────────────────────────────────────────

const PLANO_OPS   = [{ v: '', l: 'Todos os planos' }, { v: 'gratis', l: 'Grátis' }, { v: 'pago', l: 'Master' }]
const STATUS_OPS  = [{ v: '', l: 'Todos os status' }, { v: 'ativos', l: 'Ativos' }, { v: 'banidos', l: 'Banidos' }]
const ORDENAR_OPS = [
  { v: 'mais_recentes',  l: 'Mais recentes' },
  { v: 'mais_antigos',   l: 'Mais antigos' },
  { v: 'ultimo_acesso',  l: 'Último acesso' },
  { v: 'mais_imoveis',   l: 'Mais imóveis' },
  { v: 'mais_alugueis',  l: 'Mais aluguéis' },
]

// ── Página ────────────────────────────────────────────────────────────────────

export default function AdminUsuariosPage() {
  const [users, setUsers]         = useState<UserRow[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading]     = useState(true)
  const [page, setPage]           = useState(1)

  // Filtros
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch]           = useState('')
  const [plano, setPlano]             = useState('')
  const [status, setStatus]           = useState('')
  const [ordenar, setOrdenar]         = useState('mais_recentes')

  // Drawer
  const [drawerUser, setDrawerUser]   = useState<UserRow | null>(null)
  const [drawerOpen, setDrawerOpen]   = useState(false)

  // Debounce de busca
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  function handleSearchChange(v: string) {
    setSearchInput(v)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setSearch(v)
      setPage(1)
    }, 400)
  }

  // Fetch
  const fetchUsers = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const qs = new URLSearchParams({
        page:    String(page),
        search,
        plano,
        status,
        ordenar,
      })
      const res = await fetch(`/api/admin/usuarios?${qs}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setUsers(json.data ?? [])
      setPagination(json.pagination ?? null)
    } catch {
      toast.error('Erro ao carregar usuários')
    } finally {
      setLoading(false)
    }
  }, [page, search, plano, status, ordenar])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  // Quando muda filtro, volta para página 1
  function setFilter<T>(setter: (v: T) => void) {
    return (v: T) => { setter(v); setPage(1) }
  }

  // ── Exportar CSV ────────────────────────────────────────────────────────
  async function exportarCSV() {
    try {
      const qs = new URLSearchParams({ page: '1', search, plano, status, ordenar })
      // Busca todas as páginas para o export
      let allData: UserRow[] = []
      let p = 1; let totalPages = 1
      do {
        qs.set('page', String(p))
        const res = await fetch(`/api/admin/usuarios?${qs}`)
        const json = await res.json()
        allData = allData.concat(json.data ?? [])
        totalPages = json.pagination?.total_pages ?? 1
        p++
      } while (p <= totalPages)

      const headers = ['Nome', 'E-mail', 'Plano', 'Imóveis', 'Inquilinos', 'Aluguéis Mês', 'Cadastro', 'Último Acesso', 'Status']
      const rows = allData.map(u => [
        u.nome,
        u.email,
        u.plano === 'pago' ? 'Master' : 'Grátis',
        u.total_imoveis,
        u.total_inquilinos,
        u.total_alugueis_mes,
        fmtDate(u.criado_em),
        tempoRelativo(u.atualizado_em),
        u.banned ? 'Banido' : 'Ativo',
      ])

      const csv = [headers, ...rows]
        .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
        .join('\n')

      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url; a.download = `usuarios-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('CSV exportado')
    } catch {
      toast.error('Erro ao exportar')
    }
  }

  // ── Ação rápida da tabela ────────────────────────────────────────────────
  async function acaoRapida(userId: string, acao: string) {
    try {
      const res = await fetch(`/api/admin/usuarios/${userId}/acao`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)

      if (acao === 'resetar_senha' && json.reset_link) {
        await navigator.clipboard.writeText(json.reset_link)
        toast.success('Link de recuperação copiado para a área de transferência')
      } else {
        const msgs: Record<string, string> = {
          mudar_plano: `Plano alterado para ${json.plano === 'pago' ? 'Master' : 'Grátis'}`,
          banir:       'Usuário banido',
          reativar:    'Usuário reativado',
        }
        toast.success(msgs[acao] ?? 'Ação executada')
        fetchUsers(true)
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao executar ação')
    }
  }

  function abrirDrawer(u: UserRow) { setDrawerUser(u); setDrawerOpen(true) }

  return (
    <div className="space-y-5 max-w-7xl mx-auto">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-[#0F172A]">Usuários</h1>
            <Badge className="bg-red-500 hover:bg-red-500 text-white text-[10px] font-bold px-2">ADMIN</Badge>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            {pagination != null
              ? `${pagination.total.toLocaleString('pt-BR')} usuário${pagination.total !== 1 ? 's' : ''} encontrado${pagination.total !== 1 ? 's' : ''}`
              : 'Carregando…'}
          </p>
        </div>
        <Button
          variant="outline" size="sm"
          onClick={exportarCSV}
          className="gap-1.5 self-start sm:self-auto"
        >
          <Download className="h-3.5 w-3.5" />
          Exportar CSV
        </Button>
      </div>

      {/* ── Filtros ─────────────────────────────────────────────────────────── */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Busca */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#94A3B8]" />
              <Input
                placeholder="Buscar por nome ou e-mail…"
                value={searchInput}
                onChange={e => handleSearchChange(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>

            {/* Filtros select */}
            {([
              { value: plano,   setter: setFilter(setPlano),   ops: PLANO_OPS   },
              { value: status,  setter: setFilter(setStatus),  ops: STATUS_OPS  },
              { value: ordenar, setter: setFilter(setOrdenar), ops: ORDENAR_OPS },
            ] as { value: string; setter: (v: string) => void; ops: { v: string; l: string }[] }[]).map((f, idx) => (
              <select
                key={idx}
                value={f.value}
                onChange={e => f.setter(e.target.value)}
                className="h-9 rounded-lg border border-[#E2E8F0] bg-white px-3 text-sm text-[#475569] focus:outline-none focus:ring-2 focus:ring-emerald-500/30 cursor-pointer"
              >
                {f.ops.map(op => (
                  <option key={op.v} value={op.v}>{op.l}</option>
                ))}
              </select>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Tabela ──────────────────────────────────────────────────────────── */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E2E8F0]">
                {['Usuário', 'Plano', 'Imóveis', 'Inquilinos', 'Aluguéis / mês', 'Último acesso', 'Cadastro', ''].map(col => (
                  <th key={col} className="text-left py-3 px-4 text-[#94A3B8] font-semibold text-[11px] uppercase tracking-wide whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {loading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      <td className="py-3 px-4"><div className="flex items-center gap-3"><Skeleton className="h-8 w-8 rounded-full" /><div className="space-y-1.5"><Skeleton className="h-3 w-28" /><Skeleton className="h-2.5 w-36" /></div></div></td>
                      {Array.from({ length: 6 }).map((__, j) => <td key={j} className="py-3 px-4"><Skeleton className="h-3 w-12" /></td>)}
                      <td className="py-3 px-4"><Skeleton className="h-6 w-6" /></td>
                    </tr>
                  ))
                : !users.length
                ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center text-sm text-[#94A3B8]">
                        Nenhum usuário encontrado com os filtros aplicados.
                      </td>
                    </tr>
                  )
                : users.map(u => (
                    <tr
                      key={u.id}
                      className={cn(
                        'hover:bg-slate-50 transition-colors cursor-pointer',
                        u.banned && 'bg-red-50/60 hover:bg-red-50',
                      )}
                      onClick={() => abrirDrawer(u)}
                    >
                      {/* Usuário */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {u.banned ? (
                            <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                              <ShieldOff className="h-3.5 w-3.5 text-red-500" />
                            </div>
                          ) : (
                            <Avatar className="h-8 w-8 shrink-0">
                              <AvatarFallback className={cn('text-xs font-bold', corAvatar(u.nome))}>
                                {initials(u.nome)}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <div className="min-w-0">
                            <p className="font-semibold text-[#0F172A] truncate leading-tight max-w-[180px]">{u.nome}</p>
                            <p className="text-xs text-[#94A3B8] truncate max-w-[180px]">{u.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Plano */}
                      <td className="py-3 px-4">
                        <Badge className={cn(
                          'text-[10px] font-semibold',
                          u.plano === 'pago'
                            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                            : 'bg-slate-100 text-[#64748B] hover:bg-slate-100',
                        )}>
                          {u.plano === 'pago' ? 'Master' : 'Grátis'}
                        </Badge>
                      </td>

                      {/* Imóveis */}
                      <td className="py-3 px-4">
                        <span className="flex items-center gap-1.5 text-[#475569]">
                          <Building2 className="h-3.5 w-3.5 text-[#CBD5E1] shrink-0" />
                          {u.total_imoveis}
                        </span>
                      </td>

                      {/* Inquilinos */}
                      <td className="py-3 px-4">
                        <span className="flex items-center gap-1.5 text-[#475569]">
                          <Users className="h-3.5 w-3.5 text-[#CBD5E1] shrink-0" />
                          {u.total_inquilinos}
                        </span>
                      </td>

                      {/* Aluguéis mês */}
                      <td className="py-3 px-4 text-[#475569]">
                        {u.total_alugueis_mes}
                      </td>

                      {/* Último acesso */}
                      <td className="py-3 px-4 text-[#94A3B8] whitespace-nowrap">
                        {tempoRelativo(u.atualizado_em)}
                      </td>

                      {/* Cadastro */}
                      <td className="py-3 px-4 text-[#94A3B8] whitespace-nowrap">
                        {fmtDate(u.criado_em)}
                      </td>

                      {/* Ações */}
                      <td className="py-3 px-4" onClick={e => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger className="h-7 w-7 flex items-center justify-center rounded hover:bg-slate-100 transition-colors text-[#64748B]">
                            <MoreHorizontal className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => abrirDrawer(u)}>
                              <UserCheck className="h-4 w-4 mr-2" />
                              Ver detalhes
                            </DropdownMenuItem>
                            {u.role !== 'admin' && (
                              <DropdownMenuItem onClick={() => acaoRapida(u.id, 'mudar_plano')}>
                                <TrendingUp className="h-4 w-4 mr-2" />
                                {u.plano === 'pago' ? 'Mover p/ Grátis' : 'Mover p/ Master'}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => acaoRapida(u.id, 'resetar_senha')}>
                              <KeyRound className="h-4 w-4 mr-2" />
                              Resetar senha
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {u.banned ? (
                              <DropdownMenuItem
                                onClick={() => acaoRapida(u.id, 'reativar')}
                                className="text-emerald-600 focus:text-emerald-600"
                              >
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Reativar conta
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                disabled={u.role === 'admin'}
                                onClick={() => {
                                  if (u.role === 'admin') return
                                  acaoRapida(u.id, 'banir')
                                }}
                                className="text-red-600 focus:text-red-600"
                              >
                                <Ban className="h-4 w-4 mr-2" />
                                Banir usuário
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>

        {/* ── Paginação ──────────────────────────────────────────────────────── */}
        {pagination && pagination.total_pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#E2E8F0]">
            <p className="text-xs text-[#94A3B8]">
              {((page - 1) * pagination.page_size) + 1}–{Math.min(page * pagination.page_size, pagination.total)} de {pagination.total}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline" size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
                className="h-7 w-7 p-0"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>

              {/* Números de página */}
              {Array.from({ length: pagination.total_pages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === pagination.total_pages || Math.abs(p - page) <= 1)
                .reduce<(number | '…')[]>((acc, p, i, arr) => {
                  if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push('…')
                  acc.push(p)
                  return acc
                }, [])
                .map((p, i) =>
                  p === '…' ? (
                    <span key={`sep-${i}`} className="text-xs text-[#94A3B8] px-1">…</span>
                  ) : (
                    <Button
                      key={p}
                      variant={p === page ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPage(p as number)}
                      disabled={loading}
                      className="h-7 w-7 p-0 text-xs"
                    >
                      {p}
                    </Button>
                  )
                )}

              <Button
                variant="outline" size="sm"
                onClick={() => setPage(p => Math.min(pagination.total_pages, p + 1))}
                disabled={page === pagination.total_pages || loading}
                className="h-7 w-7 p-0"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* ── Drawer de detalhe ───────────────────────────────────────────────── */}
      <UserDrawer
        user={drawerUser}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onActionDone={() => fetchUsers(true)}
      />
    </div>
  )
}
