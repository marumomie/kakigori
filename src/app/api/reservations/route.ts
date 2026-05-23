import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { sendConfirmationEmail, sendAdminNotification } from '@/lib/email'

function genNumber() { return 'K' + Math.floor(1000 + Math.random() * 9000) }

export async function POST(req: NextRequest) {
  try {
    const db = getSupabaseAdmin()
    const { date, time, slotType, name, email } = await req.json()
    if (!date || !time || !slotType || !name) {
      return NextResponse.json({ error: '必須項目が不足しています' }, { status: 400 })
    }

    const { data: existing } = await db
      .from('reservations').select('id').eq('date', date).eq('time', time).eq('slot_type', slotType).eq('cancelled', false)

    const { data: setting } = await db
      .from('slot_settings').select('capacity').eq('time', time).eq('slot_type', slotType).single()

    if ((existing?.length ?? 0) >= (setting?.capacity ?? 0)) {
      return NextResponse.json({ error: 'この時間枠は満席です' }, { status: 409 })
    }

    let reservationNumber = genNumber()
    for (let i = 0; i < 10; i++) {
      const { data: dup } = await db.from('reservations').select('id').eq('reservation_number', reservationNumber).single()
      if (!dup) break
      reservationNumber = genNumber()
    }

    const { data, error } = await db
      .from('reservations')
      .insert({ date, time, slot_type: slotType, name, email, reservation_number: reservationNumber })
      .select().single()

    if (error) throw error

    const emailData = { name, date, time, slotType, reservationNumber, email }
    Promise.all([
      email ? sendConfirmationEmail(email, emailData) : Promise.resolve(),
      sendAdminNotification(emailData),
    ]).catch(console.error)

    return NextResponse.json({ reservation: data })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const adminPin = req.headers.get('x-admin-pin')
  if (adminPin !== process.env.ADMIN_PIN) return NextResponse.json({ error: '認証エラー' }, { status: 401 })

  const db = getSupabaseAdmin()
  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')

  let query = db.from('reservations').select('*').eq('cancelled', false).order('date').order('time')
  if (date) query = query.eq('date', date)

  const { data, error } = await query
  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ reservations: data })
}
