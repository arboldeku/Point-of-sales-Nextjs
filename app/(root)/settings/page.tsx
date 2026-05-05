'use client'

import { useEffect, useState } from 'react'

export default function AdminPage() {
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
    <div className="p-4 space-y-6 max-w-md">
      <h1 className="text-xl font-bold">Admin</h1>

      <div className="bg-gray-800 rounded-xl p-4 space-y-3">
        <h2 className="font-semibold text-sm text-gray-300">Dispositivo</h2>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Nombre de esta mesa</label>
          <input
            value={deviceLabel}
            onChange={e => setDeviceLabel(e.target.value)}
            placeholder="Mesa 1"
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500"
          />
          <p className="text-gray-500 text-xs mt-1">Aparece en cada venta para identificar de qué tablet vino</p>
        </div>
        <button onClick={saveLabel}
          className="bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded-lg text-sm font-semibold w-full">
          {saved ? '✅ Guardado' : 'Guardar'}
        </button>
      </div>

      <div className="bg-gray-800 rounded-xl p-4 space-y-2">
        <h2 className="font-semibold text-sm text-gray-300">Sesión activa</h2>
        <p className="font-mono text-purple-400 text-sm">{sessionId}</p>
        <p className="text-gray-500 text-xs">Todos los dispositivos comparten este session_id hoy. Se renueva automáticamente a medianoche.</p>
      </div>

      <div className="bg-gray-800 rounded-xl p-4 space-y-2">
        <h2 className="font-semibold text-sm text-gray-300">PIN de ventas</h2>
        <p className="text-gray-500 text-xs">El PIN se configura en Vercel → Environment Variables → <code className="text-purple-400">POS_CONFIRM_PIN</code>. Cámbialo antes del evento.</p>
      </div>

      <div className="bg-gray-800 rounded-xl p-4 space-y-2">
        <h2 className="font-semibold text-sm text-gray-300">Pipeline</h2>
        <p className="text-gray-500 text-xs">Las ventas confirmadas escriben a <code className="text-purple-400">scan_events</code>, <code className="text-purple-400">sales_physical</code> y <code className="text-purple-400">fifo_ledger_events</code> en tiempo real. El gold pipeline corre nocturnamente para <code className="text-purple-400">fifo_cogs_clean</code> y <code className="text-purple-400">debug_log</code>.</p>
      </div>
    </div>
  )
}
