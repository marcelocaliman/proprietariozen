'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  // Entidade a excluir
  tipo: 'imovel' | 'inquilino'
  nome: string                  // apelido do imóvel ou nome do inquilino
  countPagos: number            // qtd aluguéis pagos que serão descartados
  valorTotal: number            // soma de R$ que será descartada
  // Ação async — recebe o que o user digitou pra validar server-side
  onConfirm: (confirmacao: string) => Promise<{ error?: string }>
  // Callback de sucesso
  onSuccess?: () => void
}

const LABELS = {
  imovel:    { titulo: 'imóvel',     verbo: 'apelido' },
  inquilino: { titulo: 'inquilino',  verbo: 'nome'    },
}

export function ExcluirComHistoricoModal({
  open, onOpenChange, tipo, nome, countPagos, valorTotal, onConfirm, onSuccess,
}: Props) {
  const [digitado, setDigitado] = useState('')
  const [pending, startTransition] = useTransition()
  const labels = LABELS[tipo]

  function handleConfirm() {
    if (digitado.trim() !== nome) {
      toast.error(`Digite exatamente "${nome}" para confirmar.`)
      return
    }
    startTransition(async () => {
      const result = await onConfirm(digitado)
      if (result.error) { toast.error(result.error); return }
      toast.success(`${labels.titulo.charAt(0).toUpperCase() + labels.titulo.slice(1)} excluído permanentemente.`)
      setDigitado('')
      onOpenChange(false)
      onSuccess?.()
    })
  }

  function handleClose() {
    if (pending) return
    setDigitado('')
    onOpenChange(false)
  }

  const valorFmt = valorTotal.toLocaleString('pt-BR', {
    style: 'currency', currency: 'BRL',
  })

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-destructive flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Excluir {labels.titulo} com histórico?
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-2">
            <p className="text-sm font-medium text-destructive">Isso é destrutivo e irreversível.</p>
            <p className="text-sm text-slate-600 leading-relaxed">
              Esse {labels.titulo} tem <strong>{countPagos}</strong> {countPagos === 1 ? 'aluguel pago' : 'aluguéis pagos'}
              {' '}somando <strong>{valorFmt}</strong> no histórico contábil. Ao excluir:
            </p>
            <ul className="text-xs text-slate-600 list-disc pl-5 space-y-1">
              <li>Todo o histórico de aluguéis será apagado</li>
              <li>Os recibos serão removidos do sistema</li>
              <li>O Relatório IR perde esses valores</li>
              <li>A ação fica registrada no log de auditoria (não-apagável)</li>
            </ul>
            <p className="text-xs text-slate-500 italic pt-1">
              Recomendação: a Receita Federal exige guardar comprovantes fiscais
              por <strong>5 anos</strong>. Se ainda estiver nesse prazo, prefira{' '}
              {tipo === 'imovel' ? '"Arquivar"' : '"Desativar"'} em vez de excluir.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmacao" className="text-xs font-semibold">
              Digite <span className="font-bold text-slate-900">{nome}</span> para confirmar
            </Label>
            <Input
              id="confirmacao"
              value={digitado}
              onChange={e => setDigitado(e.target.value)}
              placeholder={nome}
              autoFocus
              disabled={pending}
            />
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <Button variant="outline" onClick={handleClose} disabled={pending}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={pending || digitado.trim() !== nome}
              onClick={handleConfirm}
              className="gap-1.5"
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Excluir tudo permanentemente
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
