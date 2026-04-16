'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  Check, X, Zap, Building2, FileText,
  TrendingUp, BarChart3, Mail, Shield, Loader2, Star,
} from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import type { PlanoTipo } from '@/lib/stripe'

function Recurso({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 text-sm py-1">
      {ok
        ? <Check className="h-4 w-4 shrink-0 text-emerald-500" />
        : <X className="h-4 w-4 shrink-0 text-[#94A3B8]" />}
      <span className={ok ? 'text-[#0F172A]' : 'text-[#94A3B8]'}>{children}</span>
    </li>
  )
}

interface Props { planoAtual: PlanoTipo }

export function PlanosClient({ planoAtual }: Props) {
  const [loadingMaster, setLoadingMaster]   = useState(false)
  const [loadingElite,  setLoadingElite]    = useState(false)
  const [loadingPortal, setLoadingPortal]   = useState(false)

  async function handleAssinar(plano: 'pago' | 'elite') {
    const setLoading = plano === 'elite' ? setLoadingElite : setLoadingMaster
    setLoading(true)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plano }),
      })
      const json = await res.json()
      if (!res.ok || !json.url) { toast.error(json.error ?? 'Erro ao iniciar pagamento'); return }
      window.location.href = json.url
    } catch { toast.error('Erro ao conectar com o servidor de pagamento') }
    finally { setLoading(false) }
  }

  async function handlePortal() {
    setLoadingPortal(true)
    try {
      const res = await fetch('/api/portal', { method: 'POST' })
      const json = await res.json()
      if (!res.ok || !json.url) { toast.error(json.error ?? 'Erro ao abrir portal'); return }
      window.location.href = json.url
    } catch { toast.error('Erro ao conectar com o servidor') }
    finally { setLoadingPortal(false) }
  }

  return (
    <div className="space-y-10 max-w-5xl mx-auto">
      {/* Cabeçalho */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-[#0F172A]">Escolha seu plano</h1>
        <p className="text-[#475569]">Simples, transparente, sem surpresas.</p>
      </div>

      {/* Cards */}
      <div className="grid gap-6 sm:grid-cols-3">

        {/* Grátis */}
        <Card className={`relative flex flex-col ${planoAtual === 'gratis' ? 'border-2 border-[#E2E8F0] ring-2 ring-[#E2E8F0]' : 'border border-[#E2E8F0]'}`}>
          {planoAtual === 'gratis' && (
            <div className="px-6 pt-5 pb-0">
              <Badge className="bg-[#F1F5F9] text-[#475569] hover:bg-[#F1F5F9] font-medium">Plano atual</Badge>
            </div>
          )}
          <CardHeader className={`${planoAtual === 'gratis' ? 'pt-3' : 'pt-6'} pb-4`}>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">Grátis</p>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-[#0F172A]">R$ 0</span>
                <span className="text-[#94A3B8] text-sm">/mês</span>
              </div>
              <p className="text-sm text-[#475569]">Para começar a organizar</p>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-5">
            <ul className="space-y-0.5">
              <Recurso ok={true}><Building2 className="h-3.5 w-3.5 inline mr-1" />1 imóvel · 1 inquilino</Recurso>
              <Recurso ok={true}>100 MB de armazenamento</Recurso>
              <Recurso ok={true}>Histórico de aluguéis</Recurso>
              <Recurso ok={true}>Dashboard com resumo</Recurso>
              <Recurso ok={false}><FileText className="h-3.5 w-3.5 inline mr-1" />Recibos PDF</Recurso>
              <Recurso ok={false}><TrendingUp className="h-3.5 w-3.5 inline mr-1" />Reajuste automático</Recurso>
              <Recurso ok={false}><BarChart3 className="h-3.5 w-3.5 inline mr-1" />Relatórios mensais</Recurso>
              <Recurso ok={false}><Mail className="h-3.5 w-3.5 inline mr-1" />Alertas automáticos</Recurso>
            </ul>
            <div className="mt-auto">
              {planoAtual === 'gratis'
                ? <Button variant="outline" className="w-full" disabled>Plano atual</Button>
                : <Button variant="outline" className="w-full" onClick={handlePortal} disabled={loadingPortal}>
                    {loadingPortal && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Gerenciar no Stripe
                  </Button>
              }
            </div>
          </CardContent>
        </Card>

        {/* Master */}
        <Card className={`relative flex flex-col border-2 border-emerald-500 ${planoAtual === 'pago' ? 'ring-2 ring-emerald-200' : ''}`}>
          <div className="px-6 pt-5 pb-0">
            {planoAtual === 'pago'
              ? <Badge className="bg-[#D1FAE5] text-[#065F46] hover:bg-[#D1FAE5] font-semibold"><Check className="h-3 w-3 mr-1" />Ativo</Badge>
              : <Badge className="bg-emerald-600 hover:bg-emerald-600 font-semibold"><Zap className="h-3 w-3 mr-1" />Mais popular</Badge>
            }
          </div>
          <CardHeader className="pt-3 pb-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Master</p>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-emerald-700">R$ 49,90</span>
                <span className="text-[#94A3B8] text-sm">/mês</span>
              </div>
              <p className="text-sm text-[#475569]">Gestão completa de imóveis</p>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-5">
            <ul className="space-y-0.5">
              <Recurso ok={true}><Building2 className="h-3.5 w-3.5 inline mr-1" />3 imóveis · 3 inquilinos</Recurso>
              <Recurso ok={true}>500 MB de armazenamento</Recurso>
              <Recurso ok={true}>Histórico de aluguéis</Recurso>
              <Recurso ok={true}>Dashboard com resumo</Recurso>
              <Recurso ok={true}><FileText className="h-3.5 w-3.5 inline mr-1" />Recibos PDF</Recurso>
              <Recurso ok={true}><TrendingUp className="h-3.5 w-3.5 inline mr-1" />Reajuste automático (IGPM/IPCA)</Recurso>
              <Recurso ok={true}><BarChart3 className="h-3.5 w-3.5 inline mr-1" />Relatórios mensais</Recurso>
              <Recurso ok={true}><Mail className="h-3.5 w-3.5 inline mr-1" />Alertas por e-mail</Recurso>
            </ul>
            <div className="mt-auto">
              {planoAtual === 'pago'
                ? <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={handlePortal} disabled={loadingPortal}>
                    {loadingPortal && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Gerenciar assinatura
                  </Button>
                : planoAtual === 'elite'
                  ? <Button variant="outline" className="w-full" disabled>Plano inferior</Button>
                  : <Button className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2" onClick={() => handleAssinar('pago')} disabled={loadingMaster}>
                      {loadingMaster ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                      Assinar Master — R$ 49,90/mês
                    </Button>
              }
            </div>
          </CardContent>
        </Card>

        {/* Elite */}
        <Card className={`relative flex flex-col border-2 border-purple-500 ${planoAtual === 'elite' ? 'ring-2 ring-purple-200' : ''}`}>
          <div className="px-6 pt-5 pb-0">
            {planoAtual === 'elite'
              ? <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 font-semibold"><Check className="h-3 w-3 mr-1" />Ativo</Badge>
              : <Badge className="bg-purple-600 hover:bg-purple-600 font-semibold"><Star className="h-3 w-3 mr-1" />Premium</Badge>
            }
          </div>
          <CardHeader className="pt-3 pb-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-purple-600 uppercase tracking-wider">Elite</p>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-purple-700">R$ 99,90</span>
                <span className="text-[#94A3B8] text-sm">/mês</span>
              </div>
              <p className="text-sm text-[#475569]">Para quem gerencia em escala</p>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-5">
            <ul className="space-y-0.5">
              <Recurso ok={true}><Building2 className="h-3.5 w-3.5 inline mr-1" />10 imóveis · ilimitado inquilinos</Recurso>
              <Recurso ok={true}>5 GB de armazenamento</Recurso>
              <Recurso ok={true}>Histórico de aluguéis</Recurso>
              <Recurso ok={true}>Dashboard com resumo</Recurso>
              <Recurso ok={true}><FileText className="h-3.5 w-3.5 inline mr-1" />Recibos PDF</Recurso>
              <Recurso ok={true}><TrendingUp className="h-3.5 w-3.5 inline mr-1" />Reajuste automático (IGPM/IPCA)</Recurso>
              <Recurso ok={true}><BarChart3 className="h-3.5 w-3.5 inline mr-1" />Relatórios mensais</Recurso>
              <Recurso ok={true}><Mail className="h-3.5 w-3.5 inline mr-1" />Alertas + cobrança automática</Recurso>
              <Recurso ok={true}><Shield className="h-3.5 w-3.5 inline mr-1" />Suporte prioritário</Recurso>
            </ul>
            <div className="mt-auto">
              {planoAtual === 'elite'
                ? <Button className="w-full bg-purple-600 hover:bg-purple-700" onClick={handlePortal} disabled={loadingPortal}>
                    {loadingPortal && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Gerenciar assinatura
                  </Button>
                : <Button className="w-full bg-purple-600 hover:bg-purple-700 gap-2" onClick={() => handleAssinar('elite')} disabled={loadingElite}>
                    {loadingElite ? <Loader2 className="h-4 w-4 animate-spin" /> : <Star className="h-4 w-4" />}
                    {planoAtual === 'pago'
                      ? 'Fazer upgrade para Elite'
                      : 'Assinar Elite — R$ 99,90/mês'}
                  </Button>
              }
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Garantias */}
      <div>
        <Separator className="mb-8" />
        <div className="grid gap-6 sm:grid-cols-3 text-center">
          <div className="space-y-2">
            <div className="flex justify-center">
              <div className="p-3 rounded-full bg-[#F1F5F9]">
                <Shield className="h-6 w-6 text-[#475569]" />
              </div>
            </div>
            <p className="text-sm font-semibold text-[#0F172A]">Cancele quando quiser</p>
            <p className="text-xs text-[#94A3B8]">Sem fidelidade. Cancele a qualquer momento.</p>
          </div>
          <div className="space-y-2">
            <div className="flex justify-center">
              <div className="p-3 rounded-full bg-[#F1F5F9]">
                <Check className="h-6 w-6 text-[#475569]" />
              </div>
            </div>
            <p className="text-sm font-semibold text-[#0F172A]">Pagamento seguro SSL</p>
            <p className="text-xs text-[#94A3B8]">Processado pela Stripe com criptografia.</p>
          </div>
          <div className="space-y-2">
            <div className="flex justify-center">
              <div className="p-3 rounded-full bg-[#F1F5F9]">
                <Zap className="h-6 w-6 text-[#475569]" />
              </div>
            </div>
            <p className="text-sm font-semibold text-[#0F172A]">Ativação imediata</p>
            <p className="text-xs text-[#94A3B8]">Acesso liberado ao confirmar o pagamento.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
