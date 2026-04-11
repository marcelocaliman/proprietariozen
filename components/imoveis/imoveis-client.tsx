'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Plus, Building2, Home, Square, Briefcase, MapPin,
  Pencil, Archive, Zap, Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { EmptyState } from '@/components/dashboard/empty-state'
import { ImovelModal } from '@/components/imoveis/imovel-modal'
import { arquivarImovel } from '@/app/(dashboard)/imoveis/actions'
import { formatarMoeda } from '@/lib/helpers'
import { LIMITES_PLANO } from '@/lib/stripe'
import type { Imovel } from '@/types'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

const labelsTipo: Record<string, string> = {
  apartamento: 'Apartamento', casa: 'Casa', kitnet: 'Kitnet',
  comercial: 'Comercial', terreno: 'Terreno', outro: 'Outro',
}

const tipoIcone: Record<string, LucideIcon> = {
  apartamento: Building2, casa: Home, kitnet: Square,
  comercial: Briefcase, terreno: MapPin, outro: Building2,
}

interface Props { imoveis: Imovel[]; plano: 'gratis' | 'pago' }

export function ImoveisClient({ imoveis, plano }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [editando, setEditando] = useState<Imovel | null>(null)
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [loadingCheckout, setLoadingCheckout] = useState(false)

  const limite = LIMITES_PLANO[plano].maxImoveis
  const atingiuLimite = imoveis.length >= limite

  function handleNovo() {
    if (atingiuLimite) { setUpgradeOpen(true); return }
    setEditando(null); setOpen(true)
  }

  function handleEditar(imovel: Imovel) { setEditando(imovel); setOpen(true) }

  async function handleArquivar(imovel: Imovel) {
    if (!confirm(`Arquivar "${imovel.apelido}"?`)) return
    const result = await arquivarImovel(imovel.id)
    if (result.error) toast.error(result.error)
    else toast.success('Imóvel arquivado')
  }

  async function handleAssinar() {
    setLoadingCheckout(true)
    try {
      const res = await fetch('/api/checkout', { method: 'POST' })
      const json = await res.json()
      if (!res.ok || !json.url) { toast.error(json.error ?? 'Erro ao iniciar pagamento'); return }
      window.location.href = json.url
    } catch { toast.error('Erro ao conectar com o servidor de pagamento') }
    finally { setLoadingCheckout(false) }
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-[#0F172A]">Imóveis</h1>
          <p className="text-sm text-[#475569] mt-0.5">
            {imoveis.length} de {limite} imóve{imoveis.length !== 1 ? 'is' : 'l'} · plano {plano === 'pago' ? 'Pro' : 'Grátis'}
          </p>
        </div>
        <Button onClick={handleNovo} className="gap-2 bg-[#059669] hover:bg-[#047857]">
          <Plus className="h-4 w-4" />
          Novo imóvel
        </Button>
      </div>

      {/* Banner plano Grátis */}
      {plano === 'gratis' && imoveis.length > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-700">
            Plano Grátis: {imoveis.length}/{limite} imóvel usado. Faça upgrade para cadastrar até 5.
          </p>
          <Button size="sm" className="shrink-0 bg-amber-500 hover:bg-amber-600 gap-1.5 text-white" onClick={() => router.push('/planos')}>
            <Zap className="h-3.5 w-3.5" />Fazer upgrade
          </Button>
        </div>
      )}

      {imoveis.length === 0 ? (
        <EmptyState
          icon={Building2}
          titulo="Nenhum imóvel cadastrado"
          descricao="Cadastre seu primeiro imóvel para começar a gerenciar seus aluguéis."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {imoveis.map(imovel => {
            const inquilinoAtivo = imovel.inquilinos?.find(i => i.ativo)
            const ocupado = !!inquilinoAtivo
            const TipoIcon = tipoIcone[imovel.tipo] ?? Building2

            return (
              <div key={imovel.id} className="bg-white rounded-xl border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden flex flex-col">
                {/* Card header colorido */}
                <div className="relative bg-[#D1FAE5] px-5 py-6 flex items-center justify-center">
                  <TipoIcon className="h-10 w-10 text-[#059669]" />
                  <div className="absolute top-3 right-3">
                    <Badge
                      className={cn(
                        'text-xs font-semibold',
                        ocupado
                          ? 'bg-[#059669] text-white hover:bg-[#059669]'
                          : 'bg-white text-[#475569] hover:bg-white border border-[#E2E8F0]',
                      )}
                    >
                      {ocupado ? 'Ocupado' : 'Vago'}
                    </Badge>
                  </div>
                </div>

                {/* Body */}
                <div className="px-5 py-4 flex-1 space-y-3">
                  <div>
                    <p className="font-semibold text-[#0F172A] truncate">{imovel.apelido}</p>
                    <p className="text-xs text-[#94A3B8] truncate mt-0.5">{imovel.endereco}</p>
                  </div>

                  <div className="h-px bg-[#F1F5F9]" />

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-[11px] text-[#94A3B8] uppercase tracking-wider font-medium">Aluguel</p>
                      <p className="font-semibold text-[#0F172A]">{formatarMoeda(imovel.valor_aluguel)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-[#94A3B8] uppercase tracking-wider font-medium">Vencimento</p>
                      <p className="font-medium text-[#0F172A]">Dia {imovel.dia_vencimento}</p>
                    </div>
                    {inquilinoAtivo && (
                      <div className="col-span-2">
                        <p className="text-[11px] text-[#94A3B8] uppercase tracking-wider font-medium">Inquilino</p>
                        <p className="font-medium text-[#0F172A] truncate">{inquilinoAtivo.nome}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-[11px] text-[#94A3B8] uppercase tracking-wider font-medium">Tipo</p>
                      <p className="font-medium text-[#0F172A]">{labelsTipo[imovel.tipo] ?? imovel.tipo}</p>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-5 pb-4 flex gap-2 border-t border-[#F1F5F9] pt-3">
                  <Button variant="outline" size="sm" className="flex-1 gap-1.5 text-xs" onClick={() => handleEditar(imovel)}>
                    <Pencil className="h-3.5 w-3.5" />Editar
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 gap-1.5 text-xs text-[#94A3B8]" onClick={() => handleArquivar(imovel)}>
                    <Archive className="h-3.5 w-3.5" />Arquivar
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <ImovelModal open={open} onOpenChange={setOpen} imovel={editando} />

      {/* Modal upgrade */}
      <Dialog open={upgradeOpen} onOpenChange={setUpgradeOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-emerald-500" />
              Limite do plano Grátis
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <p className="text-sm text-[#475569]">
              O plano Grátis permite apenas <strong>1 imóvel</strong>. Faça upgrade para o{' '}
              <strong className="text-emerald-600">Pro</strong> e cadastre até{' '}
              <strong>5 imóveis</strong>, além de recibos PDF, reajuste automático e muito mais.
            </p>
            <div className="rounded-xl border border-emerald-200 bg-[#D1FAE5]/40 p-4 space-y-2">
              <p className="text-sm font-semibold text-emerald-700">ProprietárioZen Pro</p>
              <p className="text-2xl font-bold text-emerald-700">
                R$ 29,90<span className="text-sm font-normal text-[#94A3B8]">/mês</span>
              </p>
              <ul className="text-xs text-[#475569] space-y-1 pt-1">
                {['Até 5 imóveis', 'Recibos PDF ilimitados', 'Reajuste automático', 'Alertas por e-mail'].map(f => (
                  <li key={f} className="flex items-center gap-1.5">
                    <Zap className="h-3 w-3 text-emerald-500 shrink-0" />{f}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setUpgradeOpen(false)}>Agora não</Button>
              <Button
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 gap-2"
                disabled={loadingCheckout}
                onClick={handleAssinar}
              >
                {loadingCheckout ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                Assinar Pro
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
