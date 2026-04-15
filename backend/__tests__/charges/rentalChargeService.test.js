'use strict'

process.env.ASAAS_API_KEY_ROOT = 'test_root_key'
process.env.ASAAS_ENCRYPTION_KEY = 'a'.repeat(64)
process.env.NODE_ENV = 'test'

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('../../src/models/Tenant')
jest.mock('../../src/models/Contract')
jest.mock('../../src/models/RentalCharge')
jest.mock('../../src/services/asaas/chargeService')
jest.mock('../../src/services/emailService')

const Tenant = require('../../src/models/Tenant')
const Contract = require('../../src/models/Contract')
const RentalCharge = require('../../src/models/RentalCharge')
const chargeService = require('../../src/services/asaas/chargeService')
const emailService = require('../../src/services/emailService')

const {
  createOrGetCustomer,
  createMonthlyCharge,
  createRecurringCharge,
  getChargeStatus,
  cancelRentalCharge,
  generatePixQrCode,
} = require('../../src/services/rentalChargeService')

// ── Fixtures ──────────────────────────────────────────────────────────────────

const LANDLORD_ID = '507f1f77bcf86cd799439011'
const TENANT_ID   = '507f1f77bcf86cd799439022'
const CONTRACT_ID = '507f1f77bcf86cd799439033'
const CHARGE_ID   = '507f1f77bcf86cd799439044'

const mockContract = {
  _id: CONTRACT_ID,
  landlordId: LANDLORD_ID,
  tenantId: TENANT_ID,
  propertyAddress: 'Rua das Flores, 42 — Apto 3B',
  rentAmount: 1500,
  dueDay: 10,
  finePercent: 2,
  interestPercent: 1,
  discountPercent: 0,
  asaasSubscriptionId: null,
}

const mockTenant = {
  _id: TENANT_ID,
  name: 'João da Silva',
  email: 'joao@example.com',
  cpfCnpj: '12345678901',
  mobilePhone: '11999999999',
  phone: null,
  asaasCustomerIds: new Map(),
}

const mockAsaasCharge = {
  id: 'pay_abc123',
  invoiceUrl: 'https://asaas.com/i/abc123',
  status: 'PENDING',
}

const mockRentalCharge = {
  _id: CHARGE_ID,
  contractId: CONTRACT_ID,
  landlordId: LANDLORD_ID,
  tenantId: TENANT_ID,
  asaasChargeId: 'pay_abc123',
  asaasCustomerId: 'cus_xyz',
  amount: 1500,
  dueDate: new Date('2026-05-10T12:00:00'),
  referenceMonth: '2026-05',
  status: 'PENDING',
  pixQrCode: null,
  save: jest.fn().mockResolvedValue(undefined),
}

beforeEach(() => {
  jest.clearAllMocks()
  emailService.sendChargeCreatedEmail.mockResolvedValue(undefined)
})

// ─────────────────────────────────────────────────────────────────────────────
// createOrGetCustomer
// ─────────────────────────────────────────────────────────────────────────────

