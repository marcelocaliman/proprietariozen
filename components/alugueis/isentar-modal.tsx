'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, Info } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { formatarMesReferencia } from '@/lib/helpers'
import type { AluguelItem } from './alugueis-client'

const schema = z.object({
  motivo: z.string().min(3, 'Informe a justificativa (mínimo 3 caracteres)'),
})
type FormData = z.infer<typeof schema>

interface Props {
  open: boolean
  aluguel: AluguelItem | null
  onClose: () => void
  onSuccess: (updates: Partial<AluguelItem>) => void
}

export function IsentarModal({ open, aluguel, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    if (open) reset({ motivo: '' })
  }, [open, reset])

  async function onSubmit(data: FormData) {
    if (!aluguel) return
    setLoading(true)
    try {
      const res = await fetch(`/api/alugueis/${aluguel.id}/isentar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo: data.motivo }),
      })
      const json = await res.json() as { error?: string; aviso?: string }
      if (!res.ok) { toast.error(json.error ?? 'Erro ao isentar'); return }
      if (json.aviso) toast.warning(json.aviso)
      else toast.success('Mês isento. Registro mantido no histórico.')
      onSuccess({
        isento: true,
        status: 'pago',
        valor_pago: 0,
        motivo_isencao: data.motivo,
        data_pagamento: new Date().toISOString().split('T')[0],
        asaas_charge_id: null,
        asaas_pix_qrcode: null,
        asaas_pix_copiaecola: null,
        asaas_boleto_url: null,
      })
      onClose()
    } finally { setLoading(false) }
  }

  if (!aluguel) return null

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Isentar aluguel de {formatarMesReferencia(aluguel.mes_referencia)}</DialogTitle>
        </DialogHeader>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 flex items-start gap-2.5 -mt-1">
          <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-800 leading-relaxed">
            O inquilino ficará sem cobrança neste mês.
            O registro permanece no histórico com valor <strong>R$ 0,00</strong>.
          </p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="motivo">Justificativa</Label>
            <Textarea
              id="motivo"
              rows={3}
              placeholder="Ex: Acordo pela reforma realizada pelo inquilino, férias combinadas, etc."
              {...register('motivo')}
            />
            {errors.motivo && <p className="text-destructive text-xs">{errors.motivo.message}</p>}
          </div>
          <div className="-mx-4 -mb-4 flex gap-2 justify-end border-t bg-muted/50 p-4 rounded-b-xl">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={loading} className="gap-2 bg-violet-600 hover:bg-violet-700">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirmar isenção
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
