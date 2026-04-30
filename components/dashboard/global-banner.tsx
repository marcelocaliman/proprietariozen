import { cn } from '@/lib/utils'
import type { GlobalBanner } from '@/lib/system-settings'

const COLORS = {
  emerald: 'bg-emerald-50 border-emerald-200 text-emerald-900',
  amber: 'bg-amber-50 border-amber-200 text-amber-900',
  red: 'bg-red-50 border-red-200 text-red-900',
  blue: 'bg-blue-50 border-blue-200 text-blue-900',
}

export function GlobalBannerView({ banner }: { banner: GlobalBanner }) {
  if (!banner.enabled || !banner.text) return null
  return (
    <div className={cn('rounded-2xl border px-5 py-3 flex items-center justify-between gap-4 flex-wrap shadow-sm', COLORS[banner.color])}>
      <p className="text-sm font-medium leading-snug">{banner.text}</p>
      {banner.link && banner.link_label && (
        <a
          href={banner.link}
          target={banner.link.startsWith('http') ? '_blank' : undefined}
          rel="noopener noreferrer"
          className="text-sm font-bold underline shrink-0"
        >
          {banner.link_label} →
        </a>
      )}
    </div>
  )
}
