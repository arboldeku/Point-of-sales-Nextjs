import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import { verifyPassword, createToken } from '@/lib/auth'
import { logAudit } from '@/lib/permissions'

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json()

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Usuario y contraseña requeridos' },
        { status: 400 }
      )
    }

    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get user from Supabase
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single()

    if (error || !user) {
      console.error('Login attempt for non-existent user:', username)
      
      return NextResponse.json(
        { error: 'Usuario o contraseña incorrectos' },
        { status: 401 }
      )
    }

    // Check if user is active
    if (user.status !== 'active') {
      return NextResponse.json(
        { error: 'Usuario desactivado' },
        { status: 401 }
      )
    }

    // Verify password
    const passwordValid = await verifyPassword(password, user.password_hash)

    if (!passwordValid) {
      const ipAddress = req.headers.get('x-forwarded-for') || 'unknown'
      
      // Log failed login attempt
      await logAudit(
        user.id,
        'LOGIN_FAILED',
        'User',
        user.id,
        'DENIED',
        { reason: 'Invalid password' },
        ipAddress
      )

      return NextResponse.json(
        { error: 'Usuario o contraseña incorrectos' },
        { status: 401 }
      )
    }

    // Create JWT token
    const token = createToken(user.id, user.role)

    // Update last_login
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id)

    // Log successful login
    const ipAddress = req.headers.get('x-forwarded-for') || 'unknown'
    await logAudit(
      user.id,
      'LOGIN_SUCCESS',
      'User',
      user.id,
      'ALLOWED',
      { username },
      ipAddress
    )

    // Create session record
    await supabase.from('sessions').insert({
      user_id: user.id,
      token,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    } as any)

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
