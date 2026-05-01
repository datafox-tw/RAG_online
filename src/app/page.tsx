"use client"

import React, { useState, useEffect } from 'react'

type Doc = {
  id: number
  filename: string
  mime_type?: string
  size?: number
  storage_path?: string
  created_at?: string
}

export default function Page() {
  const [file, setFile] = useState<File | null>(null)
  const [docs, setDocs] = useState<Doc[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    fetchFiles()
  }, [])

  async function fetchFiles() {
    const res = await fetch('/api/files')
    const json = await res.json()
    if (json?.success) setDocs(json.data)
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return setMessage('請選擇檔案')
    setLoading(true)
    setMessage(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const r = await fetch('/api/upload', { method: 'POST', body: fd })
      const j = await r.json()
      if (!j.success) {
        setMessage('上傳失敗: ' + (j.error || 'unknown'))
      } else {
        setMessage('上傳成功，開始處理...')
        await fetch('/api/process', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ document_id: j.data.id }) })
        setMessage('處理完成')
        fetchFiles()
      }
    } catch (err: any) {
      setMessage('錯誤: ' + err?.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('確定要刪除此檔案？')) return
    const r = await fetch(`/api/files/${id}`, { method: 'DELETE' })
    const j = await r.json()
    if (j?.success) fetchFiles()
    else setMessage('刪除失敗: ' + (j?.error || 'unknown'))
  }

  return (
    <main style={{ padding: 24, fontFamily: 'Inter, sans-serif' }}>
      <h1>RAG Demo (Next.js + Supabase + Gemini)</h1>
      <p>請先在 <strong>.env.local</strong> 填入設定，並在 Supabase 建立資料表後再上傳檔案。</p>

      <section style={{ marginTop: 24 }}>
        <h2>上傳檔案</h2>
        <form onSubmit={handleUpload}>
          <input type="file" accept=".txt,.md,text/plain,text/markdown" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <button type="submit" disabled={loading} style={{ marginLeft: 8 }}>上傳並處理</button>
        </form>
        {message && <p>{message}</p>}
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>已上傳檔案</h2>
        <button onClick={fetchFiles}>重新整理</button>
        <ul>
          {docs.map((d) => (
            <li key={d.id} style={{ marginTop: 8 }}>
              <strong>{d.filename}</strong> {' '}
              <small>({d.size ?? '-'} bytes)</small>
              <div>
                <button onClick={() => handleDelete(d.id)} style={{ color: 'red' }}>刪除</button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
