'use strict'

const mongoose = require('mongoose')

/**
 * Armazena os dados da subconta Asaas vinculada a cada proprietário.
 *
 * SEGURANÇA:
 * - O campo `apiKey` NUNCA é armazenado em texto puro.
 * - O campo `apiKey` é excluído por padrão das queries com `select: false`.
 * - A criptografia/decriptografia é responsabilidade do accountService.
 * - Adicionar índice único em userId para impedir subcontas duplicadas.
 */
const asaasAccountSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'userId é obrigatório'],
      unique: true,                    // Um proprietário → uma subconta
      index: true,
    },

    asaasId: {
      type: String,
      required: [true, 'asaasId é obrigatório'],
      unique: true,
      trim: true,
    },

    /**
     * API key da subconta CRIPTOGRAFADA com AES-256-GCM.
     * Formato armazenado: "<iv_hex>:<authTag_hex>:<encrypted_hex>"
     *
     * select: false → não incluída em queries padrão.
     * Buscar explicitamente com: AsaasAccount.findOne(...).select('+apiKey')
     */
    apiKey: {
      type: String,
      required: [true, 'apiKey criptografada é obrigatória'],
      select: false,
    },

    walletId: {
      type: String,
      required: false,
      trim: true,
    },

    accountStatus: {
      type: String,
      enum: {
        values: ['PENDING', 'ACTIVE', 'REJECTED', 'BLOCKED'],
        message: 'accountStatus inválido: {VALUE}',
      },
      default: 'PENDING',
    },

    onboardingCompleted: {
      type: Boolean,
      default: false,
    },

    /**
     * Data em que o proprietário completou o formulário no painel Asaas
     * (recebido via webhook ACCOUNT_STATUS_UPDATED).
     */
    approvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,                  // createdAt e updatedAt automáticos
    versionKey: false,
  },
)

// ── Índices compostos ────────────────────────────────────────────────────────
asaasAccountSchema.index({ accountStatus: 1 })

// ── Método de instância: retorna representação segura (sem apiKey) ───────────
asaasAccountSchema.methods.toSafeObject = function () {
  return {
    id: this._id,
    userId: this.userId,
    asaasId: this.asaasId,
    walletId: this.walletId,
    accountStatus: this.accountStatus,
    onboardingCompleted: this.onboardingCompleted,
    approvedAt: this.approvedAt,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  }
}

const AsaasAccount = mongoose.model('AsaasAccount', asaasAccountSchema)

module.exports = AsaasAccount
