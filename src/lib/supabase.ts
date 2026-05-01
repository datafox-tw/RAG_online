import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let supabaseClient: SupabaseClient | null = null

export function getSupabase() {
  if (supabaseClient) return supabaseClient

  const supabaseUrl = process.env.SUPABASE_URL || ''
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || ''

  if (!supabaseUrl) throw new Error('SUPABASE_URL is not set')
  if (!supabaseKey) throw new Error('SUPABASE keys are not set')

  supabaseClient = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  })

  return supabaseClient
}

export default getSupabase