describe('createOrGetCustomer', () => {
  it('retorna o ID cacheado sem chamar o Asaas', async () => {
    const tenantWithCache = {
      ...mockTenant,
      asaasCustomerIds: new Map([[LANDLORD_ID, 'cus_cached']]),
    }

    const result = await createOrGetCustomer(mockContract, tenantWithCache)

    expect(result).toBe('cus_cached')
    expect(chargeService.upsertCustomer).not.toHaveBeenCalled()
  })

  it('chama upsertCustomer e persiste o ID quando não há cache', async () => {
    chargeService.upsertCustomer.mockResolvedValue({ id: 'cus_new' })
    Tenant.findByIdAndUpdate.mockResolvedValue(null)

    const result = await createOrGetCustomer(mockContract, mockTenant)

    expect(chargeService.upsertCustomer).toHaveBeenCalledWith(
      LANDLORD_ID,
      expect.objectContaining({ cpfCnpj: mockTenant.cpfCnpj })
    )
    expect(Tenant.findByIdAndUpdate).toHaveBeenCalledWith(
      TENANT_ID,
      { $set: { [`asaasCustomerIds.${LANDLORD_ID}`]: 'cus_new' } }
    )
    expect(result).toBe('cus_new')
  })

  it('não inclui phone se tenant.phone for null', async () => {
    chargeService.upsertCustomer.mockResolvedValue({ id: 'cus_new' })
    Tenant.findByIdAndUpdate.mockResolvedValue(null)

    await createOrGetCustomer(mockContract, { ...mockTenant, phone: null })

    const callArg = chargeService.upsertCustomer.mock.calls[0][1]
    expect(callArg).not.toHaveProperty('phone')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// createMonthlyCharge
// ─────────────────────────────────────────────────────────────────────────────

describe('createMonthlyCharge', () => {
  beforeEach(() => {
    chargeService.upsertCustomer.mockResolvedValue({ id: 'cus_xyz' })
    Tenant.findByIdAndUpdate.mockResolvedValue(null)
    chargeService.createCharge.mockResolvedValue(mockAsaasCharge)
    RentalCharge.findOne.mockResolvedValue(null)
    RentalCharge.create.mockResolvedValue(mockRentalCharge)
  })

  it('retorna cobrança existente sem criar nova (idempotência)', async () => {
    RentalCharge.findOne.mockResolvedValue(mockRentalCharge)

    const result = await createMonthlyCharge(mockContract, mockTenant, '2026-05')

    expect(result).toBe(mockRentalCharge)
    expect(chargeService.createCharge).not.toHaveBeenCalled()
  })

  it('cria cobrança no Asaas e salva no banco', async () => {
    const result = await createMonthlyCharge(mockContract, mockTenant, '2026-05')

    expect(chargeService.createCharge).toHaveBeenCalledWith(
      LANDLORD_ID,
      expect.objectContaining({
        customer: 'cus_xyz',
        billingType: 'UNDEFINED',
        value: 1500,
        dueDate: '2026-05-10',
      })
    )
    expect(RentalCharge.create).toHaveBeenCalledWith(
      expect.objectContaining({
        referenceMonth: '2026-05',
        asaasChargeId: 'pay_abc123',
        status: 'PENDING',
      })
    )
    expect(result).toBe(mockRentalCharge)
  })

  it('formata dueDay com zero à esquerda (dueDay < 10)', async () => {
    const contractDueDay5 = { ...mockContract, dueDay: 5 }

    await createMonthlyCharge(contractDueDay5, mockTenant, '2026-05')

    const callArg = chargeService.createCharge.mock.calls[0][1]
    expect(callArg.dueDate).toBe('2026-05-05')
  })

  it('inclui discount apenas quando discountPercent > 0', async () => {
    const contractWithDiscount = { ...mockContract, discountPercent: 5 }

    await createMonthlyCharge(contractWithDiscount, mockTenant, '2026-05')

    const callArg = chargeService.createCharge.mock.calls[0][1]
    expect(callArg.discount).toEqual({ value: 5, type: 'PERCENTAGE', dueDateLimitDays: 0 })
  })

  it('não inclui discount quando discountPercent = 0', async () => {
    await createMonthlyCharge(mockContract, mockTenant, '2026-05')

    const callArg = chargeService.createCharge.mock.calls[0][1]
    expect(callArg).not.toHaveProperty('discount')
  })

  it('dispara e-mail sem bloquear a resposta', async () => {
    await createMonthlyCharge(mockContract, mockTenant, '2026-05')

    // E-mail é disparado assincronamente — só verifica que foi chamado
    expect(emailService.sendChargeCreatedEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantEmail: mockTenant.email,
        referenceMonth: '2026-05',
      })
    )
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// createRecurringCharge
// ─────────────────────────────────────────────────────────────────────────────

describe('createRecurringCharge', () => {
  it('retorna subscriptionId existente sem criar nova assinatura', async () => {
    const contractWithSub = { ...mockContract, asaasSubscriptionId: 'sub_existing' }

    const result = await createRecurringCharge(contractWithSub, mockTenant)

    expect(result).toBe('sub_existing')
    expect(chargeService.createSubscription).not.toHaveBeenCalled()
  })

  it('cria assinatura no Asaas e salva o ID no contrato', async () => {
    chargeService.upsertCustomer.mockResolvedValue({ id: 'cus_xyz' })
    Tenant.findByIdAndUpdate.mockResolvedValue(null)
    chargeService.createSubscription.mockResolvedValue({ id: 'sub_new123' })
    Contract.findByIdAndUpdate.mockResolvedValue(null)

    const result = await createRecurringCharge(mockContract, mockTenant)

    expect(chargeService.createSubscription).toHaveBeenCalledWith(
      LANDLORD_ID,
      expect.objectContaining({
        customer: 'cus_xyz',
        value: mockContract.rentAmount,
        // cycle e billingType são adicionados dentro de chargeService.createSubscription
      })
    )
    expect(Contract.findByIdAndUpdate).toHaveBeenCalledWith(
      CONTRACT_ID,
      { asaasSubscriptionId: 'sub_new123' }
    )
    expect(result).toBe('sub_new123')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// getChargeStatus
// ─────────────────────────────────────────────────────────────────────────────

describe('getChargeStatus', () => {
  it('lança 404 se a cobrança não existir', async () => {
    RentalCharge.findOne.mockResolvedValue(null)

    await expect(getChargeStatus(LANDLORD_ID, CHARGE_ID)).rejects.toMatchObject({
      statusCode: 404,
    })
  })

  it('mapeia status CONFIRMED do Asaas para RECEIVED', async () => {
    RentalCharge.findOne.mockResolvedValue({ ...mockRentalCharge })
    chargeService.getCharge.mockResolvedValue({ status: 'CONFIRMED', paymentDate: null })

    const charge = { ...mockRentalCharge, status: 'PENDING' }
    RentalCharge.findOne.mockResolvedValue(charge)

    await getChargeStatus(LANDLORD_ID, CHARGE_ID)

    expect(charge.status).toBe('RECEIVED')
    expect(charge.save).toHaveBeenCalled()
  })

  it('preenche paidAt e paidAmount quando paymentDate está presente', async () => {
    const charge = { ...mockRentalCharge, status: 'PENDING', save: jest.fn() }
    RentalCharge.findOne.mockResolvedValue(charge)
    chargeService.getCharge.mockResolvedValue({
      status: 'RECEIVED',
      paymentDate: '2026-05-08',
      value: 1500,
      billingType: 'PIX',
    })

    await getChargeStatus(LANDLORD_ID, CHARGE_ID)

    expect(charge.paidAt).toEqual(new Date('2026-05-08'))
    expect(charge.paidAmount).toBe(1500)
    expect(charge.paymentMethod).toBe('PIX')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// cancelRentalCharge
// ─────────────────────────────────────────────────────────────────────────────

describe('cancelRentalCharge', () => {
  it('lança 404 se a cobrança não existir', async () => {
    RentalCharge.findOne.mockResolvedValue(null)

    await expect(cancelRentalCharge(LANDLORD_ID, CHARGE_ID)).rejects.toMatchObject({
      statusCode: 404,
    })
  })

  it('lança 409 ao tentar cancelar cobrança já paga', async () => {
    RentalCharge.findOne.mockResolvedValue({ ...mockRentalCharge, status: 'RECEIVED' })

    await expect(cancelRentalCharge(LANDLORD_ID, CHARGE_ID)).rejects.toMatchObject({
      statusCode: 409,
    })
  })

  it('chama Asaas e marca como CANCELLED', async () => {
    const charge = { ...mockRentalCharge, status: 'PENDING', save: jest.fn() }
    RentalCharge.findOne.mockResolvedValue(charge)
    chargeService.cancelCharge.mockResolvedValue({ deleted: true })

    const result = await cancelRentalCharge(LANDLORD_ID, CHARGE_ID)

    expect(chargeService.cancelCharge).toHaveBeenCalledWith(LANDLORD_ID, 'pay_abc123')
    expect(charge.status).toBe('CANCELLED')
    expect(charge.save).toHaveBeenCalled()
    expect(result).toBe(charge)
  })

  it('não chama Asaas se cobrança já está CANCELLED', async () => {
    RentalCharge.findOne.mockResolvedValue({
      ...mockRentalCharge,
      status: 'CANCELLED',
      save: jest.fn(),
    })

    await cancelRentalCharge(LANDLORD_ID, CHARGE_ID)

    expect(chargeService.cancelCharge).not.toHaveBeenCalled()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// generatePixQrCode
// ─────────────────────────────────────────────────────────────────────────────

describe('generatePixQrCode', () => {
  it('lança 404 se a cobrança não existir', async () => {
    RentalCharge.findOne.mockResolvedValue(null)

    await expect(generatePixQrCode(LANDLORD_ID, CHARGE_ID)).rejects.toMatchObject({
      statusCode: 404,
    })
  })

  it('retorna do cache sem chamar o Asaas', async () => {
    RentalCharge.findOne.mockResolvedValue({
      ...mockRentalCharge,
      pixQrCode: '00020126580014BR.GOV.BCB.PIX',
    })

    const result = await generatePixQrCode(LANDLORD_ID, CHARGE_ID)

    expect(chargeService.getPixQrCode).not.toHaveBeenCalled()
    expect(result).toEqual({ encodedImage: null, payload: '00020126580014BR.GOV.BCB.PIX' })
  })

  it('busca no Asaas e cacheia o payload', async () => {
    const charge = { ...mockRentalCharge, pixQrCode: null, save: jest.fn() }
    RentalCharge.findOne.mockResolvedValue(charge)
    chargeService.getPixQrCode.mockResolvedValue({
      encodedImage: 'base64img==',
      payload: '00020126580014BR.GOV.BCB.PIX',
    })

    const result = await generatePixQrCode(LANDLORD_ID, CHARGE_ID)

    expect(chargeService.getPixQrCode).toHaveBeenCalledWith(LANDLORD_ID, 'pay_abc123')
    expect(charge.pixQrCode).toBe('00020126580014BR.GOV.BCB.PIX')
    expect(charge.save).toHaveBeenCalled()
    expect(result.payload).toBe('00020126580014BR.GOV.BCB.PIX')
  })
})
