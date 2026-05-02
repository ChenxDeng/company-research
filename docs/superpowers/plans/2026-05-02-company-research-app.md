# 公司调研助手 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a web app that lets job seekers input a company name and get an AI-generated research report with company overview, business scope, trends, org structure, compensation, and concerns.

**Architecture:** Next.js App Router with a single SSE API route that orchestrates DeepSeek function calling with Tavily search. Frontend renders a card-based report and supports PDF export.

**Tech Stack:** Next.js 14+ (App Router), TypeScript, DeepSeek-Chat API, Tavily Search API, html2pdf.js, Vercel

---

## File Structure

```
/
├── app/
│   ├── layout.tsx              # Root layout with fonts and metadata
│   ├── page.tsx                # Main page (search + report)
│   ├── globals.css             # Global styles (design system)
│   └── api/
│       └── research/
│           └── route.ts        # SSE endpoint orchestrating DeepSeek + Tavily
├── components/
│   ├── SearchForm.tsx          # Company name + position input form
│   ├── ReportView.tsx          # Report container with all cards
│   ├── ReportCard.tsx          # Individual report section card
│   ├── SalaryCard.tsx          # Salary grid with role/range/months
│   ├── ConcernsCard.tsx        # Warning-style card with suggested searches
│   ├── LoadingState.tsx        # Animated loading with progress stages
│   └── DownloadButton.tsx      # PDF download trigger
├── lib/
│   ├── types.ts                # TypeScript types for report JSON
│   ├── deepseek.ts             # DeepSeek API client with function calling
│   ├── tavily.ts               # Tavily search API wrapper
│   └── prompts.ts              # System prompt for DeepSeek
├── middleware.ts                # Rate limiting (IP-based)
├── package.json
├── tsconfig.json
├── next.config.ts
└── .env.local                  # DEEPSEEK_API_KEY, TAVILY_API_KEY
```

---

### Task 1: Project Setup

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `.env.local`, `.gitignore`

- [ ] **Step 1: Initialize Next.js project**

```bash
cd /Users/sisi/Documents/claudeproj
npx create-next-app@latest . --typescript --tailwind=no --eslint --app --src-dir=no --import-alias="@/*" --use-npm
```

Select: No Tailwind, Yes ESLint, Yes App Router, No src directory.

- [ ] **Step 2: Install dependencies**

```bash
npm install html2pdf.js
npm install -D @types/node
```

- [ ] **Step 3: Create .env.local**

```
DEEPSEEK_API_KEY=your_deepseek_api_key_here
TAVILY_API_KEY=your_tavily_api_key_here
```

- [ ] **Step 4: Update .gitignore**

Add `.env.local` and `.superpowers/` to `.gitignore` if not already present.

- [ ] **Step 5: Clean up default files**

Remove `app/page.tsx` default content, `app/favicon.ico` default, and any generated placeholder files. We'll recreate them in later tasks.

- [ ] **Step 6: Verify dev server starts**

```bash
npm run dev
```

Open http://localhost:3000 — should show a blank/error page (expected, no page.tsx yet).

- [ ] **Step 7: Commit**

```bash
git init
git add -A
git commit -m "chore: initialize Next.js project with TypeScript"
```

---

### Task 2: Type Definitions

**Files:**
- Create: `lib/types.ts`

- [ ] **Step 1: Create types file**

```typescript
// lib/types.ts

export interface ReportSection {
  id: string;
  title: string;
  content: string;
  sources: string[];
  tags?: string[];
  prediction?: string;
}

export interface OrganizationSection extends ReportSection {
  id: "organization";
  employees: string;
  structure: string;
  roles: { name: string; percent: number }[];
  locations: string[];
}

export interface SalaryItem {
  role: string;
  range: string;
  months: string;
}

export interface CompensationSection extends ReportSection {
  id: "compensation";
  salary: SalaryItem[];
  workIntensity: string;
  pros: string[];
  cons: string[];
}

export interface ConcernsSection extends ReportSection {
  id: "concerns";
  items: string[];
  suggestedSearches: string[];
}

export type AnySection =
  | ReportSection
  | OrganizationSection
  | CompensationSection
  | ConcernsSection;

export interface ResearchReport {
  company: string;
  summary: string;
  sections: AnySection[];
}

export type ResearchEvent =
  | { type: "status"; message: string }
  | { type: "report"; data: ResearchReport }
  | { type: "error"; message: string };
```

