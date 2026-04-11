'use client'

import { useEffect, useState } from 'react'
import { RefreshCw, TrendingUp, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { EmptyState } from './empty-state'
import { aplicarReajuste } from '@/app/(dashboard)/alugueis/actions'
import { formatarMoeda, formatarData } from '@/lib/helpers'

export type ImovelReajuste = {
  id: string
  apelido: string
  data_proximo_reajuste: string
  valor_aluguel: number
  indice_reajuste: string
  percentual_fixo: number | null
}

const labelsIndice: Record<string, string> = { igpm: 'IGPM', ipca: 'IPCA', fixo: 'Fixo' }

export function ReajusteAlertas({ imoveis }: { imoveis: ImovelReajuste[] }) {
  const [open, setOpen] = useState(false)
  const [selecionado, setSelecionado] = useState<ImovelReajuste | null>(null)
  const [percentual, setPercentual] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && selecionado) {
      setPercentual(
        selecionado.indice_reajuste === 'fixo' && selecionado.percentual_fixo != null
          ? String(selecionado.percentual_fixo)
          : ''
      )
    }
  }, [open, selecionado])

  const pct = parseFloat(percentual) || 0
  const novoValor = selecionado
    ? Math.round(selecionado.valor_aluguel * (1 + pct / 100) * 100) / 100
    : 0
  const diferenca = selecionado ? novoValor - selecionado.valor_aluguel : 0

  async function handleConfirmar() {
    if (!selecionado || pct <= 0) { toast.error('Informe um percentual válido'); return }
    setLoading(true)
    try {
      const [ano, mes, dia] = selecionado.data_proximo_reajuste.split('-').map(Number)
      const proximaData = new Date(ano + 1, mes - 1, dia).toISOString().split('T')[0]
      const result = await aplicarReajuste(selecionado.id, novoValor, proximaData)
      if (result.error) { toast.error(result.error) }
      else { toast.success(`Reajuste aplicado! Novo valor: ${formatarMoeda(novoValor)}`); setOpen(false) }
    } finally { setLoading(false) }
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-primary" />
            Reajustes próximos
            <span className="text-xs font-normal text-muted-foreground ml-auto">próximos 30 dias</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!imoveis.length ? (
            <EmptyState icon={RefreshCw} titulo="Nenhum reajuste próximo" descricao="Não há contratos com reajuste nos próximos 30 dias." />
          ) : (
            <div className="space-y-3">
              {imoveis.map(imovel => (
                <div key={imovel.id} className="flex items-center justify-between gap-3 py-1">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{imovel.apelido}</p>
                    <p className="text-xs text-muted-foreground">Reajuste em {formatarData(imovel.data_proximo_reajuste)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-semibold hidden sm:block">{formatarMoeda(imovel.valor_aluguel)}</span>
                    <Badge variant="outline" className="text-xs">
                      {labelsIndice[imovel.indice_reajuste] ?? imovel.indice_reajuste}
                    </Badge>
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                      onClick={() => { setSelecionado(imovel); setOpen(true) }}>
                      <TrendingUp className="h-3 w-3" />
                      Aplicar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={(v) => setOpen(v)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Aplicar reajuste</DialogTitle>
          </DialogHeader>
          {selecionado && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/50 px-4 py-3 space-y-1">
                <p className="text-sm font-medium">{selecionado.apelido}</p>
                <p className="text-xs text-muted-foreground">
                  Índice: {labelsIndice[selecionado.indice_reajuste] ?? selecionado.indice_reajuste} ·
                  Vence em {formatarData(selecionado.data_proximo_reajuste)}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pct">
                  {selecionado.indice_reajuste === 'fixo'
                    ? 'Percentual fixo (%)'
                    : `Percentual do ${labelsIndice[selecionado.indice_reajuste] ?? selecionado.indice_reajuste} no período (%)`}
                </Label>
                <Input id="pct" type="number" step="0.01" placeholder="Ex: 4.62"
                  value={percentual} onChange={e => setPercentual(e.target.value)} />
              </div>
              {pct > 0 && (
                <div className="rounded-lg border p-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Valor atual</span>
                    <span>{formatarMoeda(selecionado.valor_aluguel)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-primary">
                    <span>Novo valor</span>
                    <span>{formatarMoeda(novoValor)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground border-t pt-2">
                    <span>Acréscimo</span>
                    <span>+{formatarMoeda(diferenca)} (+{pct.toFixed(2)}%)</span>
                  </div>
                </div>
              )}
              <div className="-mx-4 -mb-4 flex gap-2 justify-end border-t bg-muted/50 p-4 rounded-b-xl">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={handleConfirmar} disabled={loading || pct <= 0} className="gap-2">
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Confirmar reajuste
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
