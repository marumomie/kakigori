import { createClient } from '@supabase/supabase-js'

export function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export const supabase = { get: getSupabase }
export const supabaseAdmin = { get: getSupabaseAdmin }

export type Reservation = {
  id: string
  reservation_number: string
  date: string
  time: string
  slot_type: 2 | 4
  name: string
  email?: string
  cancelled: boolean
  created_at: string
}

export type SlotSetting = {
  id: string
  time: string
  slot_type: 2 | 4
  capacity: number
}
