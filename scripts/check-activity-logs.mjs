import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

const { count } = await supabase
  .from('activity_logs')
  .select('id', { count: 'exact', head: true })
console.log('Total logs:', count)

const { data: recent } = await supabase
  .from('activity_logs')
  .select('id, user_id, action, entity_type, entity_id, created_at')
  .order('created_at', { ascending: false })
  .limit(15)
console.log('\nÚltimos 15:')
for (const r of recent ?? []) {
  console.log(`  ${r.created_at.slice(0, 19)}  ${r.action.padEnd(30)} ${r.entity_type ?? '—'}/${(r.entity_id ?? '—').slice(0, 8)}  user=${r.user_id?.slice(0, 8) ?? '—'}`)
}

// Tenta o JOIN que a API usa
console.log('\nTeste de JOIN com profiles:')
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { data: joined, error: joinErr } = await supabase
  .from('activity_logs')
  .select('id, action, profiles!activity_logs_user_id_fkey(id, nome, email)')
  .limit(3)
if (joinErr) console.log('  ❌ erro:', joinErr.message)
else console.log('  ✅ ok, exemplos:', JSON.stringify(joined?.[0] ?? null, null, 2))
