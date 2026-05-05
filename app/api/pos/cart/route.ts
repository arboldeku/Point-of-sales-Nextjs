import { createServerClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { _test_mode, ...row } = body
    const table = _test_mode ? 'scan_events_test' : 'scan_events'
    const supabase = createServerClient()

    const { error } = await supabase.from(table).insert([row])
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { sale_event_id, qty, _test_mode } = body
    const table = _test_mode ? 'scan_events_test' : 'scan_events'
    const supabase = createServerClient()

    const { error } = await supabase
      .from(table)
      .update({ qty, gross_amount: qty * (body.unit_price || 0) })
      .eq('sale_event_id', sale_event_id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json()
    const { sale_event_id, _test_mode } = body
    const table = _test_mode ? 'scan_events_test' : 'scan_events'
    const supabase = createServerClient()

    const { error } = await supabase
      .from(table)
      .delete()
      .eq('sale_event_id', sale_event_id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
