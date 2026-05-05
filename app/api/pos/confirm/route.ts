import { createServerClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { session_id, pin, discount_eur = 0, payment_method = 'cash' } = body

    // Validate PIN — never exposed to browser
    const correctPin = process.env.POS_CONFIRM_PIN
    if (!correctPin || pin !== correctPin) {
      return NextResponse.json({ error: 'PIN incorrecto' }, { status: 401 })
    }

    const supabase = createServerClient()

    // Apply discount to last item if any (distribute on gross_amount)
    if (discount_eur > 0) {
      const { data: items } = await supabase
        .from('scan_events')
        .select('sale_event_id, gross_amount')
        .eq('session_id', session_id)
        .eq('status', 'pending')
        .order('sale_ts', { ascending: false })
        .limit(1)

      if (items && items.length > 0) {
        const last = items[0]
        await supabase
          .from('scan_events')
          .update({
            discount_eur,
            gross_amount: Math.max(0, last.gross_amount - discount_eur),
            payment_method,
          })
          .eq('sale_event_id', last.sale_event_id)
      }
    }

    // Update payment_method on all items in session
    await supabase
      .from('scan_events')
      .update({ payment_method })
      .eq('session_id', session_id)
      .eq('status', 'pending')

    // Atomic: confirm sale + decrement inventory + delete zero-qty rows
    const { data, error } = await supabase.rpc('confirm_cart_and_update_inventory', {
      p_session_id: session_id,
    })

    if (error) throw error

    return NextResponse.json({ success: true, result: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
