'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Receipt, AlertCircle } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { formatarMoeda, formatarData, formatarMesReferencia } from '@/lib/helpers'
import type { AluguelItem } from './alugueis-client'

interface Props {
  open: boolean
  aluguel: AluguelItem | null
  onClose: () => void
  onSuccess: (updates: Partial<AluguelItem>) => void
}

export function ReenviarReciboModal({ open, aluguel, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false)

  async function handleReenviar() {
    if (!aluguel) return
    setLoading(true)
    try {
      const res = await fetch(`/api/alugueis/${aluguel.id}/reenviar-recibo`, { method: 'POST' })
      const json = await res.json() as { error?: string }
      if (!res.ok) { toast.error(json.error ?? 'Erro ao reenviar'); return }
      toast.success(`Recibo reenviado para ${aluguel.inquilino?.email}`)
      onSuccess({ recibo_reenviado_em: new Date().toISOString() })
      onClose()
    } finally { setLoading(false) }
  }

  if (!aluguel) return null

  const email = aluguel.inquilino?.email

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Reenviar recibo
          </DialogTitle>
        </DialogHeader>

        {!email ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
              <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                <strong>{aluguel.inquilino?.nome ?? 'Este inquilino'}</strong> não tem e-mail cadastrado.
              </p>
            </div>
            <div className="-mx-4 -mb-4 flex justify-end border-t bg-muted/50 p-4 rounded-b-xl">
              <Button variant="outline" onClick={onClose}>Fechar</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground -mt-1">
              O recibo de <strong>{formatarMesReferencia(aluguel.mes_referencia)}</strong> será enviado para:
            </p>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2 text-sm">
              <p className="font-semibold text-slate-800">{email}</p>
              <div className="flex items-center justify-between text-slate-600 text-xs">
                <span>{aluguel.imovel?.apelido}</span>
                <span>{formatarMoeda(aluguel.valor_pago ?? aluguel.valor)}</span>
              </div>
              {aluguel.data_pagamento && (
                <p className="text-xs text-slate-500">
                  Pago em {formatarData(aluguel.data_pagamento)}
                </p>
              )}
            </div>
            <div className="-mx-4 -mb-4 flex gap-2 justify-end border-t bg-muted/50 p-4 rounded-b-xl">
              <Button variant="outline" onClick={onClose}>Cancelar</Button>
              <Button onClick={handleReenviar} disabled={loading} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Receipt className="h-4 w-4" />}
                Reenviar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