- [ ] **Step 2: Verify types compile**

```bash
npx tsc --noEmit lib/types.ts
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "feat: add TypeScript types for research report"
```

---

### Task 3: Tavily Search API Wrapper

**Files:**
- Create: `lib/tavily.ts`

- [ ] **Step 1: Create Tavily wrapper**

```typescript
// lib/tavily.ts

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
```

- [ ] **Step 2: Commit**

```bash
git add lib/tavily.ts
git commit -m "feat: add Tavily search API wrapper"
```

---

### Task 4: DeepSeek API with Function Calling

**Files:**
- Create: `lib/deepseek.ts`, `lib/prompts.ts`

- [ ] **Step 1: Create system prompt**

```typescript
// lib/prompts.ts

export function buildSystemPrompt(company: string, position?: string): string {
  const positionHint = position
    ? `\n用户意向岗位：${position}。请在员工待遇部分特别关注该岗位的相关信息。`
    : "";

  return `你是一个专业的公司调研助手。用户想了解「${company}」这家公司的详细信息。${positionHint}

你需要通过搜索工具获取最新、真实的信息，然后生成一份结构化的公司调研报告。

## 报告要求

请生成以下 JSON 格式的报告（不要输出其他内容，只输出 JSON）：

{
  "company": "${company}",
  "summary": "一句话概括公司（如：从算法推荐到全球科技巨头）",
  "sections": [
    {
      "id": "overview",
      "title": "公司概况",
      "content": "公司成立历史、发展情况、行业地位的详细描述",
      "sources": ["来源1", "来源2"]
    },
    {
      "id": "business",
      "title": "业务范围",
      "content": "主要/次要业务、行业地位的详细描述",
      "tags": ["业务标签1", "业务标签2"],
      "sources": ["来源1", "来源2"]
    },
    {
      "id": "trends",
      "title": "最新动向与趋势",
      "content": "最新战略、营收、重大新闻",
      "prediction": "一句话未来趋势预测",
      "sources": ["来源1", "来源2"]
    },
    {
      "id": "organization",
      "title": "组织结构",
      "content": "组织结构概述",
      "employees": "员工规模描述",
      "structure": "组织风格描述",
      "roles": [{"name": "岗位名", "percent": 数字占比}],
      "locations": ["城市1", "城市2"],
      "sources": ["来源1", "来源2"]
    },
    {
      "id": "compensation",
      "title": "员工待遇",
      "content": "待遇概述",
      "salary": [{"role": "岗位名", "range": "薪资范围", "months": "薪月数"}],
      "workIntensity": "工作强度描述",
      "pros": ["好评1", "好评2"],
      "cons": ["差评1", "差评2"],
      "sources": ["来源1", "来源2"]
    },
    {
      "id": "concerns",
      "title": "存疑之处",
      "content": "概述",
      "items": ["存疑点1", "存疑点2"],
      "suggestedSearches": ["建议搜索关键词1", "关键词2"],
      "sources": []
    }
  ]
}

## 搜索策略

1. 先搜索公司基本信息和历史
2. 搜索公司业务和行业地位
3. 搜索最新新闻和财报
4. 搜索员工评价和薪资信息
5. 如有需要，针对特定领域补充搜索

每个搜索结果都要记录来源。如果某些信息搜索不到，如实说明而非编造。`;
}
```

- [ ] **Step 2: Create DeepSeek client**

```typescript
// lib/deepseek.ts

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
  // Extract JSON from response (handle markdown code blocks)
  let jsonStr = content.trim();
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  try {
    const parsed = JSON.parse(jsonStr);
    return {
      company: parsed.company || company,
      summary: parsed.summary || "",
      sections: parsed.sections || [],
    };
  } catch {
    throw new Error("Failed to parse AI response as JSON");
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/deepseek.ts lib/prompts.ts
git commit -m "feat: add DeepSeek API client with function calling"
```

---

### Task 5: SSE API Route

**Files:**
- Create: `app/api/research/route.ts`

- [ ] **Step 1: Create API route**

