import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from './auth'
import { hasPermission, logAudit, PermissionCode, UserRole } from './permissions'

type AuthResult =
  | { ok: true; userId: string; role: UserRole; ip: string }
  | { ok: false; response: NextResponse }

export async function requirePermission(
  req: NextRequest,
  permission: PermissionCode,
  resourceType: string,
  resourceId?: string
): Promise<AuthResult> {
  const token = req.headers.get('authorization')?.slice(7)
  const ip = req.headers.get('x-forwarded-for') || 'unknown'

  if (!token) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Token no proporcionado', allowed: false }, { status: 401 }),
    }
  }

  const payload = verifyToken(token)
  if (!payload) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Token inválido', allowed: false }, { status: 401 }),
    }
  }

  const role = payload.role as UserRole
  const userId = payload.userId
  const allowed = await hasPermission(role, permission)

  if (!allowed) {
    await logAudit(userId, permission, resourceType, resourceId ?? null, 'DENIED', {}, ip)
    return {
      ok: false,
      response: NextResponse.json(
        { error: `No tienes permiso para realizar esta acción (${permission})`, allowed: false },
        { status: 403 }
      ),
    }
  }

  return { ok: true, userId, role, ip }
}
