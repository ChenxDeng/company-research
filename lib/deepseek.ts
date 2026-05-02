import { tavilySearch } from "./tavily";
import { buildSystemPrompt } from "./prompts";
import type { ResearchReport } from "./types";

interface DeepSeekMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

const TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "search",
      description: "搜索互联网获取最新信息",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "搜索关键词",
          },
        },
        required: ["query"],
      },
    },
  },
];

export async function conductResearch(
  company: string,
  position?: string,
  onStatus?: (message: string) => void,
): Promise<ResearchReport> {
  const messages: DeepSeekMessage[] = [
    { role: "system", content: buildSystemPrompt(company, position) },
    { role: "user", content: `请帮我调研「${company}」这家公司。` },
  ];

  const maxRounds = 8;

  for (let round = 0; round < maxRounds; round++) {
    onStatus?.(round === 0 ? "正在搜索公司信息..." : "正在深入分析...");

    const response = await fetch(
      "https://api.deepseek.com/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages,
          tools: TOOLS,
          temperature: 0.3,
          response_format: { type: "json_object" },
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status}`);
    }

    const data = await response.json();
    const choice = data.choices?.[0];
    if (!choice) throw new Error("No response from DeepSeek");

    const assistantMsg = choice.message;
    messages.push(assistantMsg);

    // If no tool calls, we have the final answer
    if (!assistantMsg.tool_calls || assistantMsg.tool_calls.length === 0) {
      onStatus?.("正在生成报告...");
      return parseReport(assistantMsg.content, company);
    }

    // Execute tool calls
    for (const toolCall of assistantMsg.tool_calls) {
      if (toolCall.function.name === "search") {
        const args = JSON.parse(toolCall.function.arguments);
        onStatus?.(`正在搜索：${args.query}`);

        const results = await tavilySearch(args.query);
        const formattedResults = results
          .map(
            (r, i) =>
              `[${i + 1}] ${r.title}\n来源: ${r.url}\n内容: ${r.content}`,
          )
          .join("\n\n");

        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: formattedResults,
        });
      }
    }
  }

  throw new Error("Research exceeded maximum rounds");
}

function parseReport(content: string, company: string): ResearchReport {
  let jsonStr = content.trim();

  // Try extracting from markdown code block
  const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1].trim();
  }

  // Try finding JSON object boundaries
  const firstBrace = jsonStr.indexOf("{");
  const lastBrace = jsonStr.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
  }

  try {
    const parsed = JSON.parse(jsonStr);

    // Normalize sources: handle both string[] and {name, url}[] formats
    const normalizeSources = (sources: unknown[]): { name: string; url: string }[] => {
      if (!Array.isArray(sources)) return [];
      return sources.map((s) => {
        if (typeof s === "string") {
          return { name: s, url: "" };
        }
        if (s && typeof s === "object" && "name" in s) {
          const obj = s as Record<string, unknown>;
          return { name: String(obj.name || ""), url: String(obj.url || "") };
        }
        return { name: String(s), url: "" };
      });
    };

    const sections = (parsed.sections || []).map((section: Record<string, unknown>) => ({
      ...section,
      sources: normalizeSources(section.sources as unknown[]),
      cityDetails: section.cityDetails || [],
    }));

    return {
      company: parsed.company || company,
      summary: parsed.summary || "",
      sections,
    };
  } catch (e) {
    console.error("Failed to parse JSON. Raw content (first 500 chars):", content.substring(0, 500));
    throw new Error(`Failed to parse AI response as JSON: ${e instanceof Error ? e.message : "unknown error"}`);
  }
}
