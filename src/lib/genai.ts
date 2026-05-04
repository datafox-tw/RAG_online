export const EMBEDDING_DIMENSIONS = Number(process.env.EMBEDDING_DIMENSIONS || 768);

let aiClient: any = null;

export async function getAi() {
  if (aiClient) return aiClient

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
  if (!apiKey) {
    throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is not set.')
  }

  // dynamic import to avoid bundlers resolving native optional deps of ws on the client
  const mod = await import('@google/genai')
  const { GoogleGenAI } = mod as any
  aiClient = new GoogleGenAI({ apiKey })
  return aiClient
}

export async function generateEmbedding(text: string, task: 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY' = 'RETRIEVAL_DOCUMENT') {
  const truncatedText = text.slice(0, 8000)
  const ai = await getAi()

  const response = await ai.models.embedContent({
    model: 'gemini-embedding-001',
    contents: truncatedText,
    config: {
      outputDimensionality: EMBEDDING_DIMENSIONS,
      taskType: task,
    },
  })

  return response.embeddings?.[0]?.values ?? null
}

export async function generateText(input: string, model = 'gemini-2.5-flash'): Promise<string> {
  const ai = await getAi()
  const response = await ai.models.generateContent({
    model,
    contents: input,
  })
  return response.candidates?.[0]?.content?.parts?.[0]?.text ?? response.text ?? ''
}
