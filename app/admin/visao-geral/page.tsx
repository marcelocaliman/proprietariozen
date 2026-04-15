import { getAdminStats } from '@/lib/admin'
import { formatarMoeda } from '@/lib/helpers'
import {
  Users, Building2, TrendingUp, Receipt,
  CheckCircle2, AlertTriangle, Zap,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function StatCard({
  title, value, sub, icon: Icon, iconCls,
}: {
  title: string
  value: string | number
  sub?: string
  icon: typeof Users
  iconCls: string
}) {
  return (
    <Card className="bg-slate-900 border-slate-700/60 text-slate-100">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">{title}</p>
            <p className="text-2xl font-bold text-white mt-1">{value}</p>
            {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
          </div>
          <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${iconCls}`}>
            <Icon className="h-4.5 w-4.5 h-[18px] w-[18px]" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default async function AdminVisaoGeralPage() {
  const stats = await getAdminStats()

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Visão geral</h1>
        <p className="text-sm text-slate-400 mt-0.5">Métricas consolidadas da plataforma</p>
      </div>

      {/* Usuários */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Usuários</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <StatCard
            title="Total de usuários"
            value={stats.usuarios.total}
            icon={Users}
            iconCls="bg-blue-500/20 text-blue-400"
          />
          <StatCard
            title="Plano Pro"
            value={stats.usuarios.pro}
            sub={`${stats.usuarios.total > 0 ? Math.round((stats.usuarios.pro / stats.usuarios.total) * 100) : 0}% do total`}
            icon={TrendingUp}
            iconCls="bg-emerald-500/20 text-emerald-400"
          />
          <StatCard
            title="Novos (30 dias)"
            value={stats.usuarios.novos_30d}
            icon={Users}
            iconCls="bg-violet-500/20 text-violet-400"
          />
        </div>
      </section>

      {/* Imóveis */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Imóveis</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <StatCard
            title="Total cadastrados"
            value={stats.imoveis.total}
            icon={Building2}
            iconCls="bg-amber-500/20 text-amber-400"
          />
          <StatCard
            title="Ativos"
            value={stats.imoveis.ativos}
            icon={Building2}
            iconCls="bg-emerald-500/20 text-emerald-400"
          />
          <StatCard
            title="Cobrança automática"
            value={stats.imoveis.automatic}
            sub="billing_mode = AUTOMATIC"
            icon={Zap}
            iconCls="bg-emerald-500/20 text-emerald-400"
          />
        </div>
      </section>

      {/* Aluguéis do mês */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Aluguéis (mês atual)</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            title="Total gerados"
            value={stats.alugueis.total_mes}
            icon={Receipt}
            iconCls="bg-slate-600/60 text-slate-300"
          />
          <StatCard
            title="Pagos"
            value={stats.alugueis.pagos_mes}
            icon={CheckCircle2}
            iconCls="bg-emerald-500/20 text-emerald-400"
          />
          <StatCard
            title="Atrasados"
            value={stats.alugueis.atrasados_mes}
            icon={AlertTriangle}
            iconCls="bg-red-500/20 text-red-400"
          />
          <StatCard
            title="Receita confirmada"
            value={formatarMoeda(stats.alugueis.receita_mes)}
            sub={`${stats.alugueis.taxa_adimplencia}% de adimplência`}
            icon={TrendingUp}
            iconCls="bg-emerald-500/20 text-emerald-400"
          />
        </div>
      </section>

      {/* Asaas */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Integração Asaas</h2>
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            title="Subcontas vinculadas"
            value={stats.asaas.contas_vinculadas}
            icon={Zap}
            iconCls="bg-blue-500/20 text-blue-400"
          />
          <StatCard
            title="Subcontas aprovadas"
            value={stats.asaas.contas_aprovadas}
            sub={`${stats.asaas.contas_vinculadas > 0 ? Math.round((stats.asaas.contas_aprovadas / stats.asaas.contas_vinculadas) * 100) : 0}% aprovadas`}
            icon={CheckCircle2}
            iconCls="bg-emerald-500/20 text-emerald-400"
          />
        </div>
      </section>

      {/* Páginas em construção */}
      <Card className="bg-slate-900 border-slate-700/60 border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-slate-400">Seções em desenvolvimento</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-xs text-slate-500">
            As páginas Usuários, Financeiro, Imóveis &amp; Aluguéis, Logs e Configurações serão implementadas nos próximos prompts.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
