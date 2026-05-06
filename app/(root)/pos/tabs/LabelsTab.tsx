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

const LANG_MAP: Record<string, string> = {
  spanish: 'ESP', español: 'ESP', espanol: 'ESP', esp: 'ESP', es: 'ESP', sp: 'ESP',
  english: 'ENG', inglés: 'ENG', ingles: 'ENG', eng: 'ENG', en: 'ENG',
  japanese: 'JPN', japonés: 'JPN', japones: 'JPN', jpn: 'JPN', jap: 'JPN', jp: 'JPN', ja: 'JPN',
  french: 'FRA', francés: 'FRA', frances: 'FRA', fra: 'FRA', fr: 'FRA',
  german: 'DEU', alemán: 'DEU', aleman: 'DEU', deu: 'DEU', de: 'DEU',
  italian: 'ITA', italiano: 'ITA', ita: 'ITA', it: 'ITA',
  portuguese: 'POR', portugués: 'POR', portugues: 'POR', por: 'POR', pt: 'POR',
  korean: 'KOR', coreano: 'KOR', kor: 'KOR', ko: 'KOR',
  chinese: 'CHI', chino: 'CHI', chi: 'CHI', zh: 'CHI',
}

function normalizeLang(raw: string): string {
  if (!raw) return 'ESP'
  const key = raw.trim().toLowerCase()
  return LANG_MAP[key] ?? raw.trim().toUpperCase().slice(0, 3)
}

