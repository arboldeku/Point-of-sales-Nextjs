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
  cardmarket_id?: string
  card_name?: string
  language?: string
  set_code?: string
}

function formatTime(ts: string) {
  try { return new Date(ts).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) }
  catch { return ts }
}

// Extract cardmarket_id from internal_sku (everything before last dash)
function extractCardmarketId(sku: string): string {
  const parts = sku.split('-')
  return parts.slice(0, -1).join('-')
}

// Parse display_name to extract set_code (format: "Card Name LANG Rev? — SET_CODE")
function extractSetCode(displayName: string): string {
  const match = displayName.match(/—\s*(\S+)\s*$/)
  return match ? match[1] : ''
}

function toCSVPowertools(rows: SaleRow[]): string {
  // Powertools format: cardmarket_id, card_name, language, set_code, qty
  const headers = ['cardmarket_id', 'card_name', 'language', 'set_code', 'qty']
  const lines = rows.map(r => headers.map(h => {
    let val = ''
    if (h === 'cardmarket_id') val = r.cardmarket_id || extractCardmarketId(r.internal_sku)
    else if (h === 'card_name') val = r.card_name || r.display_name.split(' —')[0].trim()
    else if (h === 'language') val = r.language || ''
    else if (h === 'set_code') val = r.set_code || extractSetCode(r.display_name)
    else if (h === 'qty') val = String(r.qty || 0)
    return JSON.stringify(val)
  }).join(','))
  return [headers.join(','), ...lines].join('\n')
}

function downloadCSV(rows: SaleRow[], sessionId: string) {
  const csv = toCSVPowertools(rows)
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
  const [testMode, setTestMode] = useState(false)
  const sessionId = new Date().toISOString().slice(0, 10)

  useEffect(() => {
    const tm = localStorage.getItem('prisma_test_mode')
    setTestMode(tm === 'true')
  }, [])

  const loadSales = useCallback(async (isTest: boolean) => {
    setLoading(true)
    const table = isTest ? 'scan_events_test' : 'scan_events'
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('session_id', sessionId)
      .eq('status', 'confirmed')
      .order('sale_ts', { ascending: false })
    if (!error && data) setRows(data as SaleRow[])
    setLoading(false)
  }, [sessionId])

  useEffect(() => { loadSales(testMode) }, [loadSales, testMode])

  const totalQty = rows.reduce((s, r) => s + r.qty, 0)
  const totalEur = rows.reduce((s, r) => s + r.gross_amount, 0)
  const totalDiscount = rows.reduce((s, r) => s + (r.discount_eur ?? 0), 0)
  const efectivo = rows.filter(r => r.payment_method === 'efectivo').reduce((s, r) => s + r.gross_amount, 0)
  const tarjeta  = rows.filter(r => r.payment_method === 'tarjeta').reduce((s, r) => s + r.gross_amount, 0)

  return (
    <div className="p-4 space-y-4">
      {testMode && (
        <div className="bg-orange-600 text-white text-center text-sm font-bold py-1.5 rounded-lg">
          🧪 MODO TEST — mostrando scan_events_test
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Records — {sessionId}</h1>
          <p className="text-gray-400 text-sm">
            {rows.length} ventas · {totalQty} cartas
            {totalDiscount > 0 && <span className="text-orange-400 ml-2">· −€{totalDiscount.toFixed(2)} dto.</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => loadSales(testMode)}
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
          <p className="text-gray-400 text-xs mt-1">Total cobrado</p>
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
        <div className="text-center text-gray-500 py-12">
          No hay ventas confirmadas hoy{testMode ? ' (modo test)' : ''}
        </div>
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
                <th className="px-3 py-2 text-right">Dto.</th>
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2">Pago</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.sale_event_id} className={i % 2 === 0 ? 'bg-gray-900' : 'bg-gray-800'}>
                  <td className="px-3 py-2 text-gray-400">{formatTime(r.sale_ts)}</td>
                  <td className="px-3 py-2 font-medium max-w-[160px] truncate">{r.display_name}</td>
                  <td className="px-3 py-2 font-mono text-xs text-gray-500">{r.internal_sku}</td>
                  <td className="px-3 py-2 text-center">{r.qty}</td>
                  <td className="px-3 py-2 text-right text-gray-400">€{(r.unit_price ?? r.gross_amount)?.toFixed(2)}</td>
                  <td className="px-3 py-2 text-right text-orange-400">
                    {r.discount_eur > 0 ? `−€${r.discount_eur.toFixed(2)}` : '—'}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-green-400">
                    €{r.gross_amount?.toFixed(2)}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${r.payment_method === 'efectivo' ? 'bg-blue-900 text-blue-300' : 'bg-yellow-900 text-yellow-300'}`}>
                      {r.payment_method === 'efectivo' ? '💵' : '💳'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
