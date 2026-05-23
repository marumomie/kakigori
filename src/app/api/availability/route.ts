import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const db = getSupabaseAdmin()
  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')
  if (!date) return NextResponse.json({ error: '日付が必要です' }, { status: 400 })

  const [{ data: reservations }, { data: settings }] = await Promise.all([
    db.from('reservations').select('time, slot_type').eq('date', date).eq('cancelled', false),
    db.from('slot_settings').select('time, slot_type, capacity'),
  ])

  const availability: Record<string, { booked: number; capacity: number }> = {}
  settings?.forEach(s => {
    availability[`${s.time}_${s.slot_type}`] = { booked: 0, capacity: s.capacity }
  })
  reservations?.forEach(r => {
    const key = `${r.time}_${r.slot_type}`
    if (availability[key]) availability[key].booked++
  })

  return NextResponse.json({ availability })
}
