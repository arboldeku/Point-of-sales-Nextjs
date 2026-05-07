import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyToken } from '@/lib/auth'
import type { Database } from '@/types/supabase'

const getAdminClient = () => createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Active sessions
export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.slice(7)
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const payload = verifyToken(token)
  if (!payload || payload.role !== 'Admin') {
    return NextResponse.json({ error: 'Solo administradores pueden ver sesiones' }, { status: 403 })
  }

  const supabase = getAdminClient()
  const { data, error } = await supabase
    .from('sessions')
    .select('id, created_at, expires_at, users(username, role)')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ sessions: data })
}

// DELETE - Kick a user session
export async function DELETE(req: NextRequest) {
  const token = req.headers.get('authorization')?.slice(7)
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const payload = verifyToken(token)
  if (!payload || payload.role !== 'Admin') {
    return NextResponse.json({ error: 'Solo administradores pueden cerrar sesiones' }, { status: 403 })
  }

  const { session_id } = await req.json()
  if (!session_id) return NextResponse.json({ error: 'session_id requerido' }, { status: 400 })

  const supabase = getAdminClient()
  const { error } = await supabase.from('sessions').delete().eq('id', session_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
