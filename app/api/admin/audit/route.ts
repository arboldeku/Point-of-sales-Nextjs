import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyToken } from '@/lib/auth'
import type { Database } from '@/types/supabase'

const getAdminClient = () => createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Audit log with user info joined
export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.slice(7)
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const payload = verifyToken(token)
  if (!payload || payload.role !== 'Admin') {
    return NextResponse.json({ error: 'Solo administradores pueden ver la auditoría' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const limit = parseInt(searchParams.get('limit') || '100')

  const supabase = getAdminClient()
  const { data, error } = await supabase
    .from('audit_log')
    .select('id, action, resource_type, resource_id, permission_check, changes, ip_address, timestamp, users(username, role)')
    .order('timestamp', { ascending: false })
    .limit(limit)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ audit: data })
}
