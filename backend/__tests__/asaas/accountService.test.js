'use strict'

// ── Configuração do ambiente de teste ─────────────────────────────────────────
process.env.ASAAS_API_KEY_ROOT = 'test_root_api_key_fake'
process.env.ASAAS_BASE_URL = 'https://sandbox.asaas.com/api/v3'
// 64 chars hex = 32 bytes para AES-256
process.env.ASAAS_ENCRYPTION_KEY = 'a'.repeat(64)
process.env.NODE_ENV = 'test'

// ── Mocks ──────────────────────────────────────────────────────────────────────
jest.mock('axios')
jest.mock('../../src/models/AsaasAccount')

const axios = require('axios')
const AsaasAccount = require('../../src/models/AsaasAccount')

// Mock da instância axios retornada por axios.create()
const mockAxiosInstance = {
  post: jest.fn(),
  get: jest.fn(),
  delete: jest.fn(),
  interceptors: {
    request: { use: jest.fn() },
    response: { use: jest.fn() },
  },
}
axios.create.mockReturnValue(mockAxiosInstance)

const {
  createSubAccount,
  getAccountStatus,
  encryptApiKey,
  decryptApiKey,
} = require('../../src/services/asaas/accountService')

// ── Fixtures ───────────────────────────────────────────────────────────────────
const PROPRIETARIO_DATA = {
  name: 'João Silva',
  email: 'joao@example.com',
  cpfCnpj: '12345678901',
  birthDate: '1985-06-15',
  mobilePhone: '11999990000',
  address: 'Rua das Flores',
  addressNumber: '123',
  province: 'Centro',
  postalCode: '01310100',
}

const ASAAS_CREATE_RESPONSE = {
  data: {
    id: 'acc_subaccount_abc123',
    apiKey: '$aact_subKey_REAL_API_KEY_FROM_ASAAS',
    walletId: 'wallet_xyz789',
    accountStatus: 'PENDING',
  },
}

// ── Testes de criptografia ────────────────────────────────────────────────────
describe('encryptApiKey / decryptApiKey', () => {
  const originalKey = '$aact_subKey_REAL_API_KEY_FROM_ASAAS'

  test('criptografa e descriptografa corretamente', () => {
    const encrypted = encryptApiKey(originalKey)
    const decrypted = decryptApiKey(encrypted)
    expect(decrypted).toBe(originalKey)
  })

  test('dois encripts do mesmo valor produzem ciphertexts diferentes (IV aleatório)', () => {
    const enc1 = encryptApiKey(originalKey)
    const enc2 = encryptApiKey(originalKey)
    expect(enc1).not.toBe(enc2)
    // Mas ambos descriptografam para o mesmo valor
    expect(decryptApiKey(enc1)).toBe(originalKey)
    expect(decryptApiKey(enc2)).toBe(originalKey)
  })

  test('o resultado criptografado tem formato iv:authTag:ciphertext', () => {
    const encrypted = encryptApiKey(originalKey)
    const parts = encrypted.split(':')
    expect(parts).toHaveLength(3)
    expect(parts[0]).toMatch(/^[0-9a-f]{32}$/)    // IV: 16 bytes = 32 hex chars
    expect(parts[1]).toMatch(/^[0-9a-f]{32}$/)    // Auth tag: 16 bytes = 32 hex chars
    expect(parts[2].length).toBeGreaterThan(0)    // Ciphertext não vazio
  })

  test('a apiKey nunca aparece no texto criptografado', () => {
    const encrypted = encryptApiKey(originalKey)
    expect(encrypted).not.toContain(originalKey)
    expect(encrypted).not.toContain('$aact')
    expect(encrypted).not.toContain('REAL_API_KEY')
  })
})

