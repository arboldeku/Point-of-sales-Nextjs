import { createServerClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

function distributeDiscount(items: { sale_event_id: string; gross_amount: number }[], total_discount: number) {
  const totalGross = items.reduce((s, i) => s + i.gross_amount, 0)
  if (totalGross <= 0 || total_discount <= 0) return []
  let remaining = Math.min(total_discount, totalGross)
  return items.map((item, idx) => {
    const isLast = idx === items.length - 1
    const share = isLast
      ? remaining
      : Math.min(item.gross_amount, Math.round((total_discount * item.gross_amount / totalGross) * 100) / 100)
    remaining = Math.round((remaining - share) * 100) / 100
    return {
      sale_event_id: item.sale_event_id,
      discount_eur: share,
      gross_amount: Math.max(0, item.gross_amount - share),
    }
  })
}

// Test-mode confirm — writes to scan_events_test only.
// No inventory_current, no sales_physical, no fifo_ledger_events.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { session_id, pin, discount_eur = 0, payment_method = 'efectivo' } = body

    const correctPin = process.env.POS_CONFIRM_PIN
    if (!correctPin || pin !== correctPin) {
      return NextResponse.json({ error: 'PIN incorrecto' }, { status: 401 })
    }

    const supabase = createServerClient()

    const { data: pendingItems, error: fetchError } = await supabase
      .from('scan_events_test')
      .select('*')
      .eq('session_id', session_id)
      .eq('status', 'pending')

    if (fetchError) throw fetchError
    if (!pendingItems || pendingItems.length === 0) {
      return NextResponse.json({ error: 'Carrito vacío' }, { status: 400 })
    }

    // Proportional discount
    if (discount_eur > 0) {
      const shares = distributeDiscount(
        pendingItems.map(i => ({ sale_event_id: i.sale_event_id, gross_amount: i.gross_amount })),
        discount_eur
      )
      await Promise.all(shares.map(s =>
        supabase.from('scan_events_test')
          .update({ discount_eur: s.discount_eur, gross_amount: s.gross_amount })
          .eq('sale_event_id', s.sale_event_id)
      ))
    }

    await supabase
      .from('scan_events_test')
      .update({ payment_method, status: 'confirmed' })
      .eq('session_id', session_id)
      .eq('status', 'pending')

    // Test mode doesn't lock, but clean up just in case
    await supabase.from('cart_locks').delete().eq('session_id', session_id)

    return NextResponse.json({ success: true, test_mode: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
