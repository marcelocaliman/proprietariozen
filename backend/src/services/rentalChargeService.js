'use strict'

const Tenant = require('../models/Tenant')
const Contract = require('../models/Contract')
const RentalCharge = require('../models/RentalCharge')
const {
  upsertCustomer,
  createCharge,
  getCharge,
  cancelCharge,
  getPixQrCode,
  createSubscription,
} = require('./asaas/chargeService')
const { sendChargeCreatedEmail } = require('./emailService')

/**
 * Garante que o inquilino existe como customer na subconta do proprietário.
 * O asaasCustomerId é cacheado no Tenant.asaasCustomerIds para evitar buscas
 * repetidas ao Asaas — o mesmo inquilino pode ter IDs distintos em cada subconta.
 *
 * @param {Object} contract  Documento Contract populado
 * @param {Object} tenant    Documento Tenant com asaasCustomerIds selecionado
 * @returns {Promise<string>}  asaasCustomerId nesta subconta
 */
async function createOrGetCustomer(contract, tenant) {
  const landlordKey = String(contract.landlordId)
  const cached = tenant.asaasCustomerIds?.get(landlordKey)
  if (cached) return cached

  const customer = await upsertCustomer(String(contract.landlordId), {
    name: tenant.name,
    cpfCnpj: tenant.cpfCnpj,
    email: tenant.email,
    mobilePhone: tenant.mobilePhone,
    ...(tenant.phone ? { phone: tenant.phone } : {}),
  })

  // Persiste o ID para evitar chamadas redundantes ao Asaas
  await Tenant.findByIdAndUpdate(tenant._id, {
    $set: { [`asaasCustomerIds.${landlordKey}`]: customer.id },
  })

  return customer.id
}

/**
 * Cria uma cobrança avulsa para um mês específico de aluguel.
 * Idempotente: retorna a cobrança existente se já houver uma para o mesmo contrato+mês.
 *
 * @param {Object} contract       Documento Contract
 * @param {Object} tenant         Documento Tenant com asaasCustomerIds selecionado
 * @param {string} referenceMonth Formato YYYY-MM
 * @returns {Promise<Object>}     Documento RentalCharge
 */
async function createMonthlyCharge(contract, tenant, referenceMonth) {
  // Idempotência via índice único { contractId, referenceMonth }
  const existing = await RentalCharge.findOne({
    contractId: contract._id,
    referenceMonth,
  })
  if (existing) return existing

  const asaasCustomerId = await createOrGetCustomer(contract, tenant)

  const [year, month] = referenceMonth.split('-').map(Number)
  const monthName = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })
    .format(new Date(year, month - 1, 1))
  const dueDate = `${referenceMonth}-${String(contract.dueDay).padStart(2, '0')}`

  const chargePayload = {
    customer: asaasCustomerId,
    billingType: 'UNDEFINED',
    value: contract.rentAmount,
    dueDate,
    description: `Aluguel referente a ${monthName} — ${contract.propertyAddress}`,
    externalReference: `${contract._id}-${referenceMonth}`,
    fine: { value: contract.finePercent },
    interest: { value: contract.interestPercent },
    ...(contract.discountPercent > 0
      ? { discount: { value: contract.discountPercent, type: 'PERCENTAGE', dueDateLimitDays: 0 } }
      : {}),
  }

  const asaasCharge = await createCharge(String(contract.landlordId), chargePayload)

  const rentalCharge = await RentalCharge.create({
    contractId: contract._id,
    landlordId: contract.landlordId,
    tenantId: contract.tenantId,
    asaasChargeId: asaasCharge.id,
    asaasCustomerId,
    amount: contract.rentAmount,
    dueDate: new Date(`${dueDate}T12:00:00`),
    referenceMonth,
    invoiceUrl: asaasCharge.invoiceUrl ?? null,
    status: 'PENDING',
  })

  // E-mail de notificação — falha não bloqueia a resposta
  sendChargeCreatedEmail({
    tenantName: tenant.name,
    tenantEmail: tenant.email,
    amount: contract.rentAmount,
    dueDate: rentalCharge.dueDate,
    invoiceUrl: asaasCharge.invoiceUrl ?? '',
    referenceMonth,
  }).catch(err => console.error('[Email] Falha ao enviar cobrança:', err.message))

  return rentalCharge
}

/**
 * Cria uma assinatura recorrente no Asaas (billingMode=AUTOMATIC).
 * O Asaas passa a gerar e cobrar automaticamente todo mês na data de vencimento.
 * Se a assinatura já existir, retorna o ID existente sem criar duplicata.
 *
 * @param {Object} contract  Documento Contract
 * @param {Object} tenant    Documento Tenant com asaasCustomerIds selecionado
 * @returns {Promise<string>}  asaasSubscriptionId
 */
