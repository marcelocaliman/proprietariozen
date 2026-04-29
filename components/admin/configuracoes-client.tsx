'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import {
  Activity, Building2, Users, Banknote, Mail, Shield, Megaphone,
  CheckCircle2, XCircle, ExternalLink, RefreshCw, Loader2,
  AlertTriangle, FileText, Server, Key, Database, Send, Zap,
} from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { LIMITES_PLANO } from '@/lib/stripe'
import type { SystemSettings, GlobalBanner, MaintenanceMode, Announcement } from '@/lib/system-settings'
import { atualizarSetting, executarCronAlertas, executarCronGerarAlugueis } from '@/app/admin/configuracoes/actions'
import { cn } from '@/lib/utils'

interface Stats {
  usuarios: { total: number; novos30d: number; banidos: number; comAsaas: number }
  imoveis: { total: number; automatic: number; receitaTotal: number }
  inquilinos: { total: number }
  alugueis: { total: number; pagos: number }
  planos: { gratis: number; pago: number; elite: number }
  mrr: number
  documentos: { imovel: number; aluguel: number; inquilino: number }
  tokensAtivos: number
  logsHoje: number
}

interface EnvStatus {
  asaas_api_key_root: boolean
  asaas_encryption_key: boolean
  asaas_webhook_token: boolean
  asaas_base_url: string | null
  stripe_secret: boolean
  stripe_publishable: boolean
  stripe_webhook_secret: boolean
  stripe_price_master: boolean
  stripe_price_elite: boolean
  resend_api_key: boolean
  supabase_url: boolean
  supabase_anon_key: boolean
  supabase_service_role: boolean
  cron_secret: boolean
  next_public_app_url: string | null
}

interface Props {
  stats: Stats
  settings: SystemSettings
  envStatus: EnvStatus
  logsRecentes: { id: string; action: string; entity_type: string | null; entity_id: string | null; details: Record<string, unknown> | null; created_at: string; user_id: string | null }[]
  cronGerarLogs: { action: string; details: Record<string, unknown> | null; created_at: string }[]
  cronAlertasLogs: { action: string; details: Record<string, unknown> | null; created_at: string }[]
  ultimaAtividadeAsaas: string | null
  ultimaAtividadeStripe: string | null
}

function formatBRL(centavos: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(centavos)
}

function formatDataHora(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

function formatRelativo(iso: string | null): string {
  if (!iso) return 'nunca'
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60_000)
  const h = Math.floor(diff / 3_600_000)
  const d = Math.floor(diff / 86_400_000)
  if (min < 60) return `há ${min}min`
  if (h < 24) return `há ${h}h`
  return `há ${d}d`
}