```typescript
// app/api/research/route.ts

import { conductResearch } from "@/lib/deepseek";
import type { ResearchEvent } from "@/lib/types";

export async function POST(request: Request) {
  const body = await request.json();
  const { company, position } = body;

  if (!company || typeof company !== "string" || company.trim().length === 0) {
    return Response.json(
      { error: "公司名称不能为空" },
      { status: 400 },
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: ResearchEvent) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
        );
      };

      try {
        send({ type: "status", message: "开始调研..." });

        const report = await conductResearch(
          company.trim(),
          position?.trim() || undefined,
          (message) => send({ type: "status", message }),
        );

        send({ type: "report", data: report });
      } catch (error) {
        send({
          type: "error",
          message:
            error instanceof Error ? error.message : "调研过程中出现错误",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/research/route.ts
git commit -m "feat: add SSE API route for company research"
```

---

### Task 6: Global Styles & Layout

**Files:**
- Create: `app/globals.css`, `app/layout.tsx`

- [ ] **Step 1: Create global CSS with design system**

```css
/* app/globals.css */

:root {
  --bg-primary: #faf9f7;
  --bg-secondary: #f0eeeb;
  --bg-card: #ffffff;
  --bg-card-hover: #fffdfb;
  --border: #e5e2dd;
  --border-accent: #d4d0ca;
  --text-primary: #1a1a1a;
  --text-secondary: #555550;
  --text-muted: #999590;
  --accent: #d97706;
  --accent-glow: rgba(217, 119, 6, 0.08);
  --accent-soft: rgba(217, 119, 6, 0.06);
  --accent-border: rgba(217, 119, 6, 0.2);
  --warning: #b45309;
  --warning-bg: rgba(180, 83, 9, 0.04);
  --warning-border: rgba(180, 83, 9, 0.15);
  --success: #059669;
  --success-bg: rgba(5, 150, 105, 0.04);
  --success-border: rgba(5, 150, 105, 0.15);
  --font-sans: "Noto Sans SC", "PingFang SC", sans-serif;
  --font-mono: "JetBrains Mono", monospace;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  background: var(--bg-primary);
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-weight: 400;
  line-height: 1.7;
  min-height: 100vh;
}

.container {
  max-width: 1080px;
  margin: 0 auto;
  padding: 0 40px;
}

/* Header */
.site-header {
  padding: 48px 0 28px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 48px;
}

.logo {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 5px;
  text-transform: uppercase;
  color: var(--accent);
  margin-bottom: 6px;
}

.tagline {
  font-size: 13px;
  color: var(--text-muted);
  letter-spacing: 0.5px;
}

/* Search */
.search-section {
  margin-bottom: 52px;
}

.search-title {
  font-size: 40px;
  font-weight: 700;
  line-height: 1.2;
  margin-bottom: 8px;
}

.search-subtitle {
  font-size: 15px;
  color: var(--text-secondary);
  margin-bottom: 32px;
  font-weight: 300;
}

.search-form {
  display: flex;
  gap: 12px;
  align-items: stretch;
}

.input-group {
  position: relative;
  flex: 1;
}

.input-group:first-child {
  flex: 2;
}

.input-label {
  position: absolute;
  top: -8px;
  left: 16px;
  font-size: 10px;
  font-family: var(--font-mono);
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: var(--accent);
  background: var(--bg-primary);
  padding: 0 6px;
  z-index: 2;
}

.search-input {
  width: 100%;
  padding: 16px 20px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: 15px;
  font-weight: 400;
  transition: all 0.3s ease;
  outline: none;
}

.search-input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-glow);
}

.search-input::placeholder {
  color: var(--text-muted);
  font-weight: 300;
}

.search-btn {
  padding: 16px 36px;
  background: var(--accent);
  border: none;
  border-radius: 8px;
  color: #fff;
  font-family: var(--font-sans);
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 1px;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
}

.search-btn:hover {
  background: #e8850a;
  box-shadow: 0 4px 20px rgba(217, 119, 6, 0.25);
  transform: translateY(-1px);
}

.search-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

/* Loading */
.loading-state {
  text-align: center;
  padding: 60px 0;
}

.loading-ring {
  width: 48px;
  height: 48px;
  border: 2px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-text {
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--text-secondary);
  letter-spacing: 1px;
}

/* Report Header */
.report-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 32px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--border);
}

.company-name {
  font-size: 34px;
  font-weight: 700;
  line-height: 1.2;
}

.report-meta {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-muted);
  letter-spacing: 1px;
  text-align: right;
}

/* Cards Grid */
.report-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 40px;
}

/* Card Base */
.card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 28px;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  animation: fadeUp 0.5s ease both;
}

.card::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--accent), var(--accent-glow));
  opacity: 0;
  transition: opacity 0.3s;
}

.card:hover {
  border-color: var(--border-accent);
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06);
}

.card:hover::before {
  opacity: 1;
}

.card-full {
  grid-column: span 2;
}

@keyframes fadeUp {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Card Content */
.card-icon {
  font-size: 11px;
  font-family: var(--font-mono);
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--accent);
  margin-bottom: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-icon::before {
  content: "";
  width: 6px;
  height: 6px;
  background: var(--accent);
  border-radius: 50%;
}

.card-title {
  font-size: 19px;
  font-weight: 600;
  margin-bottom: 14px;
  line-height: 1.3;
}

.card-body {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.8;
}

.card-body strong {
  color: var(--text-primary);
  font-weight: 500;
}

.highlight {
  color: var(--accent);
  font-weight: 500;
}

/* Source Tags */
.source-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-muted);
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 3px 10px;
  margin-top: 16px;
  letter-spacing: 0.5px;
}

/* Tags */
.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.tag {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 4px;
  background: var(--accent-soft);
  color: var(--accent);
  border: 1px solid var(--accent-border);
}

/* Salary Grid */
.salary-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin: 12px 0;
}

.salary-item {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 14px;
  text-align: center;
}

.salary-role {
  font-size: 11px;
  font-family: var(--font-mono);
  color: var(--text-muted);
  letter-spacing: 1px;
  text-transform: uppercase;
  margin-bottom: 6px;
}

.salary-range {
  font-size: 22px;
  font-weight: 600;
}

.salary-detail {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 4px;
}

/* Pros/Cons */
.pros-cons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 12px;
}

.pros,
.cons {
  padding: 14px;
  border-radius: 8px;
}

.pros {
  background: var(--success-bg);
  border: 1px solid var(--success-border);
}

.cons {
  background: var(--warning-bg);
  border: 1px solid var(--warning-border);
}

.pros-label,
.cons-label {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 2px;
  text-transform: uppercase;
  margin-bottom: 8px;
  font-weight: 500;
}

.pros-label {
  color: var(--success);
}

.cons-label {
  color: var(--warning);
}

.pros ul,
.cons ul {
  list-style: none;
  font-size: 13px;
  color: var(--text-secondary);
}

.pros li,
.cons li {
  padding: 2px 0;
}

.pros li::before {
  content: "+ ";
  color: var(--success);
  font-weight: 700;
}

.cons li::before {
  content: "− ";
  color: var(--warning);
  font-weight: 700;
}

/* Warning Card */
.card-warning {
  background: var(--warning-bg);
  border-color: var(--warning-border);
}

.card-warning .card-icon {
  color: var(--warning);
}

.card-warning .card-icon::before {
  background: var(--warning);
}

/* Search Keywords */
.search-keywords {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}

.keyword {
  font-family: var(--font-mono);
  font-size: 12px;
  padding: 6px 14px;
  background: rgba(180, 83, 9, 0.06);
  border: 1px solid rgba(180, 83, 9, 0.15);
  border-radius: 20px;
  color: var(--warning);
  cursor: default;
}

/* Download Section */
.download-section {
  text-align: center;
  padding: 48px 0 64px;
  border-top: 1px solid var(--border);
  margin-top: 24px;
}

.download-btn {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 16px 48px;
  background: transparent;
  border: 1.5px solid var(--accent);
  border-radius: 8px;
  color: var(--accent);
  font-family: var(--font-sans);
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 2px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.download-btn:hover {
  background: var(--accent);
  color: #fff;
  box-shadow: 0 4px 24px rgba(217, 119, 6, 0.2);
}

/* Footer */
.site-footer {
  padding: 24px 0;
  border-top: 1px solid var(--border);
  text-align: center;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-muted);
  letter-spacing: 1px;
}

/* Responsive */
@media (max-width: 768px) {
  .container {
    padding: 0 20px;
  }

  .search-form {
    flex-direction: column;
  }

  .search-title {
    font-size: 28px;
  }

  .report-grid {
    grid-template-columns: 1fr;
  }

  .card-full {
    grid-column: span 1;
  }

  .salary-grid {
    grid-template-columns: 1fr;
  }

  .report-header {
    flex-direction: column;
    gap: 8px;
  }
}
```

