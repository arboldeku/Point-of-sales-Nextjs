'use client'

import { useEffect, useState } from 'react'
import { supabase, type InventoryCard } from '@/lib/supabase'
import { useDebounce } from 'use-debounce'

export default function InventoryPage() {
  const [query, setQuery] = useState('')
  const [debouncedQuery] = useDebounce(query, 300)
  const [results, setResults] = useState<InventoryCard[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState<number | null>(null)

  useEffect(() => {
    async function search() {
      setLoading(true)
      let q = supabase
        .from('inventory_current')
        .select('*')
        .gt('qty', 0)
        .order('card_name')
        .limit(100)

      if (debouncedQuery.trim()) {
        q = q.ilike('card_name', `%${debouncedQuery}%`)
      }

      const { data } = await q
      setResults((data as InventoryCard[]) || [])
      setLoading(false)
    }
    search()
  }, [debouncedQuery])

  useEffect(() => {
    supabase
      .from('inventory_current')
      .select('qty', { count: 'exact', head: true })
      .gt('qty', 0)
      .then(({ count }) => setTotal(count))
  }, [])

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Inventory</h1>
          {total !== null && <p className="text-gray-400 text-sm">{total} SKUs con stock</p>}
        </div>
      </div>

      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Buscar carta..."
        className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500"
      />

      {loading ? (
        <div className="text-center text-gray-400 py-8">Buscando...</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-700">
          <table className="w-full text-sm">
            <thead className="bg-gray-800 text-gray-400 text-left">
              <tr>
                <th className="px-3 py-2">Carta</th>
                <th className="px-3 py-2">Set</th>
                <th className="px-3 py-2">SKU</th>
                <th className="px-3 py-2">Lang</th>
                <th className="px-3 py-2">Rarity</th>
                <th className="px-3 py-2 text-center">Qty</th>
                <th className="px-3 py-2 text-right">Precio</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={r.internal_sku} className={i % 2 === 0 ? 'bg-gray-900' : 'bg-gray-800'}>
                  <td className="px-3 py-2 font-medium max-w-[160px] truncate">{r.card_name}</td>
                  <td className="px-3 py-2 text-gray-400 text-xs max-w-[120px] truncate">{r.set_name}</td>
                  <td className="px-3 py-2 font-mono text-xs text-gray-500">{r.internal_sku}</td>
                  <td className="px-3 py-2 text-xs">{r.lang}</td>
                  <td className="px-3 py-2 text-xs text-gray-400">{r.rarity}</td>
                  <td className="px-3 py-2 text-center font-bold">
                    <span className={r.qty <= 1 ? 'text-red-400' : r.qty <= 3 ? 'text-yellow-400' : 'text-green-400'}>
                      {r.qty}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right text-green-400">
                    {r.listed_price_eur != null ? `€${Number(r.listed_price_eur).toFixed(2)}` : '—'}
                  </td>
                </tr>
              ))}
              {results.length === 0 && !loading && (
                <tr><td colSpan={7} className="text-center text-gray-500 py-8">Sin resultados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
