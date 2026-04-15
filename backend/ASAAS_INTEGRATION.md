# Integração Asaas — ProprietárioZen

## Visão Geral

O ProprietárioZen usa o modelo de **subcontas Asaas** (conta plataforma + subcontas dos proprietários). Cada proprietário que quer receber aluguéis via Pix ou Boleto precisa de uma subconta vinculada. O dinheiro cai diretamente na conta do proprietário — o ProprietárioZen não toca nos recursos financeiros.

```
Inquilino paga  →  Asaas processa  →  Dinheiro cai na subconta do proprietário
                                    ↓
                              Webhook notifica o backend
                                    ↓
                          Backend atualiza status + notifica app
```

---

## Fluxo Completo de Onboarding

### 1. Proprietário solicita ativação no app

```
POST /api/asaas/onboarding
Authorization: Bearer <jwt>
Body: { name, email, cpfCnpj, birthDate, mobilePhone, address, ... }
```

### 2. Backend cria a subconta

- Chama `POST /v3/accounts` com a **conta raiz** ProprietárioZen
- Recebe `{ id, apiKey, walletId }` — a `apiKey` é retornada **uma única vez**
- Criptografa a `apiKey` com AES-256-GCM antes de persistir
- Salva `AsaasAccount` no MongoDB

### 3. Asaas envia e-mail ao proprietário

O proprietário recebe um e-mail do Asaas (domínio @asaas.com na conta padrão) para:
- Definir a senha do painel Asaas
- Enviar os documentos necessários (selfie, CNH/RG, comprovante de renda)

### 4. Aprovação (1–3 dias úteis)

Quando o Asaas aprova ou rejeita, dispara o webhook `ACCOUNT_STATUS_UPDATED`.
O backend atualiza `accountStatus` no banco e envia push notification para o proprietário.

### 5. Proprietário começa a receber

Com `accountStatus = ACTIVE`, o backend pode criar cobranças na subconta.

---

## Segurança da apiKey das Subcontas

A `apiKey` de cada subconta é o único meio de criar cobranças naquela conta.
Por isso:

| O que fazemos | Por quê |
|---|---|
| Criptografia AES-256-GCM antes do save | Comprometimento do banco não expõe as keys |
| `select: false` no campo apiKey | Queries padrão nunca retornam a key |
| IV único por encriptação | Mesmo valor → ciphertexts diferentes |
| Nunca logamos a rawApiKey | Logs não expõem credenciais |
| `getDecryptedApiKey` é interno | Nunca exposto via REST |

**Para rotacionar a `ASAAS_ENCRYPTION_KEY`:**

```js
// 1. Buscar todos os documentos com a chave antiga
const contas = await AsaasAccount.find().select('+apiKey')

// 2. Para cada uma: descriptografar com a chave antiga, re-encriptar com a nova
for (const conta of contas) {
  const plain = decryptApiKeyComChaveAntiga(conta.apiKey)
  conta.apiKey = encryptApiKeyComChaveNova(plain)
  await conta.save()
}
```

---

## Variáveis de Ambiente

| Variável | Descrição | Obrigatória |
|---|---|---|
| `ASAAS_API_KEY_ROOT` | API key da conta raiz ProprietárioZen | Sim |
| `ASAAS_BASE_URL` | `https://sandbox.asaas.com/api/v3` (dev) ou `https://api.asaas.com/v3` (prod) | Sim |
| `ASAAS_ENCRYPTION_KEY` | 64 chars hex (32 bytes) para AES-256 | Sim |
| `WEBHOOK_BASE_URL` | URL pública do backend | Sim |
| `ASAAS_WEBHOOK_TOKEN` | Token de validação dos webhooks | Sim |
| `MONGODB_URI` | Connection string MongoDB | Sim |
| `JWT_SECRET` | Segredo para verificação JWT | Sim |
| `FIREBASE_CREDENTIAL_PATH` | Caminho para credenciais Firebase Admin | Não* |

*Firebase é opcional. Se ausente, as notificações push são ignoradas silenciosamente.

