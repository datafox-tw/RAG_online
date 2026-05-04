import { chunkText } from '../lib/pdf'
import * as genai from '../lib/genai'
import * as supa from '../lib/supabase'
import { searchAndAnswer } from '../lib/rag'

jest.mock('../lib/genai')
jest.mock('../lib/supabase')

describe('Text-only RAG pipeline', () => {
  test('chunkText splits and overlaps', () => {
    const txt = 'a'.repeat(3000)
    const chunks = chunkText(txt, 1000, 100)
    expect(chunks.length).toBeGreaterThan(1)
    expect(chunks[0].text.length).toBeLessThanOrEqual(1000)
  })

  test('chunkText always advances even when overlap is large', () => {
    const txt = 'abcdefghi'.repeat(200)
    const chunks = chunkText(txt, 10, 10)
    expect(chunks.length).toBeGreaterThan(0)
    expect(chunks.length).toBe(txt.length)
    expect(chunks[chunks.length - 1].end).toBe(txt.length)
  })

  test('searchAndAnswer returns answer using mocked embeddings and LLM', async () => {
    ;(genai.generateEmbedding as jest.Mock).mockImplementation(async () => new Array(768).fill(1))

    ;(supa.getSupabase as jest.Mock).mockReturnValue({
      from: jest.fn().mockReturnValue({
        select: () => ({
          limit: () => ({
            data: [
              { id: 1, document_id: 1, chunk_index: 0, text: 'This is about cats', metadata: {}, embedding: new Array(768).fill(1) },
              { id: 2, document_id: 1, chunk_index: 1, text: 'This is about dogs', metadata: {}, embedding: new Array(768).fill(0.5) },
            ],
            error: null,
          }),
        }),
      }),
    })

    ;(genai.getAi as jest.Mock).mockResolvedValue({
      models: {
        generate: jest.fn(async () => ({ outputs: [{ content: [{ text: 'Cats are animals' }] }] })),
        embedContent: jest.fn(),
      },
    })

    const res = await searchAndAnswer('Tell me about cats', 2)
    expect(res.answer).toContain('Cats')
    expect(res.sources.length).toBeGreaterThan(0)
  })
})
