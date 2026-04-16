'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Mail, AlertCircle, UserPlus } from 'lucide-react'
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

export function LembreteModal({ open, aluguel, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false)

  async function handleEnviar() {
    if (!aluguel) return
    setLoading(true)
    try {
      const res = await fetch(`/api/alugueis/${aluguel.id}/lembrete`, { method: 'POST' })
      const json = await res.json() as { error?: string; enviadoPara?: string }
      if (!res.ok) { toast.error(json.error ?? 'Erro ao enviar'); return }
      toast.success(`Lembrete enviado para ${json.enviadoPara ?? aluguel.inquilino?.email}`)
      onSuccess({ lembrete_enviado_em: new Date().toISOString() })
      onClose()
    } finally { setLoading(false) }
  }

  if (!aluguel) return null

  const email = aluguel.inquilino?.email
  const nome = aluguel.inquilino?.nome ?? 'Sem inquilino'

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Enviar lembrete de cobrança
          </DialogTitle>
        </DialogHeader>

        {!email ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
              <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-medium">Inquilino sem e-mail</p>
                <p className="text-xs mt-0.5 text-amber-700">
                  Cadastre o e-mail de <strong>{nome}</strong> para poder enviar lembretes.
                </p>
              </div>
            </div>
            <div className="-mx-4 -mb-4 flex gap-2 justify-end border-t bg-muted/50 p-4 rounded-b-xl">
              <Button type="button" variant="outline" onClick={onClose}>Fechar</Button>
              <Button
                type="button"
                className="gap-2 bg-amber-600 hover:bg-amber-700"
                onClick={onClose}
              >
                <UserPlus className="h-4 w-4" />
                Cadastrar e-mail
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Preview do email */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2.5 text-sm">
              <div className="flex items-center gap-2 text-slate-600">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide w-14 shrink-0">Para</span>
                <span className="font-medium text-slate-700">{email}</span>
              </div>
              <div className="flex items-start gap-2 text-slate-600">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide w-14 shrink-0 pt-0.5">Assunto</span>
                <span className="text-slate-700">Lembrete de aluguel em aberto — {aluguel.imovel?.apelido}</span>
              </div>
              <hr className="border-slate-200" />
              <p className="text-xs text-slate-600 leading-relaxed">
                Olá, <strong>{nome}</strong>! Seu aluguel do{' '}
                <strong>{aluguel.imovel?.apelido}</strong> referente a{' '}
                <strong>{formatarMesReferencia(aluguel.mes_referencia)}</strong> está em aberto
                desde <strong>{formatarData(aluguel.data_vencimento)}</strong>.{' '}
                Valor: <strong>{formatarMoeda(aluguel.valor)}</strong>. Por favor regularize
                assim que possível.
              </p>
            </div>

            <div className="-mx-4 -mb-4 flex gap-2 justify-end border-t bg-muted/50 p-4 rounded-b-xl">
              <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
              <Button
                type="button"
                onClick={handleEnviar}
                disabled={loading}
                className="gap-2 bg-rose-600 hover:bg-rose-700"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                Enviar agora
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
