import { NextResponse } from 'next/server'
import fs from 'fs'

const DRIVE_PATHS = [
  'G:\\La meva unitat\\PrismaLake_v2\\Pokemon\\reference\\Release dates.csv',
  'G:\\La meva unitat\\PrismaLake_v2\\Pokemon\\reference\\Release dates jp.csv',
]

function parseDate(s: string): number | null {
  if (!s) return null
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (iso) {
    const d = new Date(`${iso[1]}-${iso[2]}-${iso[3]}`)
    return isNaN(d.getTime()) ? null : d.getTime()
  }
  // "DD MMM YY" or "DD MMM YYYY"  e.g. "30 Jan 26" or "30 Jan 2026"
  const dmy = s.match(/^(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{2,4})$/)
  if (dmy) {
    const year = dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3]
    const d = new Date(`${dmy[2]} ${dmy[1]} ${year}`)
    return isNaN(d.getTime()) ? null : d.getTime()
  }
  return null
}

const DAY_MS = 24 * 60 * 60 * 1000

export async function GET() {
  const result: Record<string, number> = {}

  for (const fpath of DRIVE_PATHS) {
    try {
      const content = fs.readFileSync(fpath, 'latin1')
      const lines = content.split('\n')

      // Parse into blocks.
      // Block header = row where parts[0].trim() === parts[1].trim() (same text repeated)
      type Row = { code: string; ts: number | null }
      type Block = { rows: Row[] }
      const blocks: Block[] = [{ rows: [] }]  // start with a header block

      for (const raw of lines) {
        const parts = raw.split(';').map(p => p.trim())
        if (!parts[0]) continue

        // Detect block header (e.g. "Mega;Mega;Mega;Mega;Mega")
        if (parts.length >= 2 && parts[1] && parts[0] === parts[1]) {
          blocks.push({ rows: [] })
          continue
        }

        // Extract code (last word of first column) and date (second column)
        const words = parts[0].split(/\s+/)
        const code = words[words.length - 1].toUpperCase()
        if (!code || code.length < 2) continue
        const ts = parseDate(parts[1] ?? '')
        blocks[blocks.length - 1].rows.push({ code, ts })
      }

      // For each block: sets with dates use their date;
      // promo sets (no date) get max_date_in_block + 1 day
      for (const block of blocks) {
        const datesInBlock = block.rows
          .map(r => r.ts)
          .filter((d): d is number => d !== null)
        if (!datesInBlock.length) continue
        const maxDate = Math.max(...datesInBlock)
        const promoDate = maxDate + DAY_MS

        for (const row of block.rows) {
          if (!row.code) continue
          result[row.code] = row.ts !== null ? row.ts : promoDate
        }
      }
    } catch {
      // Drive not mounted or file not found — skip silently
    }
  }

  return NextResponse.json(result)
}
