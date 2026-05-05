import { createServerClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

async function upsertLock(supabase: ReturnType<typeof createServerClient>, internal_sku: string, session_id: string, qty: number) {
  await supabase.from('cart_locks').upsert(
    { internal_sku, session_id, qty, expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() },
    { onConflict: 'internal_sku,session_id' }
  )
}

async function deleteLock(supabase: ReturnType<typeof createServerClient>, internal_sku: string, session_id: string) {
  await supabase.from('cart_locks').delete()
    .eq('internal_sku', internal_sku)
    .eq('session_id', session_id)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { _test_mode, ...row } = body
    const table = _test_mode ? 'scan_events_test' : 'scan_events'
    const supabase = createServerClient()

    const { error } = await supabase.from(table).insert([row])
    if (error) throw error

    // Lock this SKU for this session (test mode skips locks)
    if (!_test_mode && row.internal_sku && row.session_id) {
      await upsertLock(supabase, row.internal_sku, row.session_id, row.qty ?? 1)
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { sale_event_id, qty, internal_sku, session_id, _test_mode } = body
    const table = _test_mode ? 'scan_events_test' : 'scan_events'
    const supabase = createServerClient()

    const { error } = await supabase
      .from(table)
      .update({ qty, gross_amount: qty * (body.unit_price || 0) })
      .eq('sale_event_id', sale_event_id)

    if (error) throw error

    // Update lock qty to match new cart qty
    if (!_test_mode && internal_sku && session_id) {
      await upsertLock(supabase, internal_sku, session_id, qty)
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json()
    const { sale_event_id, internal_sku, session_id, _test_mode } = body
    const table = _test_mode ? 'scan_events_test' : 'scan_events'
    const supabase = createServerClient()

    const { error } = await supabase
      .from(table)
      .delete()
      .eq('sale_event_id', sale_event_id)

    if (error) throw error

    // Release lock when item removed from cart
    if (!_test_mode && internal_sku && session_id) {
      await deleteLock(supabase, internal_sku, session_id)
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
