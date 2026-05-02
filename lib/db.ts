import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
});

export interface SearchLog {
  id: string;
  ip: string;
  company: string;
  position?: string;
  resultCompany: string;
  timestamp: number;
  sectionsCount: number;
}

export async function logSearch(log: SearchLog): Promise<void> {
  try {
    // Store in a list (most recent first)
    await redis.lpush("search_logs", JSON.stringify(log));
    // Keep only last 1000 entries
    await redis.ltrim("search_logs", 0, 999);
    // Also increment counter
    await redis.incr("total_searches");
  } catch (error) {
    console.error("Failed to log search:", error);
  }
}

export async function getSearchLogs(limit = 50): Promise<SearchLog[]> {
  try {
    const logs = await redis.lrange("search_logs", 0, limit - 1);
    return logs.map((l) => (typeof l === "string" ? JSON.parse(l) : l)) as SearchLog[];
  } catch {
    return [];
  }
}
