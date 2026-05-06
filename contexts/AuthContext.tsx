'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

// Helper to set cookie
const setCookie = (name: string, value: string) => {
  document.cookie = `${name}=${value}; path=/; max-age=604800`
}

// Helper to delete cookie
const deleteCookie = (name: string) => {
  document.cookie = `${name}=; path=/; max-age=0`
}

interface User {
  id: string
  username: string
  email: string | null
  role: 'Admin' | 'Member' | 'User'
}

interface AuthContextType {
  user: User | null
  token: string | null
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  isAuthenticated: boolean
  hasPermission: (permission: string) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  // Check if user is already logged in (from localStorage)
  // Only runs on client after hydration
  useEffect(() => {
    setMounted(true)
    const storedToken = localStorage.getItem('pos_token')
    const storedUser = localStorage.getItem('pos_user')

    if (storedToken && storedUser) {
      setToken(storedToken)
      setUser(JSON.parse(storedUser))
    }

    setLoading(false)
  }, [])

  const login = async (username: string, password: string) => {
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Login failed')
      }

      const data = await res.json()
      setToken(data.token)
      setUser(data.user)

      localStorage.setItem('pos_token', data.token)
      localStorage.setItem('pos_user', JSON.stringify(data.user))
      setCookie('pos_token', data.token)
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    setLoading(true)
    try {
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
      }
    } catch (err) {
      console.error('Error during logout:', err)
    } finally {
      setUser(null)
      setToken(null)
      localStorage.removeItem('pos_token')
      localStorage.removeItem('pos_user')
      deleteCookie('pos_token')
      setLoading(false)
      window.location.href = '/login'
    }
  }

  const hasPermission = (permission: string): boolean => {
    if (!user) return false
    
    // Admin has all permissions
    if (user.role === 'Admin') return true

    // Member permissions: SELL_PRODUCT, VIEW_REPORTS, MODIFY_REPORTS, VIEW_TRANSACTIONS
    if (user.role === 'Member') {
      return [
        'SELL_PRODUCT',
        'VIEW_REPORTS',
        'MODIFY_REPORTS',
        'VIEW_TRANSACTIONS',
      ].includes(permission)
    }

    // User permissions: VIEW_REPORTS, VIEW_TRANSACTIONS
    if (user.role === 'User') {
      return ['VIEW_REPORTS', 'VIEW_TRANSACTIONS'].includes(permission)
    }

    return false
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
        isAuthenticated: !!user && !!token,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