- [ ] **Step 2: Create root layout**

```tsx
// app/layout.tsx

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "公司调研助手",
  description: "为求职者打造的透明化企业信息平台",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add app/globals.css app/layout.tsx
git commit -m "feat: add global styles and root layout"
```

---

### Task 7: Search Form Component

**Files:**
- Create: `components/SearchForm.tsx`

- [ ] **Step 1: Create SearchForm component**

```tsx
// components/SearchForm.tsx

"use client";

import { useState } from "react";

interface SearchFormProps {
  onSearch: (company: string, position: string) => void;
  isLoading: boolean;
}

export function SearchForm({ onSearch, isLoading }: SearchFormProps) {
  const [company, setCompany] = useState("");
  const [position, setPosition] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (company.trim()) {
      onSearch(company.trim(), position.trim());
    }
  };

  return (
    <section className="search-section">
      <h1 className="search-title">深入了解你想加入的公司</h1>
      <p className="search-subtitle">
        输入公司名称，AI 实时整合公开信息，生成一页高密度调研报告
      </p>

      <form className="search-form" onSubmit={handleSubmit}>
        <div className="input-group">
          <span className="input-label">公司名称 *</span>
          <input
            className="search-input"
            placeholder="如：字节跳动、阿里巴巴、小红书..."
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            required
          />
        </div>
        <div className="input-group">
          <span className="input-label">意向岗位</span>
          <input
            className="search-input"
            placeholder="如：前端开发、产品经理..."
            value={position}
            onChange={(e) => setPosition(e.target.value)}
          />
        </div>
        <button className="search-btn" type="submit" disabled={isLoading || !company.trim()}>
          {isLoading ? "调研中..." : "开始调研"}
        </button>
      </form>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/SearchForm.tsx
git commit -m "feat: add SearchForm component"
```

