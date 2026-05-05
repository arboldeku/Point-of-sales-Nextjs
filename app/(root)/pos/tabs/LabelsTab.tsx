'use client'

import { useState, useCallback } from 'react'
import { supabase, type InventoryCard } from '@/lib/supabase'

type LabelEntry = {
  sku: string
  name: string
  lang: string
  set_code: string
  cn: string | null
  rarity: string | null
  listed_price_eur: number | null
  condition: string | null
  qty: number
}

async function printLabels(labels: LabelEntry[]) {
  const expanded = labels.flatMap(l => Array(l.qty).fill(null).map(() => l))

  // Dynamic import — ensures bwip-js only runs in browser context (no SSR)
  let bwipjs: any
  try {
    bwipjs = (await import('bwip-js')).default
  } catch {
    bwipjs = null
  }

  // Pre-generate DataMatrix data URLs for unique SKUs
  const skuImages: Record<string, string> = {}
  const uniqueSkus = Array.from(new Set(expanded.map(l => l.sku).filter(Boolean)))
  for (const sku of uniqueSkus) {
    if (!bwipjs) break
    try {
      const canvas = document.createElement('canvas')
      bwipjs.toCanvas(canvas, { bcid: 'datamatrix', text: sku, scale: 4, paddingwidth: 1, paddingheight: 1 })
      const url = canvas.toDataURL('image/png')
      if (url) skuImages[sku] = url
    } catch {
      // individual SKU failed — skip
    }
  }

  // Use HTML entities for all non-ASCII chars to avoid document.write encoding issues
  const esc = (s: string | null | undefined) =>
    (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  @page { size: A4; margin: 8mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 9px; margin: 0; background: #fff; color: #000; }
  .no-print { padding: 8px 12px; background: #f0f0f0; font-size: 12px; border-bottom: 1px solid #ddd; }
  .grid { display: flex; flex-wrap: wrap; gap: 2mm; padding: 2mm; }
  .label {
    width: 88mm; height: 32mm;
    border: 1px solid #999;
    display: flex; flex-direction: row;
    overflow: hidden; page-break-inside: avoid;
  }
  .label-text {
    flex: 1; min-width: 0;
    padding: 3mm 2mm 3mm 3mm;
    display: flex; flex-direction: column; justify-content: space-between;
    border-right: 1px solid #ccc;
  }
  .label-dm {
    width: 26mm; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    padding: 2mm;
  }
  .label-dm img { width: 22mm; height: 22mm; image-rendering: pixelated; display: block; }
  .label-dm .no-dm {
    width: 22mm; height: 22mm; border: 1px dashed #bbb;
    display: flex; align-items: center; justify-content: center;
    font-size: 6px; color: #aaa; text-align: center;
  }
  .name { font-size: 10.5px; font-weight: bold; line-height: 1.2; margin-bottom: 1mm; overflow: hidden; }
  .details { font-size: 8px; color: #555; line-height: 1.4; }
  .spacer { flex: 1; }
  .bottom { display: flex; justify-content: space-between; align-items: flex-end; }
  .sku { font-size: 6.5px; color: #999; font-family: monospace; }
  .price { font-size: 16px; font-weight: bold; color: #000; line-height: 1; }
  @media print { .no-print { display: none; } }
</style>
</head>
<body>
<div class="no-print"><strong>${expanded.length} etiqueta${expanded.length !== 1 ? 's' : ''}</strong> &mdash; Ctrl+P para imprimir &bull; Cierra esta ventana cuando acabes</div>
<div class="grid">
${expanded.map(l => {
  const condTag = l.condition && l.condition !== 'NM' ? ` [${esc(l.condition)}]` : ''
  const details = [l.set_code, l.cn, l.rarity, l.lang].filter(Boolean).map(esc).join(' &middot; ')
  const price = l.listed_price_eur ? `&euro;${l.listed_price_eur.toFixed(2)}` : ''
  const dmHtml = skuImages[l.sku]
    ? `<img src="${skuImages[l.sku]}" alt="${esc(l.sku)}">`
    : `<div class="no-dm">sin<br>SKU</div>`
  return `<div class="label">
  <div class="label-text">
    <div class="name">${esc(l.name)}${condTag}</div>
    <div class="details">${details}</div>
    <div class="spacer"></div>
    <div class="bottom">
      <div class="sku">${esc(l.sku) || '&mdash;'}</div>
      <div class="price">${price}</div>
    </div>
  </div>
  <div class="label-dm">${dmHtml}</div>
</div>`
}).join('\n')}
</div>
<script>window.onload = function() { setTimeout(function() { window.print(); }, 500); }<\/script>
</body>
</html>`

  const win = window.open('', '_blank')
  if (!win) { alert('Permite ventanas emergentes para imprimir etiquetas'); return }
  win.document.open()
  win.document.write(html)
  win.document.close()
}

export default function LabelsTab() {
  const [mode, setMode] = useState<'csv' | 'manual'>('csv')

  const [csvLabels, setCsvLabels] = useState<LabelEntry[]>([])
  const [csvError, setCsvError] = useState('')
  const [csvFileName, setCsvFileName] = useState('')

  const [searchInput, setSearchInput] = useState('')
  const [filterSet, setFilterSet] = useState('')
  const [filterLang, setFilterLang] = useState('')
  const [filterRarity, setFilterRarity] = useState('')
  const [autocompleteResults, setAutocompleteResults] = useState<InventoryCard[]>([])
  const [autocompleteOpen, setAutocompleteOpen] = useState(false)
  const [selectedLabels, setSelectedLabels] = useState<LabelEntry[]>([])
  const [game, setGame] = useState('pokemon')
  const [autocompleteLoading, setAutocompleteLoading] = useState(false)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCsvFileName(file.name); setCsvError(''); setCsvLabels([])

    try {
      const text = await file.text()
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
      if (lines.length < 2) throw new Error('CSV vacío o sin filas de datos')

      const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim().toLowerCase())
      const parsed: LabelEntry[] = []

      for (let i = 1; i < lines.length; i++) {
        const vals = lines[i].split(',').map(v => v.replace(/^"|"$/g, '').trim())
        const row: Record<string, string> = {}
        headers.forEach((h, idx) => { row[h] = vals[idx] ?? '' })

        const name = row['card_name'] || row['name'] || row['article'] || row['nombre'] || ''
        if (!name) continue

        parsed.push({
          sku: row['internal_sku'] || row['sku'] || row['product id'] || '',
          name,
          lang: row['lang'] || row['language'] || row['idioma'] || 'ESP',
          set_code: row['set_code'] || row['expansion'] || '',
          cn: row['cn'] || row['number'] || null,
          rarity: row['rarity'] || row['rareza'] || null,
          listed_price_eur: parseFloat(row['listed_price_eur'] || row['price'] || row['article value'] || '0') || null,
          condition: row['condition'] || row['condicion'] || 'NM',
          qty: parseInt(row['qty'] || row['amount'] || '1') || 1,
        })
      }

      if (!parsed.length) throw new Error('No se encontraron filas válidas')
      setCsvLabels(parsed)
    } catch (err: any) {
      setCsvError(err.message)
    }
    e.target.value = ''
  }

  // Autocomplete search con debounce
  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value)
    if (!value.trim()) {
      setAutocompleteResults([])
      setAutocompleteOpen(false)
      return
    }

    setAutocompleteLoading(true)
    const timer = setTimeout(async () => {
      let q = supabase.from('inventory_current').select('*')
        .eq('game', game).gt('qty', 0).order('card_name').limit(15)

      q = q.or(`card_name.ilike.%${value}%,name_es.ilike.%${value}%`)
      if (filterSet.trim()) q = q.ilike('set_code', `%${filterSet}%`)
      if (filterLang.trim()) q = q.eq('lang', filterLang.toUpperCase())
      if (filterRarity.trim()) q = q.ilike('rarity', `%${filterRarity}%`)

      const { data } = await q
      setAutocompleteResults((data as InventoryCard[]) ?? [])
      setAutocompleteOpen(true)
      setAutocompleteLoading(false)
    }, 300)

    return () => clearTimeout(timer)
  }, [game, filterSet, filterLang, filterRarity])

  const addToQueue = (card: InventoryCard) => {
    const entry: LabelEntry = {
      sku: card.internal_sku,
      name: `${card.card_name} ${card.lang}${card.is_reverse ? ' Rev' : ''}`,
      lang: card.lang,
      set_code: card.set_code,
      cn: card.cn,
      rarity: card.rarity,
      listed_price_eur: card.listed_price_eur,
      condition: null,
      qty: 1,
    }
    setSelectedLabels([...selectedLabels, entry])
    setSearchInput('')
    setAutocompleteOpen(false)
  }

  const removeFromQueue = (index: number) => {
    setSelectedLabels(selectedLabels.filter((_, i) => i !== index))
  }

  const updateQueueQty = (index: number, qty: number) => {
    const updated = [...selectedLabels]
    updated[index].qty = Math.max(1, qty)
    setSelectedLabels(updated)
  }

  const totalSelectedLabels = selectedLabels.reduce((s, l) => s + l.qty, 0)
  const totalCsvLabels = csvLabels.reduce((s, l) => s + l.qty, 0)

  return (
    <div className="flex flex-col h-full p-4 gap-4 overflow-hidden">
      <h2 className="text-lg font-bold text-gray-200 shrink-0">🏷️ Generador de etiquetas</h2>

      <div className="flex gap-2 shrink-0">
        {(['csv', 'manual'] as const).map(m => (
          <button key={m} onClick={() => setMode(m)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${mode === m ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
            {m === 'csv' ? '📁 Subir CSV' : '🔍 Selección manual'}
          </button>
        ))}
        <select value={game} onChange={e => setGame(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm ml-auto">
          <option value="pokemon">Pokémon</option>
          <option value="op">One Piece</option>
        </select>
      </div>

      {mode === 'csv' && (
        <div className="flex flex-col gap-4 flex-1 overflow-hidden">
          <div className="border-2 border-dashed border-gray-700 rounded-xl p-6 text-center shrink-0">
            <label className="cursor-pointer">
              <input type="file" accept=".csv" onChange={handleFile} className="hidden" />
              <div className="text-3xl mb-2">📄</div>
              <div className="text-gray-300 font-medium">{csvFileName || 'Subir CSV'}</div>
              <div className="text-gray-500 text-xs mt-1">
                Acepta exportaciones Cardmarket o CSV con columna <code>internal_sku</code>
              </div>
              <div className="mt-3 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg text-sm inline-block">
                Seleccionar archivo
              </div>
            </label>
          </div>

          {csvError && (
            <div className="bg-red-900/50 border border-red-700 rounded px-4 py-2 text-red-300 text-sm shrink-0">
              ❌ {csvError}
            </div>
          )}

          {csvLabels.length > 0 && (
            <>
              <div className="flex items-center justify-between shrink-0">
                <span className="text-gray-400 text-sm">
                  {csvLabels.length} carta{csvLabels.length !== 1 ? 's' : ''} · {totalCsvLabels} etiqueta{totalCsvLabels !== 1 ? 's' : ''}
                </span>
                <button onClick={() => void printLabels(csvLabels)}
                  className="bg-green-700 hover:bg-green-600 px-4 py-2 rounded-lg text-sm font-bold transition-colors">
                  🖨️ Imprimir etiquetas
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-gray-900">
                    <tr className="text-gray-400 text-xs text-left border-b border-gray-800">
                      <th className="px-3 py-2">Carta</th>
                      <th className="px-3 py-2">Set</th>
                      <th className="px-3 py-2">Lang</th>
                      <th className="px-3 py-2">Rareza</th>
                      <th className="px-3 py-2 text-right">Precio</th>
                      <th className="px-3 py-2 text-right">Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {csvLabels.map((row, i) => (
                      <tr key={i} className="hover:bg-gray-800">
                        <td className="px-3 py-2 font-medium">{row.name}{row.condition && row.condition !== 'NM' && <span className="text-orange-400 text-xs ml-1">[{row.condition}]</span>}</td>
                        <td className="px-3 py-2 text-gray-400">{row.set_code}</td>
                        <td className="px-3 py-2 text-gray-400">{row.lang}</td>
                        <td className="px-3 py-2 text-gray-400 text-xs">{row.rarity ?? '—'}</td>
                        <td className="px-3 py-2 text-right text-green-400">{row.listed_price_eur ? `€${row.listed_price_eur.toFixed(2)}` : '—'}</td>
                        <td className="px-3 py-2 text-right text-gray-300">{row.qty}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {mode === 'manual' && (
        <div className="flex flex-col gap-3 flex-1 overflow-hidden">
          <div className="grid grid-cols-3 gap-2 shrink-0">
            <input value={searchInput} onChange={e => handleSearchChange(e.target.value)}
              placeholder="🔍 Buscar carta..." autoComplete="off"
              className="col-span-3 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500" />
            <input value={filterSet} onChange={e => setFilterSet(e.target.value)}
              placeholder="Set (ej: OBF)"
              className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500" />
            <input value={filterLang} onChange={e => setFilterLang(e.target.value)}
              placeholder="Idioma (ESP/ENG)"
              className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500" />
            <input value={filterRarity} onChange={e => setFilterRarity(e.target.value)}
              placeholder="Rareza (ej: Holo)"
              className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500" />
          </div>

          <div className="grid grid-cols-2 gap-3 flex-1 overflow-hidden">
            {/* Búsqueda y resultados */}
            <div className="flex flex-col gap-3 overflow-hidden min-w-0">
              {autocompleteOpen && autocompleteResults.length > 0 && (
                <div className="bg-gray-800 border border-gray-600 rounded-lg overflow-y-auto max-h-96">
                  {autocompleteResults.map(card => (
                    <div key={card.internal_sku} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-700 border-b border-gray-700 last:border-b-0 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{card.card_name}{card.is_reverse && <span className="text-blue-400 text-xs ml-1">Rev</span>}</div>
                        <div className="text-xs text-gray-400">{card.set_code} #{card.cn ?? '—'} · {card.lang}</div>
                        <div className="text-xs text-gray-500 mt-0.5">Stock: {card.qty} · €{card.listed_price_eur?.toFixed(2) ?? '—'}</div>
                      </div>
                      <button
                        onClick={() => addToQueue(card)}
                        className="shrink-0 bg-purple-600 hover:bg-purple-500 text-white rounded-lg px-3 py-1.5 text-sm font-bold transition-colors"
                      >
                        ➕
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {autocompleteLoading && searchInput && (
                <div className="text-gray-400 text-sm text-center py-4">Buscando...</div>
              )}
              {searchInput && autocompleteOpen && autocompleteResults.length === 0 && !autocompleteLoading && (
                <div className="text-gray-500 text-sm text-center py-4">Sin resultados</div>
              )}
            </div>

            {/* Cola de etiquetas */}
            <div className="flex flex-col gap-3 overflow-hidden bg-gray-800 rounded-lg p-3 border border-gray-700">
              <div className="text-sm font-bold text-gray-300 shrink-0">
                📋 Cola ({selectedLabels.length})
              </div>

              <div className="flex-1 overflow-y-auto space-y-2">
                {selectedLabels.length === 0 ? (
                  <div className="text-gray-500 text-xs text-center py-8">Selecciona cartas para generar etiquetas</div>
                ) : (
                  selectedLabels.map((label, idx) => (
                    <div key={idx} className="bg-gray-700 rounded-lg p-2 text-xs space-y-1">
                      <div className="font-medium text-gray-200 truncate">{label.name}</div>
                      <div className="text-gray-400">{label.set_code}</div>
                      <div className="flex items-center gap-2 justify-between">
                        <input
                          type="number"
                          min="1"
                          max="50"
                          value={label.qty}
                          onChange={e => updateQueueQty(idx, parseInt(e.target.value) || 1)}
                          className="w-12 bg-gray-600 border border-gray-500 rounded px-1.5 py-0.5 text-gray-200 text-xs"
                        />
                        <button
                          onClick={() => removeFromQueue(idx)}
                          className="text-red-400 hover:text-red-300 text-xs font-bold"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {selectedLabels.length > 0 && (
                <>
                  <div className="border-t border-gray-600 pt-2 shrink-0">
                    <div className="text-xs text-gray-400 text-center mb-2">
                      Total: {totalSelectedLabels} etiqueta{totalSelectedLabels !== 1 ? 's' : ''}
                    </div>
                    <button
                      onClick={() => void printLabels(selectedLabels)}
                      className="w-full bg-green-700 hover:bg-green-600 rounded-lg py-2 text-xs font-bold transition-colors text-white"
                    >
                      🖨️ Generar PDF
                    </button>
                    <button
                      onClick={() => setSelectedLabels([])}
                      className="w-full bg-gray-600 hover:bg-gray-500 rounded-lg py-1.5 text-xs transition-colors text-gray-200 mt-1"
                    >
                      Limpiar
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
