'use client'

import { useState } from 'react'
import { Plus, Users, Pencil, UserX, Phone, Link2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/dashboard/empty-state'
import { InquilinoModal } from '@/components/inquilinos/inquilino-modal'
import { desativarInquilino } from '@/app/(dashboard)/inquilinos/actions'
import { formatarTelefone } from '@/lib/helpers'
import type { Inquilino } from '@/types'
import { cn } from '@/lib/utils'

type ImovelOpcao = { id: string; apelido: string }

const CORES_AVATAR = [
  'bg-emerald-100 text-emerald-700',
  'bg-blue-100 text-blue-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-violet-100 text-violet-700',
  'bg-cyan-100 text-cyan-700',
  'bg-orange-100 text-orange-700',
]

function corAvatar(nome: string): string {
  let hash = 0
  for (let i = 0; i < nome.length; i++) {
    hash = nome.charCodeAt(i) + ((hash << 5) - hash)
  }
  return CORES_AVATAR[Math.abs(hash) % CORES_AVATAR.length]
}

function iniciaisNome(nome: string): string {
  return nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}

export function InquilinosClient({
  inquilinos,
  imoveis,
}: {
  inquilinos: Inquilino[]
  imoveis: ImovelOpcao[]
}) {
  const [open, setOpen] = useState(false)
  const [editando, setEditando] = useState<Inquilino | null>(null)

  function handleNovo() { setEditando(null); setOpen(true) }
  function handleEditar(i: Inquilino) { setEditando(i); setOpen(true) }

  async function handleDesativar(inquilino: Inquilino) {
    if (!confirm(`Desativar "${inquilino.nome}"?`)) return
    const result = await desativarInquilino(inquilino.id)
    if (result.error) toast.error(result.error)
    else toast.success('Inquilino desativado')
  }

  const ativos = inquilinos.filter(i => i.ativo)
  const inativos = inquilinos.filter(i => !i.ativo)

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-[#0F172A]">Inquilinos</h1>
          <p className="text-sm text-[#475569] mt-0.5">
            {ativos.length} ativo{ativos.length !== 1 ? 's' : ''}
            {inativos.length > 0 && ` · ${inativos.length} inativo${inativos.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Button onClick={handleNovo} className="gap-2 bg-[#059669] hover:bg-[#047857]">
          <Plus className="h-4 w-4" />
          Novo inquilino
        </Button>
      </div>

      {inquilinos.length === 0 ? (
        <EmptyState
          icon={Users}
          titulo="Nenhum inquilino cadastrado"
          descricao="Cadastre inquilinos e vincule-os aos seus imóveis."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {inquilinos.map(inquilino => (
            <div
              key={inquilino.id}
              className={cn(
                'bg-white rounded-xl border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-5 flex flex-col gap-4',
                !inquilino.ativo && 'opacity-60',
              )}
            >
              {/* Topo: avatar + nome + badge */}
              <div className="flex items-start gap-3">
                <div className={cn('h-12 w-12 rounded-full flex items-center justify-center text-sm font-bold shrink-0', corAvatar(inquilino.nome))}>
                  {iniciaisNome(inquilino.nome)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-[#0F172A] truncate">{inquilino.nome}</p>
                    <Badge
                      className={cn(
                        'text-[10px] h-4 px-1.5 font-semibold shrink-0',
                        inquilino.ativo
                          ? 'bg-[#D1FAE5] text-[#065F46] hover:bg-[#D1FAE5]'
                          : 'bg-[#F1F5F9] text-[#475569] hover:bg-[#F1F5F9]',
                      )}
                    >
                      {inquilino.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                  {inquilino.email && (
                    <p className="text-xs text-[#94A3B8] truncate mt-0.5">{inquilino.email}</p>
                  )}
                </div>
              </div>

              {/* Detalhes */}
              <div className="space-y-1.5">
                {inquilino.telefone && (
                  <div className="flex items-center gap-2 text-xs text-[#475569]">
                    <Phone className="h-3.5 w-3.5 text-[#94A3B8] shrink-0" />
                    {formatarTelefone(inquilino.telefone)}
                  </div>
                )}
                {inquilino.imovel && (
                  <div className="flex items-center gap-2 text-xs text-[#475569]">
                    <Link2 className="h-3.5 w-3.5 text-[#94A3B8] shrink-0" />
                    <span className="text-[#059669] font-medium">{inquilino.imovel.apelido}</span>
                  </div>
                )}
              </div>

              {/* Footer com ações */}
              <div className="flex gap-2 pt-1 border-t border-[#F1F5F9]">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1.5 text-xs h-8"
                  onClick={() => handleEditar(inquilino)}
                >
                  <Pencil className="h-3.5 w-3.5" />Editar
                </Button>
                {inquilino.ativo && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1.5 text-xs h-8 text-[#94A3B8] hover:text-destructive"
                    onClick={() => handleDesativar(inquilino)}
                  >
                    <UserX className="h-3.5 w-3.5" />Desativar
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <InquilinoModal open={open} onOpenChange={setOpen} inquilino={editando} imoveis={imoveis} />
    </>
  )
}
