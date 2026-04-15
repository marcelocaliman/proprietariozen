'use strict'

require('dotenv').config()
const axios = require('axios')
const { fromAxiosError } = require('./AsaasIntegrationError')

const BASE_URL = process.env.ASAAS_BASE_URL || 'https://sandbox.asaas.com/api/v3'

/**
 * Cria uma instância axios configurada para a API Asaas.
 *
 * @param {string} apiKey  API key a usar (conta raiz ou subconta).
 *                         Padrão: ASAAS_API_KEY_ROOT do ambiente.
 * @returns {import('axios').AxiosInstance}
 */
function createClient(apiKey) {
  const key = apiKey || process.env.ASAAS_API_KEY_ROOT

  if (!key) {
    throw new Error(
      'Asaas API key não configurada. ' +
      'Defina ASAAS_API_KEY_ROOT no ambiente ou passe apiKey explicitamente.',
    )
  }

  const instance = axios.create({
    baseURL: BASE_URL,
    timeout: 15_000,
    headers: {
      'access_token': key,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      // Identificação do integrador — boa prática recomendada pelo Asaas
      'User-Agent': 'ProprietarioZen/1.0 (nodejs)',
    },
  })

  // ── Interceptor de resposta: converte erros Asaas em AsaasIntegrationError ─
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      // Log seguro: NUNCA inclui headers (que conteriam a apiKey)
      if (process.env.NODE_ENV !== 'test') {
        console.error('[Asaas] Erro na requisição:', {
          method: error.config?.method?.toUpperCase(),
          url: error.config?.url,
          status: error.response?.status,
          // Apenas o array de erros do Asaas, sem dados sensíveis
          asaasErrors: error.response?.data?.errors ?? error.response?.data?.message,
        })
      }

      return Promise.reject(fromAxiosError(error))
    },
  )

  // ── Interceptor de requisição: log de debug (sem apiKey) ──────────────────
  if (process.env.NODE_ENV === 'development') {
    instance.interceptors.request.use((config) => {
      console.debug(`[Asaas] ${config.method?.toUpperCase()} ${config.url}`)
      return config
    })
  }

  return instance
}

/**
 * Cliente padrão usando a conta raiz.
 * Usar para: criar subcontas, consultas administrativas.
 */
const rootClient = createClient()

module.exports = { createClient, rootClient }
