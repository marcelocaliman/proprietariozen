'use strict'

process.env.ASAAS_API_KEY_ROOT = 'test_root_key'
process.env.NODE_ENV = 'test'

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('node-cron')
jest.mock('../../src/models/Contract')
jest.mock('../../src/models/Tenant')
jest.mock('../../src/services/rentalChargeService')

const cron = require('node-cron')
const Contract = require('../../src/models/Contract')
const Tenant = require('../../src/models/Tenant')
const { createMonthlyCharge } = require('../../src/services/rentalChargeService')

const { startChargeScheduler } = require('../../src/jobs/chargeScheduler')

// Captura o callback registrado no cron para execução manual nos testes
let scheduledCallback

beforeEach(() => {
  jest.clearAllMocks()
  scheduledCallback = null

  cron.schedule.mockImplementation((pattern, callback, options) => {
    scheduledCallback = callback
    return { stop: jest.fn() }
  })
})

// ── Fixtures ──────────────────────────────────────────────────────────────────

const CONTRACT_A = { _id: 'ctr_a', landlordId: 'lnd_1', tenantId: 'tnt_1' }
const CONTRACT_B = { _id: 'ctr_b', landlordId: 'lnd_2', tenantId: 'tnt_2' }
const MOCK_TENANT = { _id: 'tnt_1', name: 'Ana' }

// ─────────────────────────────────────────────────────────────────────────────

describe('startChargeScheduler', () => {
  it('registra cron no padrão correto com timezone Brasília', () => {
    startChargeScheduler()

    expect(cron.schedule).toHaveBeenCalledWith(
      '0 8 1 * *',
      expect.any(Function),
      { timezone: 'America/Sao_Paulo' }
    )
  })

  it('processa apenas contratos MANUAL ativos', async () => {
    Contract.find.mockResolvedValue([CONTRACT_A])
    Tenant.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(MOCK_TENANT) })
    createMonthlyCharge.mockResolvedValue({})

    startChargeScheduler()
    await scheduledCallback()

    expect(Contract.find).toHaveBeenCalledWith({ isActive: true, billingMode: 'MANUAL' })
  })

  it('cria cobranças para todos os contratos encontrados', async () => {
    Contract.find.mockResolvedValue([CONTRACT_A, CONTRACT_B])
    const tenantSelect = jest.fn().mockResolvedValue(MOCK_TENANT)
    Tenant.findById.mockReturnValue({ select: tenantSelect })
    createMonthlyCharge.mockResolvedValue({})

    startChargeScheduler()
    await scheduledCallback()

    expect(createMonthlyCharge).toHaveBeenCalledTimes(2)
  })

  it('continua processando os demais contratos quando um falha', async () => {
    Contract.find.mockResolvedValue([CONTRACT_A, CONTRACT_B])
    const tenantSelect = jest.fn().mockResolvedValue(MOCK_TENANT)
    Tenant.findById.mockReturnValue({ select: tenantSelect })

    createMonthlyCharge
      .mockRejectedValueOnce(new Error('Asaas timeout'))
      .mockResolvedValueOnce({})

    startChargeScheduler()
    await scheduledCallback()

    expect(createMonthlyCharge).toHaveBeenCalledTimes(2)
  })

  it('registra erro e continua quando o inquilino não é encontrado', async () => {
    Contract.find.mockResolvedValue([CONTRACT_A])
    Tenant.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(null) })

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    startChargeScheduler()
    await scheduledCallback()

    expect(createMonthlyCharge).not.toHaveBeenCalled()
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringMatching(/\[Scheduler\].*ctr_a/)
    )

    consoleSpy.mockRestore()
  })

  it('aborta graciosamente se a busca de contratos falhar', async () => {
    Contract.find.mockRejectedValue(new Error('DB connection lost'))

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    startChargeScheduler()
    await scheduledCallback()

    expect(createMonthlyCharge).not.toHaveBeenCalled()
    consoleSpy.mockRestore()
  })
})
