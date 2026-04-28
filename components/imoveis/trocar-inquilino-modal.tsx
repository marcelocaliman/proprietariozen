'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { ArrowLeftRight, Loader2, AlertTriangle } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { encerrarContrato } from '@/app/(dashboard)/imoveis/actions'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  imovel: { id: string; apelido: string } | null
  inquilinoAtualNome: string | null
  /** Chamado após encerrar com sucesso. Use para abrir o modal de novo inquilino. */
  onPronto: () => void
}

const mesAtualYYYYMM = (() => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
})()

export function TrocarInquilinoModal({
  open, onOpenChange, imovel, inquilinoAtualNome, onPronto,
}: Props) {
  const [ultimoMes, setUltimoMes] = useState(mesAtualYYYYMM)
  const [encerrarCobrancas, setEncerrarCobrancas] = useState(true)
  const [loading, setLoading] = useState(false)

  if (!open || !imovel) return null

  async function handleEncerrarEContinuar() {
    if (!imovel) return
    if (!ultimoMes) { toast.error('Selecione o último mês'); return }

    setLoading(true)
    try {
      const result = await encerrarContrato(imovel.id, ultimoMes, {
        desativarInquilino: true,
        arquivarImovel: false,
      })
      if (result.error) {
        toast.error(result.error)
        return
      }
      const removidos = result.removidos ?? 0
      toast.success(
        removidos > 0
          ? `Contrato encerrado. ${removidos} cobrança(s) futura(s) removida(s).`
          : 'Contrato encerrado.',
      )
      onOpenChange(false)
      // Pequena pausa para o toast aparecer antes do próximo modal
      setTimeout(() => onPronto(), 250)
    } catch {
      toast.error('Erro ao encerrar contrato')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5 text-emerald-600" />
            Trocar inquilino — {imovel.apelido}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <p className="text-sm text-slate-600">
            Vamos fazer em 2 passos:
          </p>
          <ol className="text-sm text-slate-700 space-y-1 list-decimal list-inside pl-1">
            <li>
              <strong>Agora:</strong> encerrar o contrato com{' '}
              {inquilinoAtualNome ? <span className="text-slate-900">{inquilinoAtualNome}</span> : 'o inquilino atual'}
            </li>
            <li>
              <strong>Em seguida:</strong> cadastrar e vincular o novo inquilino
            </li>
          </ol>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 leading-relaxed">
              O inquilino atual será desativado. Pagamentos já registrados são preservados.
              {encerrarCobrancas && ' Cobranças pendentes/atrasadas após o último mês serão removidas.'}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ultimo-mes">Último mês com {inquilinoAtualNome ?? 'o inquilino atual'}</Label>
            <input
              id="ultimo-mes"
              type="month"
              value={ultimoMes}
              onChange={e => setUltimoMes(e.target.value)}
              className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-ring"
            />
            <p className="text-[11px] text-slate-400">
              Cobranças deste mês e meses anteriores são preservadas.
            </p>
          </div>

          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={encerrarCobrancas}
              onChange={e => setEncerrarCobrancas(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-emerald-600 cursor-pointer"
            />
            <div>
              <p className="text-sm font-medium text-slate-900">Encerrar cobranças futuras</p>
              <p className="text-[11px] text-slate-500">
                Remove pendentes e atrasadas dos meses futuros. Recomendado.
              </p>
            </div>
          </label>
        </div>

        <div className="-mx-4 -mb-4 mt-4 flex gap-2 justify-end border-t bg-muted/50 p-4 rounded-b-xl">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={loading}
            onClick={handleEncerrarEContinuar}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Encerrar e vincular novo
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