function printLabels(labels: LabelEntry[]) {
  const expanded = labels.flatMap(l => Array(l.qty).fill(null).map(() => l))

  const esc = (s: string | null | undefined) =>
    (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  // Strip trailing lang suffix added by addToQueue ("Charizard ex ENG Rev" → "Charizard ex")
  function baseName(l: LabelEntry): string {
    return l.name
      .replace(new RegExp(`\\s+${l.lang}(\\s+Rev)?\\s*$`, 'i'), '')
      .replace(/\s+Rev\s*$/i, '')
      .trim() || l.name
  }

  // Display name with lang in parens: "Mega Audino ex (ESP)"
  function displayName(l: LabelEntry): string {
    return `${baseName(l)} (${l.lang.toUpperCase()})`
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
  .grid { display: flex; flex-wrap: wrap; gap: 2mm; padding: 2mm; }

  /* Exact dimensions from prisma-scan core/labels.py:
     LBL_W=60mm LBL_H=30mm TOP_H=13mm LEFT_W=18mm BC_H=15mm */
  .label {
    width: 60mm; height: 30mm;
    border: 1px solid #000;
    display: flex; flex-direction: column;
    overflow: hidden; page-break-inside: avoid; background: white;
  }

  /* Top section: 13mm tall = TOP_H */
  .lbl-top {
    height: 13mm; flex-shrink: 0;
    display: flex; flex-direction: row; overflow: hidden;
  }

  /* Left brand block: 18mm = LEFT_W, black fill */
  .lbl-brand {
    width: 18mm; flex-shrink: 0;
    background: #000;
    border-right: 1px solid #000;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    padding: 0 1.5mm; gap: 1.5mm;
  }
  .lbl-brand-name {
    font-family: 'Century Gothic', CenturyGothic, AppleGothic, Arial, sans-serif;
    font-weight: 700; font-size: 9pt;
    color: #fff; letter-spacing: 0.04em;
    line-height: 1; text-align: center; white-space: nowrap;
  }
  .lbl-brand-sub {
    font-family: 'Century Gothic', CenturyGothic, AppleGothic, Arial, sans-serif;
    font-weight: 700; font-size: 4pt;
    color: #bbb; letter-spacing: 0.06em;
    text-transform: uppercase; text-align: center;
    white-space: nowrap; line-height: 1;
  }

  /* Right info block: Helvetica-BoldOblique 9pt / Helvetica-Bold 8pt */
  .lbl-info {
    flex: 1; display: flex; flex-direction: column;
    justify-content: space-evenly;
    padding: 1mm 1mm 1mm 2mm;
    background: #fff;
  }
  .lbl-name {
    font-family: Arial, sans-serif;
    font-style: italic; font-weight: bold; font-size: 9pt;
    color: #000; line-height: 1;
    white-space: nowrap; overflow: hidden;
  }
  .lbl-set {
    font-family: Arial, sans-serif;
    font-weight: bold; font-size: 8pt;
    color: #000; line-height: 1;
  }
  .lbl-sku {
    font-family: Arial, sans-serif;
    font-weight: bold; font-size: 8pt;
    color: #000; line-height: 1;
  }

  /* Barcode section: remaining 17mm (30mm - 13mm), BC_H=15mm centered */
  .lbl-barcode {
    flex: 1;
    border-top: 1px solid #000;
    padding: 1mm 2mm;
    display: flex; align-items: center; justify-content: center;
    background: #fff;
  }
  .lbl-barcode svg { display: block; width: 100%; height: 100%; }

  @media print { .no-print { display: none; } }
</style>
</head>
<body>
<div class="no-print"><strong>${expanded.length} etiqueta${expanded.length !== 1 ? 's' : ''}</strong> &mdash; Ctrl+P para imprimir</div>
<div class="grid">
${expanded.map((l, i) => {
  const dn = esc(displayName(l))
  const setLine = [l.set_code, l.cn].filter(Boolean).map(esc).join(' - ')
  return `<div class="label">
  <div class="lbl-top">
    <div class="lbl-brand">
      <span class="lbl-brand-name">PRISMA</span>
      <span class="lbl-brand-sub">COLLECT &amp; PLAY!</span>
    </div>
    <div class="lbl-info">
      <span class="lbl-name">${dn}</span>
      <span class="lbl-set">${setLine}</span>
      <span class="lbl-sku">${l.sku ? esc(l.sku) : '&mdash;'}</span>
    </div>
  </div>
  <div class="lbl-barcode">
    <svg id="bc${i}"></svg>
  </div>
</div>`
}).join('\n')}
</div>
<script>
var barcodes = ${barcodeData};
window.onload = function() {
  var opts = {format:"CODE128",width:1.4,height:50,displayValue:false,margin:0,background:"#ffffff",lineColor:"#000000"};
  barcodes.forEach(function(b) {
    if (!b.val) return;
    try {
      JsBarcode('#'+b.id, b.val, opts);
      var svg = document.getElementById(b.id);
      if (svg) {
        svg.removeAttribute('width');
        svg.removeAttribute('height');
        svg.setAttribute('preserveAspectRatio', 'none');
      }
    } catch(e) {}
  });
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

      // Phase 1: parse rows, keeping cardmarket_id for Supabase lookup
      type RawEntry = LabelEntry & { _cm_id: string }
      const raw: RawEntry[] = []

      for (let i = 1; i < lines.length; i++) {
        const vals = lines[i].split(',').map(v => v.replace(/^"|"$/g, '').trim())
        const row: Record<string, string> = {}
        headers.forEach((h, idx) => { row[h] = vals[idx] ?? '' })

        const name = row['card_name'] || row['name'] || row['product'] || row['article'] || row['nombre'] || ''
        if (!name) continue

        const cm_id = row['cardmarketid'] || row['idproduct'] || row['product id'] || row['article id'] || row['cardmarket_id'] || ''
        const lang = normalizeLang(row['lang'] || row['language'] || row['idioma'] || '')

        raw.push({
          sku: row['internal_sku'] || row['sku'] || row['internal sku'] || '',
          name,
          lang,
          set_code: row['set_code'] || row['expansion'] || '',
          cn: row['cn'] || row['number'] || null,
          rarity: row['rarity'] || row['rareza'] || null,
          listed_price_eur: parseFloat(row['listed_price_eur'] || row['price'] || row['price in eur'] || row['article value'] || '0') || null,
          condition: row['condition'] || row['condicion'] || 'NM',
          qty: parseInt(row['qty'] || row['amount'] || row['count'] || '1') || 1,
          _cm_id: cm_id,
        })
      }

      if (!raw.length) throw new Error('No se encontraron filas válidas')

      // Phase 2: Supabase lookup for rows without internal_sku
      const needsLookup = raw.filter(r => !r.sku && r._cm_id)
      if (needsLookup.length > 0) {
        const cmIds = Array.from(new Set(needsLookup.map(r => r._cm_id)))
        const { data } = await supabase
          .from('inventory_current')
          .select('internal_sku, cardmarket_id, lang, card_name, set_code, cn, rarity, listed_price_eur')
          .in('cardmarket_id', cmIds as any)
          .gt('qty', 0)

        if (data) {
          const skuMap = new Map<string, any>()
          data.forEach((row: any) => {
            const key = `${row.cardmarket_id}|${String(row.lang).toUpperCase()}`
            if (!skuMap.has(key)) skuMap.set(key, row)
          })

          raw.forEach(r => {
            if (r.sku || !r._cm_id) return
            const hit = skuMap.get(`${r._cm_id}|${r.lang}`)
            if (hit) {
              r.sku           = hit.internal_sku ?? r._cm_id
              if (!r.name || r.name === r._cm_id) r.name = hit.card_name ?? r.name
              if (!r.set_code)    r.set_code = hit.set_code ?? ''
              if (!r.cn)          r.cn = hit.cn ?? null
              if (!r.rarity)      r.rarity = hit.rarity ?? null
              if (!r.listed_price_eur) r.listed_price_eur = hit.listed_price_eur ?? null
            } else {
              r.sku = r._cm_id  // fallback: at least show a barcode
            }
          })
        }
      }

      // Phase 3: for rows still without sku, fall back to cm_id
      raw.forEach(r => { if (!r.sku) r.sku = r._cm_id })

      const parsed: LabelEntry[] = raw.map(({ _cm_id: _, ...rest }) => rest)
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
