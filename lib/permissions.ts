import { createBrowserClient } from './supabase-auth'

const PERMISSION_CACHE = new Map<string, string[]>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export type PermissionCode = 
  | 'SELL_PRODUCT'
  | 'APPLY_DISCOUNT_ON_SALE'
  | 'CREATE_PRODUCT'
  | 'DELETE_PRODUCT'
  | 'CREATE_USER'
  | 'DELETE_USER'
  | 'VIEW_REPORTS'
  | 'MODIFY_REPORTS'
  | 'VIEW_TRANSACTIONS'
  | 'DELETE_TRANSACTION'

// Get user's permissions
export const getUserPermissions = async (role: string): Promise<string[]> => {
  // Check cache first
  if (PERMISSION_CACHE.has(role)) {
    return PERMISSION_CACHE.get(role)!
  }

  try {
    const supabase = createBrowserClient()
    
    // Fetch permissions for this role
    const { data: rolePerms, error } = await supabase
      .from('role_permissions')
      .select('permission_id, permissions(code)')
      .eq('role', role)

    if (error) {
      console.error('Error fetching permissions:', error)
      return []
    }

    const permCodes = (rolePerms || [])
      .map((rp: any) => rp.permissions?.code)
      .filter(Boolean)

    // Cache for 5 minutes
    PERMISSION_CACHE.set(role, permCodes)
    setTimeout(() => PERMISSION_CACHE.delete(role), CACHE_TTL)

    return permCodes
  } catch (err) {
    console.error('Error in getUserPermissions:', err)
    return []
  }
}

// Check single permission
export const hasPermission = async (
  role: string,
  permission: PermissionCode
): Promise<boolean> => {
  const userPerms = await getUserPermissions(role)
  return userPerms.includes(permission)
}

// Log audit trail (server-side)
export const logAudit = async (
  userId: string,
  action: string,
  resourceType: string,
  resourceId: string | null,
  permissionCheck: 'ALLOWED' | 'DENIED',
  changes?: Record<string, any>,
  ipAddress?: string
) => {
  try {
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { error } = await supabase.from('audit_log').insert({
      user_id: userId,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      permission_check: permissionCheck,
      changes: changes ? JSON.stringify(changes) : null,
      ip_address: ipAddress,
    } as any)

    if (error) {
      console.error('Error logging audit:', error)
    }
  } catch (err) {
    console.error('Error in logAudit:', err)
  }
}
