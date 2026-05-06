import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET() {
  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
    const { data, error } = await supabase
      .from('release_dates')
      .select('set_code, release_date')

    if (error) throw error

    const result: Record<string, number> = {}
    if (data) {
      data.forEach((row: any) => {
        const ts = new Date(row.release_date).getTime()
        result[row.set_code] = ts
      })
    }
    return NextResponse.json(result)
  } catch (err: any) {
    console.error('Error fetching release dates:', err)
    return NextResponse.json({})
  }
}
