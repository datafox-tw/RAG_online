import { NextResponse } from 'next/server'
import { getSupabase } from '../../../src/lib/supabase'
import { chunkText } from '../../../src/lib/pdf'
import { generateEmbedding, EMBEDDING_DIMENSIONS } from '../../../src/lib/genai'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const documentId = body?.document_id
    if (!documentId) return NextResponse.json({ success: false, error: 'document_id required' }, { status: 400 })

    // fetch document metadata
    const supabase = getSupabase()
    const { data: docs, error: docErr } = await supabase.from('documents').select('*').eq('id', documentId).limit(1)
    if (docErr) {
      console.error(docErr)
      return NextResponse.json({ success: false, error: 'db error fetching document' }, { status: 500 })
    }
    const doc = docs?.[0]
    if (!doc) return NextResponse.json({ success: false, error: 'document not found' }, { status: 404 })

    if (!doc.storage_path) return NextResponse.json({ success: false, error: 'no storage_path for document' }, { status: 400 })

    const bucket = process.env.SUPABASE_STORAGE_BUCKET
    if (!bucket) return NextResponse.json({ success: false, error: 'SUPABASE_STORAGE_BUCKET not set' }, { status: 500 })

    const { data: fileData, error: downloadErr } = await supabase.storage.from(bucket).download(doc.storage_path)
    if (downloadErr || !fileData) {
      console.error('downloadErr', downloadErr)
      return NextResponse.json({ success: false, error: 'file download failed' }, { status: 500 })
    }

    const buffer = await fileData.arrayBuffer()
    const text = new TextDecoder('utf-8').decode(buffer)
    if (!text.trim()) {
      return NextResponse.json({ success: false, error: 'uploaded file is empty or not valid utf-8 text' }, { status: 400 })
    }

    const chunks = chunkText(text)

    let inserted = 0
    for (let i = 0; i < chunks.length; i++) {
      const c = chunks[i]
      const emb = await generateEmbedding(c.text, 'RETRIEVAL_DOCUMENT')
      if (!emb) continue
      const { error: insErr } = await supabase.from('chunks').insert([
        {
          document_id: documentId,
          chunk_index: i,
          text: c.text,
          start_offset: c.start,
          end_offset: c.end,
          embedding: emb,
          metadata: { source: doc.filename },
        },
      ])
      if (!insErr) inserted++
    }

    return NextResponse.json({ success: true, data: { document_id: documentId, chunks_indexed: inserted } })
  } catch (err: any) {
    console.error(err)
    return NextResponse.json({ success: false, error: err?.message ?? 'unknown' }, { status: 500 })
  }
}
