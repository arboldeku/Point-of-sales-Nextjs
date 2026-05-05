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

  const [manualName, setManualName] = useState('')
  const [manualSet, setManualSet] = useState('')
  const [manualLang, setManualLang] = useState('')
  const [manualRarity, setManualRarity] = useState('')
  const [manualResults, setManualResults] = useState<InventoryCard[]>([])
  const [useInvQty, setUseInvQty] = useState(true)
  const [fixedQty, setFixedQty] = useState(1)
  const [game, setGame] = useState('pokemon')
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

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

  const searchManual = useCallback(async () => {
    setLoading(true); setSearched(true)
    let q = supabase.from('inventory_current').select('*')
      .eq('game', game).gt('qty', 0).order('card_name').limit(200)
    if (manualName.trim()) q = q.or(`card_name.ilike.%${manualName}%,name_es.ilike.%${manualName}%`)
    if (manualSet.trim()) q = q.ilike('set_code', `%${manualSet}%`)
    if (manualLang.trim()) q = q.eq('lang', manualLang.toUpperCase())
    if (manualRarity.trim()) q = q.ilike('rarity', `%${manualRarity}%`)
    const { data } = await q
    setManualResults((data as InventoryCard[]) ?? [])
    setLoading(false)
  }, [manualName, manualSet, manualLang, manualRarity, game])

  const printManual = () => {
    const labels: LabelEntry[] = manualResults.map(card => ({
      sku: card.internal_sku,
      name: `${card.card_name} ${card.lang}${card.is_reverse ? ' Rev' : ''}`,
      lang: card.lang,
      set_code: card.set_code,
      cn: card.cn,
      rarity: card.rarity,
      listed_price_eur: card.listed_price_eur,
      condition: null,
      qty: useInvQty ? (card.qty ?? 1) : fixedQty,
    }))
    void printLabels(labels)
  }

  const totalLabels = csvLabels.reduce((s, l) => s + l.qty, 0)
  const manualTotalLabels = useInvQty
    ? manualResults.reduce((s, c) => s + (c.qty ?? 1), 0)
    : manualResults.length * fixedQty

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
                  {csvLabels.length} carta{csvLabels.length !== 1 ? 's' : ''} · {totalLabels} etiqueta{totalLabels !== 1 ? 's' : ''}
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
          <div className="grid grid-cols-2 gap-2 shrink-0">
            <input value={manualName} onChange={e => setManualName(e.target.value)}
              placeholder="Nombre / Pokémon" onKeyDown={e => e.key === 'Enter' && searchManual()}
              className="col-span-2 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500" />
            <input value={manualSet} onChange={e => setManualSet(e.target.value)}
              placeholder="Set (ej: OBF)" onKeyDown={e => e.key === 'Enter' && searchManual()}
              className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500" />
            <input value={manualRarity} onChange={e => setManualRarity(e.target.value)}
              placeholder="Rareza (ej: Holo)" onKeyDown={e => e.key === 'Enter' && searchManual()}
              className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500" />
            <input value={manualLang} onChange={e => setManualLang(e.target.value)}
              placeholder="Idioma (ESP/ENG)" onKeyDown={e => e.key === 'Enter' && searchManual()}
              className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500" />
            <button onClick={searchManual}
              className="bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-bold transition-colors">
              Buscar
            </button>
          </div>

          {manualResults.length > 0 && (
            <>
              <div className="flex items-center gap-4 shrink-0">
                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                  <input type="checkbox" checked={useInvQty} onChange={e => setUseInvQty(e.target.checked)} />
                  Usar qty de inventario
                </label>
                {!useInvQty && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">Qty por carta:</span>
                    <input type="number" min="1" max="50" value={fixedQty}
                      onChange={e => setFixedQty(parseInt(e.target.value) || 1)}
                      className="w-16 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm" />
                  </div>
                )}
                <span className="text-gray-500 text-xs ml-auto">
                  {manualResults.length} carta{manualResults.length !== 1 ? 's' : ''} → {manualTotalLabels} etiqueta{manualTotalLabels !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-gray-900">
                    <tr className="text-gray-400 text-xs text-left border-b border-gray-800">
                      <th className="px-3 py-2">Carta</th>
                      <th className="px-3 py-2">Set</th>
                      <th className="px-3 py-2">Lang</th>
                      <th className="px-3 py-2">Rareza</th>
                      <th className="px-3 py-2 text-right">Stock</th>
                      <th className="px-3 py-2 text-right">Precio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {manualResults.map(card => (
                      <tr key={card.internal_sku} className="hover:bg-gray-800">
                        <td className="px-3 py-2 font-medium">{card.card_name}{card.is_reverse && <span className="text-blue-400 text-xs ml-1">Rev</span>}</td>
                        <td className="px-3 py-2 text-gray-400">{card.set_code}</td>
                        <td className="px-3 py-2 text-gray-400">{card.lang}</td>
                        <td className="px-3 py-2 text-gray-400 text-xs">{card.rarity ?? '—'}</td>
                        <td className={`px-3 py-2 text-right font-bold ${card.qty <= 2 ? 'text-orange-400' : 'text-gray-300'}`}>{card.qty}</td>
                        <td className="px-3 py-2 text-right text-green-400">{card.listed_price_eur ? `€${card.listed_price_eur.toFixed(2)}` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button onClick={printManual}
                className="shrink-0 w-full bg-green-700 hover:bg-green-600 rounded-lg py-2.5 text-sm font-bold transition-colors">
                🖨️ Imprimir etiquetas — {manualTotalLabels} etiqueta{manualTotalLabels !== 1 ? 's' : ''}
              </button>
            </>
          )}

          {searched && !loading && manualResults.length === 0 && (
            <div className="text-gray-500 text-sm text-center mt-8">Sin resultados — ajusta los filtros</div>
          )}
        </div>
      )}
    </div>
  )
}
