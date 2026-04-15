'use strict'

/**
 * Erro customizado para falhas na integração com o Asaas.
 *
 * Preserva o statusCode HTTP, o código de erro interno do Asaas e
 * a mensagem legível, facilitando o mapeamento de resposta ao cliente
 * sem expor detalhes internos.
 */
class AsaasIntegrationError extends Error {
  /**
   * @param {string}  message    Mensagem legível (pode vir do Asaas ou ser customizada)
   * @param {number}  statusCode Código HTTP retornado pelo Asaas (400, 401, 422, 429…)
   * @param {string}  [asaasCode]  Código interno do Asaas (ex: "invalid_cpfCnpj")
   */
  constructor(message, statusCode = 500, asaasCode = null) {
    super(message)
    this.name = 'AsaasIntegrationError'
    this.statusCode = statusCode
    this.asaasCode = asaasCode

    // Mantém o stack trace limpo (V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AsaasIntegrationError)
    }
  }

  toJSON() {
    return {
      error: this.name,
      message: this.message,
      statusCode: this.statusCode,
      asaasCode: this.asaasCode,
    }
  }
}

// ── Mapeamento dos erros mais comuns do Asaas ────────────────────────────────

const KNOWN_ERRORS = {
  cpfCnpjAlreadyExists: {
    statusCode: 409,
    message: 'Já existe uma conta Asaas com este CPF/CNPJ.',
  },
  invalid_cpfCnpj: {
    statusCode: 422,
    message: 'CPF ou CNPJ inválido.',
  },
  invalid_birthDate: {
    statusCode: 422,
    message: 'Data de nascimento inválida. Use o formato YYYY-MM-DD.',
  },
  subaccountLimitReached: {
    statusCode: 429,
    message: 'Limite regulatório de criação de subcontas atingido para este período.',
  },
  unauthorized: {
    statusCode: 401,
    message: 'Credenciais inválidas ou expiradas.',
  },
  webhookAlreadyExists: {
    statusCode: 409,
    message: 'Já existe um webhook registrado para esta URL nesta conta.',
  },
}

/**
 * Converte a resposta de erro do Asaas em AsaasIntegrationError.
 *
 * @param {import('axios').AxiosError} axiosError
 * @returns {AsaasIntegrationError}
 */
function fromAxiosError(axiosError) {
  const status = axiosError.response?.status ?? 500
  const data = axiosError.response?.data ?? {}

  // O Asaas retorna arrays de erros: { errors: [{ code, description }] }
  const firstError = Array.isArray(data.errors) ? data.errors[0] : null
  const asaasCode = firstError?.code ?? data.code ?? null
  const asaasMessage = firstError?.description ?? data.message ?? axiosError.message

  const known = asaasCode ? KNOWN_ERRORS[asaasCode] : null
  const message = known?.message ?? asaasMessage
  const statusCode = known?.statusCode ?? status

  return new AsaasIntegrationError(message, statusCode, asaasCode)
}

module.exports = { AsaasIntegrationError, fromAxiosError, KNOWN_ERRORS }
