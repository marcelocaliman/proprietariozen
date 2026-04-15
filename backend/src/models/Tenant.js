'use strict'

const mongoose = require('mongoose')

/**
 * Inquilino cadastrado no sistema.
 *
 * Um inquilino pode ter cobranças em subcontas de vários proprietários.
 * O campo asaasCustomerIds armazena o ID do cliente na subconta de cada
 * proprietário separadamente — o mesmo CPF pode existir como customer
 * em múltiplas subcontas Asaas distintas.
 *
 * Chave do mapa: String(landlordId)
 * Valor: asaasCustomerId na subconta deste proprietário
 */
const tenantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    // Apenas dígitos (sem pontos/traços)
    cpfCnpj: {
      type: String,
      required: true,
      trim: true,
    },

    phone: {
      type: String,
      default: null,
      trim: true,
    },

    mobilePhone: {
      type: String,
      required: true,
      trim: true,
    },

    address: {
      type: String,
      default: null,
    },

    addressNumber: {
      type: String,
      default: null,
    },

    province: {
      type: String,
      default: null,
    },

    postalCode: {
      type: String,
      default: null,
      trim: true,
    },

    /**
     * Mapa de asaasCustomerId por proprietário.
     * Ex: { "507f1f77bcf86cd799439011": "cus_abc123" }
     *
     * Usar Tenant.findById(id).select('+asaasCustomerIds') para incluir.
     */
    asaasCustomerIds: {
      type: Map,
      of: String,
      default: () => new Map(),
      select: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
)

tenantSchema.index({ cpfCnpj: 1 })
tenantSchema.index({ email: 1 })

const Tenant = mongoose.model('Tenant', tenantSchema)

module.exports = Tenant
