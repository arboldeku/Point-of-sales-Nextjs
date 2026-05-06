import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import { verifyToken } from '@/lib/auth'
import { logAudit } from '@/lib/permissions'

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.slice(7)

    if (!token) {
      return NextResponse.json(
        { error: 'Token no proporcionado' },
        { status: 400 }
      )
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      )
    }

    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Delete session
    await supabase.from('sessions').delete().eq('token', token)

    // Log logout
    const ipAddress = req.headers.get('x-forwarded-for') || 'unknown'
    await logAudit(
      payload.userId,
      'LOGOUT',
      'User',
      payload.userId,
      'ALLOWED',
      {},
      ipAddress
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
