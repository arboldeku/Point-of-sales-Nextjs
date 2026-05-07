import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyToken } from '@/lib/auth'
import { hashPassword } from '@/lib/auth'
import type { Database } from '@/types/supabase'

const getAdminClient = () => createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function requireAdmin(req: NextRequest) {
  const token = req.headers.get('authorization')?.slice(7)
  if (!token) return null
  const payload = verifyToken(token)
  if (!payload || payload.role !== 'Admin') return null
  return payload
}

// GET - List all users
export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req)
  if (!admin) {
    return NextResponse.json({ error: 'Solo administradores pueden ver usuarios' }, { status: 403 })
  }

  const supabase = getAdminClient()
  const { data, error } = await supabase
    .from('users')
    .select('id, username, email, role, status, created_at, last_login')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ users: data })
}

// POST - Create new user
export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req)
  if (!admin) {
    return NextResponse.json({ error: 'Solo administradores pueden crear usuarios' }, { status: 403 })
  }

  const { username, email, password, role } = await req.json()

  if (!username || !password || !role) {
    return NextResponse.json({ error: 'username, password y role son obligatorios' }, { status: 400 })
  }

  const supabase = getAdminClient()

  // Check username already exists
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('username', username)
    .single()

  if (existing) {
    return NextResponse.json({ error: 'El usuario ya existe' }, { status: 400 })
  }

  const password_hash = await hashPassword(password)

  const { data, error } = await supabase
    .from('users')
    .insert({ username, email: email || null, password_hash, role, status: 'active', created_by: admin.userId })
    .select('id, username, email, role, status, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ user: data }, { status: 201 })
}

// PATCH - Update user (role or status)
export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin(req)
  if (!admin) {
    return NextResponse.json({ error: 'Solo administradores pueden modificar usuarios' }, { status: 403 })
  }

  const { id, role, status } = await req.json()
  if (!id) return NextResponse.json({ error: 'id es obligatorio' }, { status: 400 })

  type UserUpdate = { role?: 'Admin' | 'Member' | 'User'; status?: string }
  const updates: UserUpdate = {}
  if (role) updates.role = role as 'Admin' | 'Member' | 'User'
  if (status) updates.status = status

  const supabase = getAdminClient()
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', id)
    .select('id, username, role, status')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ user: data })
}
