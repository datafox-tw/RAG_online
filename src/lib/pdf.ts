export function chunkText(text: string, maxLen = 1200, overlap = 200) {
  if (!Number.isFinite(maxLen) || maxLen <= 0) {
    throw new Error('maxLen must be a positive number')
  }
  if (!Number.isFinite(overlap) || overlap < 0) {
    throw new Error('overlap must be a non-negative number')
  }

  const chunks: { text: string; start: number; end: number }[] = []
  const step = Math.max(1, maxLen - overlap)
  let start = 0

  while (start < text.length) {
    const end = Math.min(start + maxLen, text.length)
    const chunkText = text.slice(start, end)
    if (!chunkText) {
      break
    }
    chunks.push({ text: chunkText, start, end })
    start += step
  }
  return chunks
}