// ── Testes de createSubAccount ────────────────────────────────────────────────
describe('createSubAccount', () => {
  const USER_ID = '507f1f77bcf86cd799439011'

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('cria subconta com sucesso e persiste no banco', async () => {
    // Simular: sem conta existente
    AsaasAccount.findOne.mockResolvedValue(null)

    // Simular resposta do Asaas
    mockAxiosInstance.post.mockResolvedValue(ASAAS_CREATE_RESPONSE)

    // Simular save() bem-sucedido
    const mockSave = jest.fn().mockResolvedValue(undefined)
    const mockAccountInstance = {
      save: mockSave,
      asaasId: ASAAS_CREATE_RESPONSE.data.id,
      walletId: ASAAS_CREATE_RESPONSE.data.walletId,
      accountStatus: 'PENDING',
    }
    AsaasAccount.mockImplementation(() => mockAccountInstance)

    const result = await createSubAccount(USER_ID, PROPRIETARIO_DATA)

    // Verificar que save() foi chamado
    expect(mockSave).toHaveBeenCalledTimes(1)

    // Verificar resultado retornado
    expect(result).toEqual({
      asaasId: ASAAS_CREATE_RESPONSE.data.id,
      walletId: ASAAS_CREATE_RESPONSE.data.walletId,
      accountStatus: 'PENDING',
    })
  })

  test('save() é chamado ANTES de qualquer retorno', async () => {
    const callOrder = []

    AsaasAccount.findOne.mockResolvedValue(null)
    mockAxiosInstance.post.mockResolvedValue(ASAAS_CREATE_RESPONSE)

    const mockSave = jest.fn().mockImplementation(() => {
      callOrder.push('save')
      return Promise.resolve()
    })

    AsaasAccount.mockImplementation(() => ({
      save: mockSave,
      asaasId: ASAAS_CREATE_RESPONSE.data.id,
      walletId: ASAAS_CREATE_RESPONSE.data.walletId,
      accountStatus: 'PENDING',
    }))

    await createSubAccount(USER_ID, PROPRIETARIO_DATA)

    expect(callOrder[0]).toBe('save')
    expect(mockSave).toHaveBeenCalledTimes(1)
  })

  test('apiKey nunca é logada — console.error não contém a apiKey', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    AsaasAccount.findOne.mockResolvedValue(null)
    mockAxiosInstance.post.mockResolvedValue(ASAAS_CREATE_RESPONSE)

    // Forçar falha no save para acionar o log de erro
    const mockSave = jest.fn().mockRejectedValue(new Error('DB connection failed'))
    AsaasAccount.mockImplementation(() => ({ save: mockSave }))

    await expect(createSubAccount(USER_ID, PROPRIETARIO_DATA)).rejects.toThrow()

    // Verificar que nenhuma chamada ao console.error contém a apiKey
    const rawApiKey = ASAAS_CREATE_RESPONSE.data.apiKey
    const allCalls = consoleSpy.mock.calls.flat(Infinity).join(' ')
    expect(allCalls).not.toContain(rawApiKey)
    expect(allCalls).not.toContain('$aact')

    consoleSpy.mockRestore()
  })

  test('a apiKey criptografada (não a raw) é passada para o modelo', async () => {
    AsaasAccount.findOne.mockResolvedValue(null)
    mockAxiosInstance.post.mockResolvedValue(ASAAS_CREATE_RESPONSE)

    let capturedApiKey = null
    const mockSave = jest.fn().mockResolvedValue(undefined)
    AsaasAccount.mockImplementation((data) => {
      capturedApiKey = data.apiKey
      return {
        save: mockSave,
        ...data,
      }
    })

    await createSubAccount(USER_ID, PROPRIETARIO_DATA)

    // A apiKey passada ao modelo não pode ser a rawApiKey
    expect(capturedApiKey).not.toBe(ASAAS_CREATE_RESPONSE.data.apiKey)
    // Mas deve ser descriptografável para o valor original
    expect(decryptApiKey(capturedApiKey)).toBe(ASAAS_CREATE_RESPONSE.data.apiKey)
  })

  test('lança AsaasIntegrationError (409) se já existe conta vinculada', async () => {
    AsaasAccount.findOne.mockResolvedValue({ userId: USER_ID, asaasId: 'acc_existing' })

    await expect(createSubAccount(USER_ID, PROPRIETARIO_DATA))
      .rejects.toMatchObject({
        name: 'AsaasIntegrationError',
        statusCode: 409,
        asaasCode: 'accountAlreadyLinked',
      })
  })

  test('propaga AsaasIntegrationError quando o Asaas retorna erro', async () => {
    AsaasAccount.findOne.mockResolvedValue(null)

    const { AsaasIntegrationError } = require('../../src/services/asaas/AsaasIntegrationError')
    mockAxiosInstance.post.mockRejectedValue(
      new AsaasIntegrationError('CPF ou CNPJ inválido.', 422, 'invalid_cpfCnpj'),
    )

    await expect(createSubAccount(USER_ID, PROPRIETARIO_DATA))
      .rejects.toMatchObject({
        name: 'AsaasIntegrationError',
        statusCode: 422,
        asaasCode: 'invalid_cpfCnpj',
      })
  })

  test('lança erro com contexto claro quando o save falha', async () => {
    AsaasAccount.findOne.mockResolvedValue(null)
    mockAxiosInstance.post.mockResolvedValue(ASAAS_CREATE_RESPONSE)

    const mockSave = jest.fn().mockRejectedValue(new Error('MongoNetworkError'))
    AsaasAccount.mockImplementation(() => ({ save: mockSave }))

    await expect(createSubAccount(USER_ID, PROPRIETARIO_DATA))
      .rejects.toMatchObject({
        name: 'AsaasIntegrationError',
        statusCode: 500,
        asaasCode: 'dbSaveFailed',
      })
  })
})
