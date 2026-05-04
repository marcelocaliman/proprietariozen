'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { criarTicket } from '@/app/(dashboard)/suporte/actions'
import { CATEGORIA_LABELS, type TicketCategoria } from '@/lib/suporte'

const CATEGORIAS: TicketCategoria[] = ['duvida', 'bug', 'financeiro', 'conta', 'sugestao', 'outro']

export function NovoTicketForm() {
  const router = useRouter()
  const [assunto, setAssunto]     = useState('')
  const [categoria, setCategoria] = useState<TicketCategoria>('duvida')
  const [conteudo, setConteudo]   = useState('')
  const [pending, startTransition] = useTransition()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const result = await criarTicket({ assunto, categoria, conteudo })
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Ticket criado! Você receberá uma notificação quando responderem.')
      router.push(`/suporte/${result.ticketId}`)
    })
  }

  return (
    <Card className="rounded-2xl border-slate-100 shadow-sm">
      <CardContent className="p-6">
        <form onSubmit={submit} className="space-y-5">
          <div>
            <Label className="text-xs font-semibold text-slate-700">Categoria</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1.5">
              {CATEGORIAS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategoria(c)}
                  className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors text-left ${
                    categoria === c
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {CATEGORIA_LABELS[c]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="assunto" className="text-xs font-semibold text-slate-700">
              Assunto
            </Label>
            <Input
              id="assunto"
              value={assunto}
              onChange={e => setAssunto(e.target.value)}
              placeholder="Resumo curto do problema (ex: cobrança duplicada em maio)"
              className="mt-1.5"
              maxLength={200}
              required
            />
            <p className="text-[10px] text-slate-400 mt-1">{assunto.length}/200</p>
          </div>

          <div>
            <Label htmlFor="conteudo" className="text-xs font-semibold text-slate-700">
              Mensagem
            </Label>
            <textarea
              id="conteudo"
              value={conteudo}
              onChange={e => setConteudo(e.target.value)}
              placeholder="Conta o que está acontecendo, quando começou, o que você esperava que acontecesse e o que aconteceu de verdade. Quanto mais detalhe, mais rápido a gente resolve."
              rows={8}
              maxLength={5000}
              required
              className="mt-1.5 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 leading-relaxed"
            />
            <p className="text-[10px] text-slate-400 mt-1">{conteudo.length}/5000</p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/suporte')}
              disabled={pending}
              className="text-sm"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={pending || conteudo.trim().length < 10 || assunto.trim().length < 3}
              className="bg-emerald-600 hover:bg-emerald-700 gap-2 text-sm font-semibold"
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Abrir ticket
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
