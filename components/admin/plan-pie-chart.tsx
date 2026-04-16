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

export function PlanPieChart({ gratis, pro, elite = 0 }: { gratis: number; pro: number; elite?: number }) {
  const total    = gratis + pro + elite
  const pagantes = pro + elite
  const pct      = total > 0 ? Math.round((pagantes / total) * 100) : 0

  const data = [
    { name: 'Grátis', value: gratis, color: '#475569' },
    { name: 'Master', value: pro,    color: '#10b981' },
    { name: 'Elite',  value: elite,  color: '#8b5cf6' },
  ].filter(d => d.value > 0)

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
          <span className="text-[11px] text-[#64748B] mt-0.5">pagantes</span>
        </div>
      </div>
      {/* Legenda */}
      <div className="flex items-center gap-3 text-xs text-[#64748B] flex-wrap justify-center">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#475569]" />
          Grátis: <strong className="text-white">{gratis}</strong>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Master: <strong className="text-white">{pro}</strong>
        </span>
        {elite > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-violet-500" />
            Elite: <strong className="text-white">{elite}</strong>
          </span>
        )}
      </div>
    </div>
  )
}
