'use strict'

require('dotenv').config()
const crypto = require('crypto')
const { rootClient, createClient } = require('./asaasClient')
const { AsaasIntegrationError } = require('./AsaasIntegrationError')
const AsaasAccount = require('../../models/AsaasAccount')

// ── Constantes de criptografia ────────────────────────────────────────────────
const CIPHER_ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16    // bytes
const TAG_LENGTH = 16   // bytes (GCM auth tag)

/**
 * Retorna a chave de criptografia como Buffer de 32 bytes a partir
 * de ASAAS_ENCRYPTION_KEY (64 chars hex).
 *
 * @returns {Buffer}
 */
function getEncryptionKey() {
  const keyHex = process.env.ASAAS_ENCRYPTION_KEY
  if (!keyHex || keyHex.length !== 64) {
    throw new Error(
      'ASAAS_ENCRYPTION_KEY inválida. ' +
      'Deve ser uma string hexadecimal de 64 caracteres (32 bytes).',
    )
  }
  return Buffer.from(keyHex, 'hex')
}

/**
 * Criptografa uma string com AES-256-GCM.
 * Retorna: "<iv_hex>:<authTag_hex>:<ciphertext_hex>"
 *
 * O IV é gerado aleatoriamente a cada chamada para que dois
 * valores idênticos produzam ciphertexts diferentes.
 *
 * @param {string} plaintext
 * @returns {string}
 */
function encryptApiKey(plaintext) {
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(CIPHER_ALGORITHM, key, iv)

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ])
  const authTag = cipher.getAuthTag()

  return [
    iv.toString('hex'),
    authTag.toString('hex'),
    encrypted.toString('hex'),
  ].join(':')
}

/**
 * Descriptografa uma string produzida por encryptApiKey.
 *
 * @param {string} encryptedText  Formato: "<iv_hex>:<authTag_hex>:<ciphertext_hex>"
 * @returns {string}  Plaintext original
 */
