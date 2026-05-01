import { NextResponse } from 'next/server'
import { getSupabase } from '../../../../../src/lib/supabase'

export const runtime = 'nodejs'

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id)
    if (!id) return NextResponse.json({ success: false, error: 'invalid id' }, { status: 400 })

    // fetch doc
    const supabase = getSupabase()
    const { data: docs, error: docErr } = await supabase.from('documents').select('*').eq('id', id).limit(1)
    if (docErr) {
      console.error(docErr)
      return NextResponse.json({ success: false, error: 'db error' }, { status: 500 })
    }
    const doc = docs?.[0]
    if (!doc) return NextResponse.json({ success: false, error: 'not found' }, { status: 404 })

    // delete chunks
    const { error: delChunksErr } = await supabase.from('chunks').delete().eq('document_id', id)
    if (delChunksErr) console.warn('delete chunks err', delChunksErr)

    // delete file from storage if exists
    const bucket = process.env.SUPABASE_STORAGE_BUCKET
    if (bucket && doc.storage_path) {
      const { error: delObjErr } = await supabase.storage.from(bucket).remove([doc.storage_path])
      if (delObjErr) console.warn('storage remove err', delObjErr)
    }

    // delete document metadata
    const { error: delDocErr } = await supabase.from('documents').delete().eq('id', id)
    if (delDocErr) {
      console.error(delDocErr)
      return NextResponse.json({ success: false, error: 'delete failed' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error(err)
    return NextResponse.json({ success: false, error: err?.message ?? 'unknown' }, { status: 500 })
  }
}
