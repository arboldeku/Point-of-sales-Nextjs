import { createServerClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { logAudit, hasPermission } from '@/lib/permissions'
import { v4 as uuidv4 } from 'uuid'

const PRISMA_START  = new Date('2026-01-20T00:00:00Z')
const PRISMA2_START = new Date('2026-03-31T00:00:00Z')

function calcEra(date: Date): string {
  if (date >= PRISMA2_START) return 'PRISMA_2'
  if (date >= PRISMA_START)  return 'PRISMA'
  return 'LEGACY'
}

function cardmarketIdFromSku(sku: string): string {
  const parts = sku.split('-')
  return parts.slice(0, -1).join('-')
}

// Distribute session discount proportionally across items.
// Last item absorbs rounding remainder so totals always add up.
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

export async function POST(req: NextRequest) {
  try {
    // Extract and validate JWT token
    const token = req.headers.get('authorization')?.slice(7)
    if (!token) {
      return NextResponse.json(
        { error: 'Token no proporcionado', allowed: false },
        { status: 401 }
      )
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json(
        { error: 'Token inválido', allowed: false },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { session_id, pin, discount_eur = 0, payment_method = 'efectivo' } = body

    const userId = payload.userId
    const userRole = payload.role as 'Admin' | 'Member' | 'User'
    const ipAddress = req.headers.get('x-forwarded-for') || 'unknown'

    // Check SELL_PRODUCT permission
    const canSell = await hasPermission(userRole, 'SELL_PRODUCT')
    if (!canSell) {
      await logAudit(
        userId,
        'SELL_PRODUCT',
        'Transaction',
        null,
        'DENIED',
        { action: 'attempted_confirm_sale', session_id },
        ipAddress
      )
      return NextResponse.json(
        { error: 'No tienes permiso para confirmar ventas', allowed: false },
        { status: 403 }
      )
    }

    const correctPin = process.env.POS_CONFIRM_PIN
    if (!correctPin || pin !== correctPin) {
      return NextResponse.json({ error: 'PIN incorrecto' }, { status: 401 })
    }

    const supabase = createServerClient()

    // Snapshot pending items first (needed for discount + fan-out)
    const { data: pendingItems, error: fetchError } = await supabase
      .from('scan_events')
      .select('*')
      .eq('session_id', session_id)
      .eq('status', 'pending')

    if (fetchError) throw fetchError
    if (!pendingItems || pendingItems.length === 0) {
      return NextResponse.json({ error: 'Carrito vacío' }, { status: 400 })
    }

    // Apply proportional discount across all items
    if (discount_eur > 0) {
      const shares = distributeDiscount(
        pendingItems.map(i => ({ sale_event_id: i.sale_event_id, gross_amount: i.gross_amount })),
        discount_eur
      )
      await Promise.all(shares.map(s =>
        supabase.from('scan_events')
          .update({ discount_eur: s.discount_eur, gross_amount: s.gross_amount })
          .eq('sale_event_id', s.sale_event_id)
      ))
      // Reflect discount in local snapshot for fan-out below
      shares.forEach(s => {
        const item = pendingItems.find(i => i.sale_event_id === s.sale_event_id)
        if (item) { item.discount_eur = s.discount_eur; item.gross_amount = s.gross_amount }
      })
    }

    // Set payment_method and user_id on all pending items
    await supabase
      .from('scan_events')
      .update({ payment_method, user_id: userId })
      .eq('session_id', session_id)
      .eq('status', 'pending')

    // Atomic: mark confirmed + decrement inventory_current
    const { data, error } = await supabase.rpc('confirm_cart_and_update_inventory', {
      p_session_id: session_id,
    })
    if (error) throw error

    // Fan out to sales_physical + fifo_ledger_events (OUT)
    const saleDate = new Date()
    const era = calcEra(saleDate)

    const salesPhysical = pendingItems.map(item => ({
      internal_sku: item.internal_sku,
      cardmarket_id: cardmarketIdFromSku(item.internal_sku),
      cardmarket_id_clean: cardmarketIdFromSku(item.internal_sku),
      id_type: 'internal_sku',
      qty: item.qty,
      sale_price: item.gross_amount,  // effective price after discount
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

    // FIFO OUT — unit_cost/cogs_quality/lot_id assigned by gold pipeline
    const fifoEvents = pendingItems.map(item => ({
      event_id: uuidv4(),
      event_type: 'OUT',
      internal_sku: item.internal_sku,
      cardmarket_id: cardmarketIdFromSku(item.internal_sku),
      qty: item.qty,
      unit_cost: null,
      sale_price: item.gross_amount,
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

    // Release all locks for this session
    await supabase.from('cart_locks').delete().eq('session_id', session_id)

    // Log successful sale
    await logAudit(
      userId,
      'SELL_PRODUCT',
      'Transaction',
      null,
      'ALLOWED',
      { action: 'sale_confirmed', session_id, items_count: pendingItems.length, discount: discount_eur },
      ipAddress
    )

    return NextResponse.json({ success: true, result: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
