/**
 * RAGLogger (Phase 7A) — Structured logging for observability.
 */
export class RAGLogger {
  static logQuery(userId, query, method) {
    console.log(`[RAG_QUERY] User: ${userId} | Method: ${method} | Query: "${query}"`);
  }

  static logAction(userId, type, success, error = null) {
    const status = success ? 'SUCCESS' : `FAILED (${error})`;
    console.log(`[RAG_ACTION] User: ${userId} | Action: ${type} | Status: ${status}`);
  }

  static logSecurity(userId, event, level = 'WARN') {
    console.log(`[RAG_SECURITY][${level}] User: ${userId} | Event: ${event}`);
  }

  static logPerformance(userId, metrics) {
    const { totalTime, retrievalTime, aiTime, tokens } = metrics;
    console.log(`[RAG_PERF] User: ${userId} | Total: ${totalTime}ms | Retrieval: ${retrievalTime}ms | AI: ${aiTime}ms | Tokens: ${tokens}`);
  }
}
