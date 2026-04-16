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
  tipo: z.enum(['reais', 'percentual']),
  valor: z.string().min(1, 'Informe o valor'),
  motivo: z.string().optional(),
})
type FormData = z.infer<typeof schema>

interface Props {
  open: boolean
  aluguel: AluguelItem | null
  onClose: () => void
  onSuccess: (updates: Partial<AluguelItem>) => void
}

export function DescontoModal({ open, aluguel, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, watch, reset, setError, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { tipo: 'reais' },
  })

  useEffect(() => {
    if (open) reset({ tipo: 'reais', valor: '', motivo: '' })
  }, [open, reset])

  const tipo = watch('tipo')
  const valorRaw = watch('valor') ?? ''
  const valorNum = parseFloat(valorRaw.replace(',', '.')) || 0

  const valorDesconto = tipo === 'percentual' && aluguel
    ? (aluguel.valor * valorNum) / 100
    : valorNum

  const novoValor = aluguel ? Math.max(0, aluguel.valor - valorDesconto) : 0

  async function onSubmit(data: FormData) {
    if (!aluguel) return
    const v = parseFloat(data.valor.replace(',', '.'))
    if (isNaN(v) || v <= 0) { setError('valor', { message: 'Informe um valor válido' }); return }

    const desconto = data.tipo === 'percentual' ? (aluguel.valor * v) / 100 : v
    if (desconto >= aluguel.valor) {
      setError('valor', { message: 'Desconto não pode zerar o aluguel. Use "Isentar mês".' })
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/alugueis/${aluguel.id}/desconto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ valorDesconto: desconto, motivo: data.motivo }),
      })
      const json = await res.json() as { error?: string; desconto?: number; observacao?: string }
      if (!res.ok) { toast.error(json.error ?? 'Erro ao aplicar desconto'); return }
      toast.success(`Desconto de ${formatarMoeda(desconto)} aplicado`)
      onSuccess({ desconto: json.desconto ?? desconto, observacao: json.observacao ?? null })
      onClose()
    } finally { setLoading(false) }
  }

  if (!aluguel) return null

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Conceder desconto neste mês</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Tipo de desconto */}
          <div className="flex rounded-lg border border-input overflow-hidden text-sm font-medium">
            {(['reais', 'percentual'] as const).map(t => (
              <label key={t} className={`flex-1 cursor-pointer text-center py-2 transition-colors ${watch('tipo') === t ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
                <input type="radio" value={t} {...register('tipo')} className="sr-only" />
                {t === 'reais' ? 'Em reais (R$)' : 'Em percentual (%)'}
              </label>
            ))}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="valor">
              {tipo === 'reais' ? 'Valor do desconto (R$)' : 'Percentual de desconto (%)'}
            </Label>
            <Input id="valor" placeholder={tipo === 'reais' ? '0,00' : '0'} {...register('valor')} />
            {errors.valor
              ? <p className="text-destructive text-xs">{errors.valor.message}</p>
              : valorNum > 0 && aluguel && (
                <p className="text-xs text-muted-foreground">
                  {tipo === 'percentual' && <>Desconto: <strong>{formatarMoeda(valorDesconto)}</strong> → </>}
                  Novo valor: <strong className="text-emerald-700">{formatarMoeda(novoValor)}</strong>
                  {' '}<span className="text-slate-400 line-through text-[11px]">{formatarMoeda(aluguel.valor)}</span>
                </p>
              )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="motivo">Motivo <span className="text-muted-foreground font-normal">(opcional)</span></Label>
            <Textarea id="motivo" rows={2} placeholder="Justificativa do desconto..." {...register('motivo')} />
          </div>

          <div className="-mx-4 -mb-4 flex gap-2 justify-end border-t bg-muted/50 p-4 rounded-b-xl">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={loading} className="gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Aplicar desconto
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
