/**
 * Utility functions for the RAG pipeline.
 */

export const cleanText = (text) => {
  if (!text) return "";
  return text
    .replace(/\s+/g, " ")
    .replace(/\n+/g, " ")
    .trim();
};

export const chunkText = (text, targetSize = 512, overlap = 0.15) => {
  const cleaned = cleanText(text);
  if (cleaned.length <= targetSize) return [cleaned];

  const chunks = [];
  const overlapSize = Math.floor(targetSize * overlap);
  let start = 0;

  while (start < cleaned.length) {
    let end = start + targetSize;
    if (end < cleaned.length) {
      const lastPeriod = cleaned.lastIndexOf(". ", end);
      if (lastPeriod > start + (targetSize * 0.5)) {
        end = lastPeriod + 1;
      }
    }
    chunks.push(cleaned.substring(start, end).trim());
    start = end - overlapSize;
  }
  return chunks;
};

export const preprocessQuery = (query) => {
  return query
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .trim();
};
