'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase, type InventoryCard, type ScanEvent } from '@/lib/supabase'
import { v4 as uuidv4 } from 'uuid'

// ── Session helpers ───────────────────────────────────────────────────────────
// All devices on the same calendar day share the same session_id (YYYY-MM-DD).
// Individual devices are distinguished by device_label (Mesa 1, Mesa 2, etc.)
function getSessionId(): string {
  if (typeof window === 'undefined') return 'ssr'
  return new Date().toISOString().slice(0, 10)
}

type ScanMode = 'venta' | 'cambio'
type PayMode = 'efectivo' | 'tarjeta'
type CambioDir = 'pagar' | 'recibir'

// ── PIN Modal ─────────────────────────────────────────────────────────────────
function PinModal({ cartCount, subtotal, discount, payMode, onConfirm, onCancel }: {
  cartCount: number; subtotal: number; discount: number; payMode: PayMode
  onConfirm: (pin: string) => Promise<void>; onCancel: () => void
}) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => { ref.current?.focus() }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pin) return
    setLoading(true); setError('')
    try { await onConfirm(pin) }
    catch (err: any) { setError(err.message || 'PIN incorrecto'); setPin(''); ref.current?.focus() }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-8 w-80 shadow-2xl">
        <h2 className="text-xl font-bold text-center mb-1">Confirmar venta</h2>
        <p className="text-gray-400 text-sm text-center mb-1">
          {cartCount} carta{cartCount !== 1 ? 's' : ''} · {payMode === 'efectivo' ? '💵 Efectivo' : '💳 Tarjeta'}
        </p>
        {discount > 0 && <p className="text-orange-400 text-sm text-center mb-1">Descuento −€{discount.toFixed(2)}</p>}
        <p className="text-2xl font-bold text-green-400 text-center mb-6">€{Math.max(0, subtotal - discount).toFixed(2)}</p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">PIN de autorización</label>
            <input ref={ref} type="password" value={pin} onChange={e => setPin(e.target.value)}
              placeholder="••••" maxLength={8} autoComplete="off"
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-center text-2xl tracking-widest focus:outline-none focus:border-purple-500" />
          </div>
          {error && <div className="bg-red-900/50 border border-red-700 rounded px-3 py-2 text-red-300 text-sm text-center">❌ {error}</div>}
          <button type="submit" disabled={!pin || loading}
            className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-lg py-3 font-bold">
            {loading ? 'Verificando...' : '✅ Confirmar venta'}
          </button>
          <button type="button" onClick={onCancel}
            className="w-full bg-gray-800 hover:bg-gray-700 rounded-lg py-2 text-sm text-gray-400">Cancelar</button>
        </form>
      </div>
    </div>
  )
}

