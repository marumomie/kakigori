import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const db = getSupabaseAdmin()
  const { data, error } = await db.from('slot_settings').select('*').order('time')
  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ settings: data })
}

export async function POST(req: NextRequest) {
  const adminPin = req.headers.get('x-admin-pin')
  if (adminPin !== process.env.ADMIN_PIN) {
    return NextResponse.json({ error: '認証エラー' }, { status: 401 })
  }
  const db = getSupabaseAdmin()
  const { time, slotType, capacity } = await req.json()
  const { data, error } = await db
    .from('slot_settings')
    .update({ capacity })
    .eq('time', time)
    .eq('slot_type', slotType)
    .select()
    .single()
  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ setting: data })
}
