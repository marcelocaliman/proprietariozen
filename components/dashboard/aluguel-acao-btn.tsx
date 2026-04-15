'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, FileText, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { marcarComoPago, buscarDetalhesAluguel, marcarReciboGerado } from '@/app/(dashboard)/alugueis/actions'

interface AluguelAcaoBtnProps {
  aluguelId: string
  status: string
}

export function AluguelAcaoBtn({ aluguelId, status }: AluguelAcaoBtnProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleVerRecibo() {
    setLoading(true)
    try {
      const result = await buscarDetalhesAluguel(aluguelId)
      if (result.error || !result.pagamento || !result.proprietario) {
        toast.error(result.error ?? 'Erro ao buscar dados do recibo')
        return
      }
      const { gerarReciboPDF } = await import('@/lib/pdf')
      gerarReciboPDF({ pagamento: result.pagamento, proprietario: result.proprietario })
      await marcarReciboGerado(aluguelId)
    } catch {
      toast.error('Erro ao gerar recibo')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'pago') {
    return (
      <button
        title="Ver recibo"
        disabled={loading}
        onClick={handleVerRecibo}
        className="h-7 w-7 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors disabled:opacity-40"
      >
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
      </button>
    )
  }

  async function handleMarkPago() {
    setLoading(true)
    try {
      const hoje = new Date().toISOString().split('T')[0]
      const result = await marcarComoPago(aluguelId, hoje, null)
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success('Aluguel marcado como pago!')
        router.refresh()
      }
    } catch {
      toast.error('Erro ao marcar como pago')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      title="Marcar como pago"
      disabled={loading}
      onClick={handleMarkPago}
      className="h-7 w-7 rounded-full flex items-center justify-center text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-40"
    >
      <Check className="h-3.5 w-3.5" />
    </button>
  )
}
