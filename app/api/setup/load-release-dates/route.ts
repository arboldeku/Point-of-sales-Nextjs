import { NextResponse } from 'next/server'
import fs from 'fs'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const DRIVE_PATHS = [
  { path: 'G:\\La meva unitat\\PrismaLake_v2\\Pokemon\\reference\\Release dates.csv', region: 'occidental' },
  { path: 'G:\\La meva unitat\\PrismaLake_v2\\Pokemon\\reference\\Release dates jp.csv', region: 'japanese' },
]

function parseDate(s: string): Date | null {
  if (!s) return null
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (iso) {
    const d = new Date(`${iso[1]}-${iso[2]}-${iso[3]}`)
    return isNaN(d.getTime()) ? null : d
  }
  const dmy = s.match(/^(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{2,4})$/)
  if (dmy) {
    let year = dmy[3]
    if (dmy[3].length === 2) {
      const yy = parseInt(dmy[3])
      year = yy >= 90 ? `19${dmy[3]}` : `20${dmy[3]}`
    }
    const d = new Date(`${dmy[2]} ${dmy[1]} ${year}`)
    return isNaN(d.getTime()) ? null : d
  }
  return null
}

const DAY_MS = 24 * 60 * 60 * 1000

export async function GET() {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  // Check if data already exists
  const { count } = await supabase.from('release_dates').select('*', { count: 'exact' })
  if (count && count > 0) {
    return NextResponse.json({ message: 'Data already loaded', rows: count })
  }

  const allRows: Array<{ set_code: string; release_date: string; region_release: string }> = []

  for (const { path, region } of DRIVE_PATHS) {
    try {
      const content = fs.readFileSync(path, 'latin1')
      const lines = content.split('\n')

      // Detect delimiter: check first line for ; or ,
      const firstLine = lines[0] || ''
      const delimiter = firstLine.includes(';') ? ';' : ','

      // Parse into blocks (same logic as original API route)
      type Row = { code: string; date: Date | null }
      type Block = { rows: Row[] }
      const blocks: Block[] = [{ rows: [] }]

      for (const raw of lines) {
        const parts = raw.split(delimiter).map(p => p.trim())
        if (!parts[0]) continue

        // Detect block header
        if (parts.length >= 2 && parts[1] && parts[0] === parts[1]) {
          blocks.push({ rows: [] })
          continue
        }

        // Extract code and date
        const words = parts[0].split(/\s+/)
        const code = words[words.length - 1].toUpperCase()
        if (!code || code.length < 2) continue
        const date = parseDate(parts[1] ?? '')
        blocks[blocks.length - 1].rows.push({ code, date })
      }

      // For each block: sets with dates use their date; promos get max_date + 1 day
      for (const block of blocks) {
        const datesInBlock = block.rows
          .map(r => r.date)
          .filter((d): d is Date => d !== null)
        if (!datesInBlock.length) continue
        const maxDate = Math.max(...datesInBlock.map(d => d.getTime()))

        for (const row of block.rows) {
          if (!row.code) continue
          const releaseDate = row.date ? row.date : new Date(maxDate + DAY_MS)
          allRows.push({
            set_code: row.code,
            release_date: releaseDate.toISOString(),
            region_release: region,
          })
        }
      }
    } catch (err) {
      console.error(`Error reading ${path}:`, err)
    }
  }

  if (!allRows.length) {
    return NextResponse.json({ error: 'No data parsed' }, { status: 400 })
  }

  // Deduplicate by set_code (keep last one per code, prioritize occidental)
  const deduped = new Map<string, (typeof allRows)[0]>()
  allRows.forEach(row => {
    const existing = deduped.get(row.set_code)
    if (!existing || row.region_release === 'occidental') {
      deduped.set(row.set_code, row)
    }
  })
  const uniqueRows = Array.from(deduped.values())

  // Upsert data
  try {
    const { error } = await supabase
      .from('release_dates')
      .upsert(uniqueRows, { onConflict: 'set_code' })
    if (error) throw error
    return NextResponse.json({ success: true, rows_loaded: uniqueRows.length })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
