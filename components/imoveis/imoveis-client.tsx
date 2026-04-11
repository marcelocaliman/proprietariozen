'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Building2, Pencil, Archive, Zap, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { EmptyState } from '@/components/dashboard/empty-state'
import { ImovelModal } from '@/components/imoveis/imovel-modal'
import { arquivarImovel } from '@/app/(dashboard)/imoveis/actions'
import { formatarMoeda } from '@/lib/helpers'
import { LIMITES_PLANO } from '@/lib/stripe'
import type { Imovel } from '@/types'

const labelsTipo: Record<string, string> = {
  apartamento: 'Apartamento',
  casa: 'Casa',
  kitnet: 'Kitnet',
  comercial: 'Comercial',
  terreno: 'Terreno',
  outro: 'Outro',
}

interface Props {
  imoveis: Imovel[]
  plano: 'gratis' | 'pago'
}

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
    setEditando(null)
    setOpen(true)
  }

  function handleEditar(imovel: Imovel) {
    setEditando(imovel)
    setOpen(true)
  }

  async function handleArquivar(imovel: Imovel) {
    if (!confirm(`Arquivar "${imovel.apelido}"? O imóvel não aparecerá mais na listagem.`)) return
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
    } catch {
      toast.error('Erro ao conectar com o servidor de pagamento')
    } finally {
      setLoadingCheckout(false)
    }
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Imóveis</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {imoveis.length}/{limite} imóvel{imoveis.length !== 1 ? 's' : ''} · plano {plano === 'pago' ? 'Pro' : 'Grátis'}
          </p>
        </div>
        <Button onClick={handleNovo} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo imóvel
        </Button>
      </div>

      {/* Banner plano grátis com imóvel cadastrado */}
      {plano === 'gratis' && imoveis.length > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950/30 px-4 py-3">
          <p className="text-sm text-orange-700 dark:text-orange-400">
            Plano Grátis: {imoveis.length}/{limite} imóvel usado. Faça upgrade para cadastrar até 5.
          </p>
          <Button size="sm" className="shrink-0 bg-orange-600 hover:bg-orange-700 gap-1.5" onClick={() => router.push('/planos')}>
            <Zap className="h-3.5 w-3.5" />Ver Pro
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
            return (
              <Card key={imovel.id} className="flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold truncate">{imovel.apelido}</p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{imovel.endereco}</p>
                    </div>
                    <Badge variant={ocupado ? 'default' : 'outline'} className="shrink-0 text-xs">
                      {ocupado ? 'Ocupado' : 'Vago'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Aluguel</span>
                    <span className="font-semibold">{formatarMoeda(imovel.valor_aluguel)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Vencimento</span>
                    <span>Dia {imovel.dia_vencimento}</span>
                  </div>
                  {inquilinoAtivo && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Inquilino</span>
                      <span className="truncate max-w-[140px] text-right">{inquilinoAtivo.nome}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Tipo</span>
                    <Badge variant="outline" className="text-xs">{labelsTipo[imovel.tipo] ?? imovel.tipo}</Badge>
                  </div>
                  <div className="flex gap-2 pt-2 border-t">
                    <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={() => handleEditar(imovel)}>
                      <Pencil className="h-3.5 w-3.5" />Editar
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 gap-1.5 text-muted-foreground" onClick={() => handleArquivar(imovel)}>
                      <Archive className="h-3.5 w-3.5" />Arquivar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <ImovelModal open={open} onOpenChange={setOpen} imovel={editando} />

      {/* Modal de upgrade para Pro */}
      <Dialog open={upgradeOpen} onOpenChange={setUpgradeOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-purple-500" />
              Limite do plano Grátis
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <p className="text-sm text-muted-foreground">
              O plano Grátis permite apenas <strong>1 imóvel</strong>. Faça upgrade para o{' '}
              <strong className="text-purple-600">Pro</strong> e cadastre até{' '}
              <strong>5 imóveis</strong>, além de recibos PDF, reajuste automático e muito mais.
            </p>
            <div className="rounded-lg border border-purple-200 bg-purple-50 dark:border-purple-900 dark:bg-purple-950/30 p-4 space-y-2">
              <p className="text-sm font-semibold text-purple-700 dark:text-purple-400">ProprietárioZen Pro</p>
              <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                R$ 29,90<span className="text-sm font-normal text-muted-foreground">/mês</span>
              </p>
              <ul className="text-xs text-muted-foreground space-y-1 pt-1">
                {['Até 5 imóveis', 'Recibos PDF ilimitados', 'Reajuste automático', 'Alertas por e-mail'].map(f => (
                  <li key={f} className="flex items-center gap-1.5">
                    <Zap className="h-3 w-3 text-purple-500 shrink-0" />{f}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setUpgradeOpen(false)}>
                Agora não
              </Button>
              <Button
                className="flex-1 bg-purple-600 hover:bg-purple-700 gap-2"
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
