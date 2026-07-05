export type Pattern = {
  id: string;
  description: string;
  context: string;
  success_rate: number;
  confidence: number;
  domain: string;
  tags: string;
  parent_id?: string;
};

type QueryOptions = {
  domain?: string;
  minConfidence?: number;
  limit?: number;
};

const patterns: Pattern[] = [];

function queryPatterns(query = '', options: QueryOptions = {}) {
  const q = query.toLowerCase();
  return patterns
    .filter((pattern) => !options.domain || pattern.domain === options.domain)
    .filter((pattern) => pattern.confidence >= (options.minConfidence ?? 0))
    .filter((pattern) => !q || `${pattern.description} ${pattern.context} ${pattern.tags}`.toLowerCase().includes(q))
    .slice(0, options.limit ?? 10);
}

export function getReasoningBank() {
  return {
    queryPatterns,
    getAutomotivePatterns: (query = '') => queryPatterns(query, { domain: 'automotive' }),
    getKioskPatterns: () => queryPatterns('', { domain: 'automotive-kiosk' }),
    getNotificationPatterns: () => queryPatterns('', { domain: 'notifications' }),
    getSuggestions: (context: string, domain?: string) => queryPatterns(context, { domain, minConfidence: 0.7 }),
    getStats: () => ({ total: patterns.length, domainCounts: {} as Record<string, number> }),
    addPattern: (pattern: Omit<Pattern, 'id'>) => {
      const next = { ...pattern, id: crypto.randomUUID() };
      patterns.push(next);
      return next;
    },
  };
}
