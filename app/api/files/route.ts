import { NextResponse } from 'next/server'
import { getSupabase } from '../../../../src/lib/supabase'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  try {
    const supabase = getSupabase()
    const { data, error } = await supabase.from('documents').select('*').order('created_at', { ascending: false })
    if (error) {
      console.error(error)
      return NextResponse.json({ success: false, error: 'db error' }, { status: 500 })
    }
    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error(err)
    return NextResponse.json({ success: false, error: err?.message ?? 'unknown' }, { status: 500 })
  }
}
