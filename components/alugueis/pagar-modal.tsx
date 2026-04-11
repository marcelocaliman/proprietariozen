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
import { marcarComoPago } from '@/app/(dashboard)/alugueis/actions'
import { formatarMoeda } from '@/lib/helpers'

const schema = z.object({
  data_pagamento: z.string().min(1, 'Informe a data de pagamento'),
  observacao: z.string().optional(),
})
type FormData = z.infer<typeof schema>

interface PagarModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  aluguel: {
    id: string
    valor: number
    imovel: { apelido: string } | null
    inquilino: { nome: string } | null
  } | null
}

export function PagarModal({ open, onOpenChange, aluguel }: PagarModalProps) {
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    if (open) reset({ data_pagamento: new Date().toISOString().split('T')[0], observacao: '' })
  }, [open, reset])

  async function onSubmit(data: FormData) {
    if (!aluguel) return
    setLoading(true)
    try {
      const result = await marcarComoPago(aluguel.id, data.data_pagamento, data.observacao || null)
      if (result.error) { toast.error(result.error) }
      else { toast.success('Pagamento registrado!'); onOpenChange(false) }
    } finally { setLoading(false) }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => onOpenChange(v)}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Registrar pagamento</DialogTitle>
        </DialogHeader>
        {aluguel && (
          <div className="rounded-lg bg-muted/50 px-4 py-3 text-sm space-y-1">
            <p className="font-medium">{aluguel.imovel?.apelido ?? 'Imóvel'}</p>
            <p className="text-muted-foreground">
              {aluguel.inquilino?.nome ?? 'Sem inquilino'} · {formatarMoeda(aluguel.valor)}
            </p>
          </div>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="data_pagamento">Data de pagamento</Label>
            <Input id="data_pagamento" type="date" {...register('data_pagamento')} />
            {errors.data_pagamento && <p className="text-destructive text-xs">{errors.data_pagamento.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="observacao">Observação</Label>
            <Textarea id="observacao" placeholder="Comprovante PIX, número do recibo..." {...register('observacao')} />
          </div>
          <div className="-mx-4 -mb-4 flex gap-2 justify-end border-t bg-muted/50 p-4 rounded-b-xl">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading} className="gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirmar pagamento
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