export function ConfiguracoesAdminClient({
  stats, settings, envStatus, logsRecentes,
  cronGerarLogs, cronAlertasLogs,
  ultimaAtividadeAsaas, ultimaAtividadeStripe,
}: Props) {
  return (
    <div className="space-y-7 max-w-[1400px] mx-auto">
      <div>
        <p className="text-sm text-slate-500 font-medium">Painel administrativo</p>
        <h1
          className="font-extrabold tracking-tight text-slate-900 mt-1 leading-[1.05]"
          style={{ letterSpacing: '-0.025em', fontSize: 'clamp(28px, 3vw, 40px)' }}
        >
          Configurações & Sistema
        </h1>
      </div>

      <Tabs defaultValue="status">
        <TabsList className="bg-slate-100 border border-slate-200 rounded-lg p-1 h-auto w-full sm:w-auto overflow-x-auto flex-nowrap">
          <TabsTrigger value="status" className="text-slate-600 data-[selected]:text-slate-900 gap-1.5">
            <Activity className="h-3.5 w-3.5" /> Status
          </TabsTrigger>
          <TabsTrigger value="planos" className="text-slate-600 data-[selected]:text-slate-900 gap-1.5">
            <Banknote className="h-3.5 w-3.5" /> Planos
          </TabsTrigger>
          <TabsTrigger value="integracoes" className="text-slate-600 data-[selected]:text-slate-900 gap-1.5">
            <Server className="h-3.5 w-3.5" /> Integrações
          </TabsTrigger>
          <TabsTrigger value="emails" className="text-slate-600 data-[selected]:text-slate-900 gap-1.5">
            <Mail className="h-3.5 w-3.5" /> E-mails
          </TabsTrigger>
          <TabsTrigger value="automacao" className="text-slate-600 data-[selected]:text-slate-900 gap-1.5">
            <Zap className="h-3.5 w-3.5" /> Automação
          </TabsTrigger>
          <TabsTrigger value="seguranca" className="text-slate-600 data-[selected]:text-slate-900 gap-1.5">
            <Shield className="h-3.5 w-3.5" /> Segurança
          </TabsTrigger>
          <TabsTrigger value="comunicacao" className="text-slate-600 data-[selected]:text-slate-900 gap-1.5">
            <Megaphone className="h-3.5 w-3.5" /> Comunicação
          </TabsTrigger>
        </TabsList>

        {/* ── 1. STATUS ── */}
        <TabsContent value="status" className="space-y-5 mt-5">
          <StatsHero stats={stats} />
          <SystemHealth envStatus={envStatus} ultimaAtividadeAsaas={ultimaAtividadeAsaas} ultimaAtividadeStripe={ultimaAtividadeStripe} />
          <PlatformStats stats={stats} />
        </TabsContent>

        {/* ── 2. PLANOS ── */}
        <TabsContent value="planos" className="space-y-5 mt-5">
          <PlanosTable stats={stats} />
          <StripePriceIds envStatus={envStatus} />
        </TabsContent>

        {/* ── 3. INTEGRAÇÕES ── */}
        <TabsContent value="integracoes" className="space-y-5 mt-5">
          <IntegracoesGrid envStatus={envStatus} ultimaAtividadeAsaas={ultimaAtividadeAsaas} ultimaAtividadeStripe={ultimaAtividadeStripe} />
        </TabsContent>

        {/* ── 4. E-MAILS ── */}
        <TabsContent value="emails" className="space-y-5 mt-5">
          <EmailsTemplates />
        </TabsContent>

        {/* ── 5. AUTOMAÇÃO ── */}
        <TabsContent value="automacao" className="space-y-5 mt-5">
          <CronJobsPanel cronGerarLogs={cronGerarLogs} cronAlertasLogs={cronAlertasLogs} />
        </TabsContent>

        {/* ── 6. SEGURANÇA ── */}
        <TabsContent value="seguranca" className="space-y-5 mt-5">
          <SegurancaPanel stats={stats} logsRecentes={logsRecentes} />
        </TabsContent>

        {/* ── 7. COMUNICAÇÃO ── */}
        <TabsContent value="comunicacao" className="space-y-5 mt-5">
          <ComunicacaoPanel settings={settings} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// 1. STATUS
// ═══════════════════════════════════════════════════════════════

function StatsHero({ stats }: { stats: Stats }) {
  return (
    <div className="grid gap-4 lg:grid-cols-7">
      <div
        className="lg:col-span-3 rounded-2xl p-7 relative overflow-hidden text-white flex flex-col justify-between min-h-[200px]"
        style={{
          background: 'linear-gradient(135deg, #022C22 0%, #064E3B 50%, #059669 100%)',
          boxShadow: '0 8px 32px rgba(5, 150, 105, 0.20)',
        }}
      >
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full pointer-events-none" style={{ background: 'rgba(110, 231, 183, 0.18)', filter: 'blur(80px)', transform: 'translate(40%, -40%)' }} />
        <div className="relative z-10">
          <p className="text-[11px] uppercase tracking-widest font-semibold text-emerald-200">MRR estimado</p>
          <p
            className="font-extrabold leading-none mt-2"
            style={{
              fontSize: 'clamp(36px, 4.5vw, 52px)',
              background: 'linear-gradient(135deg, #FFFFFF 0%, #6EE7B7 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              letterSpacing: '-0.025em',
            }}
          >
            {formatBRL(stats.mrr)}
          </p>
        </div>
        <div className="relative z-10 mt-5">
          <p className="text-sm text-emerald-100/80">
            {stats.planos.pago + stats.planos.elite} assinaturas ativas
          </p>
        </div>
      </div>

      <div className="lg:col-span-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MiniStat label="Usuários" value={stats.usuarios.total.toString()} sub={`+${stats.usuarios.novos30d} em 30d`} icon={Users} />
        <MiniStat label="Imóveis" value={stats.imoveis.total.toString()} sub={`${stats.imoveis.automatic} automáticos`} icon={Building2} />
        <MiniStat label="Inquilinos" value={stats.inquilinos.total.toString()} icon={Users} />
        <MiniStat label="Aluguéis" value={stats.alugueis.total.toString()} sub={`${stats.alugueis.pagos} pagos`} icon={Banknote} />
      </div>
    </div>
  )
}

function MiniStat({ label, value, sub, icon: Icon }: { label: string; value: string; sub?: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 py-4 px-5 shadow-sm flex flex-col justify-between min-h-[110px]">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
        <div className="h-8 w-8 rounded-lg bg-emerald-500/15 text-emerald-600 flex items-center justify-center">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-2">
        <p className="font-extrabold text-slate-900 leading-none" style={{ letterSpacing: '-0.02em', fontSize: 'clamp(20px, 2vw, 26px)' }}>
          {value}
        </p>
        {sub && <p className="text-[11px] text-slate-400 mt-1">{sub}</p>}
      </div>
    </div>
  )
}

function SystemHealth({ envStatus, ultimaAtividadeAsaas, ultimaAtividadeStripe }: { envStatus: EnvStatus; ultimaAtividadeAsaas: string | null; ultimaAtividadeStripe: string | null }) {
  const services = [
    {
      name: 'Asaas',
      ok: envStatus.asaas_api_key_root && envStatus.asaas_encryption_key && envStatus.asaas_webhook_token,
      sub: `Última cobrança gerada: ${formatRelativo(ultimaAtividadeAsaas)}`,
      env: envStatus.asaas_base_url ?? 'Não configurado',
    },
    {
      name: 'Stripe',
      ok: envStatus.stripe_secret && envStatus.stripe_webhook_secret,
      sub: `Último checkout: ${formatRelativo(ultimaAtividadeStripe)}`,
      env: envStatus.stripe_secret ? 'Conectado' : 'Não configurado',
    },
    {
      name: 'Resend',
      ok: envStatus.resend_api_key,
      sub: 'Envio de e-mails transacionais',
      env: envStatus.resend_api_key ? 'API Key configurada' : 'Não configurado',
    },
    {
      name: 'Supabase',
      ok: envStatus.supabase_url && envStatus.supabase_service_role,
      sub: 'Banco + Auth + Storage',
      env: envStatus.supabase_url ? 'URL configurada' : 'Não configurado',
    },
    {
      name: 'Cron jobs',
      ok: envStatus.cron_secret,
      sub: 'Vercel Cron — disparados automaticamente',
      env: envStatus.cron_secret ? 'Secret configurado' : 'Sem CRON_SECRET',
    },
  ]

  return (
    <Card className="rounded-2xl border-slate-100 shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="h-4 w-4 text-emerald-600" />
          <h3 className="text-sm font-bold text-slate-900">Saúde do sistema</h3>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {services.map(s => (
            <div key={s.name} className="rounded-xl border border-slate-100 p-3">
              <div className="flex items-center gap-2 mb-1">
                {s.ok ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                )}
                <p className="text-sm font-semibold text-slate-900">{s.name}</p>
              </div>
              <p className="text-[11px] text-slate-500">{s.sub}</p>
              <p className="text-[10px] text-slate-400 mt-1 truncate" title={s.env}>{s.env}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function PlatformStats({ stats }: { stats: Stats }) {
  return (
    <Card className="rounded-2xl border-slate-100 shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Database className="h-4 w-4 text-emerald-600" />
          <h3 className="text-sm font-bold text-slate-900">Distribuição</h3>
        </div>
        <div className="grid sm:grid-cols-3 gap-4 mb-6">
          <DistribuicaoItem label="Plano Grátis" value={stats.planos.gratis} max={stats.usuarios.total} color="slate" />
          <DistribuicaoItem label="Master" value={stats.planos.pago} max={stats.usuarios.total} color="emerald" />
          <DistribuicaoItem label="Elite" value={stats.planos.elite} max={stats.usuarios.total} color="purple" />
        </div>
        <div className="grid sm:grid-cols-4 gap-3 pt-4 border-t border-slate-100">
          <KeyVal label="Receita esperada/mês" value={formatBRL(stats.imoveis.receitaTotal)} />
          <KeyVal label="Documentos imóvel" value={stats.documentos.imovel.toString()} />
          <KeyVal label="Documentos aluguel" value={stats.documentos.aluguel.toString()} />
          <KeyVal label="Tokens inquilino ativos" value={stats.tokensAtivos.toString()} />
        </div>
      </CardContent>
    </Card>
  )
}

function DistribuicaoItem({ label, value, max, color }: { label: string; value: number; max: number; color: 'slate' | 'emerald' | 'purple' }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  const colors = {
    slate: 'bg-slate-400',
    emerald: 'bg-emerald-500',
    purple: 'bg-purple-500',
  }
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <p className="text-xs text-slate-500 font-medium">{label}</p>
        <p className="text-sm font-bold text-slate-900">{value} <span className="text-xs text-slate-400 font-normal">({pct}%)</span></p>
      </div>
      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', colors[color])} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function KeyVal({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">{label}</p>
      <p className="text-sm font-bold text-slate-900 mt-0.5">{value}</p>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// 2. PLANOS
// ═══════════════════════════════════════════════════════════════

function PlanosTable({ stats }: { stats: Stats }) {
  const planos = [
    { id: 'gratis' as const, ...LIMITES_PLANO.gratis, ativos: stats.planos.gratis },
    { id: 'pago' as const,   ...LIMITES_PLANO.pago,   ativos: stats.planos.pago },
    { id: 'elite' as const,  ...LIMITES_PLANO.elite,  ativos: stats.planos.elite },
  ]
  const features: { key: keyof typeof LIMITES_PLANO.gratis; label: string }[] = [
    { key: 'imoveis', label: 'Imóveis' },
    { key: 'inquilinos', label: 'Inquilinos' },
    { key: 'storage_mb', label: 'Storage (MB)' },
    { key: 'recibos_pdf', label: 'Recibos PDF' },
    { key: 'reajuste', label: 'Reajuste' },
    { key: 'relatorios', label: 'Relatórios' },
    { key: 'cobranca_automatica', label: 'Cobrança automática' },
    { key: 'relatorio_ir', label: 'Relatório IR' },
    { key: 'suporte_prioritario', label: 'Suporte prioritário' },
  ]

  return (
    <Card className="rounded-2xl border-slate-100 shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Banknote className="h-4 w-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">Limites e features por plano</h3>
          </div>
          <p className="text-xs text-slate-400">Hardcoded em <code className="font-mono">lib/stripe.ts</code></p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-2 pr-4 text-[11px] uppercase tracking-widest text-slate-500 font-semibold">Feature</th>
                {planos.map(p => (
                  <th key={p.id} className="text-center py-2 px-3 min-w-[120px]">
                    <p className="text-[11px] uppercase tracking-widest text-slate-500 font-semibold">{p.nome}</p>
                    <p className="text-base font-extrabold text-slate-900 mt-0.5">{formatBRL(p.preco / 100)}/mês</p>
                    <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">{p.ativos} usuários</p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {features.map(f => (
                <tr key={f.key} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="py-2 pr-4 text-slate-700 font-medium">{f.label}</td>
                  {planos.map(p => {
                    const val = (LIMITES_PLANO[p.id] as Record<string, unknown>)[f.key]
                    return (
                      <td key={p.id} className="text-center py-2 px-3">
                        {typeof val === 'boolean' ? (
                          val
                            ? <CheckCircle2 className="h-4 w-4 text-emerald-600 mx-auto" />
                            : <XCircle className="h-4 w-4 text-slate-300 mx-auto" />
                        ) : (
                          <span className="font-mono text-sm text-slate-700">{String(val)}</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

function StripePriceIds({ envStatus }: { envStatus: EnvStatus }) {
  return (
    <Card className="rounded-2xl border-slate-100 shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Key className="h-4 w-4 text-emerald-600" />
          <h3 className="text-sm font-bold text-slate-900">Stripe Price IDs</h3>
        </div>
        <div className="space-y-2">
          <PriceRow label="Master mensal" set={envStatus.stripe_price_master} envName="STRIPE_PRICE_ID" />
          <PriceRow label="Elite mensal" set={envStatus.stripe_price_elite} envName="STRIPE_ELITE_PRICE_ID" />
        </div>
        <a
          href="https://dashboard.stripe.com/products"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-emerald-600 hover:underline mt-4"
        >
          Abrir Stripe Dashboard <ExternalLink className="h-3 w-3" />
        </a>
      </CardContent>
    </Card>
  )
}

function PriceRow({ label, set, envName }: { label: string; set: boolean; envName: string }) {
  return (
    <div className="flex items-center justify-between gap-2 py-2 border-b border-slate-50 last:border-0">
      <div>
        <p className="text-sm text-slate-700 font-medium">{label}</p>
        <p className="text-[11px] text-slate-400 font-mono">{envName}</p>
      </div>
      {set ? (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
          <CheckCircle2 className="h-3 w-3" /> Configurado
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
          <XCircle className="h-3 w-3" /> Faltando
        </span>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// 3. INTEGRAÇÕES
// ═══════════════════════════════════════════════════════════════

function IntegracoesGrid({ envStatus, ultimaAtividadeAsaas, ultimaAtividadeStripe }: { envStatus: EnvStatus; ultimaAtividadeAsaas: string | null; ultimaAtividadeStripe: string | null }) {
  const integracoes = [
    {
      name: 'Asaas',
      desc: 'Cobrança automática Pix + boleto',
      ok: envStatus.asaas_api_key_root && envStatus.asaas_encryption_key,
      vars: [
        { k: 'ASAAS_API_KEY_ROOT', set: envStatus.asaas_api_key_root },
        { k: 'ASAAS_ENCRYPTION_KEY', set: envStatus.asaas_encryption_key },
        { k: 'ASAAS_WEBHOOK_TOKEN', set: envStatus.asaas_webhook_token },
        { k: 'ASAAS_BASE_URL', set: !!envStatus.asaas_base_url, value: envStatus.asaas_base_url },
      ],
      atividade: `Última cobrança: ${formatRelativo(ultimaAtividadeAsaas)}`,
      link: 'https://www.asaas.com/integration',
    },
    {
      name: 'Stripe',
      desc: 'Cobrança recorrente de planos',
      ok: envStatus.stripe_secret && envStatus.stripe_webhook_secret,
      vars: [
        { k: 'STRIPE_SECRET_KEY', set: envStatus.stripe_secret },
        { k: 'STRIPE_PUBLISHABLE_KEY', set: envStatus.stripe_publishable },
        { k: 'STRIPE_WEBHOOK_SECRET', set: envStatus.stripe_webhook_secret },
      ],
      atividade: `Último checkout: ${formatRelativo(ultimaAtividadeStripe)}`,
      link: 'https://dashboard.stripe.com',
    },
    {
      name: 'Resend',
      desc: 'Envio de e-mails transacionais',
      ok: envStatus.resend_api_key,
      vars: [
        { k: 'RESEND_API_KEY', set: envStatus.resend_api_key },
      ],
      atividade: 'Logs disponíveis no Resend Dashboard',
      link: 'https://resend.com/emails',
    },
    {
      name: 'Supabase',
      desc: 'Banco de dados, auth e storage',
      ok: envStatus.supabase_url && envStatus.supabase_service_role,
      vars: [
        { k: 'NEXT_PUBLIC_SUPABASE_URL', set: envStatus.supabase_url },
        { k: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', set: envStatus.supabase_anon_key },
        { k: 'SUPABASE_SERVICE_ROLE_KEY', set: envStatus.supabase_service_role },
      ],
      atividade: 'Conexão ativa',
      link: 'https://supabase.com/dashboard',
    },
    {
      name: 'Vercel Cron',
      desc: 'Tarefas agendadas (alertas, geração mensal)',
      ok: envStatus.cron_secret,
      vars: [
        { k: 'CRON_SECRET', set: envStatus.cron_secret },
      ],
      atividade: 'Configurado em vercel.json',
      link: 'https://vercel.com/dashboard',
    },
  ]

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      {integracoes.map(i => (
        <Card key={i.name} className="rounded-2xl border-slate-100 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">{i.name}</h3>
                  {i.ok ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                      <CheckCircle2 className="h-3 w-3" /> Ativo
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-700 bg-red-50 px-1.5 py-0.5 rounded-full">
                      <XCircle className="h-3 w-3" /> Inativo
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{i.desc}</p>
              </div>
              <a href={i.link} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:bg-emerald-50 rounded-md p-1 shrink-0">
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
            <p className="text-[11px] text-slate-400 mb-3">{i.atividade}</p>
            <div className="space-y-1">
              {i.vars.map(v => (
                <div key={v.k} className="flex items-center justify-between gap-2 py-1 text-xs border-b border-slate-50 last:border-0">
                  <span className="font-mono text-slate-600 truncate">{v.k}</span>
                  <div className="shrink-0 flex items-center gap-2">
                    {'value' in v && v.value && (
                      <span className="text-[10px] text-slate-400 truncate max-w-[160px]">{v.value as string}</span>
                    )}
                    {v.set
                      ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      : <XCircle className="h-3.5 w-3.5 text-red-500" />}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// 4. E-MAILS
// ═══════════════════════════════════════════════════════════════

function EmailsTemplates() {
  const templates = [
    { id: 'lembrete_vencimento_proprietario', label: 'Lembrete vencimento (proprietário)', desc: 'Disparado 3 dias antes do vencimento', cor: 'amber' },
    { id: 'lembrete_inquilino', label: 'Lembrete vencimento (inquilino)', desc: 'Disparado 3 dias antes — com PIX/boleto', cor: 'amber' },
    { id: 'cobranca_inquilino', label: 'Cobrança inicial ao inquilino', desc: 'Dia 1 do mês quando aluguel é gerado', cor: 'emerald' },
    { id: 'alerta_atraso', label: 'Alerta de atraso (proprietário)', desc: 'Disparado 1 dia após vencimento', cor: 'red' },
    { id: 'alerta_reajuste', label: 'Alerta de reajuste (proprietário)', desc: 'Disparado 30 dias antes do reajuste', cor: 'blue' },
    { id: 'alerta_vencimento_contrato', label: 'Alerta fim de contrato', desc: 'Disparado dias antes (configurável por imóvel)', cor: 'amber' },
    { id: 'recibo', label: 'Recibo de pagamento', desc: 'Enviado pelo gestor manualmente', cor: 'emerald' },
    { id: 'convite_inquilino', label: 'Convite ao inquilino', desc: 'Acesso à área do inquilino', cor: 'blue' },
    { id: 'bem_vindo', label: 'Boas-vindas', desc: 'Após cadastro novo', cor: 'emerald' },
  ]

  return (
    <Card className="rounded-2xl border-slate-100 shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Send className="h-4 w-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">Templates de e-mail</h3>
          </div>
          <p className="text-xs text-slate-400">{templates.length} templates ativos</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {templates.map(t => (
            <div key={t.id} className="rounded-xl border border-slate-100 p-3 hover:bg-slate-50/40 transition-colors">
              <p className="text-sm font-semibold text-slate-900 mb-1">{t.label}</p>
              <p className="text-[11px] text-slate-500 leading-relaxed">{t.desc}</p>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-slate-400 mt-4">
          Templates definidos em <code className="font-mono">lib/email.ts</code>. Edição via UI estará disponível em breve.
        </p>
      </CardContent>
    </Card>
  )
}

// ═══════════════════════════════════════════════════════════════
// 5. AUTOMAÇÃO
// ═══════════════════════════════════════════════════════════════

function CronJobsPanel({ cronGerarLogs, cronAlertasLogs }: { cronGerarLogs: { action: string; details: Record<string, unknown> | null; created_at: string }[]; cronAlertasLogs: { action: string; details: Record<string, unknown> | null; created_at: string }[] }) {
  const [pendingGerar, startGerar] = useTransition()
  const [pendingAlertas, startAlertas] = useTransition()

  function disparar(tipo: 'gerar' | 'alertas') {
    if (!confirm(`Disparar agora o cron "${tipo === 'gerar' ? 'gerar-alugueis' : 'alertas'}"? Esta operação afeta dados reais.`)) return
    if (tipo === 'gerar') {
      startGerar(async () => {
        const result = await executarCronGerarAlugueis()
        if (result.error) toast.error(result.error)
        else toast.success('Cron executado com sucesso')
      })
    } else {
      startAlertas(async () => {
        const result = await executarCronAlertas()
        if (result.error) toast.error(result.error)
        else toast.success('Cron executado com sucesso')
      })
    }
  }

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <CronCard
        title="gerar-alugueis"
        desc="Gera registros do mês para todos os imóveis ativos. Para AUTOMATIC, cria cobrança Asaas e envia email."
        schedule="Dia 1 às 8h BRT"
        cronExpr="0 11 1 * *"
        logs={cronGerarLogs}
        loading={pendingGerar}
        onTrigger={() => disparar('gerar')}
      />
      <CronCard
        title="alertas"
        desc="Verifica alugueis com vencimento próximo e dispara emails — proprietário e inquilino."
        schedule="Diariamente às 8h BRT"
        cronExpr="0 11 * * *"
        logs={cronAlertasLogs}
        loading={pendingAlertas}
        onTrigger={() => disparar('alertas')}
      />
    </div>
  )
}

function CronCard({ title, desc, schedule, cronExpr, logs, loading, onTrigger }: {
  title: string; desc: string; schedule: string; cronExpr: string;
  logs: { details: Record<string, unknown> | null; created_at: string }[];
  loading: boolean; onTrigger: () => void;
}) {
  return (
    <Card className="rounded-2xl border-slate-100 shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900 font-mono">/api/cron/{title}</h3>
            </div>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">{desc}</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={onTrigger}
            disabled={loading}
            className="gap-1.5 shrink-0 text-xs"
          >
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            Executar agora
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3 py-3 border-y border-slate-100 mb-3">
          <KeyVal label="Agendado" value={schedule} />
          <KeyVal label="Expressão" value={cronExpr} />
        </div>

        <div>
          <p className="text-[11px] uppercase tracking-widest font-semibold text-slate-500 mb-2">Últimas execuções manuais</p>
          {logs.length === 0 ? (
            <p className="text-xs text-slate-400 italic">Nenhuma execução manual via admin ainda.</p>
          ) : (
            <ul className="space-y-1">
              {logs.map((l, i) => (
                <li key={i} className="text-[11px] text-slate-600 flex justify-between gap-2 py-1 border-b border-slate-50 last:border-0">
                  <span>{formatDataHora(l.created_at)}</span>
                  <span className="text-emerald-600 font-medium">✓ ok</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ═══════════════════════════════════════════════════════════════
// 6. SEGURANÇA
// ═══════════════════════════════════════════════════════════════

function SegurancaPanel({ stats, logsRecentes }: { stats: Stats; logsRecentes: Props['logsRecentes'] }) {
  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-3 gap-4">
        <MiniStat label="Banidos" value={stats.usuarios.banidos.toString()} sub="contas bloqueadas" icon={Shield} />
        <MiniStat label="Logs hoje" value={stats.logsHoje.toString()} sub="últimas 24h" icon={Activity} />
        <MiniStat label="Tokens inquilino" value={stats.tokensAtivos.toString()} sub="ativos" icon={Key} />
      </div>

      <Card className="rounded-2xl border-slate-100 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">Activity log — últimas ações</h3>
            </div>
            <a href="/admin/logs" className="text-xs text-emerald-600 hover:underline">Ver tudo →</a>
          </div>
          {logsRecentes.length === 0 ? (
            <p className="text-sm text-slate-500 italic text-center py-8">Sem atividade recente.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {logsRecentes.map(l => (
                <li key={l.id} className="py-2 text-sm flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-xs text-slate-700 truncate">{l.action}</p>
                    {l.entity_type && (
                      <p className="text-[11px] text-slate-400">
                        {l.entity_type} {l.entity_id ? `· ${l.entity_id}` : ''}
                      </p>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 shrink-0">{formatRelativo(l.created_at)}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// 7. COMUNICAÇÃO
// ═══════════════════════════════════════════════════════════════

function ComunicacaoPanel({ settings }: { settings: SystemSettings }) {
  return (
    <div className="space-y-4">
      <ManutencaoCard initial={settings.maintenance_mode} />
      <BannerGlobalCard initial={settings.global_banner} />
      <AnuncioPlanoCard
        title="Anúncio para usuários do plano Grátis"
        desc="Aparece no dashboard apenas para usuários com plano gratuito (ex: convite a fazer upgrade)."
        keyName="announcement_free"
        initial={settings.announcement_free}
      />
      <AnuncioPlanoCard
        title="Anúncio para Master"
        desc="Aparece apenas para usuários do plano Master."
        keyName="announcement_master"
        initial={settings.announcement_master}
      />
      <AnuncioPlanoCard
        title="Anúncio para Elite"
        desc="Aparece apenas para usuários do plano Elite."
        keyName="announcement_elite"
        initial={settings.announcement_elite}
      />
    </div>
  )
}

function ManutencaoCard({ initial }: { initial: MaintenanceMode }) {
  const [enabled, setEnabled] = useState(initial.enabled)
  const [message, setMessage] = useState(initial.message ?? '')
  const [pending, startTransition] = useTransition()

  function salvar() {
    startTransition(async () => {
      const result = await atualizarSetting('maintenance_mode', { enabled, message })
      if (result.error) toast.error(result.error)
      else toast.success(enabled ? 'Modo manutenção ativado' : 'Modo manutenção desativado')
    })
  }

  return (
    <Card className={cn('rounded-2xl shadow-sm', enabled ? 'border-red-200 bg-red-50/30' : 'border-slate-100')}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <AlertTriangle className={cn('h-4 w-4', enabled ? 'text-red-600' : 'text-slate-400')} />
              <h3 className="text-sm font-bold text-slate-900">Modo manutenção</h3>
              {enabled && <span className="text-[10px] font-bold uppercase tracking-widest bg-red-600 text-white px-1.5 py-0.5 rounded">Ativo</span>}
            </div>
            <p className="text-xs text-slate-500 mt-1">Bloqueia o acesso de usuários e exibe a mensagem.</p>
          </div>
          <label className="inline-flex items-center cursor-pointer shrink-0">
            <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} className="sr-only peer" />
            <div className="w-11 h-6 bg-slate-200 peer-checked:bg-red-600 rounded-full peer transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-transform peer-checked:after:translate-x-5 relative" />
          </label>
        </div>
        {enabled && (
          <div className="mt-4 space-y-2">
            <Label htmlFor="maint-msg" className="text-xs">Mensagem exibida aos usuários</Label>
            <Input
              id="maint-msg"
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Estamos em manutenção. Voltamos em breve."
              maxLength={300}
            />
          </div>
        )}
        <div className="flex justify-end mt-4">
          <Button size="sm" onClick={salvar} disabled={pending} className="gap-2">
            {pending && <Loader2 className="h-3 w-3 animate-spin" />}
            Salvar
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function BannerGlobalCard({ initial }: { initial: GlobalBanner }) {
  const [enabled, setEnabled] = useState(initial.enabled)
  const [text, setText] = useState(initial.text ?? '')
  const [color, setColor] = useState<GlobalBanner['color']>(initial.color ?? 'amber')
  const [link, setLink] = useState(initial.link ?? '')
  const [linkLabel, setLinkLabel] = useState(initial.link_label ?? '')
  const [pending, startTransition] = useTransition()

  function salvar() {
    startTransition(async () => {
      const result = await atualizarSetting('global_banner', { enabled, text, color, link: link || undefined, link_label: linkLabel || undefined })
      if (result.error) toast.error(result.error)
      else toast.success('Banner atualizado')
    })
  }

  const colorMap = {
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    amber: 'bg-amber-50 border-amber-200 text-amber-900',
    red: 'bg-red-50 border-red-200 text-red-900',
    blue: 'bg-blue-50 border-blue-200 text-blue-900',
  }

  return (
    <Card className="rounded-2xl border-slate-100 shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">Banner global</h3>
              {enabled && <span className="text-[10px] font-bold uppercase tracking-widest bg-emerald-600 text-white px-1.5 py-0.5 rounded">Ativo</span>}
            </div>
            <p className="text-xs text-slate-500 mt-1">Exibido no topo do dashboard de todos os usuários.</p>
          </div>
          <label className="inline-flex items-center cursor-pointer shrink-0">
            <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} className="sr-only peer" />
            <div className="w-11 h-6 bg-slate-200 peer-checked:bg-emerald-600 rounded-full peer transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-transform peer-checked:after:translate-x-5 relative" />
          </label>
        </div>

        {enabled && (
          <div className="mt-4 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="banner-text" className="text-xs">Texto</Label>
              <Input id="banner-text" value={text} onChange={e => setText(e.target.value)} placeholder="Manutenção amanhã das 23h às 1h" maxLength={200} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="banner-link" className="text-xs">Link (opcional)</Label>
                <Input id="banner-link" value={link} onChange={e => setLink(e.target.value)} placeholder="https://..." />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="banner-link-label" className="text-xs">Texto do link</Label>
                <Input id="banner-link-label" value={linkLabel} onChange={e => setLinkLabel(e.target.value)} placeholder="Saiba mais" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Cor</Label>
              <div className="flex gap-2">
                {(['emerald', 'amber', 'red', 'blue'] as const).map(c => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={cn(
                      'flex-1 rounded-lg border px-3 py-2 text-xs font-semibold capitalize transition-colors',
                      color === c ? colorMap[c] + ' ring-2 ring-offset-1 ring-slate-300' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50',
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Preview */}
            {text && (
              <div className={cn('rounded-lg border px-4 py-2.5 text-sm', colorMap[color])}>
                {text}
                {link && linkLabel && (
                  <a href={link} className="ml-2 underline font-semibold">{linkLabel}</a>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end mt-4">
          <Button size="sm" onClick={salvar} disabled={pending} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
            {pending && <Loader2 className="h-3 w-3 animate-spin" />}
            Salvar
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function AnuncioPlanoCard({ title, desc, keyName, initial }: { title: string; desc: string; keyName: 'announcement_free' | 'announcement_master' | 'announcement_elite'; initial: Announcement }) {
  const [enabled, setEnabled] = useState(initial.enabled)
  const [text, setText] = useState(initial.text ?? '')
  const [link, setLink] = useState(initial.link ?? '')
  const [linkLabel, setLinkLabel] = useState(initial.link_label ?? '')
  const [pending, startTransition] = useTransition()

  function salvar() {
    startTransition(async () => {
      const result = await atualizarSetting(keyName, { enabled, text, link: link || undefined, link_label: linkLabel || undefined })
      if (result.error) toast.error(result.error)
      else toast.success('Anúncio atualizado')
    })
  }

  return (
    <Card className="rounded-2xl border-slate-100 shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">{title}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
          </div>
          <label className="inline-flex items-center cursor-pointer shrink-0">
            <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} className="sr-only peer" />
            <div className="w-11 h-6 bg-slate-200 peer-checked:bg-emerald-600 rounded-full peer transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-transform peer-checked:after:translate-x-5 relative" />
          </label>
        </div>

        {enabled && (
          <div className="mt-4 space-y-3">
            <Input value={text} onChange={e => setText(e.target.value)} placeholder="Texto do anúncio" maxLength={200} />
            <div className="grid grid-cols-2 gap-3">
              <Input value={link} onChange={e => setLink(e.target.value)} placeholder="Link (opcional)" />
              <Input value={linkLabel} onChange={e => setLinkLabel(e.target.value)} placeholder="Texto do link" />
            </div>
          </div>
        )}

        <div className="flex justify-end mt-4">
          <Button size="sm" onClick={salvar} disabled={pending} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
            {pending && <Loader2 className="h-3 w-3 animate-spin" />}
            Salvar
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
