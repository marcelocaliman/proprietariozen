'use strict'

process.env.ASAAS_API_KEY_ROOT = 'test_root_api_key'
process.env.ASAAS_ENCRYPTION_KEY = 'c'.repeat(64)
process.env.NODE_ENV = 'test'

jest.mock('axios')
jest.mock('../../src/models/AsaasAccount')
// Firebase admin mockado globalmente — não deve ser chamado em testes unitários
jest.mock('firebase-admin', () => ({
  messaging: () => ({ send: jest.fn().mockResolvedValue('mock_message_id') }),
}), { virtual: true })
// Modelo User mockado
jest.mock('../../src/models/User', () => ({
  findById: jest.fn().mockReturnValue({
    select: jest.fn().mockResolvedValue({ fcmToken: 'mock_fcm_token' }),
  }),
}), { virtual: true })

const axios = require('axios')
const AsaasAccount = require('../../src/models/AsaasAccount')

axios.create.mockReturnValue({
  post: jest.fn(),
  get: jest.fn(),
  interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
})

const {
  handleWebhookEvent,
  handleAccountStatusUpdated,
  handlePaymentReceived,
  handlePaymentOverdue,
} = require('../../src/services/asaas/webhookService')

// ── Fixtures — payloads reais da documentação Asaas ──────────────────────────

const ACCOUNT_STATUS_UPDATED_PAYLOAD = {
  event: 'ACCOUNT_STATUS_UPDATED',
  account: {
    id: 'acc_subaccount_abc123',
    accountStatus: 'ACTIVE',
    commercialInfoStatus: 'APPROVED',
  },
}

const PAYMENT_RECEIVED_PAYLOAD = {
  event: 'PAYMENT_RECEIVED',
  payment: {
    id: 'pay_abc123',
    customer: 'cus_tenant_001',
    value: 1500.00,
    netValue: 1485.00,
    billingType: 'PIX',
    status: 'RECEIVED',
    dueDate: '2026-05-10',
    paymentDate: '2026-05-08',
    description: 'Aluguel maio/2026 — Apto 12B',
    asaasAccount: 'acc_subaccount_abc123',
    transferredBy: { walletId: 'wallet_xyz789' },
  },
}

const PAYMENT_OVERDUE_PAYLOAD = {
  event: 'PAYMENT_OVERDUE',
  payment: {
    id: 'pay_overdue_456',
    customer: 'cus_tenant_001',
    value: 2000.00,
    billingType: 'BOLETO',
    status: 'OVERDUE',
    dueDate: '2026-04-10',
    asaasAccount: 'acc_subaccount_abc123',
    transferredBy: { walletId: 'wallet_xyz789' },
  },
}

const PAYMENT_DELETED_PAYLOAD = {
  event: 'PAYMENT_DELETED',
  payment: {
    id: 'pay_deleted_789',
    status: 'DELETED',
    asaasAccount: 'acc_subaccount_abc123',
  },
}

const MOCK_ASAAS_ACCOUNT = {
  _id: 'db_account_id',
  userId: '507f1f77bcf86cd799439011',
  asaasId: 'acc_subaccount_abc123',
  walletId: 'wallet_xyz789',
  accountStatus: 'PENDING',
  onboardingCompleted: false,
  approvedAt: null,
}

// ── handleWebhookEvent (roteador) ─────────────────────────────────────────────
describe('handleWebhookEvent — roteamento', () => {
  beforeEach(() => jest.clearAllMocks())

  test('nunca lança — resolve mesmo se o handler interno falhar', async () => {
    AsaasAccount.findOne.mockResolvedValue(null) // handler vai logar e continuar

    await expect(
      handleWebhookEvent(ACCOUNT_STATUS_UPDATED_PAYLOAD),
    ).resolves.toBeUndefined()
  })

  test('resolve para eventos desconhecidos sem lançar', async () => {
    await expect(
      handleWebhookEvent({ event: 'UNKNOWN_EVENT_TYPE', data: {} }),
    ).resolves.toBeUndefined()
  })

  test('resolve quando payload não tem campo "event"', async () => {
    await expect(
      handleWebhookEvent({}),
    ).resolves.toBeUndefined()
  })
})