---

### Task 8: Report Card Components

**Files:**
- Create: `components/ReportCard.tsx`, `components/SalaryCard.tsx`, `components/ConcernsCard.tsx`, `components/ReportView.tsx`

- [ ] **Step 1: Create ReportCard component**

```tsx
// components/ReportCard.tsx

import type { ReportSection } from "@/lib/types";

interface ReportCardProps {
  section: ReportSection;
  index: number;
  fullWidth?: boolean;
}

export function ReportCard({ section, index, fullWidth }: ReportCardProps) {
  const num = String(index + 1).padStart(2, "0");

  return (
    <div
      className={`card${fullWidth ? " card-full" : ""}`}
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div className="card-icon">{num} / {section.title}</div>
      {section.tags && section.tags.length > 0 && (
        <div className="card-title">{section.title}</div>
      )}
      <div className="card-body">
        {section.content}
        {section.prediction && (
          <div
            style={{
              marginTop: 12,
              padding: 16,
              background: "var(--accent-soft)",
              borderRadius: 8,
              borderLeft: "3px solid var(--accent)",
            }}
          >
            {section.prediction}
          </div>
        )}
        {section.tags && section.tags.length > 0 && (
          <div className="tag-row" style={{ marginTop: 8 }}>
            {section.tags.map((tag) => (
              <span className="tag" key={tag}>{tag}</span>
            ))}
          </div>
        )}
      </div>
      {section.sources.length > 0 && (
        <div className="source-tag">{section.sources.join(" · ")}</div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create SalaryCard component**

```tsx
// components/SalaryCard.tsx

import type { CompensationSection } from "@/lib/types";

interface SalaryCardProps {
  section: CompensationSection;
  index: number;
}

