// Wrapper de erro para API routes.
// Esconde detalhes internos do Supabase/Stripe em produção; mostra
// no dev. Loga estruturalmente pra Vercel logs (e Sentry no futuro).
import { NextResponse } from 'next/server'

const IS_PROD = process.env.NODE_ENV === 'production'

type ApiErrorCode =
  | 'unauthorized'        // 401
  | 'forbidden'           // 403
  | 'not_found'           // 404
  | 'invalid_input'       // 400
  | 'rate_limited'        // 429
  | 'conflict'            // 409
  | 'internal'            // 500
  | 'service_unavailable' // 503

const STATUS: Record<ApiErrorCode, number> = {
  unauthorized:        401,
  forbidden:           403,
  not_found:           404,
  invalid_input:       400,
  rate_limited:        429,
  conflict:            409,
  internal:            500,
  service_unavailable: 503,
}

// Mensagem default user-friendly por código — nunca expõe interno
const DEFAULT_MESSAGE: Record<ApiErrorCode, string> = {
  unauthorized:        'Não autenticado.',
  forbidden:           'Acesso negado.',
  not_found:           'Recurso não encontrado.',
  invalid_input:       'Dados inválidos.',
  rate_limited:        'Muitas requisições — tente novamente em alguns instantes.',
  conflict:            'Conflito no estado do recurso.',
  internal:            'Erro interno. Tente novamente em instantes.',
  service_unavailable: 'Serviço temporariamente indisponível.',
}

// Resposta de erro padrão; em prod nunca inclui error.message do Supabase/Stripe
export function apiError(
  code: ApiErrorCode,
  options?: {
    userMessage?: string  // mensagem segura pro user (override do default)
    logContext?: unknown  // contexto interno pra log; nunca vai pro response
  },
): NextResponse {
  const status = STATUS[code]
  const message = options?.userMessage ?? DEFAULT_MESSAGE[code]

  if (options?.logContext) {
    console.error(`[api-error] ${code} ${status}:`, options.logContext)
  }

  return NextResponse.json({ error: message, code }, { status })
}

// Wrapper pra capturar erros de handlers async sem vazar internals.
// Uso: export const POST = withApiErrorHandling(async (req) => { ... })
export function withApiErrorHandling<TReq, TRes extends Response>(
  handler: (req: TReq) => Promise<TRes>,
): (req: TReq) => Promise<TRes | NextResponse> {
  return async (req: TReq) => {
    try {
      return await handler(req)
    } catch (err) {
      console.error('[api-error] uncaught:', err)
      // Sem detalhes do erro no response em produção
      return apiError('internal', {
        userMessage: IS_PROD ? undefined : (err instanceof Error ? err.message : String(err)),
      }) as TRes | NextResponse
    }
  }
}

// Helper pra logar erro de operação interna (Supabase, Stripe etc)
// sem vazar pro response. Use em vez de `console.error(error.message)`.
export function logInternalError(context: string, err: unknown): void {
  if (err instanceof Error) {
    console.error(`[${context}]`, err.message, err.stack?.split('\n').slice(0, 5).join('\n'))
  } else if (typeof err === 'object' && err !== null && 'message' in err) {
    console.error(`[${context}]`, (err as { message: string }).message)
  } else {
    console.error(`[${context}]`, err)
  }
}