function decryptApiKey(encryptedText) {
  const parts = encryptedText.split(':')
  if (parts.length !== 3) {
    throw new Error('Formato do apiKey criptografado inválido.')
  }

  const [ivHex, authTagHex, ciphertextHex] = parts
  const key = getEncryptionKey()
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  const ciphertext = Buffer.from(ciphertextHex, 'hex')

  const decipher = crypto.createDecipheriv(CIPHER_ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  return decipher.update(ciphertext, undefined, 'utf8') + decipher.final('utf8')
}

// ── Funções exportadas ────────────────────────────────────────────────────────

/**
 * Cria uma subconta Asaas para o proprietário e persiste no banco.
 *
 * ATENÇÃO: a apiKey é retornada UMA ÚNICA VEZ pelo Asaas.
 * O save() no banco é garantido ANTES de qualquer outro processamento.
 *
 * @param {string} userId  ObjectId do proprietário no sistema
 * @param {Object} data    Dados do proprietário
 * @param {string} data.name
 * @param {string} data.email
 * @param {string} data.cpfCnpj          Apenas dígitos (sem pontos/traços)
 * @param {string} data.birthDate        Formato YYYY-MM-DD (obrigatório para PF)
 * @param {string} [data.phone]          Fixo com DDD
 * @param {string} data.mobilePhone      Celular com DDD
 * @param {string} data.address          Logradouro
 * @param {string} data.addressNumber
 * @param {string} data.province         Bairro
 * @param {string} data.postalCode       CEP (apenas dígitos)
 * @param {string} [data.companyType]    MEI | LTDA | SA | INDIVIDUAL (apenas PJ)
 *
 * @returns {Promise<{ asaasId: string, walletId: string, accountStatus: string }>}
 * @throws {AsaasIntegrationError}
 */
async function createSubAccount(userId, data) {
  // ── 1. Verificar duplicata ────────────────────────────────────────────────
  const existing = await AsaasAccount.findOne({ userId })
  if (existing) {
    throw new AsaasIntegrationError(
      'Este proprietário já possui uma conta Asaas vinculada.',
      409,
      'accountAlreadyLinked',
    )
  }

  // ── 2. Montar payload para o Asaas ───────────────────────────────────────
  //
  // Migração White Label: adicionar `loginEmailSmtp: data.email` aqui.
  // Isso instrui o Asaas a enviar o e-mail de boas-vindas pelo domínio
  // White Label em vez do domínio padrão asaas.com.
  // Ver ASAAS_INTEGRATION.md → seção "Migração para White Label".
  //
  const payload = {
    name: data.name,
    email: data.email,
    cpfCnpj: data.cpfCnpj,
    birthDate: data.birthDate ?? undefined,
    phone: data.phone ?? undefined,
    mobilePhone: data.mobilePhone,
    address: data.address,
    addressNumber: data.addressNumber,
    province: data.province,
    postalCode: data.postalCode,
    companyType: data.companyType ?? undefined,
  }

  // ── 3. Chamar POST /accounts ──────────────────────────────────────────────
  // Erros são convertidos em AsaasIntegrationError pelo interceptor do cliente.
  const response = await rootClient.post('/accounts', payload)
  const { id: asaasId, apiKey: rawApiKey, walletId } = response.data

  if (!asaasId || !rawApiKey) {
    throw new AsaasIntegrationError(
      'Resposta inesperada do Asaas: id ou apiKey ausentes.',
      500,
      'unexpectedResponse',
    )
  }

  // ── 4. Criptografar a apiKey ANTES de qualquer outro processamento ────────
  //
  // Crítico: se o save falhar por qualquer motivo (conexão, validação),
  // a apiKey é perdida para sempre. Não há outro endpoint para recuperá-la.
  // O bloco try/catch garante que o erro seja propagado com contexto claro.
  //
  const encryptedApiKey = encryptApiKey(rawApiKey)

  // ── 5. Persistir no banco ─────────────────────────────────────────────────
  let account
  try {
    account = new AsaasAccount({
      userId,
      asaasId,
      apiKey: encryptedApiKey,
      walletId: walletId ?? null,
      accountStatus: 'PENDING',
      onboardingCompleted: false,
    })
    await account.save()
  } catch (dbError) {
    // A apiKey foi gerada mas não salva. Logar o asaasId para auditoria
    // (NÃO logar a rawApiKey).
    console.error(
      '[Asaas] CRÍTICO: subconta criada mas falhou ao persistir no banco. ' +
      `asaasId=${asaasId} userId=${userId}`,
      dbError.message,
    )
    throw new AsaasIntegrationError(
      'Conta criada no Asaas mas falhou ao salvar no banco. ' +
      'Contate o suporte com o asaasId para recuperação manual.',
      500,
      'dbSaveFailed',
    )
  }

  // rawApiKey sai de escopo aqui — não é retornada nem logada
  return {
    asaasId: account.asaasId,
    walletId: account.walletId,
    accountStatus: account.accountStatus,
  }
}

/**
 * Consulta o status atual da subconta no Asaas.
 * Usa a apiKey descriptografada da subconta (não da conta raiz).
 *
 * @param {string} userId  ObjectId do proprietário
 * @returns {Promise<{ commercialInfoStatus: string, accountStatus: string }>}
 */
async function getAccountStatus(userId) {
  const account = await AsaasAccount.findOne({ userId }).select('+apiKey')
  if (!account) {
    throw new AsaasIntegrationError(
      'Nenhuma conta Asaas vinculada para este usuário.',
      404,
      'accountNotFound',
    )
  }

  const decryptedKey = decryptApiKey(account.apiKey)
  const subClient = createClient(decryptedKey)

  const response = await subClient.get('/myAccount/status')
  const { commercialInfoStatus, accountStatus } = response.data

  // Sincronizar o status local se mudou
  if (accountStatus && account.accountStatus !== accountStatus) {
    await AsaasAccount.updateOne(
      { userId },
      {
        accountStatus,
        onboardingCompleted: accountStatus === 'ACTIVE',
        approvedAt: accountStatus === 'ACTIVE' ? new Date() : account.approvedAt,
      },
    )
  }

  return { commercialInfoStatus, accountStatus }
}

/**
 * Retorna a apiKey descriptografada de uma subconta.
 * Uso interno — NÃO expor via API REST.
 *
 * @param {string} userId
 * @returns {Promise<string>}
 */
async function getDecryptedApiKey(userId) {
  const account = await AsaasAccount.findOne({ userId }).select('+apiKey')
  if (!account) {
    throw new AsaasIntegrationError(
      'Conta Asaas não encontrada para este usuário.',
      404,
      'accountNotFound',
    )
  }
  return decryptApiKey(account.apiKey)
}

module.exports = {
  createSubAccount,
  getAccountStatus,
  getDecryptedApiKey,
  // Exportados para uso nos testes unitários
  encryptApiKey,
  decryptApiKey,
}
