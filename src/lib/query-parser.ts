export interface ParsedQuery {
  apiQuery: string;
  minFavesThreshold: number;
  hasDynamicDate: boolean;
}

export function parseRawQuery(rawQuery: string): ParsedQuery {
  let apiQuery = rawQuery;
  let minFavesThreshold = 0;
  const hasDynamicDate = rawQuery.includes("{today}");

  // Extract and remove min_faves:N
  const minFavesMatch = apiQuery.match(/min_faves:(\d+)/);
  if (minFavesMatch) {
    minFavesThreshold = parseInt(minFavesMatch[1], 10);
    apiQuery = apiQuery.replace(/min_faves:\d+/, "").trim();
  }

  // Remove other engagement operators the API doesn't support
  apiQuery = apiQuery.replace(/min_retweets:\d+/g, "").trim();
  apiQuery = apiQuery.replace(/min_replies:\d+/g, "").trim();

  // Clean up extra spaces
  apiQuery = apiQuery.replace(/\s+/g, " ").trim();

  return { apiQuery, minFavesThreshold, hasDynamicDate };
}

export function buildRuntimeQuery(apiQuery: string, hasDynamicDate: boolean): {
  query: string;
  startTime?: string;
} {
  if (!hasDynamicDate) return { query: apiQuery };

  const today = new Date().toISOString().split("T")[0]; // "2026-02-07"
  let query = apiQuery.replace(/\{today\}/g, today);

  // Extract since:YYYY-MM-DD and convert to start_time parameter
  let startTime: string | undefined;
  const sinceMatch = query.match(/since:(\d{4}-\d{2}-\d{2})/);
  if (sinceMatch) {
    startTime = sinceMatch[1] + "T00:00:00Z";
    query = query.replace(/since:\d{4}-\d{2}-\d{2}/, "").trim();
  }

  // Clean up extra spaces
  query = query.replace(/\s+/g, " ").trim();

  return { query, startTime };
}
