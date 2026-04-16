'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { formatarMoeda } from '@/lib/helpers'
import type { AluguelItem } from './alugueis-client'

const schema = z.object({
  valorPago: z.string().min(1, 'Informe o valor'),
  dataPagamento: z.string().min(1, 'Informe a data'),
  observacao: z.string().optional(),
})
type FormData = z.infer<typeof schema>

interface Props {
  open: boolean
  aluguel: AluguelItem | null
  onClose: () => void
  onSuccess: (updates: Partial<AluguelItem>) => void
}

export function PagamentoParcialModal({ open, aluguel, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, watch, reset, setError, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    if (open) reset({ valorPago: '', dataPagamento: new Date().toISOString().split('T')[0], observacao: '' })
  }, [open, reset])

  const valorPagoRaw = watch('valorPago') ?? ''
  const valorPagoNum = parseFloat(valorPagoRaw.replace(',', '.')) || 0
  const saldoRestante = aluguel ? Math.max(0, aluguel.valor - valorPagoNum) : 0

  async function onSubmit(data: FormData) {
    if (!aluguel) return
    const valorNum = parseFloat(data.valorPago.replace(',', '.'))
    if (isNaN(valorNum) || valorNum <= 0) {
      setError('valorPago', { message: 'Informe um valor válido' })
      return
    }
    if (valorNum >= aluguel.valor) {
      setError('valorPago', { message: 'Para pagamento total, use "Registrar pagamento"' })
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/alugueis/${aluguel.id}/pagamento-parcial`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ valorPago: valorNum, dataPagamento: data.dataPagamento, observacao: data.observacao }),
      })
      const json = await res.json() as { error?: string; valor_pago?: number; observacao?: string }
      if (!res.ok) { toast.error(json.error ?? 'Erro ao registrar'); return }
      toast.success(`Pagamento parcial de ${formatarMoeda(valorNum)} registrado`)
      onSuccess({ valor_pago: json.valor_pago ?? valorNum, observacao: json.observacao ?? null })
      onClose()
    } finally { setLoading(false) }
  }

  if (!aluguel) return null

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Pagamento parcial</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground -mt-1">
          Valor total: <strong>{formatarMoeda(aluguel.valor)}</strong>
        </p>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="valorPago">Valor recebido (R$)</Label>
            <Input id="valorPago" placeholder="0,00" {...register('valorPago')} />
            {errors.valorPago
              ? <p className="text-destructive text-xs">{errors.valorPago.message}</p>
              : valorPagoNum > 0 && (
                <p className="text-xs text-muted-foreground">
                  Saldo restante: <strong>{formatarMoeda(saldoRestante)}</strong>
                </p>
              )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dataPagamento">Data do recebimento</Label>
            <Input id="dataPagamento" type="date" {...register('dataPagamento')} />
            {errors.dataPagamento && <p className="text-destructive text-xs">{errors.dataPagamento.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="observacao">Observação <span className="text-muted-foreground font-normal">(opcional)</span></Label>
            <Textarea
              id="observacao"
              placeholder="Ex: Inquilino pagará o restante em 15 dias"
              rows={2}
              {...register('observacao')}
            />
          </div>
          <div className="-mx-4 -mb-4 flex gap-2 justify-end border-t bg-muted/50 p-4 rounded-b-xl">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={loading} className="gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Registrar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
