import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-prod'
const JWT_EXPIRY = '7d'

/**
 * Hash a password with bcrypt
 */
export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 10)
}

/**
 * Verify password against bcrypt hash
 */
export const verifyPassword = async (
  password: string,
  hash: string
): Promise<boolean> => {
  return bcrypt.compare(password, hash)
}

/**
 * Create JWT token
 */
export const createToken = (userId: string, role: string): string => {
  return jwt.sign(
    {
      userId,
      role,
      iat: Date.now(),
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  )
}

/**
 * Verify and decode JWT token
 */
export const verifyToken = (token: string): { userId: string; role: string } | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any
    return {
      userId: decoded.userId,
      role: decoded.role,
    }
  } catch (error) {
    return null
  }
}

/**
 * Extract token from Authorization header
 */
export const getTokenFromHeaders = (headers: Headers): string | null => {
  const auth = headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return null
  return auth.slice(7)
}

/**
 * Extract token from cookies
 */
export const getTokenFromCookie = (cookieString: string): string | null => {
  const cookies = cookieString.split(';').map((c) => c.trim())
  const posCookie = cookies.find((c) => c.startsWith('pos_token='))
  if (!posCookie) return null
  return posCookie.split('=')[1]
}
