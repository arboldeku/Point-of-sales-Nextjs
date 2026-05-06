import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Server-side client (full access)
export const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey)

// Browser client (row-level security enforced)
export const createBrowserClient = () => {
  return createClient<Database>(supabaseUrl, supabaseAnonKey)
}

// Get client for browser with auth token
export const getBrowserClientWithAuth = (token: string) => {
  const client = createBrowserClient()

  // Override the auth header
  return {
    ...client,
    headers: {
      ...client.headers,
      Authorization: `Bearer ${token}`,
    },
  }
}
