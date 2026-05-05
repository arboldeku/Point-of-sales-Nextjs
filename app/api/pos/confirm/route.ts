import { createServerClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'

const PRISMA_START = new Date('2026-01-20T00:00:00Z')
const PRISMA2_START = new Date('2026-03-31T00:00:00Z')

function calcEra(date: Date): string {
  if (date >= PRISMA2_START) return 'PRISMA_2'
  if (date >= PRISMA_START) return 'PRISMA'
  return 'LEGACY'
}

// internal_sku = {cardmarket_id}-{4-digit-suffix} — extract everything before the last segment
function cardmarketIdFromSku(sku: string): string {
  const parts = sku.split('-')
  return parts.slice(0, -1).join('-')
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { session_id, pin, discount_eur = 0, payment_method = 'efectivo' } = body

    const correctPin = process.env.POS_CONFIRM_PIN
    if (!correctPin || pin !== correctPin) {
      return NextResponse.json({ error: 'PIN incorrecto' }, { status: 401 })
    }

    const supabase = createServerClient()

    // Apply discount to last item if any
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

    await supabase
      .from('scan_events')
      .update({ payment_method })
      .eq('session_id', session_id)
      .eq('status', 'pending')

    // Snapshot pending items before the atomic confirm
    const { data: pendingItems, error: fetchError } = await supabase
      .from('scan_events')
      .select('*')
      .eq('session_id', session_id)
      .eq('status', 'pending')

    if (fetchError) throw fetchError

    // Atomic: mark confirmed + decrement inventory_current
    const { data, error } = await supabase.rpc('confirm_cart_and_update_inventory', {
      p_session_id: session_id,
    })
    if (error) throw error

    // Fan out to sales_physical + fifo_ledger_events
    if (pendingItems && pendingItems.length > 0) {
      const saleDate = new Date()
      const era = calcEra(saleDate)

      const salesPhysical = pendingItems.map(item => ({
        internal_sku: item.internal_sku,
        cardmarket_id: cardmarketIdFromSku(item.internal_sku),
        cardmarket_id_clean: cardmarketIdFromSku(item.internal_sku),
        id_type: 'internal_sku',
        qty: item.qty,
        sale_price: item.unit_price,
        sale_date: saleDate.toISOString(),
        sale_channel: item.channel || 'Iberian',
        era,
        source_system: 'pos_web',
        data_quality: 'clean_official',
        variant_resolution: 'level_a',
        source_file: `pos_web_${session_id}`,
        ingest_batch_id: session_id,
        sale_type: item.sale_type || 'venta',
        trade_amount: item.trade_amount ?? null,
        game: 'pokemon',
      }))

      // FIFO OUT events — unit_cost / cogs_quality / lot_id assigned by gold pipeline
      const fifoEvents = pendingItems.map(item => ({
        event_id: uuidv4(),
        event_type: 'OUT',
        internal_sku: item.internal_sku,
        cardmarket_id: cardmarketIdFromSku(item.internal_sku),
        qty: item.qty,
        unit_cost: null,
        sale_price: item.unit_price,
        event_date: saleDate.toISOString(),
        event_date_type: 'official_sale',
        era,
        fifo_level: 'A',
        cogs_quality: null,
        data_quality: 'clean_official',
        source_system: 'pos_web',
        lot_id: null,
        sale_type: item.sale_type || 'venta',
        game: 'pokemon',
      }))

      const [spResult, fifoResult] = await Promise.all([
        supabase.from('sales_physical').insert(salesPhysical),
        supabase.from('fifo_ledger_events').insert(fifoEvents),
      ])

      if (spResult.error) throw spResult.error
      if (fifoResult.error) throw fifoResult.error
    }

    // NOTE: sales_cm is written separately via CardmarketTab when a CM order
    // is confirmed as delivered at the event (different endpoint, different flow)

    return NextResponse.json({ success: true, result: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
