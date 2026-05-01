import { GoogleGenAI } from "@google/genai";

export const EMBEDDING_DIMENSIONS = Number(process.env.EMBEDDING_DIMENSIONS || 768);

let aiClient: GoogleGenAI | null = null;

export function getAi() {
  if (aiClient) return aiClient;

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is not set.');
  }

  aiClient = new GoogleGenAI({ apiKey });
  return aiClient;
}

export async function generateEmbedding(text: string, task: 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY' = 'RETRIEVAL_DOCUMENT') {
  const truncatedText = text.slice(0, 8000);
  const ai = getAi();

  const response = await ai.models.embedContent({
    model: 'gemini-embedding-001',
    contents: truncatedText,
    config: {
      outputDimensionality: EMBEDDING_DIMENSIONS,
      taskType: task,
    },
  });

  return response.embeddings?.[0]?.values ?? null;
}
