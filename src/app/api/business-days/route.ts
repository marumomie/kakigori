import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const db = getSupabaseAdmin()
  const { searchParams } = new URL(req.url)
  const year = searchParams.get('year')
  const month = searchParams.get('month')

  let query = db.from('business_days').select('date').order('date')
  if (year && month) {
    const from = `${year}-${String(month).padStart(2,'0')}-01`
    const to = `${year}-${String(Number(month)+1).padStart(2,'0')}-01`
    query = query.gte('date', from).lt('date', to)
  }
  const { data, error } = await query
  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ dates: data?.map(d => d.date) || [] })
}

export async function POST(req: NextRequest) {
  const adminPin = req.headers.get('x-admin-pin')
  if (adminPin !== process.env.ADMIN_PIN) {
    return NextResponse.json({ error: '認証エラー' }, { status: 401 })
  }
  const db = getSupabaseAdmin()
  const { date, open } = await req.json()

  if (open) {
    const { error } = await db.from('business_days').upsert({ date }, { onConflict: 'date' })
    if (error) return NextResponse.json({ error }, { status: 500 })
  } else {
    const { error } = await db.from('business_days').delete().eq('date', date)
    if (error) return NextResponse.json({ error }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