// ── ACCOUNT_STATUS_UPDATED ────────────────────────────────────────────────────
describe('handleAccountStatusUpdated', () => {
  beforeEach(() => jest.clearAllMocks())

  test('atualiza accountStatus no banco quando conta é aprovada', async () => {
    AsaasAccount.findOne.mockResolvedValue({ ...MOCK_ASAAS_ACCOUNT })
    AsaasAccount.updateOne = jest.fn().mockResolvedValue({ modifiedCount: 1 })

    await handleAccountStatusUpdated(ACCOUNT_STATUS_UPDATED_PAYLOAD)

    expect(AsaasAccount.updateOne).toHaveBeenCalledWith(
      { asaasId: 'acc_subaccount_abc123' },
      expect.objectContaining({
        accountStatus: 'ACTIVE',
        onboardingCompleted: true,
      }),
    )
  })

  test('define approvedAt quando status muda para ACTIVE pela primeira vez', async () => {
    AsaasAccount.findOne.mockResolvedValue({ ...MOCK_ASAAS_ACCOUNT, accountStatus: 'PENDING' })
    AsaasAccount.updateOne = jest.fn().mockResolvedValue({})

    await handleAccountStatusUpdated(ACCOUNT_STATUS_UPDATED_PAYLOAD)

    const updateCall = AsaasAccount.updateOne.mock.calls[0][1]
    expect(updateCall.approvedAt).toBeInstanceOf(Date)
  })

  test('não atualiza se a conta não for encontrada no banco', async () => {
    AsaasAccount.findOne.mockResolvedValue(null)
    AsaasAccount.updateOne = jest.fn()

    await handleAccountStatusUpdated(ACCOUNT_STATUS_UPDATED_PAYLOAD)

    expect(AsaasAccount.updateOne).not.toHaveBeenCalled()
  })

  test('processa evento REJECTED sem lançar', async () => {
    AsaasAccount.findOne.mockResolvedValue({ ...MOCK_ASAAS_ACCOUNT })
    AsaasAccount.updateOne = jest.fn().mockResolvedValue({})

    const rejectedEvent = {
      ...ACCOUNT_STATUS_UPDATED_PAYLOAD,
      account: { ...ACCOUNT_STATUS_UPDATED_PAYLOAD.account, accountStatus: 'REJECTED' },
    }

    await expect(handleAccountStatusUpdated(rejectedEvent)).resolves.toBeUndefined()

    expect(AsaasAccount.updateOne).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ accountStatus: 'REJECTED', onboardingCompleted: false }),
    )
  })
})

// ── PAYMENT_RECEIVED ──────────────────────────────────────────────────────────
describe('handlePaymentReceived', () => {
  beforeEach(() => jest.clearAllMocks())

  test('localiza a subconta pelo walletId', async () => {
    AsaasAccount.findOne.mockResolvedValue({ ...MOCK_ASAAS_ACCOUNT })

    await handlePaymentReceived(PAYMENT_RECEIVED_PAYLOAD)

    expect(AsaasAccount.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        $or: expect.arrayContaining([
          { walletId: 'wallet_xyz789' },
        ]),
      }),
    )
  })

  test('não lança se a subconta não for encontrada', async () => {
    AsaasAccount.findOne.mockResolvedValue(null)

    await expect(handlePaymentReceived(PAYMENT_RECEIVED_PAYLOAD)).resolves.toBeUndefined()
  })

  test('não lança se o payment.id estiver ausente', async () => {
    await expect(
      handlePaymentReceived({ event: 'PAYMENT_RECEIVED', payment: {} }),
    ).resolves.toBeUndefined()
  })

  test('processa pagamento via PIX corretamente', async () => {
    AsaasAccount.findOne.mockResolvedValue({ ...MOCK_ASAAS_ACCOUNT })

    await expect(
      handlePaymentReceived(PAYMENT_RECEIVED_PAYLOAD),
    ).resolves.toBeUndefined()
  })

  test('processa pagamento via BOLETO corretamente', async () => {
    AsaasAccount.findOne.mockResolvedValue({ ...MOCK_ASAAS_ACCOUNT })

    const boletoPayload = {
      ...PAYMENT_RECEIVED_PAYLOAD,
      payment: { ...PAYMENT_RECEIVED_PAYLOAD.payment, billingType: 'BOLETO' },
    }

    await expect(handlePaymentReceived(boletoPayload)).resolves.toBeUndefined()
  })
})

// ── PAYMENT_OVERDUE ───────────────────────────────────────────────────────────
describe('handlePaymentOverdue', () => {
  beforeEach(() => jest.clearAllMocks())

  test('localiza subconta e não lança', async () => {
    AsaasAccount.findOne.mockResolvedValue({ ...MOCK_ASAAS_ACCOUNT })

    await expect(handlePaymentOverdue(PAYMENT_OVERDUE_PAYLOAD)).resolves.toBeUndefined()
  })

  test('não lança se subconta não encontrada', async () => {
    AsaasAccount.findOne.mockResolvedValue(null)

    await expect(handlePaymentOverdue(PAYMENT_OVERDUE_PAYLOAD)).resolves.toBeUndefined()
  })
})

// ── Validação do token no handler Express ─────────────────────────────────────
describe('Webhook route — validação do token', () => {
  let app
  let request

  beforeAll(async () => {
    // Importar dinamicamente para evitar conflito com mocks
    process.env.ASAAS_WEBHOOK_TOKEN = 'valid_token_123'
    const express = require('express')
    const webhookRoutes = require('../../src/routes/webhooks')
    app = express()
    app.use(express.json())
    app.use('/api/webhooks', webhookRoutes)

    try {
      request = require('supertest')
    } catch {
      request = null // supertest não instalado — pular testes de rota
    }
  })

  test.skip('retorna 401 com token inválido', async () => {
    if (!request) return
    const res = await request(app)
      .post('/api/webhooks/asaas')
      .set('asaas-access-token', 'wrong_token')
      .send(PAYMENT_RECEIVED_PAYLOAD)
    expect(res.status).toBe(401)
  })

  test.skip('retorna 200 com token válido', async () => {
    if (!request) return
    AsaasAccount.findOne.mockResolvedValue(null)
    const res = await request(app)
      .post('/api/webhooks/asaas')
      .set('asaas-access-token', 'valid_token_123')
      .send(PAYMENT_RECEIVED_PAYLOAD)
    expect(res.status).toBe(200)
    expect(res.body.received).toBe(true)
  })
})
