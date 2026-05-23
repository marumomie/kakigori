import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { sendCancellationEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const db = getSupabaseAdmin()
    const { reservationNumber } = await req.json()
    if (!reservationNumber) return NextResponse.json({ error: '予約番号が必要です' }, { status: 400 })

    const { data: reservation, error: findErr } = await db
      .from('reservations')
      .select('*')
      .eq('reservation_number', reservationNumber.trim().toUpperCase())
      .eq('cancelled', false)
      .single()

    if (findErr || !reservation) return NextResponse.json({ error: '予約が見つかりません' }, { status: 404 })

    const { error } = await db.from('reservations').update({ cancelled: true }).eq('id', reservation.id)
    if (error) throw error

    if (reservation.email) {
      sendCancellationEmail(reservation.email, {
        name: reservation.name,
        date: reservation.date,
        time: reservation.time,
        reservationNumber: reservation.reservation_number,
      }).catch(console.error)
    }

    return NextResponse.json({ success: true, reservation })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}
