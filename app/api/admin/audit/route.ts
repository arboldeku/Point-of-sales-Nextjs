import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyToken } from '@/lib/auth'
import type { Database } from '@/types/supabase'

const getAdminClient = () => createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Audit log with filters: user_id, action, result, date_from, date_to
export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.slice(7)
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const payload = verifyToken(token)
  if (!payload || payload.role !== 'Admin') {
    return NextResponse.json({ error: 'Solo administradores pueden ver la auditoría' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const limit    = parseInt(searchParams.get('limit') || '200')
  const action   = searchParams.get('action')       // e.g. SELL_PRODUCT
  const result   = searchParams.get('result')       // ALLOWED | DENIED
  const userId   = searchParams.get('user_id')
  const dateFrom = searchParams.get('date_from')    // ISO date string
  const dateTo   = searchParams.get('date_to')

  const supabase = getAdminClient()

  let query = supabase
    .from('audit_log')
    .select('id, action, resource_type, resource_id, permission_check, timestamp, ip_address, users(username, role)')
    .order('timestamp', { ascending: false })
    .limit(limit)

  if (action)   query = query.eq('action', action)
  if (result)   query = query.eq('permission_check', result as 'ALLOWED' | 'DENIED')
  if (userId)   query = query.eq('user_id', userId)
  if (dateFrom) query = query.gte('timestamp', dateFrom)
  if (dateTo)   query = query.lte('timestamp', dateTo)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ audit: data })
}