async function createRecurringCharge(contract, tenant) {
  if (contract.asaasSubscriptionId) return contract.asaasSubscriptionId

  const asaasCustomerId = await createOrGetCustomer(contract, tenant)

  // Próxima data de vencimento: mês atual se dueDay ainda não passou, caso contrário próximo mês
  const now = new Date()
  let nextYear = now.getFullYear()
  let nextMonth = now.getMonth() + 1  // 1-based
  if (now.getDate() > contract.dueDay) {
    nextMonth++
    if (nextMonth > 12) { nextMonth = 1; nextYear++ }
  }
  const nextDueDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(contract.dueDay).padStart(2, '0')}`

  const subscription = await createSubscription(String(contract.landlordId), {
    customer: asaasCustomerId,
    value: contract.rentAmount,
    nextDueDate,
    description: `Aluguel mensal — ${contract.propertyAddress}`,
    externalReference: String(contract._id),
    fine: { value: contract.finePercent },
    interest: { value: contract.interestPercent },
    ...(contract.discountPercent > 0
      ? { discount: { value: contract.discountPercent, type: 'PERCENTAGE', dueDateLimitDays: 0 } }
      : {}),
  })

  await Contract.findByIdAndUpdate(contract._id, {
    asaasSubscriptionId: subscription.id,
  })

  return subscription.id
}

// Mapeamento de status Asaas → status interno
const ASAAS_STATUS_MAP = {
  PENDING: 'PENDING',
  CONFIRMED: 'RECEIVED',
  RECEIVED: 'RECEIVED',
  OVERDUE: 'OVERDUE',
  REFUNDED: 'REFUNDED',
  REFUND_REQUESTED: 'REFUNDED',
  CANCELLED: 'CANCELLED',
  DELETED: 'CANCELLED',
}

/**
 * Sincroniza o status de uma cobrança com o Asaas e atualiza o banco se mudou.
 *
 * @param {string} landlordId
 * @param {string} rentalChargeId  _id do RentalCharge no MongoDB
 * @returns {Promise<Object>}      Documento RentalCharge atualizado
 */
async function getChargeStatus(landlordId, rentalChargeId) {
  const rentalCharge = await RentalCharge.findOne({
    _id: rentalChargeId,
    landlordId,
  })
  if (!rentalCharge) {
    const err = new Error('Cobrança não encontrada.')
    err.statusCode = 404
    throw err
  }

  const asaasCharge = await getCharge(String(landlordId), rentalCharge.asaasChargeId)
  const newStatus = ASAAS_STATUS_MAP[asaasCharge.status] ?? rentalCharge.status

  if (newStatus !== rentalCharge.status || asaasCharge.paymentDate) {
    rentalCharge.status = newStatus
    if (asaasCharge.paymentDate) {
      rentalCharge.paidAt = new Date(asaasCharge.paymentDate)
      rentalCharge.paidAmount = asaasCharge.value
      rentalCharge.paymentMethod = asaasCharge.billingType ?? null
    }
    await rentalCharge.save()
  }

  return rentalCharge
}

/**
 * Cancela uma cobrança no Asaas e marca como CANCELLED no banco.
 * Lança erro 409 se a cobrança já foi paga.
 *
 * @param {string} landlordId
 * @param {string} rentalChargeId  _id do RentalCharge no MongoDB
 * @returns {Promise<Object>}      Documento RentalCharge atualizado
 */
async function cancelRentalCharge(landlordId, rentalChargeId) {
  const rentalCharge = await RentalCharge.findOne({
    _id: rentalChargeId,
    landlordId,
  })
  if (!rentalCharge) {
    const err = new Error('Cobrança não encontrada.')
    err.statusCode = 404
    throw err
  }
  if (rentalCharge.status === 'RECEIVED') {
    const err = new Error('Não é possível cancelar uma cobrança já paga.')
    err.statusCode = 409
    throw err
  }

  if (rentalCharge.status !== 'CANCELLED') {
    await cancelCharge(String(landlordId), rentalCharge.asaasChargeId)
    rentalCharge.status = 'CANCELLED'
    await rentalCharge.save()
  }

  return rentalCharge
}

/**
 * Retorna o QR Code Pix de uma cobrança.
 * O código é cacheado no documento RentalCharge após a primeira consulta.
 *
 * @param {string} landlordId
 * @param {string} rentalChargeId  _id do RentalCharge no MongoDB
 * @returns {Promise<{ encodedImage: string|null, payload: string }>}
 */
async function generatePixQrCode(landlordId, rentalChargeId) {
  const rentalCharge = await RentalCharge.findOne({
    _id: rentalChargeId,
    landlordId,
  })
  if (!rentalCharge) {
    const err = new Error('Cobrança não encontrada.')
    err.statusCode = 404
    throw err
  }

  // Retorna do cache se já disponível
  if (rentalCharge.pixQrCode) {
    return { encodedImage: null, payload: rentalCharge.pixQrCode }
  }

  const qrData = await getPixQrCode(String(landlordId), rentalCharge.asaasChargeId)

  if (qrData.payload) {
    rentalCharge.pixQrCode = qrData.payload
    await rentalCharge.save()
  }

  return qrData
}

module.exports = {
  createOrGetCustomer,
  createMonthlyCharge,
  createRecurringCharge,
  getChargeStatus,
  cancelRentalCharge,
  generatePixQrCode,
}
