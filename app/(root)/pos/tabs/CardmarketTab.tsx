'use client'

// Ported from prisma-scan/ui/cardmarket_tab.py
// Logic: scan Cardmarket orders, group by SKU, nuevo pedido, cerrar caja → download CM format CSV

import { useState, useEffect, useRef } from 'react'
import { supabase, type InventoryCard } from '@/lib/supabase'
import { v4 as uuidv4 } from 'uuid'

type CmItem = {
  sale_event_id: string
  sale_ts: string
  internal_sku: string
  display_name: string
  language: string
  set_name: string
  set_code: string
  cardmarket_id: string | null
  unit_price: number
  qty: number
  gross_amount: number
  business_rarity: string | null
}

type CmOrder = {
  session_id: string
  items: CmItem[]
  total: number
  qty: number
  timestamp: string
}

export default function CardmarketTab() {
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<InventoryCard[]>([])
  const [currentItems, setCurrentItems] = useState<CmItem[]>([])
  const [completedOrders, setCompletedOrders] = useState<CmOrder[]>([])
  const [cmSessionId, setCmSessionId] = useState(() => uuidv4().slice(0, 8))
  const [lastMsg, setLastMsg] = useState<{ok: boolean; text: string} | null>(null)
  const [game, setGame] = useState('pokemon')
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => { searchRef.current?.focus() }, [])

  // Search inventory for manual add
  const searchCards = async (q: string) => {
    if (!q.trim()) { setSearchResults([]); return }
    const { data } = await supabase.from('inventory_current').select('*')
      .gt('qty', 0).eq('game', game)
      .or(`card_name.ilike.%${q}%,name_es.ilike.%${q}%,internal_sku.ilike.%${q}%`)
      .order('card_name').limit(20)
    setSearchResults((data as InventoryCard[]) ?? [])
  }

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)
    if (/^\d{5,}-\d{4}$/.test(val.trim())) {
      addBySku(val.trim())
      setQuery('')
    } else {
      searchCards(val)
    }
  }

  const addBySku = async (sku: string) => {
    const { data } = await supabase.from('inventory_current').select('*')
      .eq('internal_sku', sku).gt('qty', 0).single()
    if (data) {
      addItem(data as InventoryCard)
      setLastMsg({ ok: true, text: `✅ Añadido: ${(data as InventoryCard).card_name}` })
    } else {
      setLastMsg({ ok: false, text: `❌ SKU no encontrado: ${sku}` })
    }
    setTimeout(() => setLastMsg(null), 2500)
  }

  const addItem = (card: InventoryCard) => {
    const existing = currentItems.find(c => c.internal_sku === card.internal_sku)
    if (existing) {
      setCurrentItems(prev => prev.map(c =>
        c.internal_sku === card.internal_sku
          ? { ...c, qty: c.qty + 1, gross_amount: c.unit_price * (c.qty + 1) }
          : c
      ))
      return
    }
    const price = card.listed_price_eur ?? 0
    setCurrentItems(prev => [...prev, {
      sale_event_id: uuidv4(),
      sale_ts: new Date().toISOString(),
      internal_sku: card.internal_sku,
      display_name: `${card.card_name} ${card.lang}${card.is_reverse ? ' Rev' : ''} — ${card.set_code}`,
      language: card.lang,
      set_name: card.set_name,
      set_code: card.set_code,
      cardmarket_id: card.cardmarket_id,
      unit_price: price,
      qty: 1,
      gross_amount: price,
      business_rarity: card.rarity,
    }])
    setSearchResults([]); setQuery('')
    searchRef.current?.focus()
  }

  const removeItem = (sku: string) => {
    setCurrentItems(prev => prev.filter(c => c.internal_sku !== sku))
  }

  const nuevoPedido = () => {
    if (currentItems.length > 0) {
      setCompletedOrders(prev => [...prev, {
        session_id: cmSessionId,
        items: [...currentItems],
        total: currentItems.reduce((s, c) => s + c.gross_amount, 0),
        qty: currentItems.reduce((s, c) => s + c.qty, 0),
        timestamp: new Date().toISOString(),
      }])
    }
    setCurrentItems([])
    setCmSessionId(uuidv4().slice(0, 8))
    setLastMsg({ ok: true, text: '✅ Pedido guardado — nuevo ticket abierto' })
    setTimeout(() => setLastMsg(null), 2000)
    searchRef.current?.focus()
  }

  const downloadCM = () => {
    // Mirrors cardmarket_tab.py CERRAR CAJA CSV export format
    const allItems = [...completedOrders.flatMap(o => o.items), ...currentItems]
    if (!allItems.length) return

    const rows = allItems.map((s, idx) => {
      const date = s.sale_ts.slice(0, 10)
      const category = s.set_code?.toUpperCase().includes('OP') ? 'One Piece Single' : 'Pokemon Single'
      return [
        idx + 1,
        date,
        s.display_name,
        s.cardmarket_id ?? s.internal_sku,
        '',
        s.set_name,
        category,
        s.qty,
        s.unit_price.toFixed(2),
        s.gross_amount.toFixed(2),
        'EUR',
        s.language,
        s.business_rarity ?? '',
      ].join(',')
    })

    const header = 'Shipment nr.,Date of purchase,Article,Product ID,Localized Product Name,Expansion,Category,Amount,Article Value,Total,Currency,Language,Rarity'
    const csv = [header, ...rows].join('\n')
    const today = new Date().toISOString().slice(0, 10)
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `Articles-byPurchaseDate-${today}_${today}.csv`
    a.click()
  }

  const ticketTotal = currentItems.reduce((s, c) => s + c.gross_amount, 0)
  const dayTotal = completedOrders.reduce((s, o) => s + o.total, 0) + ticketTotal
  const dayQty = completedOrders.reduce((s, o) => s + o.qty, 0) + currentItems.reduce((s, c) => s + c.qty, 0)

  return (
    <div className="flex h-full overflow-hidden">
      {/* LEFT: Scanner + manual search */}
      <div className="flex flex-col flex-1 p-4 gap-3 overflow-hidden">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-gray-200">📦 Cardmarket</h2>
          <select value={game} onChange={e => setGame(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm ml-auto">
            <option value="pokemon">Pokémon</option>
            <option value="op">One Piece</option>
          </select>
        </div>

        <input ref={searchRef} value={query} onChange={handleInput}
          placeholder="🔍 Busca o escanea SKU"
          className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-base focus:outline-none focus:border-blue-500"
          autoComplete="off" />

        {lastMsg && (
          <div className={`text-sm px-3 py-2 rounded border ${lastMsg.ok ? 'bg-green-900/40 border-green-700 text-green-300' : 'bg-red-900/40 border-red-700 text-red-300'}`}>
            {lastMsg.text}
          </div>
        )}

        {/* Search results for manual add */}
        <div className="flex-1 overflow-y-auto space-y-1">
          {searchResults.map(card => (
            <button key={card.internal_sku} onClick={() => addItem(card)}
              className="w-full text-left bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-blue-500 rounded-lg px-4 py-2.5 transition-colors flex justify-between items-center">
              <div>
                <div className="font-medium text-sm">{card.card_name}</div>
                <div className="text-xs text-gray-400">{card.set_code} · {card.lang} · {card.rarity}</div>
              </div>
              <div className="text-green-400 font-bold text-sm shrink-0 ml-4">
                {card.listed_price_eur ? `€${card.listed_price_eur.toFixed(2)}` : '—'}
              </div>
            </button>
          ))}
        </div>

        {/* Daily summary */}
        {(completedOrders.length > 0 || currentItems.length > 0) && (
          <div className="border-t border-gray-800 pt-3 space-y-2 shrink-0">
            <div className="text-xs text-gray-500 uppercase tracking-wider">Registro del día</div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-gray-800 rounded p-2 text-center">
                <div className="text-green-400 font-bold">{dayQty}</div>
                <div className="text-xs text-gray-500">Artículos</div>
              </div>
              <div className="bg-gray-800 rounded p-2 text-center">
                <div className="text-green-400 font-bold">€{dayTotal.toFixed(2)}</div>
                <div className="text-xs text-gray-500">Total ingresos</div>
              </div>
            </div>
            {completedOrders.length > 0 && (
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {[...completedOrders].reverse().map((order, i) => (
                  <div key={order.session_id} className="text-xs text-gray-500 border-l-2 border-blue-700 pl-2">
                    Pedido #{completedOrders.length - i} · {order.qty} art. · €{order.total.toFixed(2)}
                  </div>
                ))}
              </div>
            )}
            <button onClick={downloadCM}
              className="w-full bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded py-2 text-xs font-medium text-gray-300 transition-colors">
              🔒 Cerrar caja — Descargar CSV Cardmarket
            </button>
          </div>
        )}
      </div>

      {/* RIGHT: Current ticket */}
      <div className="w-80 flex flex-col border-l border-gray-800 bg-gray-900">
        <div className="p-3 border-b border-gray-800">
          <div className="font-bold text-gray-200 text-sm">🧾 Ticket CM — {cmSessionId}</div>
          <div className="text-xs text-gray-500 mt-0.5">{completedOrders.length} pedido{completedOrders.length !== 1 ? 's' : ''} completados hoy</div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {currentItems.length === 0 ? (
            <div className="text-gray-600 text-sm text-center mt-8">Sin artículos<br /><span className="text-xs">Escanea o busca</span></div>
          ) : (
            currentItems.map(item => (
              <div key={item.internal_sku} className="bg-gray-800 rounded-lg px-3 py-2">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{item.display_name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{item.language} · {item.set_name} · x{item.qty}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-green-400 font-bold text-sm">€{item.gross_amount.toFixed(2)}</div>
                    <button onClick={() => removeItem(item.internal_sku)}
                      className="text-red-500 hover:text-red-400 text-xs mt-1 block ml-auto">✕</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-3 border-t border-gray-800 space-y-2">
          <div className="flex justify-between font-bold text-xl">
            <span>TOTAL</span>
            <span className="text-green-400">€{ticketTotal.toFixed(2)}</span>
          </div>
          <button onClick={nuevoPedido} disabled={currentItems.length === 0}
            className="w-full bg-blue-700 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg py-2.5 font-bold transition-colors">
            ➕ Nuevo pedido ({currentItems.length})
          </button>
        </div>
      </div>
    </div>
  )
}
