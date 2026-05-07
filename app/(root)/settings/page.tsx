'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/auth/protected-route'

// ── Types ─────────────────────────────────────────────────────────────────────
type UserRow = { id: string; username: string; email: string | null; role: string; status: string; created_at: string | null; last_login: string | null }
type AuditRow = { id: string; action: string; resource_type: string; permission_check: string; timestamp: string | null; ip_address: string | null; users: { username: string; role: string } | null }
type SessionRow = { id: string; created_at: string | null; expires_at: string; users: { username: string; role: string } | null }

const TABS = ['⚙️ Dispositivo', '👥 Usuarios', '📋 Auditoría', '🔐 Sesiones'] as const
type Tab = typeof TABS[number]

// ── Helper ────────────────────────────────────────────────────────────────────
function fmt(dt: string | null) {
  if (!dt) return '—'
  return new Date(dt).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

// ── Sub-panels ────────────────────────────────────────────────────────────────
function DevicePanel() {
  const [deviceLabel, setDeviceLabel] = useState('Mesa 1')
  const [saved, setSaved] = useState(false)
  const sessionId = new Date().toISOString().slice(0, 10)

  useEffect(() => {
    const stored = localStorage.getItem('prisma_device_label')
    if (stored) setDeviceLabel(stored)
  }, [])

  function saveLabel() {
    localStorage.setItem('prisma_device_label', deviceLabel)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-4 max-w-md">
      <div className="bg-gray-800 rounded-xl p-4 space-y-3">
        <h2 className="font-semibold text-sm text-gray-300">Nombre de esta mesa</h2>
        <input value={deviceLabel} onChange={e => setDeviceLabel(e.target.value)}
          placeholder="Mesa 1"
          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500" />
        <p className="text-gray-500 text-xs">Aparece en cada venta para saber de qué tablet vino</p>
        <button onClick={saveLabel}
          className="bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded-lg text-sm font-semibold w-full">
          {saved ? '✅ Guardado' : 'Guardar'}
        </button>
      </div>
      <div className="bg-gray-800 rounded-xl p-4 space-y-2">
        <h2 className="font-semibold text-sm text-gray-300">Sesión de hoy</h2>
        <p className="font-mono text-purple-400 text-sm">{sessionId}</p>
        <p className="text-gray-500 text-xs">Se renueva automáticamente a medianoche.</p>
      </div>
      <div className="bg-gray-800 rounded-xl p-4 space-y-2">
        <h2 className="font-semibold text-sm text-gray-300">PIN de ventas</h2>
        <p className="text-gray-500 text-xs">Se configura en Vercel → Environment Variables → <code className="text-purple-400">POS_CONFIRM_PIN</code></p>
      </div>
    </div>
  )
}

function UsersPanel({ token }: { token: string }) {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ username: '', email: '', password: '', role: 'Member' })
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } })
    const data = await res.json()
    setUsers(data.users || [])
    setLoading(false)
  }, [token])

  useEffect(() => { load() }, [load])

  async function toggleStatus(user: UserRow) {
    const newStatus = user.status === 'active' ? 'inactive' : 'active'
    await fetch('/api/admin/users', { method: 'PATCH', headers: authHeaders, body: JSON.stringify({ id: user.id, status: newStatus }) })
    setMsg({ ok: true, text: `${user.username} → ${newStatus}` })
    load()
  }

  async function changeRole(user: UserRow, role: string) {
    await fetch('/api/admin/users', { method: 'PATCH', headers: authHeaders, body: JSON.stringify({ id: user.id, role }) })
    setMsg({ ok: true, text: `${user.username} ahora es ${role}` })
    load()
  }

  async function createUser() {
    setCreating(true)
    const res = await fetch('/api/admin/users', { method: 'POST', headers: authHeaders, body: JSON.stringify(form) })
    const data = await res.json()
    if (!res.ok) { setMsg({ ok: false, text: data.error }); setCreating(false); return }
    setMsg({ ok: true, text: `✅ ${form.username} creado` })
    setForm({ username: '', email: '', password: '', role: 'Member' })
    setCreating(false)
    load()
  }

  return (
    <div className="space-y-4">
      {msg && (
        <div className={`px-4 py-2 rounded-lg text-sm ${msg.ok ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'}`}>
          {msg.text}
        </div>
      )}

      {/* Create user */}
      <div className="bg-gray-800 rounded-xl p-4 space-y-3">
        <h2 className="font-semibold text-sm text-gray-300">Crear nuevo usuario</h2>
        <div className="grid grid-cols-2 gap-2">
          <input placeholder="Usuario" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
            className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500" />
          <input placeholder="Email (opcional)" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500" />
          <input placeholder="Contraseña" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500" />
          <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
            className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500">
            <option value="Admin">👑 Admin</option>
            <option value="Member">👤 Member</option>
            <option value="User">👁️ User</option>
          </select>
        </div>
        <button onClick={createUser} disabled={creating || !form.username || !form.password}
          className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 px-4 py-2 rounded-lg text-sm font-semibold w-full">
          {creating ? 'Creando...' : '+ Crear usuario'}
        </button>
      </div>

      {/* Users table */}
      <div className="bg-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700 text-gray-400 text-xs">
              <th className="text-left px-4 py-3">Usuario</th>
              <th className="text-left px-4 py-3">Rol</th>
              <th className="text-left px-4 py-3">Estado</th>
              <th className="text-left px-4 py-3">Último acceso</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center py-8 text-gray-500">Cargando...</td></tr>
            ) : users.map(u => (
              <tr key={u.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                <td className="px-4 py-3 font-medium">{u.username}</td>
                <td className="px-4 py-3">
                  <select value={u.role}
                    onChange={e => changeRole(u, e.target.value)}
                    className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs focus:outline-none">
                    <option value="Admin">👑 Admin</option>
                    <option value="Member">👤 Member</option>
                    <option value="User">👁️ User</option>
                  </select>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${u.status === 'active' ? 'bg-green-900/50 text-green-400' : 'bg-gray-700 text-gray-400'}`}>
                    {u.status === 'active' ? '● Activo' : '○ Inactivo'}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">{fmt(u.last_login)}</td>
                <td className="px-4 py-3">
                  <button onClick={() => toggleStatus(u)}
                    className={`text-xs px-3 py-1 rounded-lg ${u.status === 'active' ? 'bg-red-900/50 text-red-400 hover:bg-red-900' : 'bg-green-900/50 text-green-400 hover:bg-green-900'}`}>
                    {u.status === 'active' ? 'Desactivar' : 'Reactivar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function AuditPanel({ token }: { token: string }) {
  const [audit, setAudit] = useState<AuditRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/audit', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setAudit(d.audit || []); setLoading(false) })
  }, [token])

  return (
    <div className="bg-gray-800 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-700 text-gray-400 text-xs">
            <th className="text-left px-4 py-3">Fecha</th>
            <th className="text-left px-4 py-3">Usuario</th>
            <th className="text-left px-4 py-3">Acción</th>
            <th className="text-left px-4 py-3">Recurso</th>
            <th className="text-left px-4 py-3">Resultado</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={5} className="text-center py-8 text-gray-500">Cargando...</td></tr>
          ) : audit.length === 0 ? (
            <tr><td colSpan={5} className="text-center py-8 text-gray-500">Sin registros todavía</td></tr>
          ) : audit.map(a => (
            <tr key={a.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
              <td className="px-4 py-3 text-gray-400 text-xs">{fmt(a.timestamp)}</td>
              <td className="px-4 py-3 font-medium text-xs">{a.users?.username ?? '—'}</td>
              <td className="px-4 py-3 font-mono text-xs text-purple-300">{a.action}</td>
              <td className="px-4 py-3 text-gray-400 text-xs">{a.resource_type}</td>
              <td className="px-4 py-3">
                {a.permission_check === 'ALLOWED'
                  ? <span className="text-green-400 text-xs font-semibold">✅ OK</span>
                  : <span className="text-red-400 text-xs font-semibold">❌ Denegado</span>
                }
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SessionsPanel({ token }: { token: string }) {
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/sessions', { headers: { Authorization: `Bearer ${token}` } })
    const data = await res.json()
    setSessions(data.sessions || [])
    setLoading(false)
  }, [token])

  useEffect(() => { load() }, [load])

  async function kickSession(sessionId: string) {
    await fetch('/api/admin/sessions', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ session_id: sessionId })
    })
    load()
  }

  return (
    <div className="bg-gray-800 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
        <span className="text-sm text-gray-300 font-semibold">{sessions.length} sesión{sessions.length !== 1 ? 'es' : ''} activa{sessions.length !== 1 ? 's' : ''}</span>
        <button onClick={load} className="text-xs text-gray-400 hover:text-white">↻ Actualizar</button>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-700 text-gray-400 text-xs">
            <th className="text-left px-4 py-3">Usuario</th>
            <th className="text-left px-4 py-3">Rol</th>
            <th className="text-left px-4 py-3">Logueado desde</th>
            <th className="text-left px-4 py-3">Expira</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={5} className="text-center py-8 text-gray-500">Cargando...</td></tr>
          ) : sessions.length === 0 ? (
            <tr><td colSpan={5} className="text-center py-8 text-gray-500">Nadie conectado</td></tr>
          ) : sessions.map(s => (
            <tr key={s.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
              <td className="px-4 py-3 font-medium">{s.users?.username ?? '—'}</td>
              <td className="px-4 py-3 text-gray-400 text-xs">{s.users?.role ?? '—'}</td>
              <td className="px-4 py-3 text-gray-400 text-xs">{fmt(s.created_at)}</td>
              <td className="px-4 py-3 text-gray-400 text-xs">{fmt(s.expires_at)}</td>
              <td className="px-4 py-3">
                <button onClick={() => kickSession(s.id)}
                  className="text-xs px-3 py-1 rounded-lg bg-red-900/50 text-red-400 hover:bg-red-900">
                  Desconectar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const { user, token } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('⚙️ Dispositivo')

  const isAdmin = user?.role === 'Admin'
  const visibleTabs = isAdmin ? TABS : [TABS[0]]

  return (
    <ProtectedRoute>
      <div className="p-6 space-y-6 max-w-5xl">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Admin</h1>
          {user && (
            <span className="text-xs text-gray-400 bg-gray-800 px-3 py-1 rounded-full">
              {user.role === 'Admin' ? '👑' : '👤'} {user.username}
            </span>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-700">
          {visibleTabs.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === tab
                  ? 'bg-gray-800 text-white border-t border-x border-gray-700'
                  : 'text-gray-400 hover:text-gray-200'
              }`}>
              {tab}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div>
          {activeTab === '⚙️ Dispositivo' && <DevicePanel />}
          {activeTab === '👥 Usuarios' && isAdmin && token && <UsersPanel token={token} />}
          {activeTab === '📋 Auditoría' && isAdmin && token && <AuditPanel token={token} />}
          {activeTab === '🔐 Sesiones' && isAdmin && token && <SessionsPanel token={token} />}
        </div>
      </div>
    </ProtectedRoute>
  )
}
