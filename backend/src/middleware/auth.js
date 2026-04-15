'use strict'

require('dotenv').config()
const jwt = require('jsonwebtoken')

/**
 * Middleware JWT — extrai e valida o token Bearer.
 * Injeta `req.userId` (string) para uso nos controllers.
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de autenticação não fornecido.' })
  }

  const token = authHeader.slice(7)

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    req.userId = payload.sub ?? payload.userId ?? payload.id
    next()
  } catch (err) {
    const message = err.name === 'TokenExpiredError'
      ? 'Token expirado.'
      : 'Token inválido.'
    return res.status(401).json({ error: message })
  }
}

module.exports = { authMiddleware }
