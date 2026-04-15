'use strict'

const { createClient } = require('./asaasClient')
const { getDecryptedApiKey } = require('./accountService')
const { AsaasIntegrationError } = require('./AsaasIntegrationError')

/**
 * Retorna um cliente Asaas configurado com a apiKey da subconta do proprietário.
 * Todas as cobranças são criadas NA subconta — o dinheiro cai direto no
 * proprietário, sem passar pelo ProprietárioZen.
 *
 * @param {string} userId
 * @returns {Promise<import('axios').AxiosInstance>}
 */
async function getSubClient(userId) {
  const apiKey = await getDecryptedApiKey(userId)
  return createClient(apiKey)
}

// ── Cobranças ─────────────────────────────────────────────────────────────────

/**
 * Cria uma cobrança na subconta do proprietário.
 *
 * @param {string} userId
 * @param {Object} chargeData
 * @param {string} chargeData.customer       ID do cliente no Asaas
 * @param {'PIX'|'BOLETO'|'CREDIT_CARD'} chargeData.billingType
 * @param {number} chargeData.value          Valor em R$ (ex: 1500.00)
 * @param {string} chargeData.dueDate        Formato YYYY-MM-DD
 * @param {string} [chargeData.description]  Descrição para o inquilino
 * @param {number} [chargeData.installmentCount]
 * @param {Object} [chargeData.discount]
 * @param {Object} [chargeData.interest]
 * @param {Object} [chargeData.fine]
 * @returns {Promise<Object>}  Objeto de cobrança retornado pelo Asaas
 */
async function createCharge(userId, chargeData) {
  const client = await getSubClient(userId)
  const response = await client.post('/payments', chargeData)
  return response.data
}

/**
 * Busca uma cobrança específica na subconta do proprietário.
 *
 * @param {string} userId
 * @param {string} chargeId  ID da cobrança no Asaas
 * @returns {Promise<Object>}
 */
async function getCharge(userId, chargeId) {
  const client = await getSubClient(userId)
  const response = await client.get(`/payments/${chargeId}`)
  return response.data
}

/**
 * Lista cobranças da subconta com filtros opcionais.
 *
 * @param {string} userId
 * @param {Object} [filters]
 * @param {string} [filters.status]       PENDING, RECEIVED, CONFIRMED, OVERDUE…
 * @param {string} [filters.customer]     ID do cliente no Asaas
 * @param {string} [filters.dateCreated]  Data no formato YYYY-MM-DD
 * @param {number} [filters.offset]       Paginação (default 0)
 * @param {number} [filters.limit]        Máximo 100 (default 10)
 * @returns {Promise<{ data: Object[], totalCount: number, hasMore: boolean }>}
 */
async function listCharges(userId, filters = {}) {
  const client = await getSubClient(userId)
  const response = await client.get('/payments', { params: filters })
  return response.data
}

/**
 * Cancela/exclui uma cobrança na subconta do proprietário.
 *
 * @param {string} userId
 * @param {string} chargeId
 * @returns {Promise<{ deleted: boolean, id: string }>}
 */
async function cancelCharge(userId, chargeId) {
  const client = await getSubClient(userId)
  const response = await client.delete(`/payments/${chargeId}`)
  return response.data
}

/**
 * Cria ou recupera um cliente (inquilino) na subconta do proprietário.
 * O Asaas requer que o pagador seja um cliente cadastrado.
 *
 * @param {string} userId
 * @param {Object} customerData
 * @param {string} customerData.name
 * @param {string} customerData.cpfCnpj
 * @param {string} [customerData.email]
 * @param {string} [customerData.phone]
 * @param {string} [customerData.mobilePhone]
 * @returns {Promise<Object>}  Cliente criado ou existente
 */
async function upsertCustomer(userId, customerData) {
  const client = await getSubClient(userId)

  // Verificar se já existe cliente com o mesmo CPF/CNPJ
  const searchResponse = await client.get('/customers', {
    params: { cpfCnpj: customerData.cpfCnpj, limit: 1 },
  })

  const existing = searchResponse.data?.data?.[0]
  if (existing) return existing

  const createResponse = await client.post('/customers', customerData)
  return createResponse.data
}

/**
 * Gera o QR Code Pix de uma cobrança já criada.
 *
 * @param {string} userId
 * @param {string} chargeId
 * @returns {Promise<{ encodedImage: string, payload: string, expirationDate: string }>}
 */
async function getPixQrCode(userId, chargeId) {
  const client = await getSubClient(userId)
  const response = await client.get(`/payments/${chargeId}/pixQrCode`)
  return response.data
}

module.exports = {
  createCharge,
  getCharge,
  listCharges,
  cancelCharge,
  upsertCustomer,
  getPixQrCode,
}
