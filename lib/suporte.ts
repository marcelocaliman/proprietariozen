// Tipos e helpers compartilhados do sistema de suporte.

export type TicketStatus = 'open' | 'em_andamento' | 'aguardando_usuario' | 'resolvido' | 'fechado'
export type TicketPrioridade = 'baixa' | 'normal' | 'alta' | 'urgente'
export type TicketCategoria = 'bug' | 'financeiro' | 'conta' | 'sugestao' | 'duvida' | 'outro'

export const STATUS_LABELS: Record<TicketStatus, string> = {
  open:                'Aberto',
  em_andamento:        'Em andamento',
  aguardando_usuario:  'Aguardando você',
  resolvido:           'Resolvido',
  fechado:             'Fechado',
}

export const STATUS_COLORS: Record<TicketStatus, string> = {
  open:                'bg-emerald-100 text-emerald-700 border-emerald-200',
  em_andamento:        'bg-blue-100 text-blue-700 border-blue-200',
  aguardando_usuario:  'bg-amber-100 text-amber-700 border-amber-200',
  resolvido:           'bg-slate-100 text-slate-700 border-slate-200',
  fechado:             'bg-slate-100 text-slate-500 border-slate-200',
}

export const PRIORIDADE_LABELS: Record<TicketPrioridade, string> = {
  baixa:    'Baixa',
  normal:   'Normal',
  alta:     'Alta',
  urgente:  'Urgente',
}

export const PRIORIDADE_COLORS: Record<TicketPrioridade, string> = {
  baixa:    'bg-slate-100 text-slate-600',
  normal:   'bg-blue-50 text-blue-700',
  alta:     'bg-amber-100 text-amber-700',
  urgente:  'bg-red-100 text-red-700',
}

export const CATEGORIA_LABELS: Record<TicketCategoria, string> = {
  bug:        'Erro / Bug',
  financeiro: 'Financeiro',
  conta:      'Conta / Acesso',
  sugestao:   'Sugestão',
  duvida:     'Dúvida',
  outro:      'Outro',
}

export type TicketAnexo = {
  nome: string
  path: string  // Path no bucket support-attachments
  tamanho: number
  tipo: string  // mime type
}

// ── Validação de anexos ─────────────────────────────────────
export const ANEXO_MAX_BYTES = 10 * 1024 * 1024 // 10 MB
export const ANEXO_MAX_PER_MENSAGEM = 5
export const ANEXO_MIME_PERMITIDOS = new Set([
  'image/png', 'image/jpeg', 'image/webp', 'image/gif',
  'application/pdf',
  'application/zip',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',       // .xlsx
])

export function validarAnexo(file: { name: string; size: number; type: string }): string | null {
  if (file.size > ANEXO_MAX_BYTES) return `Arquivo "${file.name}" maior que 10MB`
  if (!ANEXO_MIME_PERMITIDOS.has(file.type)) return `Tipo "${file.type}" não permitido`
  return null
}

// ── Rate limit: máx tickets criados por dia por usuário ─────
export const TICKETS_MAX_POR_DIA = 5
