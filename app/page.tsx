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
  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'bot'; text: string; sources?: any[] }>>([])
  const [query, setQuery] = useState('')

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
        // Refresh immediately and a couple times after to handle async processing delays
        fetchFiles()
        setTimeout(fetchFiles, 1500)
        setTimeout(fetchFiles, 4000)
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
    <main style={{ fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial', padding: 24, background: '#f5f7fb', minHeight: '100vh' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '360px 1fr', gap: 20 }}>
        <div style={{ background: '#fff', borderRadius: 8, padding: 16, boxShadow: '0 6px 18px rgba(20,30,60,0.08)' }}>
          <h2 style={{ marginTop: 0 }}>上傳 / 檔案管理</h2>
          <p style={{ color: '#666', fontSize: 13 }}>只接受 .txt / .md，系統會自動分段並建立向量。</p>

          <form onSubmit={handleUpload} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
            <input style={{ flex: 1 }} type="file" accept=".txt,.md,text/plain,text/markdown" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <button type="submit" disabled={loading} style={{ padding: '8px 12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6 }}>上傳</button>
          </form>
          {message && <div style={{ marginBottom: 12, color: '#333' }}>{message}</div>}

          <div style={{ marginTop: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: '6px 0' }}>已上傳</h3>
              <button onClick={fetchFiles} style={{ background: 'transparent', border: 'none', color: '#2563eb', cursor: 'pointer' }}>重新整理</button>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {docs.map((d) => (
                <li key={d.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{d.filename}</div>
                    <div style={{ fontSize: 12, color: '#666' }}>{d.size ?? '-'} bytes</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button onClick={() => handleDelete(d.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}>刪除</button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: 8, padding: 16, boxShadow: '0 6px 18px rgba(20,30,60,0.06)', display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ marginTop: 0 }}>問答聊天 (RAG)</h2>
          <div style={{ color: '#666', fontSize: 13, marginBottom: 12 }}>在下方輸入你的問題，系統會以已上傳文件為知識來源回答。</div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ flex: 1, overflowY: 'auto', padding: 8, border: '1px solid #f0f0f0', borderRadius: 6, minHeight: 220 }}>
              {/** Messages */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* initial hint */}
                <div style={{ fontSize: 13, color: '#888' }}>示例：請問檔案中提到的重點是什麼？</div>
                {/** Render conversation messages if any (we store in state) */}
                {messages.map((m, idx) => (
                  <div key={idx} style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 13, color: m.sender === 'user' ? '#0f172a' : '#064e3b', fontWeight: 600 }}>{m.sender === 'user' ? '你' : '系統'}</div>
                    <div style={{ whiteSpace: 'pre-wrap', marginTop: 4 }}>{m.text}</div>
                    {m.sources && m.sources.length > 0 && (
                      <div style={{ marginTop: 6, fontSize: 12, color: '#555' }}>
                        來源：{m.sources.map((s: any, i: number) => <span key={i}>doc {s.document_id} chunk {s.chunk_index}{i < m.sources.length - 1 ? ' · ' : ''}</span>)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault()
              if (!query.trim()) return
              const userMessage = query.trim()
              setMessages((m) => [...m, { sender: 'user', text: userMessage }])
              setQuery('')
              setLoading(true)
              try {
                const res = await fetch('/api/query', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: userMessage, top_k: 5 }) })
                const j = await res.json()
                if (!j.success) {
                  setMessages((m) => [...m, { sender: 'bot', text: '查詢失敗：' + (j.error || 'unknown') }])
                } else {
                  const ans = j.data?.answer ?? JSON.stringify(j.data)
                  const src = j.data?.sources ?? []
                  setMessages((m) => [...m, { sender: 'bot', text: ans, sources: src }])
                }
              } catch (err: any) {
                setMessages((m) => [...m, { sender: 'bot', text: '系統錯誤：' + (err?.message || 'unknown') }])
              } finally {
                setLoading(false)
              }
            }} style={{ display: 'flex', gap: 8 }}>
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="請在此輸入問題..." style={{ flex: 1, padding: '10px 12px', borderRadius: 6, border: '1px solid #e6e6e6' }} />
              <button type="submit" disabled={loading} style={{ padding: '10px 14px', background: '#10b981', border: 'none', color: '#fff', borderRadius: 6 }}>{loading ? '等待中...' : '送出'}</button>
            </form>

            <div style={{ marginTop: 8 }}>
              <h4 style={{ margin: '6px 0' }}>對話歷史</h4>
              <div style={{ maxHeight: 200, overflowY: 'auto', background: '#fafafa', padding: 8, borderRadius: 6 }}>
                {messages.length === 0 && <div style={{ color: '#888', fontSize: 13 }}>尚無對話，先問個問題吧！</div>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
