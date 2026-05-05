import { createServerClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const supabase = createServerClient()

    const { error } = await supabase
      .from('scan_events')
      .insert([body])

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { sale_event_id, qty } = body
    const supabase = createServerClient()

    const { error } = await supabase
      .from('scan_events')
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
    const { sale_event_id } = body
    const supabase = createServerClient()

    const { error } = await supabase
      .from('scan_events')
      .delete()
      .eq('sale_event_id', sale_event_id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
