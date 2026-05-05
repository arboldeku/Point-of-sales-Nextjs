'use client'

// Ported from prisma-scan/ui/search_tab.py
// Logic: filter inventory_current by name, set, lang, rarity — same filters as Python version

import { useState, useCallback } from 'react'
import { supabase, type InventoryCard } from '@/lib/supabase'

export default function SearchTab() {
  const [name, setName] = useState('')
  const [setFilter, setSetFilter] = useState('')
  const [lang, setLang] = useState('')
  const [rarity, setRarity] = useState('')
  const [game, setGame] = useState('pokemon')
  const [results, setResults] = useState<InventoryCard[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const doSearch = useCallback(async () => {
    setLoading(true); setSearched(true)

    let q = supabase.from('inventory_current').select('*')
      .eq('game', game).gt('qty', 0).order('card_name').limit(200)

    if (name.trim()) q = q.or(`card_name.ilike.%${name}%,name_es.ilike.%${name}%,internal_sku.ilike.%${name}%`)
    if (setFilter.trim()) q = q.ilike('set_code', `%${setFilter}%`)
    if (lang.trim()) q = q.eq('lang', lang.toUpperCase())
    if (rarity.trim()) q = q.ilike('rarity', `%${rarity}%`)

    const { data } = await q
    setResults((data as InventoryCard[]) ?? [])
    setLoading(false)
  }, [name, setFilter, lang, rarity, game])

  const clear = () => {
    setName(''); setSetFilter(''); setLang(''); setRarity('')
    setResults([]); setSearched(false)
  }

  const onKey = (e: React.KeyboardEvent) => { if (e.key === 'Enter') doSearch() }

  return (
    <div className="flex flex-col h-full p-4 gap-4 overflow-hidden">
      <h2 className="text-lg font-bold text-gray-200 shrink-0">🔍 Buscador de cartas</h2>
      <p className="text-gray-500 text-sm -mt-2 shrink-0">Busca por nombre, expansión, idioma o rareza</p>

      {/* Filters — mirrors the 4 filters in search_tab.py */}
      <div className="grid grid-cols-2 gap-2 shrink-0">
        <input value={name} onChange={e => setName(e.target.value)} onKeyDown={onKey}
          placeholder="Nombre / Pokémon (ej: Charizard)"
          className="col-span-2 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500" />
        <input value={setFilter} onChange={e => setSetFilter(e.target.value)} onKeyDown={onKey}
          placeholder="Expansión (ej: OBF, PAR)"
          className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500" />
        <input value={rarity} onChange={e => setRarity(e.target.value)} onKeyDown={onKey}
          placeholder="Rareza (ej: Holo Rare)"
          className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500" />
        <input value={lang} onChange={e => setLang(e.target.value)} onKeyDown={onKey}
          placeholder="Idioma (ESP, ENG, JPN…)"
          className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500" />
        <select value={game} onChange={e => setGame(e.target.value)}
          className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500">
          <option value="pokemon">Pokémon</option>
          <option value="op">One Piece</option>
        </select>
      </div>

      <div className="flex gap-2 shrink-0">
        <button onClick={doSearch}
          className="bg-purple-600 hover:bg-purple-500 px-6 py-2 rounded-lg text-sm font-bold transition-colors">
          Buscar
        </button>
        <button onClick={clear}
          className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg text-sm text-gray-400 transition-colors">
          Limpiar
        </button>
        {results.length > 0 && (
          <span className="text-gray-500 text-sm self-center">
            {results.length} resultado{results.length !== 1 ? 's' : ''} con stock disponible
          </span>
        )}
      </div>

      {/* Results table — mirrors st.dataframe in search_tab.py */}
      <div className="flex-1 overflow-y-auto">
        {loading && <div className="text-gray-500 text-center mt-8">Buscando...</div>}
        {!loading && searched && results.length === 0 && (
          <div className="text-gray-500 text-center mt-8">Sin resultados — ajusta los filtros</div>
        )}
        {!loading && results.length > 0 && (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-900 z-10">
              <tr className="text-gray-400 text-xs text-left border-b border-gray-800">
                <th className="px-3 py-2">Carta</th>
                <th className="px-3 py-2">Idioma</th>
                <th className="px-3 py-2">Expansión</th>
                <th className="px-3 py-2">Rareza</th>
                <th className="px-3 py-2 text-right">Stock</th>
                <th className="px-3 py-2 text-right">Precio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {results.map(card => (
                <tr key={card.internal_sku} className="hover:bg-gray-800">
                  <td className="px-3 py-2">
                    <div className="font-medium">{card.card_name}</div>
                    {card.name_es && card.name_es !== card.card_name && (
                      <div className="text-xs text-gray-500">{card.name_es}</div>
                    )}
                    <div className="text-xs text-gray-600">{card.cn}</div>
                  </td>
                  <td className="px-3 py-2 text-gray-300">
                    {card.lang}
                    {card.is_reverse && <span className="text-blue-400 ml-1 text-xs">Rev</span>}
                  </td>
                  <td className="px-3 py-2 text-gray-400">{card.set_code}</td>
                  <td className="px-3 py-2 text-gray-400 text-xs">{card.rarity ?? '—'}</td>
                  <td className={`px-3 py-2 text-right font-bold ${card.qty <= 2 ? 'text-orange-400' : 'text-gray-300'}`}>
                    {card.qty}
                  </td>
                  <td className="px-3 py-2 text-right font-medium text-green-400">
                    {card.listed_price_eur ? `€${card.listed_price_eur.toFixed(2)}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