export function SalaryCard({ section, index }: SalaryCardProps) {
  const num = String(index + 1).padStart(2, "0");

  return (
    <div
      className="card"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div className="card-icon">{num} / {section.title}</div>
      <div className="card-title">{section.title}</div>
      <div className="card-body">
        {section.salary.length > 0 && (
          <div className="salary-grid">
            {section.salary.map((item) => (
              <div className="salary-item" key={item.role}>
                <div className="salary-role">{item.role}</div>
                <div className="salary-range">{item.range}</div>
                <div className="salary-detail">{item.months}</div>
              </div>
            ))}
          </div>
        )}
        {section.workIntensity && (
          <div style={{ margin: "14px 0", fontSize: 13, color: "var(--text-secondary)" }}>
            <strong>工作强度：</strong>{section.workIntensity}
          </div>
        )}
        {(section.pros.length > 0 || section.cons.length > 0) && (
          <div className="pros-cons">
            {section.pros.length > 0 && (
              <div className="pros">
                <div className="pros-label">好评</div>
                <ul>{section.pros.map((p) => <li key={p}>{p}</li>)}</ul>
              </div>
            )}
            {section.cons.length > 0 && (
              <div className="cons">
                <div className="cons-label">差评</div>
                <ul>{section.cons.map((c) => <li key={c}>{c}</li>)}</ul>
              </div>
            )}
          </div>
        )}
      </div>
      {section.sources.length > 0 && (
        <div className="source-tag">{section.sources.join(" · ")}</div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create ConcernsCard component**

```tsx
// components/ConcernsCard.tsx

import type { ConcernsSection } from "@/lib/types";

interface ConcernsCardProps {
  section: ConcernsSection;
  index: number;
}

export function ConcernsCard({ section, index }: ConcernsCardProps) {
  const num = String(index + 1).padStart(2, "0");

  return (
    <div
      className="card card-warning card-full"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div className="card-icon">{num} / {section.title}</div>
      <div className="card-title">{section.title}</div>
      <div className="card-body">
        {section.content && <p style={{ marginBottom: 12 }}>{section.content}</p>}
        <ul style={{ listStyle: "none" }}>
          {section.items.map((item) => (
            <li key={item} style={{ padding: "6px 0" }}>• {item}</li>
          ))}
        </ul>
        {section.suggestedSearches.length > 0 && (
          <>
            <div style={{ marginTop: 16, fontSize: 13, color: "var(--text-secondary)" }}>
              <strong>建议自行调研以下关键词：</strong>
            </div>
            <div className="search-keywords">
              {section.suggestedSearches.map((kw) => (
                <span className="keyword" key={kw}>{kw}</span>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create ReportView component**

```tsx
// components/ReportView.tsx

import type { ResearchReport, OrganizationSection, CompensationSection, ConcernsSection } from "@/lib/types";
import { ReportCard } from "./ReportCard";
import { SalaryCard } from "./SalaryCard";
import { ConcernsCard } from "./ConcernsCard";

interface ReportViewProps {
  report: ResearchReport;
}

export function ReportView({ report }: ReportViewProps) {
  const today = new Date().toISOString().split("T")[0];

  return (
    <div id="report-content">
      <div className="report-header">
        <h2 className="company-name">{report.company}</h2>
        <div className="report-meta">
          <div>调研时间：{today}</div>
          <div>数据来源：实时网络搜索</div>
        </div>
      </div>

      <p style={{ marginBottom: 24, fontSize: 15, color: "var(--text-secondary)" }}>
        {report.summary}
      </p>

      <div className="report-grid">
        {report.sections.map((section, i) => {
          switch (section.id) {
            case "organization":
              return (
                <ReportCard
                  key={section.id}
                  section={section as OrganizationSection}
                  index={i}
                />
              );
            case "compensation":
              return (
                <SalaryCard
                  key={section.id}
                  section={section as CompensationSection}
                  index={i}
                />
              );
            case "concerns":
              return (
                <ConcernsCard
                  key={section.id}
                  section={section as ConcernsSection}
                  index={i}
                />
              );
            default:
              return (
                <ReportCard
                  key={section.id}
                  section={section}
                  index={i}
                  fullWidth={section.id === "trends"}
                />
              );
          }
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add components/ReportCard.tsx components/SalaryCard.tsx components/ConcernsCard.tsx components/ReportView.tsx
git commit -m "feat: add report card components"
```

---

### Task 9: Loading State & Download Button

**Files:**
- Create: `components/LoadingState.tsx`, `components/DownloadButton.tsx`

- [ ] **Step 1: Create LoadingState component**

```tsx
// components/LoadingState.tsx

interface LoadingStateProps {
  status: string;
}

export function LoadingState({ status }: LoadingStateProps) {
  return (
    <div className="loading-state">
      <div className="loading-ring" />
      <div className="loading-text">{status}</div>
    </div>
  );
}
```

- [ ] **Step 2: Create DownloadButton component**

```tsx
// components/DownloadButton.tsx

"use client";

export function DownloadButton() {
  const handleDownload = async () => {
    const html2pdf = (await import("html2pdf.js")).default;
    const element = document.getElementById("report-content");
    if (!element) return;

    html2pdf()
      .set({
        margin: [10, 10],
        filename: "company-research.pdf",
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      })
      .from(element)
      .save();
  };

  return (
    <div className="download-section">
      <button className="download-btn" onClick={handleDownload}>
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        下载 PDF 报告
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/LoadingState.tsx components/DownloadButton.tsx
git commit -m "feat: add loading state and PDF download button"
```

---

### Task 10: Main Page (SSE Integration)

**Files:**
- Create: `app/page.tsx`

- [ ] **Step 1: Create main page with SSE client**

```tsx
// app/page.tsx

"use client";

import { useState } from "react";
import { SearchForm } from "@/components/SearchForm";
import { ReportView } from "@/components/ReportView";
import { LoadingState } from "@/components/LoadingState";
import { DownloadButton } from "@/components/DownloadButton";
import type { ResearchReport, ResearchEvent } from "@/lib/types";

export default function Home() {
  const [report, setReport] = useState<ResearchReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const handleSearch = async (company: string, position: string) => {
    setIsLoading(true);
    setReport(null);
    setError("");
    setStatus("正在连接...");

    try {
      const response = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company, position: position || undefined }),
      });

      if (!response.ok) {
        throw new Error("请求失败");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("无法读取响应");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;

          try {
            const event: ResearchEvent = JSON.parse(line.slice(6));

            switch (event.type) {
              case "status":
                setStatus(event.message);
                break;
              case "report":
                setReport(event.data);
                break;
              case "error":
                setError(event.message);
                break;
            }
          } catch {
            // Skip malformed events
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "请求失败");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container">
      <header className="site-header">
        <div className="logo">公司调研助手</div>
        <div className="tagline">为求职者打造的透明化企业信息平台</div>
      </header>

      <SearchForm onSearch={handleSearch} isLoading={isLoading} />

      {isLoading && <LoadingState status={status} />}

      {error && (
        <div
          style={{
            textAlign: "center",
            padding: 40,
            color: "var(--warning)",
            fontSize: 14,
          }}
        >
          {error}
        </div>
      )}

      {report && (
        <>
          <ReportView report={report} />
          <DownloadButton />
        </>
      )}

      <footer className="site-footer">
        数据来源均为公开信息，仅供参考 · 请以实际情况为准
      </footer>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/page.tsx
git commit -m "feat: add main page with SSE integration"
```

---

### Task 11: Rate Limiting Middleware

**Files:**
- Create: `middleware.ts`

- [ ] **Step 1: Create rate limiting middleware**

```typescript
// middleware.ts

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const rateLimit = new Map<string, { count: number; resetTime: number }>();
const MAX_REQUESTS = 10;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname !== "/api/research") {
    return NextResponse.next();
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  const now = Date.now();
  const record = rateLimit.get(ip);

  if (!record || now > record.resetTime) {
    rateLimit.set(ip, { count: 1, resetTime: now + WINDOW_MS });
    return NextResponse.next();
  }

  if (record.count >= MAX_REQUESTS) {
    return NextResponse.json(
      { error: "请求过于频繁，请稍后再试" },
      { status: 429 },
    );
  }

  record.count++;
  return NextResponse.next();
}

export const config = {
  matcher: "/api/research",
};
```

- [ ] **Step 2: Commit**

```bash
git add middleware.ts
git commit -m "feat: add IP-based rate limiting middleware"
```

---

### Task 12: Dev Server Verification

- [ ] **Step 1: Start dev server and verify**

```bash
npm run dev
```

Open http://localhost:3000 and verify:
- Page loads with header, search form
- Form validation works (empty company name blocked)
- Responsive layout works on mobile viewport

- [ ] **Step 2: Test with real API keys**

Set `DEEPSEEK_API_KEY` and `TAVILY_API_KEY` in `.env.local`, then search for a company. Verify:
- SSE streaming works (status messages update)
- Report renders with all 6 sections
- PDF download works

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete company research app"
```
