import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

// Tenta selecionar TODAS as colunas pra ver o que existe
const { data, error } = await supabase
  .from('activity_logs')
  .select('*')
  .limit(0)

console.log('Erro:', error?.message ?? 'nenhum')

// Lista tudo
const { data: all, error: e2 } = await supabase.from('activity_logs').select('id, user_id, action, entity_type, entity_id, ip_address, created_at, details').limit(1)
console.log('\nSelect com details:', e2 ? `❌ ${e2.message}` : '✅ ok')

const { error: e3 } = await supabase.from('activity_logs').select('id, action, ip_address').limit(1)
console.log('Select sem details:', e3 ? `❌ ${e3.message}` : '✅ ok')

// Testa insert sem details
const { data: profile } = await supabase.from('profiles').select('id').limit(1).single()
const { error: e4 } = await supabase.from('activity_logs').insert({
  user_id: profile.id,
  action: 'TESTE_NO_DETAILS',
}).select()
console.log('Insert sem details:', e4 ? `❌ ${e4.message}` : '✅ ok')
