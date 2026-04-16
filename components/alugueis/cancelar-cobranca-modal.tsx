'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, AlertTriangle } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { AluguelItem } from './alugueis-client'

const MOTIVOS = [
  'Erro no valor cadastrado',
  'Acordo entre as partes',
  'Imóvel desocupado no período',
  'Isenção concedida ao inquilino',
  'Outro motivo',
] as const

const schema = z.object({
  tipoMotivo: z.string().min(1, 'Selecione um motivo'),
  motivo: z.string().optional(),
})
type FormData = z.infer<typeof schema>

interface Props {
  open: boolean
  aluguel: AluguelItem | null
  onClose: () => void
  onSuccess: (id: string) => void
}

export function CancelarCobrancaModal({ open, aluguel, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  function handleClose() { reset(); onClose() }

  const tipoSelecionado = watch('tipoMotivo')

  async function onSubmit(data: FormData) {
    if (!aluguel) return
    setLoading(true)
    try {
      const res = await fetch(`/api/alugueis/${aluguel.id}/cancelar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipoMotivo: data.tipoMotivo, motivo: data.motivo }),
      })
      const json = await res.json() as { error?: string; aviso?: string }
      if (!res.ok) { toast.error(json.error ?? 'Erro ao cancelar'); return }

      if (json.aviso) toast.warning(json.aviso)
      else toast.success('Cobrança cancelada')

      onSuccess(aluguel.id)
      handleClose()
    } finally { setLoading(false) }
  }

  if (!aluguel) return null

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Cancelar cobrança</DialogTitle>
        </DialogHeader>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 flex items-start gap-2.5 -mt-1">
          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 leading-relaxed">
            O registro permanecerá no histórico com status <strong>cancelado</strong>.
            Esta ação não pode ser desfeita.
          </p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="tipoMotivo">Motivo do cancelamento</Label>
            <select
              id="tipoMotivo"
              className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none transition-colors focus:border-ring"
              {...register('tipoMotivo')}
            >
              <option value="">Selecione o motivo</option>
              {MOTIVOS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            {errors.tipoMotivo && <p className="text-destructive text-xs">{errors.tipoMotivo.message}</p>}
          </div>

          {tipoSelecionado === 'Outro motivo' && (
            <div className="space-y-1.5">
              <Label htmlFor="motivo">Detalhe o motivo</Label>
              <Textarea id="motivo" rows={2} placeholder="Descreva o motivo..." {...register('motivo')} />
            </div>
          )}

          <div className="-mx-4 -mb-4 flex gap-2 justify-end border-t bg-muted/50 p-4 rounded-b-xl">
            <Button type="button" variant="outline" onClick={handleClose}>Voltar</Button>
            <Button type="submit" disabled={loading} variant="destructive" className="gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Cancelar cobrança
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
