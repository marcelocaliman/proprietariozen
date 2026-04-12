import Link from 'next/link'

// ── Brand green — matches icon.svg exactly ────────────────────────────────────
const LOGO_GREEN = '#3DBF79'

/**
 * Smile mark SVG — identical path to /public/icons/icon.svg.
 * Uses a filled shape (not a stroke) so it scales cleanly at any size.
 *
 * Color variant : green circle (#3DBF79) + white filled smile
 * White variant : semi-transparent ring + green filled smile
 */
function SmileMark({ s, variant }: { s: number; variant: 'color' | 'white' }) {
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 100 100"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      {variant === 'color' ? (
        <circle cx="50" cy="50" r="50" fill={LOGO_GREEN} />
      ) : (
        <circle
          cx="50"
          cy="50"
          r="48"
          fill="rgba(255,255,255,0.12)"
          stroke="rgba(255,255,255,0.35)"
          strokeWidth="3"
        />
      )}
      {/* Filled smile path — same coordinates as icon.svg */}
      <path
        d="M15 68C15 58 32 53 50 53C68 53 85 58 85 68C85 82 65 92 50 92C35 92 15 82 15 68Z"
        fill={variant === 'color' ? 'white' : LOGO_GREEN}
      />
    </svg>
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface LogoProps {
  /**
   * Height of the circle mark in px. Text scales automatically.
   * Common: 28 (compact), 32 (mobile), 36 (default), 40 (large)
   */
  iconSize?: number
  href?: string
  className?: string
}

// ── Color logo — for white / light backgrounds ────────────────────────────────

export function LogoColor({ iconSize = 36, href, className = '' }: LogoProps) {
  const fontSize = Math.round(iconSize * 0.595)

  const mark = (
    <span className={`inline-flex items-center gap-2.5 ${className}`} aria-label="PropZen">
      <SmileMark s={iconSize} variant="color" />
      <span className="font-extrabold leading-none tracking-tight" style={{ fontSize }}>
        <span style={{ color: '#111827' }}>Prop</span>
        <span style={{ color: LOGO_GREEN }}>Zen</span>
      </span>
    </span>
  )

  if (href) {
    return (
      <Link href={href} aria-label="PropZen — página inicial">
        {mark}
      </Link>
    )
  }
  return mark
}

// ── White logo — for dark / colored backgrounds ───────────────────────────────

export function LogoWhite({ iconSize = 36, href, className = '' }: LogoProps) {
  const fontSize = Math.round(iconSize * 0.595)

  const mark = (
    <span className={`inline-flex items-center gap-2.5 ${className}`} aria-label="PropZen">
      <SmileMark s={iconSize} variant="white" />
      <span
        className="font-extrabold leading-none tracking-tight text-white"
        style={{ fontSize }}
      >
        PropZen
      </span>
    </span>
  )

  if (href) {
    return (
      <Link href={href} aria-label="PropZen — página inicial">
        {mark}
      </Link>
    )
  }
  return mark
}
