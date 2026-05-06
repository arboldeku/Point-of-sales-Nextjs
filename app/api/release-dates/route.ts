import { NextResponse } from 'next/server'
import fs from 'fs'

const DRIVE_PATHS = [
  'G:\\La meva unitat\\PrismaLake_v2\\Pokemon\\reference\\Release dates.csv',
  'G:\\La meva unitat\\PrismaLake_v2\\Pokemon\\reference\\Release dates jp.csv',
]

function parseDate(s: string): number | null {
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (iso) {
    const d = new Date(`${iso[1]}-${iso[2]}-${iso[3]}`)
    return isNaN(d.getTime()) ? null : d.getTime()
  }
  // "18 Nov 16" or "18 Nov 2016"
  const dmy = s.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{2,4})$/)
  if (dmy) {
    const year = dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3]
    const d = new Date(`${dmy[2]} ${dmy[1]} ${year}`)
    return isNaN(d.getTime()) ? null : d.getTime()
  }
  return null
}

export async function GET() {
  const result: Record<string, number> = {}

  for (const fpath of DRIVE_PATHS) {
    try {
      const content = fs.readFileSync(fpath, 'latin1')
      for (const line of content.split('\n')) {
        const parts = line.split(';')
        if (parts.length < 2) continue
        const words = parts[0].trim().split(/\s+/)
        if (!words.length) continue
        const code = words[words.length - 1].toUpperCase()
        const ts = parseDate(parts[1].trim())
        if (code && ts != null) result[code] = ts
      }
    } catch {
      // file not available (production / Drive disconnected)
    }
  }

  return NextResponse.json(result)
}
