'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

type SaleRow = {
  sale_event_id: string
  sale_ts: string
  session_id: string
  internal_sku: string
  display_name: string
  qty: number
  unit_price: number
  gross_amount: number
  discount_eur: number
  channel: string
  payment_method: string
  sale_type: string
}

function formatTime(ts: string) {
  try { return new Date(ts).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) }
  catch { return ts }
}

function toCSV(rows: SaleRow[]): string {
  const headers = ['sale_event_id','sale_ts','session_id','internal_sku','display_name','qty','unit_price','gross_amount','discount_eur','channel','payment_method','sale_type']
  const lines = rows.map(r => headers.map(h => JSON.stringify((r as any)[h] ?? '')).join(','))
  return [headers.join(','), ...lines].join('\n')
}

function downloadCSV(rows: SaleRow[], sessionId: string) {
  const csv = toCSV(rows)
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ventas_${sessionId}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function RecordsPage() {
  const [rows, setRows] = useState<SaleRow[]>([])
  const [loading, setLoading] = useState(true)
  const sessionId = new Date().toISOString().slice(0, 10)

  const loadSales = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('scan_events')
      .select('*')
      .eq('session_id', sessionId)
      .eq('status', 'confirmed')
      .order('sale_ts', { ascending: false })
    if (!error && data) setRows(data as SaleRow[])
    setLoading(false)
  }, [sessionId])

  useEffect(() => { loadSales() }, [loadSales])

  const totalQty = rows.reduce((s, r) => s + r.qty, 0)
  const totalEur = rows.reduce((s, r) => s + (r.gross_amount - (r.discount_eur ?? 0)), 0)
  const efectivo = rows.filter(r => r.payment_method === 'efectivo').reduce((s, r) => s + (r.gross_amount - (r.discount_eur ?? 0)), 0)
  const tarjeta  = rows.filter(r => r.payment_method === 'tarjeta').reduce((s, r) => s + (r.gross_amount - (r.discount_eur ?? 0)), 0)

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Records — {sessionId}</h1>
          <p className="text-gray-400 text-sm">{rows.length} ventas · {totalQty} cartas</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadSales}
            className="bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded-lg text-sm">
            Actualizar
          </button>
          <button onClick={() => downloadCSV(rows, sessionId)} disabled={rows.length === 0}
            className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 px-3 py-2 rounded-lg text-sm font-semibold">
            Descargar CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-800 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-green-400">€{totalEur.toFixed(2)}</p>
          <p className="text-gray-400 text-xs mt-1">Total día</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-blue-400">€{efectivo.toFixed(2)}</p>
          <p className="text-gray-400 text-xs mt-1">Efectivo</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-yellow-400">€{tarjeta.toFixed(2)}</p>
          <p className="text-gray-400 text-xs mt-1">Tarjeta</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-gray-400 py-12">Cargando...</div>
      ) : rows.length === 0 ? (
        <div className="text-center text-gray-500 py-12">No hay ventas confirmadas hoy</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-700">
          <table className="w-full text-sm">
            <thead className="bg-gray-800 text-gray-400 text-left">
              <tr>
                <th className="px-3 py-2">Hora</th>
                <th className="px-3 py-2">Carta</th>
                <th className="px-3 py-2">SKU</th>
                <th className="px-3 py-2 text-center">Qty</th>
                <th className="px-3 py-2 text-right">Precio</th>
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2">Pago</th>
                <th className="px-3 py-2">Tipo</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.sale_event_id} className={i % 2 === 0 ? 'bg-gray-900' : 'bg-gray-800'}>
                  <td className="px-3 py-2 text-gray-400">{formatTime(r.sale_ts)}</td>
                  <td className="px-3 py-2 font-medium max-w-[180px] truncate">{r.display_name}</td>
                  <td className="px-3 py-2 text-gray-500 font-mono text-xs">{r.internal_sku}</td>
                  <td className="px-3 py-2 text-center">{r.qty}</td>
                  <td className="px-3 py-2 text-right">€{r.unit_price?.toFixed(2)}</td>
                  <td className="px-3 py-2 text-right font-semibold text-green-400">
                    €{(r.gross_amount - (r.discount_eur ?? 0)).toFixed(2)}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${r.payment_method === 'efectivo' ? 'bg-blue-900 text-blue-300' : 'bg-yellow-900 text-yellow-300'}`}>
                      {r.payment_method === 'efectivo' ? '💵' : '💳'} {r.payment_method}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-400 text-xs">{r.sale_type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
