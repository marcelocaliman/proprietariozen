// Formatadores centralizados — consolida tempoRelativo, formatDataHora,
// formatMoeda etc que estavam duplicados em 4-6 arquivos.

export function tempoRelativo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60_000)
  if (min < 1) return 'agora'
  if (min < 60) return `há ${min}min`
  const h = Math.floor(min / 60)
  if (h < 24) return `há ${h}h`
  const d = Math.floor(h / 24)
  if (d < 7) return `há ${d}d`
  return new Date(iso).toLocaleDateString('pt-BR', { dateStyle: 'short' })
}

export function formatDataHora(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

export function formatData(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { dateStyle: 'short' })
}

// Centavos -> "R$ 49,90"
export function formatMoedaCentavos(centavos: number): string {
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// Reais (decimal) -> "R$ 49,90"
export function formatMoeda(valor: number, decimais = 2): string {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: decimais,
    maximumFractionDigits: decimais,
  })
}