// ── Main SalesTab ─────────────────────────────────────────────────────────────
export default function SalesTab() {
  // Search state
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<InventoryCard[]>([])
  const [loading, setLoading] = useState(false)

  // Cart / ticket state
  const [cart, setCart] = useState<ScanEvent[]>([])
  // sessionId must be empty on server, populated on client to avoid hydration mismatch
  const [sessionId, setSessionId] = useState('')
  const [deviceLabel, setDeviceLabel] = useState('Mesa 1')
  const [game, setGame] = useState('pokemon')

  // Mode state (mirrors prisma-scan scan_tab.py session_state)
  const [scanMode, setScanMode] = useState<ScanMode>('venta')
  const [payMode, setPayMode] = useState<PayMode>('efectivo')
  const [cambioHasMoney, setCambioHasMoney] = useState(false)
  const [cambioDir, setCambioDir] = useState<CambioDir>('recibir')
  const [tradeAmount, setTradeAmount] = useState(0)
  const [discount, setDiscount] = useState(0)
  const [channel, setChannel] = useState('Iberian')

  // Daily log (all confirmed sales today, mirrors st.session_state.sales)
  const [dailySales, setDailySales] = useState<ScanEvent[]>([])

  // Test mode — sandbox writes to scan_events_test, skips inventory + FIFO
  const [testMode, setTestMode] = useState(false)

  // UI state
  const [showPin, setShowPin] = useState(false)
  const [lastMsg, setLastMsg] = useState<{ok: boolean; text: string} | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  // Populate sessionId on client only (avoids Next.js hydration mismatch)
  useEffect(() => {
    setSessionId(getSessionId())
  }, [])

  // Load persisted device label + test mode
  useEffect(() => {
    const saved = localStorage.getItem('prisma_device_label')
    if (saved) setDeviceLabel(saved)
    const tm = localStorage.getItem('prisma_test_mode')
    if (tm === 'true') setTestMode(true)
    searchRef.current?.focus()
  }, [])

  const toggleTestMode = () => {
    const next = !testMode
    setTestMode(next)
    localStorage.setItem('prisma_test_mode', String(next))
    setCart([])
  }

  // Poll cart every 2 seconds — table switches with testMode
  useEffect(() => {
    if (!sessionId) return
    const table = testMode ? 'scan_events_test' : 'scan_events'
    const load = async () => {
      const { data } = await supabase.from(table).select('*')
        .eq('session_id', sessionId).eq('status', 'pending').order('sale_ts', { ascending: true })
      setCart((data as ScanEvent[]) ?? [])
    }
    load()
    const t = setInterval(load, 2000)
    return () => clearInterval(t)
  }, [sessionId, testMode])

  const loadCart = async () => {
    const table = testMode ? 'scan_events_test' : 'scan_events'
    const { data } = await supabase.from(table).select('*')
      .eq('session_id', sessionId).eq('status', 'pending').order('sale_ts', { ascending: true })
    setCart((data as ScanEvent[]) ?? [])
  }

  // Search inventory
  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return }
    setLoading(true)
    const { data } = await supabase.from('inventory_current').select('*')
      .gt('qty', 0).eq('game', game)
      .or(`internal_sku.ilike.%${q}%,card_name.ilike.%${q}%,name_es.ilike.%${q}%,set_code.ilike.%${q}%,cn.ilike.%${q}%`)
      .order('card_name').limit(30)
    setResults((data as InventoryCard[]) ?? [])
    setLoading(false)
  }, [game])

  useEffect(() => {
    const t = setTimeout(() => search(query), 200)
    return () => clearTimeout(t)
  }, [query, search])

  // Barcode scanner detection: fast input matching SKU pattern → auto-add
  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)
    if (/^\d{5,}-\d{4}$/.test(val.trim())) {
      addToCartBySku(val.trim())
      setQuery('')
    }
  }

  const addToCartBySku = async (sku: string) => {
    const { data } = await supabase.from('inventory_current').select('*')
      .eq('internal_sku', sku).gt('qty', 0).single()
    if (data) {
      await addToCart(data as InventoryCard)
      setLastMsg({ ok: true, text: `✅ Escaneado: ${(data as InventoryCard).card_name}` })
      setTimeout(() => setLastMsg(null), 2500)
    } else {
      setLastMsg({ ok: false, text: `❌ SKU no encontrado: ${sku}` })
    }
  }

  const addToCart = async (card: InventoryCard) => {
    const existing = cart.find(c => c.internal_sku === card.internal_sku)
    if (existing) {
      await fetch('/api/pos/cart', { method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sale_event_id: existing.sale_event_id, qty: existing.qty + 1, unit_price: existing.unit_price, _test_mode: testMode }) })
      loadCart(); return
    }
    const price = card.listed_price_eur ?? 0
    const isCambio = scanMode === 'cambio'
    const event: ScanEvent = {
      sale_event_id: uuidv4(),
      sale_ts: new Date().toISOString(),
      session_id: sessionId,
      internal_sku: card.internal_sku,
      display_name: `${card.card_name} ${card.lang}${card.is_reverse ? ' Rev' : ''} — ${card.set_code}`,
      language: card.lang,
      business_rarity: card.rarity,
      qty: 1,
      unit_price: price,
      gross_amount: price,
      discount_eur: 0,
      channel,
      source_system: 'prisma-pos',
      status: 'pending',
      sale_type: isCambio ? 'cambio' : 'physical',
      payment_method: payMode,
      money_direction: isCambio ? (cambioHasMoney ? cambioDir : 'cambio_directo') : 'in',
      trade_amount: isCambio && cambioHasMoney ? tradeAmount : null,
    }
    await fetch('/api/pos/cart', { method: 'POST',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...event, _test_mode: testMode }) })
    loadCart()
    setResults([]); setQuery('')
    searchRef.current?.focus()
  }

  const removeFromCart = async (sale_event_id: string) => {
    await fetch('/api/pos/cart', { method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sale_event_id, _test_mode: testMode }) })
    loadCart()
  }

  const handleConfirmWithPin = async (pin: string) => {
    const endpoint = testMode ? '/api/pos/confirm-test' : '/api/pos/confirm'
    const res = await fetch(endpoint, { method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, pin, discount_eur: discount, payment_method: payMode }) })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Error desconocido')
    // Move to daily log
    setDailySales(prev => [...prev, ...cart.map(c => ({ ...c, status: 'confirmed' as const }))])
    setCart([]); setDiscount(0); setShowPin(false)
    setLastMsg({ ok: true, text: `✅ Venta confirmada — ${cart.length} carta${cart.length !== 1 ? 's' : ''}` })
    searchRef.current?.focus()
  }

  const nuevoTicket = () => {
    if (cart.length > 0 && !confirm('¿Cerrar ticket actual? Las cartas pendientes se pierden.')) return
    cart.forEach(c => removeFromCart(c.sale_event_id))
    setDiscount(0); setTradeAmount(0); setCambioHasMoney(false)
    searchRef.current?.focus()
  }

  const downloadVSA = () => {
    const rows = dailySales.map(s => ([
      s.sale_event_id, s.sale_ts, s.session_id, s.internal_sku, s.display_name,
      s.language, s.business_rarity, s.qty, s.unit_price, s.gross_amount,
      s.discount_eur, s.channel, s.source_system, s.status, s.sale_type,
      s.payment_method, s.money_direction, s.trade_amount
    ].map(v => v ?? '').join(',')))
    const header = 'sale_event_id,sale_ts,session_id,internal_sku,display_name,language,business_rarity,qty,unit_price,gross_amount,discount_eur,channel,source_system,status,sale_type,payment_method,money_direction,trade_amount'
    const csv = [header, ...rows].join('\n')
    const date = new Date().toISOString().slice(0, 10)
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `VSA_${date}.csv`
    a.click()
  }

  const subtotal = cart.reduce((s, c) => s + (c.gross_amount ?? 0), 0)
  const ventasHoy = dailySales.filter(s => s.sale_type === 'physical')
  const cambiosHoy = dailySales.filter(s => s.sale_type === 'cambio')
  const totalVentas = ventasHoy.reduce((s, c) => s + (c.gross_amount ?? 0), 0)
  const totalCambios = cambiosHoy.reduce((s, c) => s + (c.gross_amount ?? 0), 0)
  const totalEfectivo = dailySales.filter(s => s.payment_method === 'efectivo').reduce((s, c) => s + (c.gross_amount ?? 0), 0)
  const totalTarjeta = dailySales.filter(s => s.payment_method === 'tarjeta').reduce((s, c) => s + (c.gross_amount ?? 0), 0)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* TEST MODE BANNER */}
      {testMode && (
        <div className="bg-orange-600 text-white text-center text-sm font-bold py-1.5 flex items-center justify-center gap-3 shrink-0">
          🧪 MODO TEST — las ventas NO afectan inventario ni FIFO
          <button onClick={toggleTestMode} className="bg-orange-800 hover:bg-orange-900 px-2 py-0.5 rounded text-xs">Desactivar</button>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
      {showPin && (
        <PinModal cartCount={cart.length} subtotal={subtotal} discount={discount} payMode={payMode}
          onConfirm={handleConfirmWithPin} onCancel={() => setShowPin(false)} />
      )}

      {/* LEFT: Search + Daily log */}
      <div className="flex flex-col flex-1 p-3 gap-3 overflow-hidden">
        {/* Controls */}
        <div className="flex gap-2 flex-wrap">
          <input value={deviceLabel}
            onChange={e => { setDeviceLabel(e.target.value); localStorage.setItem('prisma_device_label', e.target.value) }}
            className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm w-18" placeholder="Mesa" />
          <select value={game} onChange={e => setGame(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm">
            <option value="pokemon">Pokémon</option>
            <option value="op">One Piece</option>
          </select>
          <select value={channel} onChange={e => setChannel(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm">
            <option>Iberian</option><option>SA</option><option>LIGA</option><option>Online</option>
          </select>
          <button onClick={toggleTestMode}
            className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${testMode ? 'bg-orange-600 text-white' : 'bg-gray-800 text-gray-500 hover:text-gray-300'}`}>
            🧪 Test
          </button>
        </div>

        {/* Mode: VENTA / CAMBIO */}
        <div className="flex gap-2">
          {(['venta', 'cambio'] as ScanMode[]).map(m => (
            <button key={m} onClick={() => setScanMode(m)}
              className={`flex-1 py-2 rounded-lg font-bold text-sm transition-colors ${scanMode === m ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
              {m === 'venta' ? '💰 VENTA' : '🔄 CAMBIO'}
            </button>
          ))}
        </div>

        {/* Payment mode */}
        {scanMode === 'venta' && (
          <div className="flex gap-2">
            {(['efectivo', 'tarjeta'] as PayMode[]).map(p => (
              <button key={p} onClick={() => setPayMode(p)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${payMode === p ? (p === 'efectivo' ? 'bg-green-700 text-white' : 'bg-blue-700 text-white') : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                {p === 'efectivo' ? '💵 Efectivo' : '💳 Tarjeta'}
              </button>
            ))}
          </div>
        )}

        {/* CAMBIO options */}
        {scanMode === 'cambio' && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <button onClick={() => setCambioHasMoney(false)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${!cambioHasMoney ? 'bg-blue-700 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                🔄 Directo
              </button>
              <button onClick={() => setCambioHasMoney(true)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${cambioHasMoney ? 'bg-blue-700 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                💸 Con dinero
              </button>
            </div>
            {cambioHasMoney && (
              <>
                <div className="flex gap-2">
                  {(['pagar', 'recibir'] as CambioDir[]).map(d => (
                    <button key={d} onClick={() => setCambioDir(d)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${cambioDir === d ? 'bg-blue-700 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                      {d === 'pagar' ? '📤 A pagar' : '📥 A recibir'}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  {(['efectivo', 'tarjeta'] as PayMode[]).map(p => (
                    <button key={p} onClick={() => setPayMode(p)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${payMode === p ? (p === 'efectivo' ? 'bg-green-700 text-white' : 'bg-blue-700 text-white') : 'bg-gray-800 text-gray-400'}`}>
                      {p === 'efectivo' ? '💵 Efectivo' : '💳 Tarjeta'}
                    </button>
                  ))}
                </div>
                <input type="number" min="0" step="0.5" value={tradeAmount || ''}
                  onChange={e => setTradeAmount(parseFloat(e.target.value) || 0)}
                  placeholder="Importe cambio (€)"
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500" />
              </>
            )}
          </div>
        )}

        {/* Search input */}
        <input ref={searchRef} value={query} onChange={handleInput}
          placeholder="🔍 Busca carta o escanea código de barras"
          className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-base focus:outline-none focus:border-purple-500"
          autoComplete="off" />

        {/* Last scan feedback */}
        {lastMsg && (
          <div className={`text-sm px-3 py-2 rounded border ${lastMsg.ok ? 'bg-green-900/40 border-green-700 text-green-300' : 'bg-red-900/40 border-red-700 text-red-300'}`}>
            {lastMsg.text}
          </div>
        )}

        {/* Search results */}
        <div className="flex-1 overflow-y-auto space-y-1">
          {loading && <div className="text-gray-500 text-sm text-center mt-4">Buscando...</div>}
          {!loading && results.length === 0 && query && (
            <div className="text-gray-500 text-sm text-center mt-8">Sin resultados para &ldquo;{query}&rdquo;</div>
          )}
          {results.map(card => (
            <button key={card.internal_sku} onClick={() => addToCart(card)}
              className="w-full text-left bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-purple-500 rounded-lg px-4 py-2.5 transition-colors flex justify-between items-center">
              <div>
                <div className="font-medium text-sm">{card.card_name}
                  {card.name_es && card.name_es !== card.card_name && <span className="text-gray-400 text-xs ml-2">({card.name_es})</span>}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {card.set_code} · {card.cn} · {card.rarity} · {card.lang}
                  {card.is_reverse && <span className="text-blue-400 ml-1">Rev</span>}
                </div>
              </div>
              <div className="text-right ml-4 shrink-0">
                <div className="font-bold text-green-400 text-sm">{card.listed_price_eur ? `€${card.listed_price_eur.toFixed(2)}` : '—'}</div>
                <div className={`text-xs mt-0.5 ${card.qty <= 2 ? 'text-orange-400' : 'text-gray-500'}`}>stock: {card.qty}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Daily summary (bottom of left panel) */}
        {dailySales.length > 0 && (
          <div className="border-t border-gray-800 pt-3 space-y-2 shrink-0">
            <div className="text-xs text-gray-500 uppercase tracking-wider">Registro del día</div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-gray-800 rounded p-2">
                <div className="text-green-400 font-bold">{ventasHoy.length}</div>
                <div className="text-xs text-gray-500">💰 Ventas</div>
              </div>
              <div className="bg-gray-800 rounded p-2">
                <div className="text-blue-400 font-bold">{cambiosHoy.length}</div>
                <div className="text-xs text-gray-500">🔄 Cambios</div>
              </div>
              <div className="bg-gray-800 rounded p-2">
                <div className="text-gray-300 font-bold">€{(totalVentas + totalCambios).toFixed(0)}</div>
                <div className="text-xs text-gray-500">Total</div>
              </div>
            </div>
            <div className="flex gap-3 text-xs text-gray-500">
              <span>💵 Efectivo: <span className="text-gray-300">€{totalEfectivo.toFixed(2)}</span></span>
              <span>💳 Tarjeta: <span className="text-gray-300">€{totalTarjeta.toFixed(2)}</span></span>
            </div>
            <button onClick={downloadVSA}
              className="w-full bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded py-2 text-xs font-medium text-gray-300 transition-colors">
              🔒 Cerrar caja — Descargar VSA
            </button>
          </div>
        )}
      </div>

      {/* RIGHT: Cart / Ticket */}
      <div className="w-80 flex flex-col border-l border-gray-800 bg-gray-900">
        <div className="p-3 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <span className="font-bold text-gray-200 text-sm">🧾 Ticket — {deviceLabel}</span>
            <span className={`text-xs px-2 py-0.5 rounded font-medium ${scanMode === 'venta' ? 'bg-green-900 text-green-300' : 'bg-blue-900 text-blue-300'}`}>
              {scanMode === 'venta' ? '💰 Venta' : '🔄 Cambio'}
            </span>
          </div>
          <div className="text-xs text-gray-600 truncate mt-0.5">{sessionId}</div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {cart.length === 0 ? (
            <div className="text-gray-600 text-sm text-center mt-8">Sin artículos<br /><span className="text-xs">Escanea o busca</span></div>
          ) : (
            cart.map(item => (
              <div key={item.sale_event_id} className="bg-gray-800 rounded-lg px-3 py-2">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{item.display_name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{item.language} · {item.business_rarity} · x{item.qty}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-green-400 font-bold text-sm">€{item.gross_amount?.toFixed(2)}</div>
                    <button onClick={() => removeFromCart(item.sale_event_id)}
                      className="text-red-500 hover:text-red-400 text-xs mt-1 block ml-auto">✕</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Discount + Total + Confirm */}
        <div className="p-3 border-t border-gray-800 space-y-2">
          <div className="flex gap-2 items-center">
            <span className="text-gray-400 text-xs shrink-0">Dto. (€)</span>
            <input type="number" min="0" step="0.5" value={discount || ''}
              onChange={e => setDiscount(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm focus:outline-none focus:border-orange-500" />
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-sm text-orange-400">
              <span>Descuento</span><span>−€{discount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-xl">
            <span>TOTAL</span>
            <span className="text-green-400">€{Math.max(0, subtotal - discount).toFixed(2)}</span>
          </div>
          <button onClick={() => setShowPin(true)} disabled={cart.length === 0}
            className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg py-2.5 font-bold transition-colors">
            ✅ CONFIRMAR ({cart.length})
          </button>
          <button onClick={nuevoTicket}
            className="w-full bg-gray-800 hover:bg-gray-700 rounded-lg py-2 text-sm text-gray-300 transition-colors">
            ➕ Nuevo ticket
          </button>
        </div>
      </div>
      </div>
    </div>
  )
}