**Gerar as chaves aleatórias:**
```bash
# ASAAS_ENCRYPTION_KEY
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# ASAAS_WEBHOOK_TOKEN
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Webhooks

### Registro

Os webhooks são registrados **na subconta** (não na conta raiz) logo após o onboarding.
Isso é crucial: cada subconta tem seus próprios webhooks.

### Eventos registrados

| Evento | Ação |
|---|---|
| `PAYMENT_RECEIVED` | Atualiza status da cobrança + push "Aluguel recebido" |
| `PAYMENT_OVERDUE` | Push "Aluguel em atraso" para o proprietário |
| `PAYMENT_DELETED` | Marca cobrança como cancelada no banco |
| `ACCOUNT_STATUS_UPDATED` | Atualiza `accountStatus` + push conforme novo status |

### Validação

O Asaas envia o header `asaas-access-token` com o valor configurado em `authToken` no registro.
O backend valida esse header antes de processar qualquer evento.

### Idempotência

O handler sempre retorna HTTP 200. O Asaas reexperimenta com backoff exponencial em caso de falha;
respostas 2xx indicam recebimento bem-sucedido.

### Desenvolvimento local com ngrok

```bash
ngrok http 3001
# Copiar a URL HTTPS gerada (ex: https://abc123.ngrok.io)
# Definir WEBHOOK_BASE_URL=https://abc123.ngrok.io no .env
```

---

## Estrutura de Arquivos

```
src/
├── services/asaas/
│   ├── asaasClient.js         # axios configurado (raiz e subconta)
│   ├── accountService.js      # createSubAccount, getAccountStatus, encrypt/decrypt
│   ├── chargeService.js       # createCharge, listCharges, cancelCharge, getPixQrCode
│   ├── webhookService.js      # setupWebhook, handleWebhookEvent, handlers
│   └── AsaasIntegrationError.js  # Classe de erro + mapeamento de códigos Asaas
├── models/
│   └── AsaasAccount.js        # Mongoose schema da subconta
├── routes/
│   ├── asaas.js               # POST /onboarding, GET /status, GET /account
│   └── webhooks.js            # POST /api/webhooks/asaas
├── middleware/
│   └── auth.js                # JWT middleware
└── app.js                     # Express + MongoDB

__tests__/asaas/
├── accountService.test.js     # Criptografia, createSubAccount, segurança da apiKey
├── webhookService.test.js     # setupWebhook usa apiKey da subconta (não da raiz)
└── webhookHandler.test.js     # Cada tipo de evento com payload real do Asaas
```

---

## Migração para White Label

A conta White Label do Asaas permite que o e-mail de boas-vindas seja enviado pelo domínio do ProprietárioZen (ex: `noreply@proprietariezen.com.br`) em vez do domínio `@asaas.com`, e o proprietário acesse o painel via subdomínio personalizado.

### O que muda no código

**Um único campo** no payload do `POST /accounts` em `accountService.js`:

```js
// accountService.js — função createSubAccount
// Linha marcada com "Migração White Label":

const payload = {
  name: data.name,
  email: data.email,
  cpfCnpj: data.cpfCnpj,
  // ... outros campos ...

  // ▼ DESCOMENTAR ao migrar para White Label ▼
  // loginEmailSmtp: data.email,
  // Instrui o Asaas a enviar o e-mail de boas-vindas via SMTP White Label
  // em vez do domínio padrão @asaas.com.
}
```

### O que configurar no painel Asaas White Label

1. Ativar o plano White Label na conta raiz
2. Configurar o subdomínio: `proprietariezen.asaas.com` ou domínio próprio
3. Configurar SMTP para envio dos e-mails
4. Descomentar `loginEmailSmtp` no `accountService.js`
5. Atualizar `ASAAS_BASE_URL` se o endpoint mudar

**Não há refatoração de banco, modelos ou lógica de negócio.**
A mudança é exclusivamente no payload de criação de subconta.

---

## Executando os Testes

```bash
npm test                  # todos os testes
npm run test:coverage     # com relatório de cobertura
```

**Cobertura atual:** 31 testes passando, cobrindo:
- Criptografia AES-256-GCM (encrypt/decrypt, unicidade de IV, segurança)
- `createSubAccount`: sucesso, duplicata, erro Asaas, falha de banco, ordem do save()
- Garantia que a apiKey **nunca** aparece em logs
- `setupWebhook`: usa apiKey da subconta, eventos corretos, idempotência
- `handleWebhookEvent`: roteamento, eventos desconhecidos, payloads inválidos
- Handlers: `ACCOUNT_STATUS_UPDATED`, `PAYMENT_RECEIVED`, `PAYMENT_OVERDUE`
