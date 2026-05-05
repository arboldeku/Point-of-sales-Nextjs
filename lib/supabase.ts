import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Client-side: anon key (read-only, respects RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-side only: service role key (bypasses RLS for writes)
// Only import this in API routes (app/api/*), never in components
export function createServerClient() {
  return createClient(
    supabaseUrl,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

// Types matching our Supabase schema
export type InventoryCard = {
  internal_sku: string
  cardmarket_id: string
  qty: number
  available_qty?: number  // from inventory_available view (qty minus active locks)
  card_name: string
  set_code: string
  set_name: string
  cn: string | null
  rarity: string | null
  lang: string
  is_reverse: boolean
  listed_price_eur: number | null
  name_es: string | null
  game: string
}

export type ScanEvent = {
  sale_event_id: string
  sale_ts: string
  session_id: string
  internal_sku: string
  display_name: string
  language: string
  business_rarity: string | null
  qty: number
  unit_price: number
  gross_amount: number
  discount_eur: number
  channel: string
  source_system: string
  status: 'pending' | 'confirmed' | 'voided'
  sale_type: string
  payment_method: string | null
  money_direction: string
  trade_amount: number | null
}

export type RefCard = {
  cardmarket_id: string
  card_name: string
  set_name: string
  set_code: string
  cn: string | null
  rarity: string | null
  lang: string | null
  is_reverse: boolean | null
  name_es: string | null
  game: string
}
