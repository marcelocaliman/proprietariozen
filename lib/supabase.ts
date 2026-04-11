import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

// Client para uso no lado do cliente (componentes 'use client')
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
