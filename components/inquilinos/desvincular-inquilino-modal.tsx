'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { LogOut, Loader2, AlertTriangle, ArrowLeftRight } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { desvincularInquilino } from '@/app/(dashboard)/inquilinos/actions'
import { cn } from '@/lib/utils'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  inquilino: { id: string; nome: string } | null
  imovelApelido?: string | null
  onDesvinculado?: () => void
}

type Modo = 'apenas_desvincular' | 'desvincular_e_encerrar'

export function DesvincularInquilinoModal({
  open, onOpenChange, inquilino, imovelApelido, onDesvinculado,
}: Props) {
  const router = useRouter()
  const [modo, setModo] = useState<Modo>('apenas_desvincular')
  const [loading, setLoading] = useState(false)

  if (!inquilino) return null

  async function handleConfirmar() {
    if (!inquilino) return
    setLoading(true)
    try {
      const result = await desvincularInquilino(inquilino.id, {
        encerrarCobrancasFuturas: modo === 'desvincular_e_encerrar',
      })
      if (result.error) {
        toast.error(result.error)
        return
      }
      const sufixo = result.cobrancasRemovidas
        ? ` · ${result.cobrancasRemovidas} cobrança(s) futura(s) removida(s)`
        : ''
      toast.success(`${inquilino.nome} desvinculado` + sufixo)
      onDesvinculado?.()
      onOpenChange(false)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LogOut className="h-5 w-5 text-amber-600" />
            Desvincular {inquilino.nome}
            {imovelApelido && <span className="text-slate-400 font-normal text-sm">— {imovelApelido}</span>}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          {/* Opção 1: apenas desvincular */}
          <button
            type="button"
            onClick={() => setModo('apenas_desvincular')}
            className={cn(
              'w-full text-left rounded-lg border p-3.5 transition-colors',
              modo === 'apenas_desvincular'
                ? 'border-emerald-500 bg-emerald-50'
                : 'border-slate-200 hover:border-slate-300',
            )}
          >
            <div className="flex items-start gap-3">
              <input
                type="radio"
                checked={modo === 'apenas_desvincular'}
                readOnly
                className="mt-0.5 accent-emerald-600 shrink-0"
              />
              <div>
                <p className="text-sm font-semibold text-slate-900">Apenas desvincular</p>
                <ul className="text-xs text-slate-600 mt-1.5 space-y-0.5 list-disc list-inside">
                  <li>Imóvel volta para &quot;Vago&quot;</li>
                  <li>Histórico de pagamentos preservado</li>
                  <li>Cadastro do inquilino mantido</li>
                  <li>Cobranças futuras (próximos meses) <strong>continuam ativas</strong></li>
                </ul>
              </div>
            </div>
          </button>

          {/* Opção 2: desvincular + encerrar */}
          <button
            type="button"
            onClick={() => setModo('desvincular_e_encerrar')}
            className={cn(
              'w-full text-left rounded-lg border p-3.5 transition-colors',
              modo === 'desvincular_e_encerrar'
                ? 'border-emerald-500 bg-emerald-50'
                : 'border-slate-200 hover:border-slate-300',
            )}
          >
            <div className="flex items-start gap-3">
              <input
                type="radio"
                checked={modo === 'desvincular_e_encerrar'}
                readOnly
                className="mt-0.5 accent-emerald-600 shrink-0"
              />
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Desvincular e encerrar cobranças futuras
                </p>
                <ul className="text-xs text-slate-600 mt-1.5 space-y-0.5 list-disc list-inside">
                  <li>Tudo da opção anterior, e</li>
                  <li>Remove cobranças <strong>pendentes e atrasadas</strong> dos meses futuros</li>
                  <li>Mantém o mês corrente e meses passados intactos</li>
                </ul>
                <p className="text-[11px] text-amber-700 mt-1.5 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Recomendado quando o contrato terminou de fato
                </p>
              </div>
            </div>
          </button>

          {/* Hint sobre mover */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 flex items-start gap-2">
            <ArrowLeftRight className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
            <p>
              <strong>Vai mover pra outro imóvel?</strong>{' '}
              Não use desvincular — clica em &quot;Editar inquilino&quot; e troca o imóvel.
              O histórico segue ligado ao inquilino.
            </p>
          </div>
        </div>

        <div className="-mx-4 -mb-4 mt-4 flex gap-2 justify-end border-t bg-muted/50 p-4 rounded-b-xl">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={loading}
            onClick={handleConfirmar}
            className="gap-2 bg-amber-600 hover:bg-amber-700"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Desvincular
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
