'use client'

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'

export type GrowthPoint = {
  date: string
  label: string
  total: number
  pro: number
}

type TipProps = { active?: boolean; payload?: { value?: number }[]; label?: string }

function CustomTooltip({ active, payload, label }: TipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs shadow-xl">
      <p className="font-semibold text-slate-300 mb-1">{label}</p>
      <p className="text-blue-400">Total: <span className="font-bold text-white">{payload[0]?.value}</span></p>
      <p className="text-amber-400">Pro: <span className="font-bold text-white">{payload[1]?.value}</span></p>
    </div>
  )
}

export function UserGrowthChart({ data }: { data: GrowthPoint[] }) {
  if (!data.length) {
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-slate-500">
        Sem dados nos últimos 30 dias
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
        <defs>
          <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradPro" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis
          dataKey="label"
          tick={{ fill: '#64748b', fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fill: '#64748b', fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="total"
          name="Total"
          stroke="#60a5fa"
          strokeWidth={2}
          fill="url(#gradTotal)"
        />
        <Area
          type="monotone"
          dataKey="pro"
          name="Pro"
          stroke="#f59e0b"
          strokeWidth={2}
          fill="url(#gradPro)"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
