import { getSupabase } from './supabase'
import { generateEmbedding, getAi } from './genai'

function dot(a: number[], b: number[]) {
  return a.reduce((s, v, i) => s + v * (b[i] ?? 0), 0)
}

function norm(a: number[]) {
  return Math.sqrt(a.reduce((s, v) => s + v * v, 0))
}

function cosineSim(a: number[], b: number[]) {
  const na = norm(a)
  const nb = norm(b)
  if (na === 0 || nb === 0) return 0
  return dot(a, b) / (na * nb)
}

export async function searchAndAnswer(query: string, top_k = 5) {
  if (!query) throw new Error('query required')
  const queryEmb = await generateEmbedding(query, 'RETRIEVAL_QUERY')
  if (!queryEmb) throw new Error('embedding failed')

  // fetch candidate chunks (limit to reasonable number)
  const supabase = getSupabase()
  const { data: chunks, error } = await supabase.from('chunks').select('id,document_id,chunk_index,text,metadata,embedding').limit(500)
  if (error) throw new Error('db error fetching chunks: ' + error.message)
  const items: any[] = chunks ?? []

  // compute similarity
  const scored = items
    .map((it) => ({
      ...it,
      score: Array.isArray(it.embedding) ? cosineSim(queryEmb as number[], it.embedding as number[]) : -1,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, top_k)

  // build prompt
  const context = scored.map((s, i) => `SOURCE ${i + 1} (doc ${s.document_id}, chunk ${s.chunk_index}):\n${s.text}`).join('\n\n')
  const prompt = `Use the following extracted context to answer the question. If the answer is not contained, say you don't know.\n\nContext:\n${context}\n\nQuestion:\n${query}`

  // call LLM
  let answer = ''
  try {
    const ai = getAi()
    const response: any = await ai.models.generate({
      model: 'gemini-2.5-flash',
      input: prompt,
    })
    // attempt to extract text from common response shapes
    if (response?.outputs?.[0]?.content) {
      // new genai shapes
      const cnt = response.outputs[0].content
      if (Array.isArray(cnt)) answer = cnt.map((c: any) => c.text ?? c).join('\n')
      else answer = cnt.text ?? String(cnt)
    } else if (response?.candidates?.[0]?.content) {
      answer = response.candidates[0].content
    } else if (response?.output?.[0]?.content?.[0]?.text) {
      answer = response.output[0].content[0].text
    } else {
      answer = JSON.stringify(response)
    }
  } catch (err: any) {
    throw new Error('LLM call failed: ' + err?.message)
  }

  const sources = scored.map((s: any, i: number) => ({ document_id: s.document_id, chunk_index: s.chunk_index, score: s.score }))
  return { answer, sources }
}

export default { searchAndAnswer }
