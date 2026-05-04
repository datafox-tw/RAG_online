import { NextResponse } from 'next/server'
import { getSupabase } from '../../../src/lib/supabase'

export const runtime = 'nodejs'

function isAllowedTextFile(file: File) {
  const name = file.name.toLowerCase()
  const allowedName = name.endsWith('.txt') || name.endsWith('.md')
  return allowedName
}

export async function POST(req: Request) {
  try {
    const form = await req.formData()
    const file = form.get('file') as File | null
    if (!file) {
      return NextResponse.json({ success: false, error: 'no file provided' }, { status: 400 })
    }

    if (!isAllowedTextFile(file)) {
      return NextResponse.json({ success: false, error: 'only .txt or .md files are allowed' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const bucket = process.env.SUPABASE_STORAGE_BUCKET
    let storagePath = null
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY && bucket) {
      const filename = `${Date.now()}-${file.name}`
      const supabase = getSupabase()
      const { error: uploadErr } = await supabase.storage.from(bucket).upload(filename, buffer, {
        contentType: file.type,
      })
      if (uploadErr) {
        console.error('uploadErr', uploadErr)
        return NextResponse.json({ success: false, error: 'storage upload failed' }, { status: 500 })
      }
      storagePath = filename
    }

    // insert document metadata
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = getSupabase()
      const { data, error } = await supabase.from('documents').insert([
        {
          filename: file.name,
          mime_type: file.type,
          size: buffer.length,
          storage_path: storagePath,
        },
      ]).select().limit(1)

      if (error) {
        console.error('db insert err', error)
        return NextResponse.json({ success: false, error: 'db insert failed' }, { status: 500 })
      }

      return NextResponse.json({ success: true, data: data?.[0] })
    }

    return NextResponse.json({ success: false, error: 'Supabase not configured on server' }, { status: 500 })
  } catch (err: any) {
    console.error(err)
    return NextResponse.json({ success: false, error: err?.message ?? 'unknown' }, { status: 500 })
  }
}
