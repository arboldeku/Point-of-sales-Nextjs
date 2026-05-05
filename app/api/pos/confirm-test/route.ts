import { createServerClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

// Test-mode confirm — writes to scan_events_test only.
// Does NOT touch inventory_current, sales_physical, or fifo_ledger_events.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { session_id, pin, discount_eur = 0, payment_method = 'efectivo' } = body

    const correctPin = process.env.POS_CONFIRM_PIN
    if (!correctPin || pin !== correctPin) {
      return NextResponse.json({ error: 'PIN incorrecto' }, { status: 401 })
    }

    const supabase = createServerClient()

    if (discount_eur > 0) {
      const { data: items } = await supabase
        .from('scan_events_test')
        .select('sale_event_id, gross_amount')
        .eq('session_id', session_id)
        .eq('status', 'pending')
        .order('sale_ts', { ascending: false })
        .limit(1)

      if (items && items.length > 0) {
        const last = items[0]
        await supabase
          .from('scan_events_test')
          .update({
            discount_eur,
            gross_amount: Math.max(0, last.gross_amount - discount_eur),
            payment_method,
          })
          .eq('sale_event_id', last.sale_event_id)
      }
    }

    await supabase
      .from('scan_events_test')
      .update({ payment_method, status: 'confirmed' })
      .eq('session_id', session_id)
      .eq('status', 'pending')

    return NextResponse.json({ success: true, test_mode: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
