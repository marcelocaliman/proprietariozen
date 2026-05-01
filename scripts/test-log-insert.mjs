import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

const { data: profile } = await supabase
  .from('profiles')
  .select('id')
  .limit(1)
  .single()

console.log('Inserindo log de teste pro user', profile.id, '...')
const { data, error } = await supabase
  .from('activity_logs')
  .insert({
    user_id: profile.id,
    action: 'TESTE_DEBUG',
    entity_type: 'debug',
    entity_id: null,
    details: { from: 'manual script' },
  })
  .select()

if (error) console.log('❌ ERRO:', error.message, error.code, error.details, error.hint)
else console.log('✅ OK:', data)
