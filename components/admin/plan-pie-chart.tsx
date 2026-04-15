'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

type TipProps = { active?: boolean; payload?: { name?: string; value?: number }[] }

function CustomTooltip({ active, payload }: TipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-xs shadow-lg">
      <p className="text-[#475569]">
        {payload[0]?.name}: <span className="font-bold text-[#0F172A]">{payload[0]?.value}</span>
      </p>
    </div>
  )
}

export function PlanPieChart({ gratis, pro }: { gratis: number; pro: number }) {
  const total = gratis + pro
  const pct = total > 0 ? Math.round((pro / total) * 100) : 0

  const data = [
    { name: 'Grátis', value: gratis, color: '#475569' },
    { name: 'Pro',    value: pro,    color: '#10b981' },
  ]

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <ResponsiveContainer width={180} height={180}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={56}
              outerRadius={80}
              dataKey="value"
              startAngle={90}
              endAngle={-270}
              strokeWidth={0}
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        {/* Label central */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-[#0F172A] leading-none">{pct}%</span>
          <span className="text-[11px] text-[#64748B] mt-0.5">Pro</span>
        </div>
      </div>
      {/* Legenda */}
      <div className="flex items-center gap-4 text-xs text-[#64748B]">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#475569]" />
          Grátis: <strong className="text-white">{gratis}</strong>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Pro: <strong className="text-white">{pro}</strong>
        </span>
      </div>
    </div>
  )
}
