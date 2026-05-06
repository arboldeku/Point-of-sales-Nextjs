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

function printLabels(labels: LabelEntry[]) {
  const expanded = labels.flatMap(l => Array(l.qty).fill(null).map(() => l))

  const esc = (s: string | null | undefined) =>
    (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  // Rarity string → CSS class (matches label_preview.html classes)
  function rarityClass(r: string | null): string {
    if (!r) return 'c'
    const v = r.toLowerCase()
    if (v.includes('double') || v === 'rr') return 'rr'
    if (v.includes('special') && v.includes('art')) return 'sar'
    if (v.includes('special') && v.includes('illus')) return 'sar'
    if (v.includes('hyper') || v.includes('rainbow')) return 'hr'
    if (v.includes('illus')) return 'ir'
    if (v.includes('ultra') || v === 'ur') return 'ur'
    if (v.includes('art') || v === 'ar') return 'ar'
    return 'c'
  }

  // Lang → CSS class
  function langClass(lang: string): string {
    const l = lang.toUpperCase()
    if (l === 'ENG') return 'lang-eng'
    if (l === 'ESP') return 'lang-esp'
    if (l === 'JPN') return 'lang-jpn'
    return 'lang-other'
  }

  // Strip trailing lang suffix added by addToQueue ("Charizard ex ENG Rev" → "Charizard ex")
  function displayName(l: LabelEntry): string {
    return l.name
      .replace(new RegExp(`\\s+${l.lang}(\\s+Rev)?\\s*$`, 'i'), '')
      .replace(/\s+Rev\s*$/i, '')
      .trim() || l.name
  }

  // Barcode data for JsBarcode (embedded as JSON to avoid script injection)
  const barcodeData = JSON.stringify(
    expanded.map((l, i) => ({ id: `bc${i}`, val: l.sku || '' }))
  )

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script>
<style>
  @page { size: A4; margin: 5mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; background: white; }
  .no-print { padding: 8px 12px; background: #f0f0f0; font-size: 12px; border-bottom: 1px solid #ddd; }
  .grid { display: flex; flex-wrap: wrap; gap: 1.5mm; padding: 1mm; }

  .label {
    width: 60mm; height: 30mm;
    border: 0.5px solid #ccc; border-radius: 2px;
    display: flex; flex-direction: column;
    overflow: hidden; page-break-inside: avoid; background: white;
  }

  /* Black header */
  .lbl-header {
    background: #111; padding: 2px 6px;
    display: flex; align-items: center; justify-content: space-between;
    flex-shrink: 0; height: 7mm;
  }
  .lbl-store {
    font-weight: 900; font-size: 8.5px; letter-spacing: 0.18em;
    text-transform: uppercase; color: #f0c040;
  }
  .lbl-category { font-size: 5.5px; color: #999; letter-spacing: 0.03em; }

  /* Body */
  .lbl-body {
    flex: 1; display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    padding: 2px 6px; text-align: center; gap: 1.5px;
  }
  .lbl-top-row { display: flex; align-items: center; justify-content: center; gap: 4px; }
  .lbl-name { font-weight: 800; font-size: 9.5px; color: #111; letter-spacing: -0.01em; line-height: 1.1; }
  .lbl-lang {
    font-size: 5.5px; font-weight: 700; letter-spacing: 0.06em;
    padding: 1px 3px; border-radius: 2px; flex-shrink: 0;
  }
  .lang-eng { background: #1a3a6a; color: #60b0ff; border: 0.5px solid #2a5aaa; }
  .lang-esp { background: #6a1a1a; color: #ff6060; border: 0.5px solid #aa2a2a; }
  .lang-jpn { background: #1a4a2a; color: #40d080; border: 0.5px solid #2a6a3a; }
  .lang-other { background: #444; color: #ccc; border: 0.5px solid #666; }

  .lbl-set { font-family: 'Courier New', monospace; font-size: 6.5px; color: #666; }

  .lbl-rarity {
    display: inline-flex; align-items: center; gap: 2px;
    font-size: 5.5px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase;
    padding: 1px 4px; border-radius: 2px;
  }
  .rdot { width: 4px; height: 4px; border-radius: 50%; flex-shrink: 0; }
  .rr  { background: #fff3cd; color: #7a5a00; border: 0.5px solid #e0c050; } .rr  .rdot { background: #d4a000; }
  .ur  { background: #f3e8ff; color: #6a1a8a; border: 0.5px solid #c070e0; } .ur  .rdot { background: #9030b0; }
  .ir  { background: #e8f4ff; color: #1a4a8a; border: 0.5px solid #5090d0; } .ir  .rdot { background: #2060a0; }
  .sar { background: #fff0e8; color: #8a3a00; border: 0.5px solid #e08040; } .sar .rdot { background: #c05010; }
  .hr  { background: #e8fff0; color: #005a30; border: 0.5px solid #40c070; } .hr  .rdot { background: #009040; }
  .ar  { background: #f0f0ff; color: #2a2a8a; border: 0.5px solid #7070c0; } .ar  .rdot { background: #4040a0; }
  .c   { background: #f5f5f5; color: #555;    border: 0.5px solid #bbb;    } .c   .rdot { background: #888; }

  /* Barcode */
  .lbl-barcode {
    border-top: 0.5px solid #e8e8e8;
    padding: 1px 5px 2px;
    display: flex; flex-direction: column; align-items: center; flex-shrink: 0;
  }
  .lbl-barcode svg { max-width: 100%; height: 13px; }
  .lbl-sku { font-family: 'Courier New', monospace; font-size: 5.5px; color: #444; letter-spacing: 0.1em; margin-top: 1px; }

  @media print { .no-print { display: none; } }
</style>
</head>
<body>
<div class="no-print"><strong>${expanded.length} etiqueta${expanded.length !== 1 ? 's' : ''}</strong> &mdash; Ctrl+P para imprimir</div>
<div class="grid">
${expanded.map((l, i) => {
  const rc = rarityClass(l.rarity)
  const lc = langClass(l.lang)
  const dn = esc(displayName(l))
  const setLine = [l.set_code, l.cn].filter(Boolean).map(esc).join(' &middot; ')
  return `<div class="label">
  <div class="lbl-header">
    <span class="lbl-store">Prisma</span>
    <span class="lbl-category">Pok&eacute;mon TCG &middot; Single</span>
  </div>
  <div class="lbl-body">
    <div class="lbl-top-row">
      <span class="lbl-name">${dn}</span>
      <span class="lbl-lang ${lc}">${esc(l.lang)}</span>
    </div>
    <div class="lbl-set">${setLine}</div>
    ${l.rarity ? `<span class="lbl-rarity ${rc}"><span class="rdot"></span>${esc(l.rarity)}</span>` : ''}
  </div>
  <div class="lbl-barcode">
    <svg id="bc${i}"></svg>
    <span class="lbl-sku">${l.sku ? esc(l.sku) : '&mdash;'}</span>
  </div>
</div>`
}).join('\n')}
</div>
<script>
var barcodes = ${barcodeData};
window.onload = function() {
  var opts = {format:"CODE128",width:1.2,height:13,displayValue:false,margin:0,background:"#ffffff",lineColor:"#000000"};
  barcodes.forEach(function(b) { if (b.val) try { JsBarcode('#'+b.id, b.val, opts); } catch(e) {} });
  setTimeout(function() { window.print(); }, 500);
};
<\/script>
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
          sku: row['internal_sku'] || row['sku'] || row['internal sku'] || row['idproduct'] || row['product id'] || row['article id'] || row['cardmarket_id'] || '',
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
                <button onClick={() => printLabels(csvLabels)}
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
                      onClick={() => printLabels(selectedLabels)}
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
