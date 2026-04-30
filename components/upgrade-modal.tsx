'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Zap, Star, Check, X, Loader2 } from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

type Props = {
  open: boolean
  onOpenChange: (v: boolean) => void
  // Contexto do gatilho — usado no header pra mensagem
  reason?: 'limite_imoveis' | 'feature_paga' | 'manual'
  /** Texto opcional pra customizar a descrição do header */
  description?: string
}

function Recurso({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2.5 text-sm">
      {ok
        ? <Check className="h-4 w-4 shrink-0 text-emerald-600" />
        : <X className="h-4 w-4 shrink-0 text-slate-300" />}
      <span className={ok ? 'text-slate-800' : 'text-slate-400'}>{children}</span>
    </li>
  )
}

const HEADER_DEFAULTS: Record<NonNullable<Props['reason']>, { titulo: string; subtitulo: string }> = {
  limite_imoveis: {
    titulo: 'Você atingiu o limite do plano Grátis',
    subtitulo: 'Faça upgrade para cadastrar mais imóveis e desbloquear cobrança automática, recibos PDF e alertas.',
  },
  feature_paga: {
    titulo: 'Esse recurso é dos planos pagos',
    subtitulo: 'Faça upgrade para acessar e ganhe ainda mais ferramentas pra automatizar a gestão dos seus imóveis.',
  },
  manual: {
    titulo: 'Escolha o plano ideal',
    subtitulo: 'Desbloqueie todos os recursos do ProprietárioZen.',
  },
}

export function UpgradeModal({ open, onOpenChange, reason = 'limite_imoveis', description }: Props) {
  const [loadingMaster, setLoadingMaster] = useState(false)
  const [loadingElite, setLoadingElite] = useState(false)

  const header = HEADER_DEFAULTS[reason]

  async function handleAssinar(planoPretendido: 'pago' | 'elite') {
    const setLoading = planoPretendido === 'elite' ? setLoadingElite : setLoadingMaster
    setLoading(true)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plano: planoPretendido }),
      })
      const json = await res.json()
      if (!res.ok || !json.url) {
        toast.error(json.error ?? 'Erro ao iniciar pagamento')
        return
      }
      window.location.href = json.url
    } catch {
      toast.error('Erro ao conectar com o servidor de pagamento')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl p-0 overflow-hidden gap-0">
        {/* Header gradiente verde */}
        <div
          className="px-6 sm:px-8 py-6 sm:py-7 relative overflow-hidden text-white"
          style={{
            background: 'linear-gradient(135deg, #022C22 0%, #064E3B 50%, #059669 100%)',
          }}
        >
          <div className="absolute top-0 right-0 w-72 h-72 rounded-full pointer-events-none" style={{ background: 'rgba(110, 231, 183, 0.20)', filter: 'blur(80px)', transform: 'translate(40%, -40%)' }} />
          <div className="absolute bottom-0 left-0 w-56 h-56 rounded-full pointer-events-none" style={{ background: 'rgba(52, 211, 153, 0.12)', filter: 'blur(70px)' }} />
          <div className="relative z-10 flex items-start gap-3">
            <div className="shrink-0 h-11 w-11 rounded-xl bg-white/15 border border-white/25 backdrop-blur-sm flex items-center justify-center">
              <Zap className="h-5 w-5 text-emerald-200" />
            </div>
            <div className="min-w-0">
              <h2 className="font-extrabold leading-tight" style={{ fontSize: 'clamp(20px, 2vw, 26px)', letterSpacing: '-0.02em' }}>
                {header.titulo}
              </h2>
              <p className="text-sm text-emerald-100/80 mt-1.5 leading-relaxed max-w-xl">
                {description ?? header.subtitulo}
              </p>
            </div>
          </div>
        </div>

        {/* Cards dos planos */}
        <div className="bg-slate-50/60 px-5 sm:px-7 py-6">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Master */}
            <div className="rounded-2xl bg-white border-2 border-emerald-200 shadow-sm overflow-hidden flex flex-col">
              <div className="px-5 py-4 border-b border-emerald-100 bg-emerald-50/40">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700/80">Master</p>
                    <p className="text-emerald-700 font-extrabold mt-1.5" style={{ fontSize: 'clamp(24px, 2.4vw, 30px)', letterSpacing: '-0.02em' }}>
                      R$ 49,90
                      <span className="text-xs font-medium text-emerald-600/70 ml-1">/mês</span>
                    </p>
                  </div>
                  <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-[10px] shrink-0">
                    <Zap className="h-3 w-3 mr-1" />Recomendado
                  </Badge>
                </div>
              </div>
              <div className="p-5 flex-1 flex flex-col gap-4">
                <ul className="space-y-2">
                  <Recurso ok>3 imóveis · 3 inquilinos</Recurso>
                  <Recurso ok>500 MB de armazenamento</Recurso>
                  <Recurso ok>Recibos PDF</Recurso>
                  <Recurso ok>Alertas por e-mail</Recurso>
                  <Recurso ok>Reajuste automático (IGPM/IPCA)</Recurso>
                  <Recurso ok={false}>Cobrança automática</Recurso>
                </ul>
                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2 h-10 text-sm font-semibold mt-auto"
                  onClick={() => handleAssinar('pago')}
                  disabled={loadingMaster || loadingElite}
                >
                  {loadingMaster ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                  Assinar Master
                </Button>
              </div>
            </div>

            {/* Elite */}
            <div className="rounded-2xl bg-white border-2 border-purple-200 shadow-sm overflow-hidden flex flex-col">
              <div className="px-5 py-4 border-b border-purple-100 bg-purple-50/40">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-purple-700/80">Elite</p>
                    <p className="text-purple-700 font-extrabold mt-1.5" style={{ fontSize: 'clamp(24px, 2.4vw, 30px)', letterSpacing: '-0.02em' }}>
                      R$ 99,90
                      <span className="text-xs font-medium text-purple-600/70 ml-1">/mês</span>
                    </p>
                  </div>
                  <Badge className="bg-purple-600 hover:bg-purple-600 text-white text-[10px] shrink-0">
                    <Star className="h-3 w-3 mr-1" />Premium
                  </Badge>
                </div>
              </div>
              <div className="p-5 flex-1 flex flex-col gap-4">
                <ul className="space-y-2">
                  <Recurso ok>10 imóveis · inquilinos ilimitados</Recurso>
                  <Recurso ok>5 GB de armazenamento</Recurso>
                  <Recurso ok>Recibos PDF</Recurso>
                  <Recurso ok>Alertas por e-mail</Recurso>
                  <Recurso ok>Reajuste automático (IGPM/IPCA)</Recurso>
                  <Recurso ok>Cobrança automática + suporte prioritário</Recurso>
                </ul>
                <Button
                  className="w-full bg-purple-600 hover:bg-purple-700 gap-2 h-10 text-sm font-semibold mt-auto"
                  onClick={() => handleAssinar('elite')}
                  disabled={loadingMaster || loadingElite}
                >
                  {loadingElite ? <Loader2 className="h-4 w-4 animate-spin" /> : <Star className="h-4 w-4" />}
                  Assinar Elite
                </Button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 mt-5 pt-4 border-t border-slate-200">
            <p className="text-[11px] text-slate-500">
              Cancele a qualquer momento. Pagamento seguro via Stripe.
            </p>
            <button
              onClick={() => onOpenChange(false)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors"
            >
              Agora não
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
