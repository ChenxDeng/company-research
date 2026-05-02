export interface SearchResult {
  title: string;
  url: string;
  content: string;
}

export async function tavilySearch(query: string): Promise<SearchResult[]> {
  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: process.env.TAVILY_API_KEY,
      query,
      search_depth: "advanced",
      include_answer: true,
      max_results: 5,
    }),
  });

  if (!response.ok) {
    throw new Error(`Tavily API error: ${response.status}`);
  }

  const data = await response.json();

  return (data.results || []).map((r: Record<string, string>) => ({
    title: r.title,
    url: r.url,
    content: r.content,
  }));
}
