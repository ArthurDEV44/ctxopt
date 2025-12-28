/**
 * BM25 (Best Matching 25) implementation for tool search
 *
 * BM25 is a ranking function used by search engines to rank documents
 * based on query terms appearing in each document.
 *
 * Formula: score = IDF * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (dl/avgdl))))
 *
 * Where:
 * - tf = term frequency in document
 * - k1 = term saturation parameter (default: 1.2)
 * - b = length normalization parameter (default: 0.75)
 * - dl = document length (number of terms)
 * - avgdl = average document length across corpus
 * - IDF = log((N - df + 0.5) / (df + 0.5) + 1)
 * - N = total number of documents
 * - df = document frequency (docs containing term)
 */

/**
 * Configuration options for BM25 algorithm
 */
export interface BM25Options {
  /** Term saturation parameter. Higher = more weight to term frequency. Default: 1.2 */
  k1?: number;
  /** Length normalization. 0 = no normalization, 1 = full normalization. Default: 0.75 */
  b?: number;
}

/**
 * Result item from BM25 search
 */
export interface BM25Result<T> {
  /** Original item from the corpus */
  item: T;
  /** BM25 relevance score (higher = more relevant) */
  score: number;
  /** Query terms that matched in this document */
  matchedTerms: string[];
}

/**
 * BM25 search index interface
 */
export interface BM25Index<T> {
  /** Search the index and return ranked results */
  search: (query: string) => BM25Result<T>[];
  /** Get corpus statistics */
  stats: () => { documentCount: number; avgDocLength: number; vocabularySize: number };
}

/**
 * Tokenize text into searchable terms
 *
 * - Lowercases text
 * - Removes punctuation
 * - Splits on whitespace
 * - Filters words shorter than 2 characters
 */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 2);
}

/**
 * Create a BM25 search index from a collection of items
 *
 * @param items - Array of items to index
 * @param getSearchableText - Function to extract searchable text from each item
 * @param options - BM25 configuration options
 * @returns BM25 search index
 *
 * @example
 * ```typescript
 * const tools = [
 *   { name: "compress", description: "Compress content" },
 *   { name: "analyze", description: "Analyze build output" }
 * ];
 *
 * const index = createBM25Index(
 *   tools,
 *   (tool) => `${tool.name} ${tool.description}`
 * );
 *
 * const results = index.search("compress content");
 * // [{ item: { name: "compress", ... }, score: 2.5, matchedTerms: ["compress", "content"] }]
 * ```
 */
export function createBM25Index<T>(
  items: T[],
  getSearchableText: (item: T) => string,
  options?: BM25Options
): BM25Index<T> {
  const k1 = options?.k1 ?? 1.2;
  const b = options?.b ?? 0.75;

  // Handle empty corpus
  if (items.length === 0) {
    return {
      search: () => [],
      stats: () => ({ documentCount: 0, avgDocLength: 0, vocabularySize: 0 }),
    };
  }

  // Build tokenized corpus
  const documents = items.map((item) => tokenize(getSearchableText(item)));

  // Calculate average document length
  const totalLength = documents.reduce((sum, doc) => sum + doc.length, 0);
  const avgdl = totalLength / documents.length;

  // Build document frequency map (how many docs contain each term)
  const df = new Map<string, number>();
  for (const doc of documents) {
    const uniqueTerms = new Set(doc);
    for (const term of uniqueTerms) {
      df.set(term, (df.get(term) ?? 0) + 1);
    }
  }

  const N = documents.length;

  /**
   * Calculate IDF (Inverse Document Frequency) for a term
   * Using the standard BM25 IDF formula with smoothing
   */
  function idf(term: string): number {
    const docFreq = df.get(term) ?? 0;
    // BM25 IDF formula: log((N - df + 0.5) / (df + 0.5) + 1)
    return Math.log((N - docFreq + 0.5) / (docFreq + 0.5) + 1);
  }

  /**
   * Score a single document against query terms
   */
  function scoreDocument(
    docIndex: number,
    queryTerms: string[]
  ): { score: number; matchedTerms: string[] } {
    const doc = documents[docIndex];
    if (!doc) {
      return { score: 0, matchedTerms: [] };
    }
    const dl = doc.length;

    // Build term frequency map for this document
    const termFreq = new Map<string, number>();
    for (const term of doc) {
      termFreq.set(term, (termFreq.get(term) ?? 0) + 1);
    }

    let score = 0;
    const matchedTerms: string[] = [];

    for (const term of queryTerms) {
      const tf = termFreq.get(term) ?? 0;
      if (tf > 0) {
        matchedTerms.push(term);
        const termIdf = idf(term);
        // BM25 term score formula
        const numerator = tf * (k1 + 1);
        const denominator = tf + k1 * (1 - b + b * (dl / avgdl));
        score += termIdf * (numerator / denominator);
      }
    }

    return { score, matchedTerms };
  }

  return {
    search(query: string): BM25Result<T>[] {
      const queryTerms = tokenize(query);

      // Empty query returns no results
      if (queryTerms.length === 0) {
        return [];
      }

      const results: BM25Result<T>[] = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item) continue;
        const { score, matchedTerms } = scoreDocument(i, queryTerms);
        // Only include documents with at least one matching term
        if (score > 0) {
          results.push({
            item,
            score,
            matchedTerms,
          });
        }
      }

      // Sort by score descending (most relevant first)
      return results.sort((a, b) => b.score - a.score);
    },

    stats() {
      return {
        documentCount: N,
        avgDocLength: avgdl,
        vocabularySize: df.size,
      };
    },
  };
}
