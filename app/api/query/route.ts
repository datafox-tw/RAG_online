import { NextResponse } from 'next/server'
import { searchAndAnswer } from '../../../src/lib/rag'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const query = body?.query
    const top_k = Number(body?.top_k || 5)
    if (!query) return NextResponse.json({ success: false, error: 'query required' }, { status: 400 })

    const result = await searchAndAnswer(query, top_k)
    return NextResponse.json({ success: true, data: result })
  } catch (err: any) {
    console.error(err)
    return NextResponse.json({ success: false, error: err?.message ?? 'unknown' }, { status: 500 })
  }
}
